<?php

namespace Tests\Feature;

use App\Services\PropertyMapQuote;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * POST /property-map/snapshot: the photo for the quote image and what the browser needs
 * to draw the fence on it. Google is faked; nothing leaves the test.
 */
class PropertyMapSnapshotTest extends TestCase
{
    private array $project;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.google_maps.server_key' => 'test-server-key', 'services.google_maps.signing_secret' => null]);
        $scenarios = json_decode(file_get_contents(__DIR__.'/../fixtures/property-map-scenarios.json'), true);
        $this->project = $scenarios['A-rectangle-two-gates']['project'];
    }

    private function withMapQuote(): static
    {
        $sketch = json_encode([['id' => 'concrete', 'value' => false]]);

        return $this->withSession([
            'sketch' => $sketch,
            PropertyMapQuote::SESSION_PROJECT => $this->project,
            PropertyMapQuote::SESSION_SKETCH_HASH => hash('sha256', $sketch),
        ]);
    }

    public function test_it_needs_the_materials_list_of_a_map_drawing_first(): void
    {
        Http::fake();

        $this->postJson('/property-map/snapshot')->assertStatus(409);
        Http::assertNothingSent();
    }

    public function test_it_returns_the_plain_photo_with_its_frame_and_the_drawing(): void
    {
        Http::fake(['maps.googleapis.com/*' => Http::response('jpeg-bytes', 200, ['Content-Type' => 'image/jpeg'])]);

        $response = $this->withMapQuote()->postJson('/property-map/snapshot')->assertOk();

        $response->assertJsonPath('image', 'data:image/jpeg;base64,'.base64_encode('jpeg-bytes'));
        $response->assertJsonPath('frame.zoom', 20);
        $response->assertJsonPath('frame.size', ['width' => 200, 'height' => 255]);
        $response->assertJsonPath('project.runs.0.gates.0.width_ft', 4);
        $this->assertEqualsWithDelta(26.64071, $response->json('frame.center.lat'), 0.0001);

        Http::assertSentCount(1);
        Http::assertSent(function (Request $request) {
            return str_contains($request->url(), 'size=200x255')
                && str_contains($request->url(), 'maptype=satellite')
                && ! str_contains($request->url(), 'path=');
        });
    }

    public function test_it_answers_502_when_google_refuses_so_the_browser_sends_the_plan(): void
    {
        Http::fake(['maps.googleapis.com/*' => Http::response('The provided API key is invalid.', 403, ['Content-Type' => 'text/plain'])]);

        $this->withMapQuote()->postJson('/property-map/snapshot')->assertStatus(502);
    }
}
