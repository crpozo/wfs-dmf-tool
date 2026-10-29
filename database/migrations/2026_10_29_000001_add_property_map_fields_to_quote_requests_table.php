<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Property map quotes (Phase 2, Feature 1): the map project the quote was drawn on and
 * the S3 key of its satellite image. Both stay null for quotes drawn on the canvas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quote_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('quote_requests', 'map_data')) {
                $table->json('map_data')->nullable();
            }

            if (!Schema::hasColumn('quote_requests', 'sketch_image_path')) {
                $table->string('sketch_image_path')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('quote_requests', function (Blueprint $table) {
            if (Schema::hasColumn('quote_requests', 'sketch_image_path')) {
                $table->dropColumn('sketch_image_path');
            }

            if (Schema::hasColumn('quote_requests', 'map_data')) {
                $table->dropColumn('map_data');
            }
        });
    }
};
