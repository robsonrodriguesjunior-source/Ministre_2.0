<?php

namespace App\Policies;

use App\Models\Song;
use App\Models\User;

class SongPolicy
{
    /** Todo participante vê o repertório e as cifras. */
    public function view(User $user, Song $song): bool
    {
        return $user->membershipIn($song->ministry_id) !== null;
    }

    /** Cadastrar, editar e apagar músicas: só líderes. */
    public function manage(User $user, Song $song): bool
    {
        return (bool) $user->membershipIn($song->ministry_id)?->isLeader();
    }
}
