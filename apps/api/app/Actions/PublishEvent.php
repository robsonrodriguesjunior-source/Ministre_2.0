<?php

namespace App\Actions;

use App\Models\Event;
use App\Services\Notifier;
use Illuminate\Support\Facades\DB;

/** Publicar: a escala aparece para a equipe e cada escalado recebe "Você foi escalado no …". */
class PublishEvent
{
    public function __construct(private Notifier $notifier) {}

    public function handle(Event $event): Event
    {
        if ($event->status === Event::STATUS_PUBLISHED) {
            return $event;
        }

        DB::transaction(function () use ($event) {
            $event->update(['status' => Event::STATUS_PUBLISHED, 'published_at' => now()]);

            $event->assignments()->with(['member.user', 'position'])->get()
                ->each(fn ($a) => $this->notifier->scheduled($a->member, $event, $a->position->name));
        });

        return $event->refresh();
    }
}
