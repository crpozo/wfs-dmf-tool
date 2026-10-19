<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SyncOdooQuoteSentAt extends Command
{
    protected $signature = 'quote-requests:sync-odoo-sent-at';
    protected $description = 'Sync sent_at for quote requests from Odoo';

    public function handle(): int
    {
        app(\App\Http\Controllers\QuoteRequestController::class)->syncAllOdooSentAt();

        $this->info('Quote request sent_at sync completed.');

        return self::SUCCESS;
    }

}
