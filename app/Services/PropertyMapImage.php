<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Satellite image of a property map project for the quote (Phase 2, Feature 1):
 * Maps Static API, satellite, scale 2, framed on the fence. The photo carries no drawing:
 * the browser draws the fence, gates, corners and labels over it (quote-image.js) with the
 * same projection, so they cannot drift apart. (Paths drawn by Google are rounded to
 * 1e-5 degrees, about 3.6 ft, which showed as lines off their corners.) Requested from
 * the server with GOOGLE_MAPS_SERVER_KEY (restricted to the server IP).
 */
class PropertyMapImage
{
    private const ENDPOINT = 'https://maps.googleapis.com/maps/api/staticmap';
    private const MIN_ZOOM = 15;
    // Google's pixels (before scale=2). Below 200 the logo and attribution no longer fit well.
    private const MIN_SIZE = 200;
    private const MAX_SIZE = 640;
    // Share of the image the fence takes; the rest is room for the labels beside it.
    private const FILL = 0.72;
    // The shorter edge of the image is at least this share of the longer one.
    private const MIN_ASPECT = 0.75;

    /**
     * Returns the image as a data URL, or null when it can't be generated.
     */
    public function dataUrl(array $project): ?string
    {
        $url = $this->url($project);

        return $url === null ? null : $this->fetch($url);
    }

    /**
     * Plain satellite photo for the ground of the 3D view: 640x640 at scale 2 (1280 px),
     * centered on a point, no paths or markers. Returns the JPEG bytes, or null. The 3D
     * view maps it onto the lot with the Web Mercator scale of that zoom, so the photo
     * keeps its true proportions.
     */
    public function ground(float $lat, float $lng, int $zoom): ?string
    {
        $key = config('services.google_maps.server_key');
        if (blank($key)) {
            return null;
        }

        $params = [
            'size=640x640',
            'scale=2',
            'maptype=satellite',
            'format=jpg',
            sprintf('center=%.6f,%.6f', $lat, $lng),
            'zoom='.$zoom,
            'key='.rawurlencode($key),
        ];
        $pathAndQuery = '/maps/api/staticmap?'.implode('&', $params);
        $dataUrl = $this->fetch(self::ENDPOINT.'?'.implode('&', $params).$this->signature($pathAndQuery));

        return $dataUrl === null ? null : base64_decode(substr($dataUrl, strpos($dataUrl, ',') + 1));
    }

    private function fetch(string $url): ?string
    {
        try {
            $response = Http::timeout(20)->get($url);
        } catch (\Throwable $exception) {
            Log::warning('Property map image request failed.', ['exception' => $exception->getMessage()]);
            return null;
        }

        $type = strtolower((string) $response->header('Content-Type'));
        if (! $response->successful() || ! str_starts_with($type, 'image/')) {
            // Google answers errors (bad key, IP not allowed) with a 403 and a text body.
            Log::warning('Property map image was rejected by the Maps Static API.', [
                'status' => $response->status(),
                'body' => mb_substr($response->body(), 0, 300),
            ]);
            return null;
        }

        return 'data:'.strtok($type, ';').';base64,'.base64_encode($response->body());
    }

    public function url(array $project): ?string
    {
        $key = config('services.google_maps.server_key');
        $vertices = $project['vertices'] ?? [];
        if (blank($key) || count($vertices) < 2 || empty($project['runs'] ?? [])) {
            return null;
        }

        [$center, $zoom, $size] = $this->frame($vertices);
        $params = [
            sprintf('size=%dx%d', $size['width'], $size['height']),
            'scale=2',
            'maptype=satellite',
            'format=jpg',
            sprintf('center=%.6f,%.6f', $center['lat'], $center['lng']),
            'zoom='.$zoom,
            'key='.rawurlencode($key),
        ];
        $pathAndQuery = '/maps/api/staticmap?'.implode('&', $params);

        return self::ENDPOINT.'?'.implode('&', $params).$this->signature($pathAndQuery);
    }

    /*
     * What to ask Google for so the fence takes about 72% of the photo: the center, the
     * zoom and the size of the image (in Google's pixels, before scale=2).
     *
     * Static Maps only has whole zoom levels, so a fixed 640x640 image leaves a typical
     * backyard at a quarter of the picture and the rest shows the neighbours. Instead the
     * closest zoom that still holds the fence is used and the image is asked smaller,
     * following the shape of the fence. Google places its logo and attribution on the
     * image it returns, whatever its size, and the browser scales the whole image up
     * evenly, so both stay on it and no geometry is distorted.
     *
     * Everything is computed in Web Mercator pixels, exactly like the browser does
     * (resources/js/property-map/geometry.js).
     */
    public function frame(array $vertices): array
    {
        $xs = [];
        $ys = [];
        foreach ($vertices as $vertex) {
            [$xs[], $ys[]] = $this->worldPoint((float) $vertex['lat'], (float) $vertex['lng']);
        }

        // Rounded like the center= parameter, so the browser draws on the same pixels.
        $center = $this->latLng((min($xs) + max($xs)) / 2, (min($ys) + max($ys)) / 2);
        $center = ['lat' => round($center['lat'], 6), 'lng' => round($center['lng'], 6)];

        $spanX = max($xs) - min($xs);
        $spanY = max($ys) - min($ys);
        $maxZoom = max(self::MIN_ZOOM, min(21, (int) config('services.google_maps.static_max_zoom', 20)));

        for ($zoom = $maxZoom; $zoom > self::MIN_ZOOM; $zoom--) {
            if (max($spanX, $spanY) * 2 ** $zoom <= self::MAX_SIZE * self::FILL) {
                break;
            }
        }

        $width = $this->side($spanX * 2 ** $zoom);
        $height = $this->side($spanY * 2 ** $zoom);
        // A long, thin fence still gets an image with room for its labels.
        $width = max($width, (int) ceil($height * self::MIN_ASPECT));
        $height = max($height, (int) ceil($width * self::MIN_ASPECT));

        return [$center, $zoom, ['width' => $width, 'height' => $height]];
    }

    private function side(float $fencePixels): int
    {
        return (int) max(self::MIN_SIZE, min(self::MAX_SIZE, ceil($fencePixels / self::FILL)));
    }

    // Web Mercator at zoom 0 (the world is 256 pixels wide).
    private function worldPoint(float $lat, float $lng): array
    {
        $sin = sin(deg2rad($lat));

        return [
            ($lng + 180) / 360 * 256,
            (0.5 - log((1 + $sin) / (1 - $sin)) / (4 * M_PI)) * 256,
        ];
    }

    private function latLng(float $x, float $y): array
    {
        return [
            'lat' => rad2deg(atan(sinh(M_PI * (1 - 2 * $y / 256)))),
            'lng' => $x / 256 * 360 - 180,
        ];
    }

    // https://developers.google.com/maps/documentation/maps-static/digital-signature
    private function signature(string $pathAndQuery): string
    {
        $secret = config('services.google_maps.signing_secret');
        if (blank($secret)) {
            return '';
        }

        $key = base64_decode(strtr($secret, '-_', '+/'));
        $signature = strtr(base64_encode(hash_hmac('sha1', $pathAndQuery, $key, true)), '+/', '-_');

        return '&signature='.$signature;
    }
}
