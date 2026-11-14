<?php

namespace App\Jobs;

use App\Models\AppNotification;
use App\Services\PushSender;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/** Manda para o celular uma notificação que já está no sino. Roda na fila, para o app não esperar. */
class SendPush implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(public int $notificationId)
    {
        $this->afterCommit();
    }

    public function handle(PushSender $sender): void
    {
        $notification = AppNotification::with('user')->find($this->notificationId);
        if (! $notification?->user || $notification->read_at) {
            return; // apagada, pessoa saiu ou já viu no app
        }

        $sender->send(
            $notification->user,
            $notification->title,
            $notification->body,
            $notification->data['route'] ?? null,
            $notification->type.'-'.($notification->data['event_id'] ?? $notification->data['announcement_id'] ?? $notification->id),
        );
    }
}
