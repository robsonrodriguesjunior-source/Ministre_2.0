<?php

use App\Models\DeviceToken;
use App\Models\User;
use App\Services\PushSender;
use Database\Seeders\DemoSeeder;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->seed(DemoSeeder::class);
    $this->marcos = User::where('email', 'marcos@demo.ministreapp.com.br')->first();
    $this->ana = User::where('email', 'ana@demo.ministreapp.com.br')->first();
});

/** Conta de serviço do Firebase de mentira, com uma chave RSA real (para a assinatura funcionar). */
function fake_firebase_credentials(): string
{
    $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
    openssl_pkey_export($key, $pem);
    $path = tempnam(sys_get_temp_dir(), 'fcm');
    file_put_contents($path, json_encode([
        'type' => 'service_account',
        'project_id' => 'ministre-teste',
        'client_email' => 'push@ministre-teste.iam.gserviceaccount.com',
        'private_key' => $pem,
        'token_uri' => 'https://oauth2.googleapis.com/token',
    ]));
    config(['ministre.fcm.credentials' => $path]);

    return $path;
}

it('registers the native app and moves the phone when someone else logs in', function () {
    $device = ['token' => 'fcm-token-do-celular', 'platform' => 'android'];

    $this->actingAs($this->marcos)->postJson('/api/v1/push/devices', $device)->assertOk();
    $this->actingAs($this->ana)->postJson('/api/v1/push/devices', $device)->assertOk();
    expect(DeviceToken::count())->toBe(1)
        ->and(DeviceToken::first()->user_id)->toBe($this->ana->id)
        ->and(DeviceToken::first()->provider)->toBe('fcm');

    // Quem não é dono do celular não consegue tirar o cadastro.
    $this->actingAs($this->marcos)->deleteJson('/api/v1/push/devices', ['token' => $device['token']])->assertOk();
    expect(DeviceToken::count())->toBe(1);

    $this->actingAs($this->ana)->deleteJson('/api/v1/push/devices', ['token' => $device['token']])->assertOk();
    expect(DeviceToken::count())->toBe(0);

    $this->actingAs($this->ana)->postJson('/api/v1/push/devices', [...$device, 'platform' => 'web'])
        ->assertUnprocessable();
});

it('sends to the native app through Firebase and forgets uninstalled phones', function () {
    fake_firebase_credentials();
    DeviceToken::create(['user_id' => $this->ana->id, 'token' => 'celular-ok', 'provider' => 'fcm', 'platform' => 'android']);
    DeviceToken::create(['user_id' => $this->ana->id, 'token' => 'celular-desinstalado', 'provider' => 'fcm', 'platform' => 'android']);

    Http::fake([
        'oauth2.googleapis.com/*' => Http::response(['access_token' => 'acesso-google', 'expires_in' => 3600]),
        'fcm.googleapis.com/*' => function (Request $request) {
            return $request['message']['token'] === 'celular-ok'
                ? Http::response(['name' => 'projects/ministre-teste/messages/1'])
                : Http::response(['error' => ['status' => 'NOT_FOUND', 'details' => [['errorCode' => 'UNREGISTERED']]]], 404);
        },
    ]);

    $sent = app(PushSender::class)->send($this->ana, 'Você foi escalado', 'Culto de domingo', '/escala/5');

    expect($sent)->toBe(1)
        ->and(DeviceToken::pluck('token')->all())->toBe(['celular-ok']);

    Http::assertSent(fn (Request $r) => str_contains($r->url(), 'projects/ministre-teste/messages:send')
        && $r->hasHeader('Authorization', 'Bearer acesso-google')
        && $r['message']['notification']['title'] === 'Você foi escalado'
        && $r['message']['data']['route'] === '/escala/5'
        && $r['message']['android']['notification']['channel_id'] === 'avisos');
});

it('does not try Firebase while the server has no credentials', function () {
    config(['ministre.fcm.credentials' => null]);
    DeviceToken::create(['user_id' => $this->ana->id, 'token' => 'celular-ok', 'provider' => 'fcm', 'platform' => 'android']);
    Http::fake();

    expect(app(PushSender::class)->send($this->ana, 'Oi', null))->toBe(0);
    Http::assertNothingSent();
    expect(DeviceToken::count())->toBe(1);
});
