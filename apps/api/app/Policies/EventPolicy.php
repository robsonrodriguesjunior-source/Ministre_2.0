<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\User;

class EventPolicy
{
    /** Rascunhos só os líderes; escala Temporária só quem está escalado (e os líderes). */
    public function view(User $user, Event $event): bool
    {
        $membership = $user->membershipIn($event->ministry_id);

        return $membership !== null && $event->isVisibleTo($membership);
    }

    /** Criar, editar, publicar, duplicar, cancelar, excluir e lembrar pendentes: só líderes. */
    public function manage(User $user, Event $event): bool
    {
        return (bool) $user->membershipIn($event->ministry_id)?->isLeader();
    }
}
