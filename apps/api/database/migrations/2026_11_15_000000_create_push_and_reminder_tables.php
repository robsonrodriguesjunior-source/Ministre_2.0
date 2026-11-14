<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Celulares e navegadores que aceitaram receber avisos (Web Push, usado pelo app da Tela de Início).
        Schema::create('web_push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('endpoint');
            $table->char('endpoint_hash', 64)->unique(); // o endereço é longo demais para índice
            $table->string('p256dh');
            $table->string('auth');
            $table->string('user_agent')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();
        });

        // Lembretes automáticos: cada um vai uma vez só por pessoa e escala.
        Schema::table('event_assignments', function (Blueprint $table) {
            $table->timestamp('pending_reminded_at')->nullable()->after('reminded_at');
            $table->timestamp('day_reminded_at')->nullable()->after('pending_reminded_at');
        });
    }

    public function down(): void
    {
        Schema::table('event_assignments', function (Blueprint $table) {
            $table->dropColumn(['pending_reminded_at', 'day_reminded_at']);
        });
        Schema::dropIfExists('web_push_subscriptions');
    }
};
