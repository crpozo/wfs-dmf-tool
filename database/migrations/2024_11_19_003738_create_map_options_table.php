<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('map_options', function (Blueprint $table) {
            $table->id(); // Auto-incrementing primary key
            $table->integer('material'); // Material as integer
            $table->string('name', 20); // Name as varchar(20)
            $table->integer('option'); // Option as integer
            $table->timestamps(); // Created_at and updated_at
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('map_options');
    }
};
