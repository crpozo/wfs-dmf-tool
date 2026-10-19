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
        Schema::create('gates', function (Blueprint $table) {
            $table->id(); // Auto-increment primary key
            $table->integer('material'); // Material as integer
            $table->string('color', 15); // Color as varchar(15)
            $table->integer('width'); // Width as integer
            $table->integer('height'); // Height as integer
            $table->string('part', 25); // Part as varchar(25)
            $table->timestamps(); // Created_at and updated_at
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gates');
    }
};
