<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('steps', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('type', 50)->nullable();
            $table->string('input', 50)->nullable();
            $table->text('img')->nullable();
            $table->text('text')->nullable();
            $table->string('color', 10)->nullable();
            $table->text('background')->nullable();
            $table->boolean('special_order')->default(false);
            $table->string('parent_id')->nullable();
            $table->string('next_id')->nullable();
            $table->timestamps();

        });
    }

    public function down(): void
    {
        Schema::dropIfExists('steps');
    }
};
