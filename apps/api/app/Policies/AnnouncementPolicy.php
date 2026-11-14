<?php

namespace App\Policies;

use App\Models\Announcement;
use App\Models\User;

class AnnouncementPolicy
{
    /** Editar, fixar e apagar: só líderes do ministério do aviso. */
    public function manage(User $user, Announcement $announcement): bool
    {
        return (bool) $user->membershipIn($announcement->ministry_id)?->isLeader();
    }
}
