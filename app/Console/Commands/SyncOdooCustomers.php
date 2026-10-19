<?php

namespace App\Console\Commands;

use App\Models\Customer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SyncOdooCustomers extends Command
{
    protected $signature = 'odoo:sync-customers {--limit=1000} {--offset=0}';

    protected $description = 'Sync Odoo customers into local customers table';

    public function handle()
    {
        $headers = [
            'Authorization' => 'bearer ' . env('ODOO_API_KEY'),
            'Content-Type' => 'application/json',
        ];

        if (env('ODOO_DATABASE')) {
            $headers['X-Odoo-Database'] = env('ODOO_DATABASE');
        }

        $baseUrl = rtrim(env('ODOO_BASE_URL'), '/') . '/json/2';

        $limit = (int) $this->option('limit');
        $offset = (int) $this->option('offset');

        $updated = 0;

        do {
            $response = Http::withHeaders($headers)
                ->timeout(60)
                ->post($baseUrl . '/res.partner/search_read', [
                    'domain' => [
                        ['customer_rank', '>', 0],
                        ['active', '=', true],
                        ['is_company', '=', true],
                    ],
                    'fields' => [
                        'id',
                        'name',
                        'email',
                        'phone',
                        'active',
                        'is_company',
                    ],
                    'limit' => $limit,
                    'offset' => $offset,
                    'order' => 'name asc',
                ]);

            if ($response->failed()) {
                $this->error('Odoo API error: ' . $response->body());
                return self::FAILURE;
            }

            $customers = $response->json();

            foreach ($customers as $odooCustomer) {
                Customer::updateOrCreate(
                    ['id' => $odooCustomer['id']],
                    [
                        'name' => $odooCustomer['name'] ?? '',
                        'email' => $odooCustomer['email'] ?? null,
                        'phone' => $odooCustomer['phone'] ?? null,
                        'active' => (bool) ($odooCustomer['active'] ?? true),
                        'last_synced_at' => now(),
                    ]
                );

                $updated++;
            }

            $this->info("Synced {$updated} customers...");

            $offset += $limit;

        } while (count($customers) === $limit);

        $this->info("Finished. Total synced: {$updated}");

        return self::SUCCESS;
    }
}
