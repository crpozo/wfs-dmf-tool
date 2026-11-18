<?php

namespace Tests\Unit;

use App\Services\PropertyMapImage;
use Tests\TestCase;

/**
 * Framing of the quote's satellite photo. The drawings are the ones the JavaScript and
 * browser tests use (tests/fixtures/property-map-scenarios.json); the frame stored with
 * each is what the browser tests draw on, so both sides are checked against one file.
 */
class PropertyMapImageTest extends TestCase
{
    private const FIXTURE = __DIR__.'/../fixtures/property-map-scenarios.json';

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.google_maps.server_key' => 'test-server-key',
            'services.google_maps.signing_secret' => null,
            'services.google_maps.static_max_zoom' => 20,
        ]);
    }

    public static function scenarios(): array
    {
        $cases = [];
        foreach (json_decode(file_get_contents(self::FIXTURE), true) as $name => $scenario) {
            $cases[$name] = [$scenario['project'], $scenario['frame']];
        }

        return $cases;
    }

    /**
     * @dataProvider scenarios
     */
    public function test_frame_matches_the_one_the_browser_tests_draw_on(array $project, array $expected): void
    {
        [$center, $zoom, $size] = (new PropertyMapImage())->frame($project['vertices']);

        $this->assertSame($expected, ['center' => $center, 'zoom' => $zoom, 'size' => $size]);
    }

    /**
     * @dataProvider scenarios
     */
    public function test_the_fence_fills_the_photo_without_being_cut(array $project): void
    {
        [$center, $zoom, $size] = (new PropertyMapImage())->frame($project['vertices']);

        [$spanX, $spanY] = $this->spanInPixels($project['vertices'], $zoom);
        $fill = max($spanX / $size['width'], $spanY / $size['height']);

        // 72% is the target; the rest is room for the labels. Very small drawings are held
        // back by the smallest image and the closest zoom, never below half the photo here.
        $this->assertLessThanOrEqual(0.7201, $fill);
        $this->assertGreaterThanOrEqual(0.55, $fill);
        $this->assertGreaterThanOrEqual(200, min($size));
        $this->assertLessThanOrEqual(640, max($size));
        $this->assertGreaterThanOrEqual(0.74, min($size) / max($size));
        $this->assertGreaterThanOrEqual(15, $zoom);
        $this->assertLessThanOrEqual(20, $zoom);

        // Centred on the fence, with the precision of the center= parameter.
        $lats = array_column($project['vertices'], 'lat');
        $lngs = array_column($project['vertices'], 'lng');
        $this->assertEqualsWithDelta((min($lats) + max($lats)) / 2, $center['lat'], 2e-6);
        $this->assertEqualsWithDelta((min($lngs) + max($lngs)) / 2, $center['lng'], 2e-6);
    }

    public function test_a_typical_backyard_no_longer_sits_in_a_quarter_of_the_photo(): void
    {
        // 60 ft by 80 ft: 29% of the old fixed 640x640 photo at zoom 20.
        [, $zoom, $size] = (new PropertyMapImage())->frame(self::scenarios()['A-rectangle-two-gates'][0]['vertices']);

        $this->assertSame(20, $zoom);
        $this->assertSame(['width' => 200, 'height' => 255], $size);
    }

    public function test_zoom_21_is_used_only_when_configured(): void
    {
        $vertices = self::scenarios()['F-narrow-side-yard'][0]['vertices'];

        config(['services.google_maps.static_max_zoom' => 21]);
        [, $zoom] = (new PropertyMapImage())->frame($vertices);
        $this->assertSame(21, $zoom);

        config(['services.google_maps.static_max_zoom' => 99]);
        [, $zoom] = (new PropertyMapImage())->frame($vertices);
        $this->assertSame(21, $zoom);
    }

    public function test_a_very_large_property_zooms_out_instead_of_being_cut(): void
    {
        // About 0.6 miles across.
        $vertices = [['lat' => 26.64, 'lng' => -81.88], ['lat' => 26.649, 'lng' => -81.87]];
        [, $zoom, $size] = (new PropertyMapImage())->frame($vertices);
        [$spanX, $spanY] = $this->spanInPixels($vertices, $zoom);

        $this->assertLessThan(20, $zoom);
        $this->assertGreaterThanOrEqual($spanX / 0.72, $size['width']);
        $this->assertGreaterThanOrEqual($spanY / 0.72, $size['height']);
    }

    public function test_the_photo_is_requested_without_any_drawing_on_it(): void
    {
        $project = self::scenarios()['C-irregular-consecutive-gates'][0];
        $url = (new PropertyMapImage())->url($project);

        // Google's paths are rounded to 1e-5 degrees and drifted off the corners; the
        // browser draws the whole fence instead.
        $this->assertStringNotContainsString('path=', $url);
        $this->assertStringNotContainsString('markers=', $url);
        $this->assertStringContainsString('maptype=satellite', $url);
        $this->assertStringContainsString('scale=2', $url);
        $this->assertStringContainsString('size=201x200', $url);
        $this->assertStringContainsString('zoom=20', $url);
        $this->assertStringContainsString('key=test-server-key', $url);
        $this->assertStringNotContainsString('signature=', $url);
    }

    public function test_the_request_is_signed_when_a_secret_is_set(): void
    {
        config(['services.google_maps.signing_secret' => base64_encode('secret')]);
        $url = (new PropertyMapImage())->url(self::scenarios()['A-rectangle-two-gates'][0]);

        $this->assertMatchesRegularExpression('/&signature=[A-Za-z0-9_-]+=*$/', $url);
    }

    public function test_no_url_without_a_key_or_without_a_drawing(): void
    {
        $image = new PropertyMapImage();
        $this->assertNull($image->url(['vertices' => [['lat' => 26.64, 'lng' => -81.87]], 'runs' => []]));

        config(['services.google_maps.server_key' => null]);
        $this->assertNull($image->url(self::scenarios()['A-rectangle-two-gates'][0]));
    }

    private function spanInPixels(array $vertices, int $zoom): array
    {
        $xs = [];
        $ys = [];
        foreach ($vertices as $vertex) {
            $sin = sin(deg2rad($vertex['lat']));
            $xs[] = ($vertex['lng'] + 180) / 360 * 256 * 2 ** $zoom;
            $ys[] = (0.5 - log((1 + $sin) / (1 - $sin)) / (4 * M_PI)) * 256 * 2 ** $zoom;
        }

        return [max($xs) - min($xs), max($ys) - min($ys)];
    }
}
