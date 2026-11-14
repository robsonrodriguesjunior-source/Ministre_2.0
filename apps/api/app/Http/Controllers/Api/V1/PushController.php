<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\WebPushSubscription;
use App\Services\PushSender;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Cadastro do celular para receber avisos (Web Push) e um aviso de teste. */
class PushController extends Controller
{
    /** Chave pública que o celular usa para se cadastrar. */
    public function config(): JsonResponse
    {
        return response()->json(['public_key' => config('ministre.push.public_key')]);
    }

    public function subscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'url:https', 'max:2000'],
            'keys.p256dh' => ['required', 'string', 'max:255'],
            'keys.auth' => ['required', 'string', 'max:255'],
        ]);

        // O mesmo celular pode trocar de conta: o cadastro passa para quem entrou agora.
        WebPushSubscription::updateOrCreate(
            ['endpoint_hash' => WebPushSubscription::hash($data['endpoint'])],
            [
                'user_id' => $request->user()->id,
                'endpoint' => $data['endpoint'],
                'p256dh' => $data['keys']['p256dh'],
                'auth' => $data['keys']['auth'],
                'user_agent' => substr((string) $request->userAgent(), 0, 255),
                'last_seen_at' => now(),
            ],
        );

        return response()->json(['message' => 'Pronto! Os avisos vão chegar neste celular.']);
    }

    public function unsubscribe(Request $request): JsonResponse
    {
        $request->validate(['endpoint' => ['required', 'string', 'max:2000']]);
        $request->user()->webPushSubscriptions()
            ->where('endpoint_hash', WebPushSubscription::hash($request->input('endpoint')))
            ->delete();

        return response()->json(['message' => 'Este celular não vai mais receber avisos.']);
    }

    /** "Enviar um teste": confirma que está funcionando neste celular. */
    public function test(Request $request, PushSender $sender): JsonResponse
    {
        $sent = $sender->send($request->user(), 'Tudo certo!', 'Os avisos do Ministre vão chegar assim.', '/notificacoes', 'teste');

        return response()->json([
            'sent' => $sent,
            'message' => $sent > 0 ? 'Aviso de teste enviado.' : 'Nenhum celular cadastrado para receber avisos.',
        ], $sent > 0 ? 200 : 422);
    }
}
