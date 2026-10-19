<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $this->resizeHearAboutUsColumn(255);
    }

    public function down(): void
    {
        if (DB::table('quote_requests')
            ->whereNotNull('hear_about_us')
            ->whereRaw('CHAR_LENGTH(hear_about_us) > 30')
            ->exists()) {
            throw new RuntimeException(
                'Cannot reduce quote_requests.hear_about_us to 30 characters while longer values exist.'
            );
        }

        $this->resizeHearAboutUsColumn(30);
    }

    private function resizeHearAboutUsColumn(int $length): void
    {
        match (DB::connection()->getDriverName()) {
            'pgsql' => DB::statement(
                sprintf('ALTER TABLE "quote_requests" ALTER COLUMN "hear_about_us" TYPE VARCHAR(%d)', $length)
            ),
            'mysql', 'mariadb' => DB::statement(
                sprintf('ALTER TABLE `quote_requests` MODIFY `hear_about_us` VARCHAR(%d) NULL', $length)
            ),
            // SQLite does not enforce the declared VARCHAR length.
            'sqlite' => null,
            default => throw new RuntimeException('Unsupported database driver for resizing hear_about_us.'),
        };
    }
};
