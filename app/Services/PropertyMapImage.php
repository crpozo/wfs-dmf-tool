<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Satellite image of a property map project for the quote (Phase 2, Feature 1):
 * Maps Static API, satellite, 640x640 at scale 2, one path per fence side in the brand
 * color (weight 5), existing walls in gray, and a marker on each gate. Requested from the
 * server with GOOGLE_MAPS_SERVER_KEY (restricted to the server IP).
 */
class PropertyMapImage
{
    private const ENDPOINT = 'https://maps.googleapis.com/maps/api/staticmap';
    private const FENCE_COLOR = '0x2E59C1FF';
    private const WALL_COLOR = '0xC4C9D6FF';
    private const GATE_COLOR = '0xFFFFFF';

    /**
     * Returns the image as a data URL, or null when it can't be generated.
     */
    public function dataUrl(array $project): ?string
    {
        $url = $this->url($project);
        if ($url === null) {
            return null;
        }

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
        $runs = $project['runs'] ?? [];
        if (blank($key) || count($vertices) < 2 || empty($runs)) {
            return null;
        }

        [$center, $zoom] = $this->frame($vertices);
        $params = [
            'size=640x640',
            'scale=2',
            'maptype=satellite',
            'format=jpg',
            sprintf('center=%.6f,%.6f', $center['lat'], $center['lng']),
            'zoom='.$zoom,
        ];

        foreach ($runs as $run) {
            $from = $vertices[$run['from'] ?? -1] ?? null;
            $to = $vertices[$run['to'] ?? -1] ?? null;
            if (! $from || ! $to) {
                continue;
            }
            $color = ! empty($run['is_existing_wall']) ? self::WALL_COLOR : self::FENCE_COLOR;
            $params[] = 'path='.rawurlencode("color:{$color}|weight:5|enc:".$this->encodePolyline([$from, $to]));

            foreach ($run['gates'] ?? [] as $gate) {
                $t = min(1, max(0, (float) ($gate['t'] ?? 0.5)));
                $lat = $from['lat'] + ($to['lat'] - $from['lat']) * $t;
                $lng = $from['lng'] + ($to['lng'] - $from['lng']) * $t;
                $label = ($gate['type'] ?? '') === 'double' ? 'D' : 'G';
                $params[] = 'markers='.rawurlencode(sprintf('size:mid|color:%s|label:%s|%.6f,%.6f', self::GATE_COLOR, $label, $lat, $lng));
            }
        }

        $params[] = 'key='.rawurlencode($key);
        $pathAndQuery = '/maps/api/staticmap?'.implode('&', $params);

        return self::ENDPOINT.'?'.implode('&', $params).$this->signature($pathAndQuery);
    }

    /*
     * Center and zoom so the fence fills about 75% of the image. Without them Google
     * frames the paths loosely and a backyard fence ends up tiny.
     */
    private function frame(array $vertices): array
    {
        $lats = array_column($vertices, 'lat');
        $lngs = array_column($vertices, 'lng');
        $center = [
            'lat' => (min($lats) + max($lats)) / 2,
            'lng' => (min($lngs) + max($lngs)) / 2,
        ];

        $cosLat = cos(deg2rad($center['lat']));
        $spanMeters = max(
            (max($lats) - min($lats)) * 110540,
            (max($lngs) - min($lngs)) * 111320 * $cosLat,
            1
        );

        // Web Mercator: meters per pixel at zoom z is 156543.03392 * cos(lat) / 2^z (640 px wide).
        $zoom = (int) floor(log((156543.03392 * $cosLat * 640 * 0.75) / $spanMeters, 2));

        return [$center, max(15, min(20, $zoom))];
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

    // Google's encoded polyline format.
    private function encodePolyline(array $points): string
    {
        $encoded = '';
        $previousLat = 0;
        $previousLng = 0;

        foreach ($points as $point) {
            $lat = (int) round($point['lat'] * 1e5);
            $lng = (int) round($point['lng'] * 1e5);
            $encoded .= $this->encodeValue($lat - $previousLat).$this->encodeValue($lng - $previousLng);
            $previousLat = $lat;
            $previousLng = $lng;
        }

        return $encoded;
    }

    private function encodeValue(int $value): string
    {
        $value = $value < 0 ? ~($value << 1) : ($value << 1);
        $chunk = '';
        while ($value >= 0x20) {
            $chunk .= chr((0x20 | ($value & 0x1f)) + 63);
            $value >>= 5;
        }

        return $chunk.chr($value + 63);
    }
}
