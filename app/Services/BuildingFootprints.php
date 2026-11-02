<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * House footprint for the 3D view (Phase 2, Feature 1).
 *
 * Source: FEMA USA Structures, a public ArcGIS feature service with building outlines
 * nationwide (residential coverage verified in Lee and Charlotte counties). Results are
 * cached for 30 days per area, so a customer reopening the 3D view does not query again.
 */
class BuildingFootprints
{
    private const SERVICE = 'https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/USA_Structures_View/FeatureServer/0/query';
    private const SEARCH_MARGIN_METERS = 25;
    // An open fence end this close to a building's walls is taken as attached to it.
    private const ANCHOR_METERS = 6;

    /**
     * The house the fence belongs to, as ['outline' => [[lat, lng], ...], 'height_ft' => float,
     * 'occupancy' => FEMA OCC_CLS (Residential, Commercial, ...) or null, 'use' => PRIM_OCC
     * or null], or null when there is none.
     *
     * Picks the largest building whose center is inside the fence (when the fence is a
     * closed shape). An open fence usually starts and ends on the house walls, so it takes
     * the building whose outline is nearest its two end points; this keeps a side-yard
     * fence from picking the neighbor's house when the drawing's middle falls closer to
     * it. Otherwise, the building closest to the middle of the fence.
     */
    public function houseFor(array $vertices, bool $closed): ?array
    {
        if (count($vertices) < 2) {
            return null;
        }

        $buildings = $this->buildingsAround($vertices);
        if (empty($buildings)) {
            return null;
        }

        if ($closed && count($vertices) >= 3) {
            $inside = array_values(array_filter($buildings, fn ($building) => $this->contains($vertices, $building['center'])));
            if ($inside) {
                usort($inside, fn ($a, $b) => $b['area'] <=> $a['area']);
                return $this->result($this->mostDetailed($inside[0], $buildings));
            }
        }

        if (! $closed) {
            $anchored = $this->anchoredTo($vertices[0], $vertices[count($vertices) - 1], $buildings);
            if ($anchored) {
                return $this->result($this->mostDetailed($anchored, $buildings));
            }
        }

        $middle = $this->center($vertices);
        usort($buildings, fn ($a, $b) => $this->distance($a['center'], $middle) <=> $this->distance($b['center'], $middle));

        return $this->distance($buildings[0]['center'], $middle) <= 60
            ? $this->result($this->mostDetailed($buildings[0], $buildings))
            : null;
    }

    /*
     * The building whose walls are nearest both ends of an open fence (sum of the two
     * distances), or null when no building has an end within ANCHOR_METERS of its walls.
     */
    private function anchoredTo(array $start, array $end, array $buildings): ?array
    {
        $best = null;
        $bestScore = INF;
        foreach ($buildings as $building) {
            $toStart = $this->distanceToOutline($start, $building['outline']);
            $toEnd = $this->distanceToOutline($end, $building['outline']);
            if (min($toStart, $toEnd) > self::ANCHOR_METERS) {
                continue;
            }
            if ($toStart + $toEnd < $bestScore) {
                $bestScore = $toStart + $toEnd;
                $best = $building;
            }
        }

        return $best;
    }

    // Distance in meters from a point to the nearest edge of an outline.
    private function distanceToOutline(array $point, array $outline): float
    {
        $cosLat = cos(deg2rad($point['lat']));
        $toXY = fn ($p) => [($p['lng'] - $point['lng']) * 111320 * $cosLat, ($p['lat'] - $point['lat']) * 110540];
        $nearest = INF;
        $count = count($outline);
        for ($i = 0; $i < $count; $i++) {
            [$ax, $ay] = $toXY($outline[$i]);
            [$bx, $by] = $toXY($outline[($i + 1) % $count]);
            $dx = $bx - $ax;
            $dy = $by - $ay;
            $lengthSquared = $dx * $dx + $dy * $dy;
            $t = $lengthSquared > 0 ? max(0, min(1, -($ax * $dx + $ay * $dy) / $lengthSquared)) : 0;
            $nearest = min($nearest, hypot($ax + $dx * $t, $ay + $dy * $t));
        }

        return $nearest;
    }

    /*
     * The service often has the same house twice, from different sources: a plain
     * rectangle and a traced outline. Prefer the one with more corners.
     */
    private function mostDetailed(array $chosen, array $buildings): array
    {
        foreach ($buildings as $building) {
            if ($this->distance($building['center'], $chosen['center']) < 6
                && count($building['outline']) > count($chosen['outline'])) {
                $chosen = $building;
            }
        }

        return $chosen;
    }

    private function buildingsAround(array $vertices): array
    {
        $lats = array_column($vertices, 'lat');
        $lngs = array_column($vertices, 'lng');
        $marginLat = self::SEARCH_MARGIN_METERS / 110540;
        $marginLng = self::SEARCH_MARGIN_METERS / (111320 * cos(deg2rad(array_sum($lats) / count($lats))));
        $envelope = [
            round(min($lngs) - $marginLng, 5), round(min($lats) - $marginLat, 5),
            round(max($lngs) + $marginLng, 5), round(max($lats) + $marginLat, 5),
        ];

        // v2: entries also carry OCC_CLS and PRIM_OCC.
        $cacheKey = 'footprints:v2:'.implode(',', $envelope);
        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return $cached;
        }

        $buildings = $this->query($envelope);
        if ($buildings !== null) {
            // Only answers are cached; a failed request is retried next time.
            Cache::put($cacheKey, $buildings, now()->addDays(30));
        }

        return $buildings ?? [];
    }

    // Buildings intersecting the envelope [minLng, minLat, maxLng, maxLat], or null on failure.
    private function query(array $envelope): ?array
    {
        try {
            $response = Http::timeout(15)->get(self::SERVICE, [
                'geometry' => implode(',', $envelope),
                'geometryType' => 'esriGeometryEnvelope',
                'inSR' => 4326,
                'spatialRel' => 'esriSpatialRelIntersects',
                'outFields' => 'OCC_CLS,PRIM_OCC,HEIGHT,SQMETERS',
                'returnGeometry' => 'true',
                'outSR' => 4326,
                // No resultRecordCount: this service rejects it (HTTP 400) without orderByFields.
                'f' => 'geojson',
            ]);
        } catch (\Throwable $exception) {
            Log::warning('Building footprints request failed.', ['exception' => $exception->getMessage()]);
            return null;
        }

        // ArcGIS reports query errors with HTTP 200 and an "error" member.
        if (! $response->successful() || $response->json('error')) {
            Log::warning('Building footprints service answered with an error.', [
                'status' => $response->status(),
                'error' => $response->json('error.details') ?? $response->json('error.message'),
            ]);
            return null;
        }

        $buildings = [];
        foreach ($response->json('features') ?? [] as $feature) {
            $ring = $feature['geometry']['coordinates'][0] ?? null;
            if (($feature['geometry']['type'] ?? '') !== 'Polygon' || ! is_array($ring) || count($ring) < 4) {
                continue;
            }
            $outline = array_map(fn ($point) => ['lat' => (float) $point[1], 'lng' => (float) $point[0]], $ring);
            $buildings[] = [
                'outline' => $outline,
                'center' => $this->center($outline),
                'area' => (float) ($feature['properties']['SQMETERS'] ?? 0),
                'height' => $feature['properties']['HEIGHT'] ?? null,
                'occupancy' => $feature['properties']['OCC_CLS'] ?? null,
                'use' => $feature['properties']['PRIM_OCC'] ?? null,
            ];
        }

        return $buildings;
    }

    private function result(array $building): array
    {
        // HEIGHT is in meters and often missing; a one-story Florida home is about 11 ft.
        $height = is_numeric($building['height']) && $building['height'] >= 2.5 && $building['height'] <= 15
            ? round($building['height'] * 3.28084, 1)
            : 11.0;

        return [
            'outline' => array_map(fn ($point) => [$point['lat'], $point['lng']], $building['outline']),
            'height_ft' => $height,
            'occupancy' => is_string($building['occupancy'] ?? null) ? $building['occupancy'] : null,
            'use' => is_string($building['use'] ?? null) ? $building['use'] : null,
        ];
    }

    private function center(array $points): array
    {
        return [
            'lat' => array_sum(array_column($points, 'lat')) / count($points),
            'lng' => array_sum(array_column($points, 'lng')) / count($points),
        ];
    }

    // Planar distance in meters; fine at the size of a lot.
    private function distance(array $a, array $b): float
    {
        $dy = ($a['lat'] - $b['lat']) * 110540;
        $dx = ($a['lng'] - $b['lng']) * 111320 * cos(deg2rad($a['lat']));

        return sqrt($dx * $dx + $dy * $dy);
    }

    // Ray casting point-in-polygon.
    private function contains(array $polygon, array $point): bool
    {
        $inside = false;
        $count = count($polygon);
        for ($i = 0, $j = $count - 1; $i < $count; $j = $i++) {
            $a = $polygon[$i];
            $b = $polygon[$j];
            if ((($a['lat'] > $point['lat']) !== ($b['lat'] > $point['lat']))
                && ($point['lng'] < ($b['lng'] - $a['lng']) * ($point['lat'] - $a['lat']) / ($b['lat'] - $a['lat']) + $a['lng'])) {
                $inside = ! $inside;
            }
        }

        return $inside;
    }
}
