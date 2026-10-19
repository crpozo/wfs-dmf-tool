<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quote_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('quote_requests', 'fulfillment_method')) {
                $table->string('fulfillment_method', 20)->default('pickup')->after('ref');
            }

            if (!Schema::hasColumn('quote_requests', 'pickup_location_id')) {
                $table->unsignedSmallInteger('pickup_location_id')->nullable()->after('fulfillment_method');
            }
        });
    }

    public function down(): void
    {
        Schema::table('quote_requests', function (Blueprint $table) {
            if (Schema::hasColumn('quote_requests', 'pickup_location_id')) {
                $table->dropColumn('pickup_location_id');
            }

            if (Schema::hasColumn('quote_requests', 'fulfillment_method')) {
                $table->dropColumn('fulfillment_method');
            }
        });
    }
};
