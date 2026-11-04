<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Links a quote request to the property map it was drawn on (Phase 2, Feature 1).
 *
 * When the materials list came from the map, the quote keeps the map project
 * (quote_requests.map_data) and its satellite image, which is the image the browser
 * sends as canvas_image, stored in S3 (quote_requests.sketch_image_path). Odoo and the
 * sales email get the same image.
 */
class PropertyMapQuote
{
    public const SESSION_PROJECT = 'property_map_project';
    public const SESSION_SKETCH_HASH = 'property_map_sketch_hash';

    public static function remember(array $project, string $sketchJson): void
    {
        session([
            self::SESSION_PROJECT => $project,
            self::SESSION_SKETCH_HASH => md5($sketchJson),
        ]);
    }

    /**
     * True only when the last materials list came from the map. If the customer switched
     * to the classic canvas and estimated again, session('sketch') no longer matches.
     */
    public function isMapQuote(): bool
    {
        $sketch = session('sketch');

        return is_array(session(self::SESSION_PROJECT))
            && is_string($sketch)
            && session(self::SESSION_SKETCH_HASH) === md5($sketch);
    }

    /**
     * Fields to merge into the new quote request.
     */
    public function quoteFields(?string $imageDataUrl, $odooId = null): array
    {
        return [
            'map_data' => session(self::SESSION_PROJECT),
            'sketch_image_path' => $imageDataUrl ? $this->storeImage($imageDataUrl, $odooId) : null,
        ];
    }

    public function forget(): void
    {
        session()->forget([self::SESSION_PROJECT, self::SESSION_SKETCH_HASH]);
    }

    // A failed upload must not stop the quote: Odoo already has the image.
    private function storeImage(string $dataUrl, $odooId): ?string
    {
        if (! preg_match('/^data:image\/(jpeg|png);base64,(.+)$/s', trim($dataUrl), $matches)) {
            return null;
        }

        $binary = base64_decode(preg_replace('/\s+/', '', $matches[2]), true);
        if ($binary === false || $binary === '') {
            return null;
        }

        $extension = $matches[1] === 'jpeg' ? 'jpg' : 'png';
        $name = $odooId ? "odoo-{$odooId}-".Str::lower((string) Str::ulid()) : Str::lower((string) Str::ulid());
        $path = 'quotes/'.now()->format('Y/m').'/'.$name.'.'.$extension;

        try {
            Storage::disk('quote_images')->put($path, $binary, [
                'ContentType' => $matches[1] === 'jpeg' ? 'image/jpeg' : 'image/png',
            ]);

            return $path;
        } catch (\Throwable $exception) {
            Log::warning('Property map quote image could not be stored in S3.', [
                'path' => $path,
                'exception' => $exception->getMessage(),
            ]);

            return null;
        }
    }
}
