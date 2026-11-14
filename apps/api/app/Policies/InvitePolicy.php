<?php

namespace App\Policies;

use App\Models\Invite;
use App\Models\User;

class InvitePolicy
{
    /** Só um líder do ministério do convite pode cancelá-lo. */
    public function delete(User $user, Invite $invite): bool
    {
        return (bool) $user->membershipIn($invite->ministry_id)?->isLeader();
    }
}
