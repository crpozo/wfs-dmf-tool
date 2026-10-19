<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 🔹 Add self-referencing FKs for the steps table
        Schema::table('steps', function (Blueprint $table) {
            $table->foreign('parent_id')
                ->references('id')
                ->on('steps')
                ->onDelete('set null');

            $table->foreign('next_id')
                ->references('id')
                ->on('steps')
                ->onDelete('set null');
        });

        // 🔹 Add FKs for the responses table
        Schema::table('responses', function (Blueprint $table) {
            $table->foreign('step_id')
                ->references('id')
                ->on('steps')
                ->onDelete('cascade');

            $table->foreign('next_id')
                ->references('id')
                ->on('steps')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        // 🔹 Drop FKs in reverse order
        Schema::table('responses', function (Blueprint $table) {
            $table->dropForeign(['step_id']);
            $table->dropForeign(['next_id']);
        });

        Schema::table('steps', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropForeign(['next_id']);
        });
    }
};
