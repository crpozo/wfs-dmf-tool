<?php
use App\Models\Step;
use App\Models\Response;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/../vendor/autoload.php';

$json = file_get_contents('steps.json');
$data = json_decode($json, true);

DB::transaction(function() use ($data) {
    Step::truncate();
    Response::truncate();

    foreach ($data as $rootId => $rootNode) {
        importNode($rootNode, null);
    }
});

function importNode($node, $parentId = null)
{
    $step = Step::create([
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
        'next_id' => $node['next']['id'] ?? null
    ]);

    if (isset($node['responses'])) {
        foreach ($node['responses'] as $r) {
            Response::create([
                'id' => $r['id'],
                'step_id' => $step->id,
                'name' => $r['name'],
                'color' => $r['color'] ?? null,
                'img' => $r['img'] ?? null,
                'special_order' => $r['special_order'] ?? false,
                'next_id' => $r['next']['id'] ?? null
            ]);

            if (isset($r['next'])) {
                importNode($r['next'], $step->id);
            }
        }
    }

    if (isset($node['next']) && !isset($node['responses'])) {
        importNode($node['next'], $step->id);
    }
}
