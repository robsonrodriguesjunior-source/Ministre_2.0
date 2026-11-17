<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Gestores da igreja: acesso de gestão em todos os departamentos (o criador da igreja já é gestor).
 * granted_by_manager marca a participação que o sistema criou ou promoveu por causa disso,
 * para desfazer certinho quando a pessoa deixa de ser gestora.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('church_managers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('church_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['church_id', 'user_id']);
        });

        Schema::table('ministry_members', function (Blueprint $table) {
            $table->string('granted_by_manager', 10)->nullable()->after('role'); // created | promoted
        });
    }

    public function down(): void
    {
        Schema::table('ministry_members', function (Blueprint $table) {
            $table->dropColumn('granted_by_manager');
        });
        Schema::dropIfExists('church_managers');
    }
};
