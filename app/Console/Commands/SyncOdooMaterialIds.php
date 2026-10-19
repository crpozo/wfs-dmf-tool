<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class SyncOdooMaterialIds extends Command
{
    protected $signature = 'odoo:sync-material-ids {--chunk=100}';

    protected $description = 'Bulk update odoo_materials.odoo_id from Odoo products using SKU';

    public function handle()
    {

        // Actualizar odoo materials por si hay nuevos SKUs
        DB::statement("
            INSERT INTO odoo_materials (sku)
            SELECT DISTINCT trim(sku)
            FROM material_options
            CROSS JOIN LATERAL unnest(ARRAY[
                option_1,
                option_2,
                option_3,
                option_4,
                option_5,
                option_6,
                option_7,
                option_8,
                option_9,
                option_10,
                option_11,
                option_12,
                option_13,
                option_14,
                option_15,
                option_16,
                option_17,
                option_18,
                option_19,
                option_20,
                option_21,
                option_22,
                option_23,
                option_24,
                option_25,
                option_26,
                option_27,
                option_28,
                option_29,
                option_30,
                option_31,
                option_32
            ]) AS sku
            WHERE sku IS NOT NULL
              AND trim(sku) <> ''
            ON CONFLICT (sku) DO NOTHING
        ");

        $this->info('Missing SKUs inserted into odoo_materials.');

        $headers = [
            'Authorization' => 'bearer ' . env('ODOO_API_KEY'),
            'Content-Type' => 'application/json',
        ];

        if (env('ODOO_DATABASE')) {
            $headers['X-Odoo-Database'] = env('ODOO_DATABASE');
        }

        $baseUrl = rtrim(env('ODOO_BASE_URL'), '/') . '/json/2';

        $chunkSize = (int) $this->option('chunk');

        $skus = DB::table('odoo_materials')
            ->whereNotNull('sku')
            ->where('sku', '<>', '')
            ->pluck('sku')
            ->map(fn ($sku) => trim($sku))
            ->filter()
            ->unique()
            ->values();

        if ($skus->isEmpty()) {
            $this->warn('No SKUs found in odoo_materials.');
            return self::SUCCESS;
        }

        $updated = 0;
        $notFound = [];

        foreach ($skus->chunk($chunkSize) as $skuChunk) {

            $this->info('Processing chunk with ' . $skuChunk->count() . ' SKUs');

            $response = Http::withHeaders($headers)
                ->timeout(60)
                ->post($baseUrl . '/product.product/search_read', [
                    'domain' => [
                        ['default_code', 'in', $skuChunk->values()->all()],
                        ['sale_ok', '=', true],
                        ['active', '=', true],
                    ],
                    'fields' => ['id', 'default_code', 'name'],
                ]);

            if ($response->failed()) {
                $this->error('Odoo API error: ' . $response->body());
                continue;
            }

            $products = collect($response->json());

            $productsBySku = $products
                ->filter(fn ($p) => !empty($p['default_code']))
                ->keyBy(fn ($p) => trim($p['default_code']));

            foreach ($skuChunk as $sku) {

                $product = $productsBySku->get($sku);

                if (!$product) {
                    $notFound[] = $sku;
                    $this->warn("Not found: {$sku}");
                    continue;
                }

                DB::table('odoo_materials')
                    ->where('sku', $sku)
                    ->update([
                        'odoo_id' => $product['id'],
                        'updated_at' => now(),
                    ]);

                $updated++;

                $this->info(
                    "Updated {$sku} => {$product['id']} ({$product['name']})"
                );
            }
        }

        $this->newLine();
        $this->info("Finished. Updated: {$updated}");

        if (!empty($notFound)) {
            $this->newLine();
            $this->warn('Not found SKUs:');
            foreach ($notFound as $sku) {
                $this->line($sku);
            }
        }

        return self::SUCCESS;
    }
}