<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cadastro direto pelo líder (18/11/2026): o líder cadastra nome, WhatsApp e funções e a pessoa
 * já pode ser escalada antes de entrar no app.
 * - users.is_placeholder: conta provisória (sem senha utilizável) criada pelo líder; some quando
 *   a pessoa aceita o convite e o membro passa para a conta verdadeira dela.
 * - invites.member_id: convite pessoal, ligado a esse membro (uso único).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_placeholder')->default(false)->after('password');
        });

        Schema::table('invites', function (Blueprint $table) {
            $table->foreignId('member_id')->nullable()->after('ministry_id')->constrained('ministry_members')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('invites', function (Blueprint $table) {
            $table->dropConstrainedForeignId('member_id');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_placeholder');
        });
    }
};
