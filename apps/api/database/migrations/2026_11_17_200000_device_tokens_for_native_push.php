<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// App nativo (APK/loja): o celular manda o endereço de avisos do Firebase (FCM).
// "expo_token" vira "token" e ganha "provider" (fcm = Firebase direto; expo = serviço do Expo).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('device_tokens', function (Blueprint $table) {
            $table->renameColumn('expo_token', 'token');
        });
        Schema::table('device_tokens', function (Blueprint $table) {
            $table->string('provider', 10)->default('expo')->after('token');
        });
    }

    public function down(): void
    {
        Schema::table('device_tokens', function (Blueprint $table) {
            $table->dropColumn('provider');
        });
        Schema::table('device_tokens', function (Blueprint $table) {
            $table->renameColumn('token', 'expo_token');
        });
    }
};
