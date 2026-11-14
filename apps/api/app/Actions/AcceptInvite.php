<?php

namespace App\Actions;

use App\Models\Invite;
use App\Models\MinistryMember;
use App\Models\Position;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** "Tenho um convite": entra no ministério e escolhe as próprias funções. */
class AcceptInvite
{
    /** @param  list<int>  $positionIds */
    public function handle(User $user, Invite $invite, array $positionIds): MinistryMember
    {
        if (! $invite->isUsable()) {
            throw ValidationException::withMessages(['code' => 'Este convite expirou ou já foi usado.']);
        }

        return DB::transaction(function () use ($user, $invite, $positionIds) {
            $membership = MinistryMember::withTrashed()->firstOrNew([
                'ministry_id' => $invite->ministry_id,
                'user_id' => $user->id,
            ]);

            if ($membership->exists && ! $membership->trashed() && $membership->status === MinistryMember::STATUS_ACTIVE) {
                throw ValidationException::withMessages(['code' => 'Você já faz parte deste ministério.']);
            }

            $membership->fill([
                'role' => $invite->role,
                'status' => MinistryMember::STATUS_ACTIVE,
                'joined_at' => now(),
            ]);
            $membership->deleted_at = null;
            $membership->save();

            // Só funções ativas deste mesmo ministério.
            $valid = Position::query()
                ->where('ministry_id', $invite->ministry_id)
                ->whereNull('archived_at')
                ->whereIn('id', $positionIds)
                ->pluck('id')
                ->all();
            $membership->positions()->sync($valid);

            $invite->increment('uses');

            return $membership;
        });
    }
}
