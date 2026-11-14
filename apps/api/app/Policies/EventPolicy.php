<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\User;

class EventPolicy
{
    /** Participantes veem escalas publicadas; rascunhos só os líderes. */
    public function view(User $user, Event $event): bool
    {
        $membership = $user->membershipIn($event->ministry_id);
        if (! $membership) {
            return false;
        }

        return $event->status !== Event::STATUS_DRAFT || $membership->isLeader();
    }

    /** Criar, editar, publicar, duplicar, cancelar, excluir e lembrar pendentes: só líderes. */
    public function manage(User $user, Event $event): bool
    {
        return (bool) $user->membershipIn($event->ministry_id)?->isLeader();
    }
}
