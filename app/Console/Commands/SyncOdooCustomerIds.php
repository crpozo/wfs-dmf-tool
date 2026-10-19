<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class SyncOdooCustomerIds extends Command
{
    protected $signature = 'odoo:sync-customer-ids';

    protected $description = 'Update local customer users.username with Odoo customer/partner id by matching email';

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

        $emails = DB::table('users')
            ->where('account_type', 'customer')
            ->whereNotNull('email')
            ->where('email', '<>', '')
            ->pluck('email')
            ->map(fn ($email) => strtolower(trim($email)))
            ->filter()
            ->unique()
            ->values();

        if ($emails->isEmpty()) {
            $this->warn('No customer emails found.');
            return self::SUCCESS;
        }

        $response = Http::withHeaders($headers)
            ->timeout(60)
            ->post($baseUrl . '/res.partner/search_read', [
                'domain' => [
                    ['email', 'in', $emails->all()],
                    ['active', '=', true],
                    ['customer_rank', '>', 0],
                ],
                'fields' => ['id', 'name', 'email', 'customer_rank'],
            ]);

        if ($response->failed()) {
            $this->error('Odoo API error: ' . $response->body());
            return self::FAILURE;
        }

        $odooCustomers = collect($response->json());

        $customersByEmail = $odooCustomers
            ->filter(fn ($customer) => !empty($customer['email']))
            ->mapWithKeys(function ($customer) {
                $email = strtolower(trim($customer['email']));

                return [
                    $email => $customer
                ];
            });

        $updated = 0;
        $notFound = [];

        foreach ($emails as $email) {
            $odooCustomer = $customersByEmail->get($email);

            if (!$odooCustomer) {
                $notFound[] = $email;
                continue;
            }

            DB::table('users')
                ->where('account_type', 'customer')
                ->whereRaw('LOWER(TRIM(email)) = ?', [$email])
                ->update([
                    'username' => (string) $odooCustomer['id'],
                    'updated_at' => now(),
                ]);

            $updated++;

            $this->info("Updated {$email} => Odoo customer ID {$odooCustomer['id']} ({$odooCustomer['name']})");
        }

        $this->newLine();
        $this->info("Finished. Updated: {$updated}");

        if (!empty($notFound)) {
            $this->newLine();
            $this->warn('Customer emails not found in Odoo:');

            foreach ($notFound as $email) {
                $this->line($email);
            }
        }

        return self::SUCCESS;
    }
}