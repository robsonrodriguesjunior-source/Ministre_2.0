<?php

namespace App\Policies;

use App\Models\Ministry;
use App\Models\User;

/** Quem pode fazer o quê num ministério (seção 1 da especificação). */
class MinistryPolicy
{
    /** Qualquer participante ativo vê o ministério. */
    public function view(User $user, Ministry $ministry): bool
    {
        return $user->membershipIn($ministry->id) !== null;
    }

    /** Só líderes gerenciam: membros, funções, convites, escalas, avisos. */
    public function manage(User $user, Ministry $ministry): bool
    {
        return (bool) $user->membershipIn($ministry->id)?->isLeader();
    }
}
