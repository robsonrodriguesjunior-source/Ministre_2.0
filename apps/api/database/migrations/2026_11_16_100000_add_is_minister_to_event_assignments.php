<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Ministro da escala: o líder marca com a estrela; quem é ministro cuida do repertório daquela escala.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_assignments', function (Blueprint $table) {
            $table->boolean('is_minister')->default(false)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('event_assignments', function (Blueprint $table) {
            $table->dropColumn('is_minister');
        });
    }
};
