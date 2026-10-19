<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class SyncOdooUserIds extends Command
{
    protected $signature = 'odoo:sync-user-ids';

    protected $description = 'Update local users.username with Odoo user id by matching email';

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
            ->whereNotNull('email')
            ->where('email', '<>', '')
            ->where('account_type', '=', 'company')
            ->pluck('email')
            ->map(fn ($email) => strtolower(trim($email)))
            ->filter()
            ->unique()
            ->values();

        if ($emails->isEmpty()) {
            $this->warn('No user emails found.');
            return self::SUCCESS;
        }

        $response = Http::withHeaders($headers)
            ->timeout(60)
            ->post($baseUrl . '/res.users/search_read', [
                'domain' => [
                    ['login', 'in', $emails->all()],
                    ['active', '=', true],
                ],
                'fields' => ['id', 'name', 'login', 'email'],
            ]);

        if ($response->failed()) {
            $this->error('Odoo API error: ' . $response->body());
            return self::FAILURE;
        }

        $odooUsers = collect($response->json());

        $usersByEmail = $odooUsers
            ->mapWithKeys(function ($user) {
                $email = strtolower(trim($user['login'] ?? $user['email'] ?? ''));

                return $email
                    ? [$email => $user]
                    : [];
            });

        $updated = 0;
        $notFound = [];

        foreach ($emails as $email) {
            $odooUser = $usersByEmail->get($email);

            if (!$odooUser) {
                $notFound[] = $email;
                continue;
            }

            DB::table('users')
                ->whereRaw('LOWER(TRIM(email)) = ?', [$email])
                ->update([
                    'username' => (string) $odooUser['id'],
                    'updated_at' => now(),
                ]);

            $updated++;

            $this->info("Updated {$email} => Odoo user ID {$odooUser['id']} ({$odooUser['name']})");
        }

        $this->newLine();
        $this->info("Finished. Updated: {$updated}");

        if (!empty($notFound)) {
            $this->newLine();
            $this->warn('Emails not found in Odoo:');
            foreach ($notFound as $email) {
                $this->line($email);
            }
        }

        return self::SUCCESS;
    }
}