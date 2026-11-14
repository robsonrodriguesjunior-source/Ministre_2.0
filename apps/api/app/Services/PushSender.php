<?php

namespace App\Services;

use App\Models\DeviceToken;
use App\Models\User;
use App\Models\WebPushSubscription;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

/**
 * Entrega o aviso no celular da pessoa:
 * - app da Tela de Início (Web Push, iPhone com iOS 16.4+ e Android);
 * - app das lojas (Expo Push), quando existir (Etapa 7).
 * Endereços que o celular já descartou são apagados.
 */
class PushSender
{
    /** @return int quantos aparelhos receberam */
    public function send(User $user, string $title, ?string $body, ?string $route = null, ?string $tag = null): int
    {
        $url = rtrim((string) config('ministre.app_url'), '/').($route ?? '/');
        $sent = $this->sendWeb($user, ['title' => $title, 'body' => $body, 'url' => $url, 'tag' => $tag]);

        return $sent + $this->sendExpo($user, $title, $body, $route);
    }

    /** @param  array<string, mixed>  $payload */
    private function sendWeb(User $user, array $payload): int
    {
        $subscriptions = $user->webPushSubscriptions()->get();
        $keys = config('ministre.push');
        if ($subscriptions->isEmpty() || ! $keys['public_key'] || ! $keys['private_key']) {
            return 0;
        }

        $webPush = new WebPush(['VAPID' => [
            'subject' => $keys['subject'],
            'publicKey' => $keys['public_key'],
            'privateKey' => $keys['private_key'],
        ]], ['TTL' => 60 * 60 * 24, 'urgency' => 'high']);

        foreach ($subscriptions as $s) {
            $webPush->queueNotification(
                Subscription::create(['endpoint' => $s->endpoint, 'keys' => ['p256dh' => $s->p256dh, 'auth' => $s->auth]]),
                json_encode($payload, JSON_UNESCAPED_UNICODE),
            );
        }

        $sent = 0;
        foreach ($webPush->flush() as $report) {
            if ($report->isSuccess()) {
                $sent++;
            } elseif ($report->isSubscriptionExpired()) {
                WebPushSubscription::where('endpoint_hash', WebPushSubscription::hash($report->getEndpoint()))->delete();
            } else {
                Log::warning('Web Push falhou', ['reason' => $report->getReason()]);
            }
        }

        return $sent;
    }

    private function sendExpo(User $user, string $title, ?string $body, ?string $route): int
    {
        $tokens = DeviceToken::where('user_id', $user->id)->pluck('expo_token');
        if ($tokens->isEmpty()) {
            return 0;
        }

        $response = Http::timeout(10)->post('https://exp.host/--/api/v2/push/send', $tokens->map(fn ($token) => [
            'to' => $token,
            'title' => $title,
            'body' => $body,
            'sound' => 'default',
            'data' => ['route' => $route],
        ])->values()->all());

        if (! $response->ok()) {
            Log::warning('Expo Push falhou', ['status' => $response->status()]);

            return 0;
        }

        $sent = 0;
        foreach ($response->json('data', []) as $i => $ticket) {
            if (($ticket['status'] ?? '') === 'ok') {
                $sent++;
            } elseif (($ticket['details']['error'] ?? '') === 'DeviceNotRegistered') {
                DeviceToken::where('expo_token', $tokens[$i] ?? null)->delete();
            }
        }

        return $sent;
    }
}
