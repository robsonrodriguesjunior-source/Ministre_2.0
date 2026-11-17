<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Envio direto pelo Firebase Cloud Messaging (API v1), sem serviço intermediário.
 * A chave da "conta de serviço" do Firebase fica num arquivo fora do Git (FIREBASE_CREDENTIALS).
 */
class FcmClient
{
    public const SENT = 'sent';

    public const GONE = 'gone'; // o celular desinstalou o app ou trocou de endereço: apagar

    public const FAILED = 'failed';

    /** @return array{project_id: string, client_email: string, private_key: string, token_uri?: string}|null */
    public function credentials(): ?array
    {
        $path = config('ministre.fcm.credentials');
        if (! $path || ! is_file($path)) {
            return null;
        }
        $json = json_decode((string) file_get_contents($path), true);

        return is_array($json) && isset($json['project_id'], $json['client_email'], $json['private_key']) ? $json : null;
    }

    public function configured(): bool
    {
        return $this->credentials() !== null;
    }

    /** @param  array<string, string>  $data */
    public function send(string $token, string $title, ?string $body, array $data = []): string
    {
        $creds = $this->credentials();
        if (! $creds) {
            return self::FAILED;
        }

        $response = Http::timeout(10)
            ->withToken($this->accessToken($creds))
            ->post("https://fcm.googleapis.com/v1/projects/{$creds['project_id']}/messages:send", ['message' => [
                'token' => $token,
                'notification' => array_filter(['title' => $title, 'body' => $body], fn ($v) => $v !== null),
                'data' => $data,
                'android' => ['priority' => 'high', 'notification' => ['channel_id' => 'avisos', 'sound' => 'default']],
                'apns' => ['payload' => ['aps' => ['sound' => 'default']]],
            ]]);

        if ($response->successful()) {
            return self::SENT;
        }

        $code = $response->json('error.details.0.errorCode') ?? $response->json('error.status');
        if ($response->status() === 404 || in_array($code, ['UNREGISTERED', 'NOT_FOUND'], true)
            || ($code === 'INVALID_ARGUMENT' && str_contains((string) $response->json('error.message'), 'registration token'))) {
            return self::GONE;
        }
        if ($response->status() === 401) {
            Cache::forget($this->cacheKey($creds));
        }
        Log::warning('FCM falhou', ['status' => $response->status(), 'code' => $code]);

        return self::FAILED;
    }

    /** Token de acesso do Google (vale 1 h; guardado por 50 min). */
    private function accessToken(array $creds): string
    {
        return Cache::remember($this->cacheKey($creds), now()->addMinutes(50), function () use ($creds) {
            $uri = $creds['token_uri'] ?? 'https://oauth2.googleapis.com/token';
            $now = time();
            $segments = [
                $this->b64(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])),
                $this->b64(json_encode([
                    'iss' => $creds['client_email'],
                    'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                    'aud' => $uri,
                    'iat' => $now,
                    'exp' => $now + 3600,
                ])),
            ];
            if (! openssl_sign(implode('.', $segments), $signature, $creds['private_key'], OPENSSL_ALGO_SHA256)) {
                throw new RuntimeException('Não foi possível assinar o pedido ao Firebase (chave inválida).');
            }
            $segments[] = $this->b64($signature);

            $response = Http::asForm()->timeout(10)->post($uri, [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => implode('.', $segments),
            ]);
            if (! $response->ok() || ! $response->json('access_token')) {
                throw new RuntimeException('O Firebase recusou a chave de serviço (status '.$response->status().').');
            }

            return (string) $response->json('access_token');
        });
    }

    private function cacheKey(array $creds): string
    {
        return 'fcm-access-token:'.md5($creds['client_email']);
    }

    private function b64(string $raw): string
    {
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }
}
