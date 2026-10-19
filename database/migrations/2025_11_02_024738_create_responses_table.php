<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('responses', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('step_id');
            $table->string('name');
            $table->string('color', 10)->nullable();
            $table->text('img')->nullable();
            $table->boolean('special_order')->default(false);
            $table->string('next_id')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('responses');
    }
};
