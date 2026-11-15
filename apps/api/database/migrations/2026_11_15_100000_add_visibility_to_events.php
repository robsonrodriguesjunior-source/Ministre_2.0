<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * - visibility: Escala Oficial (todos do ministério veem) ou Temporária (só quem está escalado vê).
     *   As escalas que já existem continuam Oficiais.
     * - rehearsal_at: data e hora do ensaio, dentro da própria escala do culto (o ensaio não é mais uma escala à parte).
     */
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->string('visibility', 20)->default('official')->after('status');
            $table->timestamp('rehearsal_at')->nullable()->after('starts_at');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn(['visibility', 'rehearsal_at']);
        });
    }
};
