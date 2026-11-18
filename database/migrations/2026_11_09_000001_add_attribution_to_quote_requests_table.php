<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Campaign data (UTM, click IDs, landing page and referrer) of each public quote.
 * Stays null when the visitor has none.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quote_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('quote_requests', 'attribution')) {
                $table->json('attribution')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('quote_requests', function (Blueprint $table) {
            if (Schema::hasColumn('quote_requests', 'attribution')) {
                $table->dropColumn('attribution');
            }
        });
    }
};
