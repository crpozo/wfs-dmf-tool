<?php

namespace App\Http\Controllers;

use App\Models\Step;
use App\Models\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StepController extends Controller
{
    // Rebuild JSON from DB
    public function exportBranch()
    {
        // Load all steps and responses into memory
        $steps = Step::all()->keyBy('id')->toArray();
        $responses = Response::where('active', true)->orderBy('id')->get()->toArray();

        // Group responses by their parent step_id
        $responsesByStep = collect($responses)->groupBy('step_id')->toArray();

        // Assume root step is '1' (you can adjust this or detect roots)
        $rootId = '3';

        $tree = $this->buildTree($rootId, $steps, $responsesByStep);

        return response()->json($tree, 200, [], JSON_PRETTY_PRINT);
    }

    public function exportJson()
    {
        // Load everything once for efficiency
        $steps = Step::all()->keyBy('id')->toArray();
        $responses = Response::where('active', true)->orderBy('id')->get()->toArray(); // include only active
        $responsesByStep = collect($responses)->groupBy('step_id')->toArray();

        // 🔹 Root IDs we want to export
        $rootIds = ['1', '2', '3', '4'];

        // 🔹 Build each tree individually
        $forest = [];
        foreach ($rootIds as $rootId) {
            if (isset($steps[$rootId])) {
                $forest[$rootId] = $this->buildTree($rootId, $steps, $responsesByStep);
            }
        }

        // ✅ Return all four trees in one JSON object
        return response()->json($forest, 200, [], JSON_PRETTY_PRINT);
    }

    private function buildTree($stepId, $steps, $responsesByStep)
    {
        if (!isset($steps[$stepId])) {
            return null;
        }

        $step = $steps[$stepId];
        $node = [
            'id' => $step['id'],
            'name' => $step['name']
        ];

        // Optional step properties
        foreach (['type', 'input', 'img', 'text', 'color', 'background'] as $key) {
            if (!empty($step[$key])) {
                $node[$key] = $step[$key];
            }
        }
        if (!empty($step['special_order'])) {
            $node['special_order'] = (bool)$step['special_order'];
        }

        // Add responses if any
        if (isset($responsesByStep[$stepId])) {
            $node['responses'] = [];
            foreach ($responsesByStep[$stepId] as $r) {
                $rNode = [
                    'id' => $r['id'],
                    'name' => $r['name']
                ];
                foreach (['color', 'img'] as $key) {
                    if (!empty($r[$key])) {
                        $rNode[$key] = $r[$key];
                    }
                }
                if (!empty($r['special_order'])) {
                    $rNode['special_order'] = (bool)$r['special_order'];
                }

                // Recursively attach next step if exists
                if (!empty($r['next_id'])) {
                    $rNode['next'] = $this->buildTree($r['next_id'], $steps, $responsesByStep);
                }

                // Store response using its ID as key (like in original JSON)
                $node['responses'][$r['id']] = $rNode;
            }
        }

        // Recursively add the "next" step in the main flow
        if (!empty($step['next_id'])) {
            $node['next'] = $this->buildTree($step['next_id'], $steps, $responsesByStep);
        }

        return $node;
    }

    // Compare DB and JSON files
    public function compareJson(Request $request)
    {
        $dbJson = json_encode($this->exportJson()->getData(true));

        $jsonPath = $request->file('json')
            ? $request->file('json')->getRealPath()
            : base_path('resources/steps.json');
        $fileJson = file_get_contents($jsonPath);

        return response()->json([
            'match' => md5($dbJson) === md5($fileJson),
            'db_md5' => md5($dbJson),
            'file_md5' => md5($fileJson)
        ]);
    }

    public function importJson(Request $request)
    {
        $jsonPath = $request->file('json')
            ? $request->file('json')->getRealPath()
            : base_path('resources/steps.json');

        $json = file_get_contents($jsonPath);
        $data = json_decode($json, true);

        // Trackers and counters
        $this->stepCount = 0;
        $this->responseCount = 0;
        $this->pendingStepNext = [];
        $this->pendingResponseNext = [];
        $this->importedSteps = [];
        $this->importedResponses = [];

        DB::transaction(function () use ($data) {
            //Step::truncate();
            //Response::truncate();

            // Pass 1 – insert all without next_id
            foreach ($data as $rootNode) {
                if($rootNode['id'] == '2') {
                    $this->importNode($rootNode, null);
                }
            }

            // Pass 2 – update next_id references
            foreach ($this->pendingStepNext as $stepId => $nextId) {
                Step::where('id', $stepId)->update(['next_id' => $nextId]);
            }

            foreach ($this->pendingResponseNext as $respId => $nextId) {
                Response::where('id', $respId)->update(['next_id' => $nextId]);
            }
        });

        return response()->json([
            'message' => '✅ Import completed successfully',
            'steps_inserted' => $this->stepCount,
            'responses_inserted' => $this->responseCount,
        ]);
    }

    private function importNode(array $node, ?string $parentId = null)
    {
        // Skip already imported steps
        if (isset($this->importedSteps[$node['id']])) {
            return;
        }
        $this->importedSteps[$node['id']] = true;

        Step::create([
            'id' => $node['id'],
            'name' => $node['name'],
            'type' => $node['type'] ?? null,
            'input' => $node['input'] ?? null,
            'img' => $node['img'] ?? null,
            'text' => $node['text'] ?? null,
            'color' => $node['color'] ?? null,
            'background' => $node['background'] ?? null,
            'special_order' => $node['special_order'] ?? false,
            'parent_id' => $parentId,
            'next_id' => null,
        ]);
        $this->stepCount++;

        if (!empty($node['next']['id'])) {
            $this->pendingStepNext[$node['id']] = $node['next']['id'];
        }

        if (!empty($node['responses'])) {
            foreach ($node['responses'] as $r) {

                // Skip already imported responses
                if (isset($this->importedResponses[$r['id']])) {
                    continue;
                }
                $this->importedResponses[$r['id']] = true;

                Response::create([
                    'id' => $r['id'],
                    'step_id' => $node['id'],
                    'name' => $r['name'],
                    'color' => $r['color'] ?? null,
                    'img' => $r['img'] ?? null,
                    'special_order' => $r['special_order'] ?? false,
                    'next_id' => null,
                ]);
                $this->responseCount++;

                if (!empty($r['next']['id'])) {
                    $this->pendingResponseNext[$r['id']] = $r['next']['id'];
                }

                if (!empty($r['next'])) {
                    $this->importNode($r['next'], $node['id']);
                }
            }
        }

        if (!empty($node['next']) && empty($node['responses'])) {
            $this->importNode($node['next'], $node['id']);
        }
    }

    public function duplicateBranch(Request $request)
    {
        $oldPrefix = $request->query('old');
        $newPrefix = $request->query('new');
        $newName   = $request->query('name');

        if (!$oldPrefix || !$newPrefix || !$newName) {
            return response()->json([
                'error' => 'Missing required parameters: old, new, name'
            ], 400);
        }

        DB::transaction(function () use ($oldPrefix, $newPrefix, $newName) {
            // 1️⃣ Duplicate steps
            DB::statement("
            INSERT INTO wfs.steps (id, name, type, input, img, text, color, background, special_order, parent_id, next_id, created_at, updated_at)
            SELECT
                REPLACE(id, ?, ?) AS id,
                name,
                type,
                input,
                img,
                text,
                color,
                background,
                special_order,
                REPLACE(parent_id, ?, ?) AS parent_id,
                next_id,
                NOW(),
                NOW()
            FROM wfs.steps
            WHERE id LIKE ?
        ", [$oldPrefix, $newPrefix, $oldPrefix, $newPrefix, $oldPrefix . '%']);

            // 2️⃣ Duplicate responses
            DB::statement("
            INSERT INTO wfs.responses (id, step_id, name, color, img, special_order, next_id, created_at, updated_at, active)
            SELECT
                REPLACE(id, ?, ?) AS id,
                REPLACE(step_id, ?, ?) AS step_id,
                name,
                color,
                img,
                special_order,
                REPLACE(next_id, ?, ?) AS next_id,
                NOW(),
                NOW(),
                active
            FROM wfs.responses
            WHERE id LIKE ?
        ", [$oldPrefix, $newPrefix, $oldPrefix, $newPrefix, $oldPrefix, $newPrefix, $oldPrefix . '%']);

            // 3️⃣ Update the name of the root response
            DB::table('wfs.responses')
                ->where('id', $newPrefix)
                ->update(['name' => $newName]);
        });

        return response()->json([
            'message' => "✅ Branch {$oldPrefix} duplicated to {$newPrefix} with name '{$newName}' successfully."
        ]);
    }

    public function getLeaves()
    {
        // Load everything
        $steps = Step::all()->keyBy('id');
        $responses = Response::where('active', true)->get()->keyBy('id');

        // Get only leaves (responses that do not lead anywhere)
        $leafResponses = $responses->whereNull('next_id');

        $result = [];

        foreach ($leafResponses as $leaf) {
            $pathParts = [];

            // progressively reduce id from left to right
            for ($len = 1; $len <= strlen($leaf->id); $len++) {
                $prefix = substr($leaf->id, 0, $len);

                // add step name for first level only
                if ($len === 1 && isset($steps[$prefix])) {
                    $pathParts[] = $steps[$prefix]->name;
                }

                // add response name if it exists
                if (isset($responses[$prefix])) {
                    $pathParts[] = $responses[$prefix]->name;
                }
            }

            // store final path
            $result[$leaf->id] = implode(' / ', $pathParts);
        }

        return response()->json($result, 200, [], JSON_PRETTY_PRINT);
    }


}
