<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    protected $commands = [
        \App\Console\Commands\SyncOdooMaterialIds::class,
    ];
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        $schedule->command('quote-requests:sync-odoo-sent-at')
            ->everyFiveMinutes()
            ->withoutOverlapping();

        // Property map projects saved by link expire after 90 days.
        $schedule->command('model:prune', ['--model' => [\App\Models\SavedProject::class]])
            ->daily();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
