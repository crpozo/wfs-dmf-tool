<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Property map projects saved by link (Phase 2, Feature 1). Anonymous: no customer data,
 * only the drawing and the fence configuration. Rows expire after 90 days and are removed
 * by `model:prune` (see App\Console\Kernel).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('saved_projects')) {
            return;
        }

        Schema::create('saved_projects', function (Blueprint $table) {
            $table->id();
            $table->ulid('token')->unique();
            $table->text('project');            // encrypted JSON of the map project
            $table->json('materials');          // fence configuration (session "materials")
            $table->timestamp('expires_at')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_projects');
    }
};
