<?php

namespace App\Http\Controllers;

use App\Models\SavedProject;
use App\Services\BuildingFootprints;
use App\Services\PropertyMapImage;
use App\Services\PropertyMapQuote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Draw on your property (Phase 2, Feature 1).
 *
 * The map sends its drawing already converted to the canvas format, so the materials
 * calculation (HomeController@estimate) is called unchanged. This route only exists
 * because the canvas sends the drawing inside a GET URL, which a map drawing with
 * several gates can outgrow.
 */
class PropertyMapController extends Controller
{
    // A project is a few KB; this only stops abuse.
    private const MAX_PROJECT_BYTES = 200_000;

    public function estimate(Request $request)
    {
        $validated = $request->validate([
            'graph' => ['required', 'array', 'min:1', 'max:2000'],
            'graph.*.node1' => ['required', 'integer'],
            'graph.*.node2' => ['required', 'integer'],
            'graph.*.x1' => ['required', 'numeric'],
            'graph.*.y1' => ['required', 'numeric'],
            'graph.*.x2' => ['required', 'numeric'],
            'graph.*.y2' => ['required', 'numeric'],
            'graph.*.door' => ['required', Rule::in([0, 1])],
            'graph.*.type' => ['required', 'integer', 'between:3,8'],
            'graph.*.material' => ['required', 'integer', 'between:1,4'],
            'graph.*.length' => ['nullable', 'numeric', 'min:0'],
            'graph.*.doorType' => ['nullable', 'integer', 'between:0,3'],
            'concrete' => ['required', 'boolean'],
            'project' => ['nullable', 'array'],
        ]);

        if (! is_array(session('materials')) || empty(session('materials'))) {
            return response('Your fence configuration has expired. Please choose your fence again.', 409);
        }

        if (isset($validated['project']) && $this->tooLarge($validated['project'])) {
            return response('The drawing is too large.', 413);
        }

        $graph = $validated['graph'];
        $graph[] = ['id' => 'concrete', 'value' => (bool) $validated['concrete']];
        $sketchJson = json_encode($graph);

        // Kept for the quote: map project and its satellite image (see PropertyMapQuote).
        if (isset($validated['project'])) {
            PropertyMapQuote::remember($validated['project'], $sketchJson);
        }

        return app(HomeController::class)->estimate($sketchJson);
    }

    /**
     * Satellite image of the drawing behind the current materials list, as a data URL.
     * The quote flow sends it as canvas_image, so Odoo gets it like the canvas sketch.
     */
    public function snapshot(PropertyMapImage $image, PropertyMapQuote $quote): JsonResponse
    {
        if (! $quote->isMapQuote()) {
            return response()->json(['message' => 'Get the materials list for your drawing first.'], 409);
        }

        $dataUrl = $image->dataUrl(session(PropertyMapQuote::SESSION_PROJECT));
        if ($dataUrl === null) {
            return response()->json(['message' => 'The satellite image is not available right now.'], 502);
        }

        return response()->json(['image' => $dataUrl]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->projectRules());

        $materials = session('materials');
        if (! is_array($materials) || empty($materials)) {
            return response()->json(['message' => 'Your fence configuration has expired. Please choose your fence again.'], 409);
        }

        if ($this->tooLarge($validated['project'])) {
            return response()->json(['message' => 'The drawing is too large to save.'], 413);
        }

        $saved = SavedProject::create([
            'project' => $validated['project'],
            'materials' => $materials,
        ]);

        return response()->json([
            'token' => $saved->token,
            'url' => route('property-map.open', $saved),
            'expires_at' => $saved->expires_at->toIso8601String(),
        ], 201);
    }

    /**
     * What the 3D view needs besides the drawing: the outline of the house, when one is
     * found, to size and place the house next to the fence.
     */
    public function scene(Request $request, BuildingFootprints $footprints): JsonResponse
    {
        $project = $request->validate($this->projectRules())['project'];
        $vertices = $project['vertices'];
        if (count($vertices) < 2) {
            return response()->json(['message' => 'Draw your fence first.'], 422);
        }

        $runs = $project['runs'];
        $last = count($vertices) - 1;
        $closed = collect($runs)->contains(fn ($run) => ($run['from'] ?? null) === $last && ($run['to'] ?? null) === 0);

        return response()->json([
            'house' => $footprints->houseFor($vertices, $closed),
        ]);
    }

    public function show(string $token): JsonResponse
    {
        $saved = SavedProject::active()->where('token', $token)->firstOrFail();

        return response()->json([
            'project' => $saved->project,
            'expires_at' => $saved->expires_at->toIso8601String(),
        ]);
    }

    // Link the customer opens later: restores the fence configuration in the session
    // and lands on the drawing step, which then loads the project.
    public function open(string $token): RedirectResponse
    {
        $saved = SavedProject::active()->where('token', $token)->first();

        if (! $saved) {
            return redirect('/')->with('status', 'This saved project has expired. Please start a new drawing.');
        }

        session([
            'materials' => $saved->materials,
            'step' => 0,
        ]);

        return redirect('/drawfence?project='.urlencode($saved->token));
    }

    /**
     * Settings for the map script (resources/views/partials/property_map.blade.php):
     * the browser key, the map id and the fence slots of the current configuration,
     * used for the per-side material choice and the gate options.
     */
    public static function clientConfig(): array
    {
        $materials = [];
        foreach ((array) session('materials', []) as $slot => $material) {
            $materials[] = [
                'slot' => (int) $slot,
                'code' => (string) ($material['code'] ?? ''),
                'label' => implode(' · ', array_filter([
                    $material['height'] ?? null,
                    $material['material'] ?? null,
                    $material['style'] ?? null,
                    $material['color'] ?? null,
                ])),
                // The chosen answers (style, color, height...), for the 3D view.
                'fields' => array_filter((array) $material, fn ($value, $key) => is_string($value) && $key !== 'code', ARRAY_FILTER_USE_BOTH),
            ];
        }

        return [
            'browserKey' => config('services.google_maps.browser_key'),
            'mapId' => config('services.google_maps.map_id'),
            'materials' => $materials,
        ];
    }

    // Every top-level field is listed: validated() keeps only the keys that have rules.
    private function projectRules(): array
    {
        return [
            'project' => ['required', 'array'],
            'project.source' => ['nullable', 'string', 'max:20'],
            'project.address' => ['nullable', 'string', 'max:255'],
            'project.place_id' => ['nullable', 'string', 'max:255'],
            'project.center' => ['nullable', 'array'],
            'project.center.lat' => ['required_with:project.center', 'numeric', 'between:-90,90'],
            'project.center.lng' => ['required_with:project.center', 'numeric', 'between:-180,180'],
            'project.zoom' => ['nullable', 'numeric', 'between:0,22'],
            'project.vertices' => ['present', 'array', 'max:500'],
            'project.vertices.*.lat' => ['required', 'numeric', 'between:-90,90'],
            'project.vertices.*.lng' => ['required', 'numeric', 'between:-180,180'],
            'project.runs' => ['present', 'array', 'max:500'],
            'project.runs.*' => ['array'],
        ];
    }

    private function tooLarge(array $project): bool
    {
        return strlen((string) json_encode($project)) > self::MAX_PROJECT_BYTES;
    }
}
