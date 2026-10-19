<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;

class DrawFenceController extends Controller
{
    public function embed(Request $request): Response
    {
        return $this->embedResponse($request, 'embed_draw');
    }

    public function customizable(Request $request): Response
    {
        return $this->embedResponse($request, 'embed_draw_customizable');
    }

    private function embedResponse(Request $request, string $view): Response
    {
        $materials = $this->embeddedMaterials($request);

        // Keep the existing estimate, save and quote endpoints working without
        // requiring www to share or pre-create an app session.
        session([
            'materials' => $materials,
            'step' => 0,
        ]);

        $response = response()->view($view, $this->drawingData($materials, 0));
        $parentOrigin = config('services.drawfence_embed.parent_origin');

        if (is_string($parentOrigin) && $parentOrigin !== '') {
            $response->headers->set(
                'Content-Security-Policy',
                "frame-ancestors 'self' {$parentOrigin}"
            );
        }

        return $response;
    }

    private function drawingData(array $materials, int $step): array
    {
        $materialTypes = collect($materials)
            ->map(fn ($material) => substr((string) ($material['code'] ?? ''), 0, 1));
        $lastSlot = array_key_last($materials);
        $lastCode = (string) ($materials[$lastSlot]['code'] ?? '');

        return [
            'step' => 'STEP '.($step + 1),
            'materials' => $materials,
            'hayAl' => $materialTypes->contains('1'),
            'hayChain' => $materialTypes->contains('2'),
            'hayMetal' => $materialTypes->contains('3'),
            'hayPVC' => $materialTypes->contains('4'),
            'm' => $lastSlot ?? 0,
            'c' => $lastCode === '' ? '' : substr_replace($lastCode, '0', -1),
            'embedParentOrigin' => config('services.drawfence_embed.parent_origin'),
        ];
    }

    private function embeddedMaterials(Request $request): array
    {
        $materials = $request->query('materials');

        if (is_string($materials)) {
            $materials = json_decode($materials, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                abort(422, 'The materials parameter must contain valid JSON.');
            }
        }

        $materials ??= [];

        $validator = Validator::make(
            ['materials' => $materials],
            [
                'materials' => ['required', 'array', 'min:1', 'max:3'],
                'materials.*' => ['required', 'array'],
                'materials.*.code' => ['required', 'string', 'max:64', 'regex:/^[1-4][A-Za-z0-9_-]*$/'],
            ],
            [
                'materials.required' => 'Select at least one material before opening the drawing tool.',
                'materials.min' => 'Select at least one material before opening the drawing tool.',
            ]
        );

        if ($validator->fails()) {
            abort(422, $validator->errors()->first());
        }

        return $materials;
    }
}
