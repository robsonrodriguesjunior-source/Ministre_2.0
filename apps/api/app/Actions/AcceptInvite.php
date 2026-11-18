<?php

namespace App\Actions;

use App\Models\EventAssignment;
use App\Models\Invite;
use App\Models\MinistryMember;
use App\Models\Position;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * "Tenho um convite": entra no ministério e escolhe as próprias funções.
 * Convite pessoal (cadastro direto pelo líder): a pessoa assume o membro que o líder já criou,
 * com as funções e as escalas dele, e a conta provisória deixa de existir.
 */
class AcceptInvite
{
    /** @param  list<int>  $positionIds */
    public function handle(User $user, Invite $invite, array $positionIds): MinistryMember
    {
        if (! $invite->isUsable()) {
            throw ValidationException::withMessages(['code' => 'Este convite expirou ou já foi usado.']);
        }

        return DB::transaction(function () use ($user, $invite, $positionIds) {
            $placeholder = $invite->member_id ? MinistryMember::with('user')->find($invite->member_id) : null;
            if ($placeholder && $placeholder->user?->is_placeholder && $placeholder->status === MinistryMember::STATUS_ACTIVE) {
                $membership = $this->claim($user, $placeholder, $positionIds);
                $invite->increment('uses');

                return $membership;
            }

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

            $membership->positions()->sync($this->validPositions($invite->ministry_id, $positionIds));

            $invite->increment('uses');

            return $membership;
        });
    }

    /**
     * O membro cadastrado pelo líder passa para a conta verdadeira da pessoa.
     *
     * @param  list<int>  $positionIds
     */
    private function claim(User $user, MinistryMember $placeholder, array $positionIds): MinistryMember
    {
        $temp = $placeholder->user;
        $extra = $this->validPositions($placeholder->ministry_id, $positionIds);

        $existing = MinistryMember::withTrashed()
            ->where('ministry_id', $placeholder->ministry_id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing && ! $existing->trashed() && $existing->status === MinistryMember::STATUS_ACTIVE) {
            // Já estava no ministério (entrou por outro link): junta tudo no membro que já existe.
            $existing->positions()->syncWithoutDetaching([...$placeholder->positions()->pluck('positions.id')->all(), ...$extra]);
            foreach (EventAssignment::where('ministry_member_id', $placeholder->id)->get() as $a) {
                $dup = EventAssignment::where('event_id', $a->event_id)->where('ministry_member_id', $existing->id)->where('position_id', $a->position_id)->exists();
                $dup ? $a->delete() : $a->update(['ministry_member_id' => $existing->id]);
            }
            if ($placeholder->role === MinistryMember::ROLE_LEADER && $existing->role !== MinistryMember::ROLE_LEADER) {
                $existing->update(['role' => MinistryMember::ROLE_LEADER]);
            }
            $placeholder->forceDelete();
            $membership = $existing;
        } else {
            // Uma participação antiga (removida) no mesmo ministério entraria em conflito com a nova.
            $existing?->forceDelete();
            $placeholder->update(['user_id' => $user->id, 'joined_at' => now()]);
            if ($extra) {
                $placeholder->positions()->syncWithoutDetaching($extra);
            }
            $membership = $placeholder;
        }

        if (! $user->phone && $temp->phone) {
            $user->update(['phone' => $temp->phone]);
        }
        // A conta provisória não tem mais nada ligado a ela.
        $temp->forceDelete();

        return $membership->refresh();
    }

    /**
     * Só funções ativas do mesmo ministério.
     *
     * @param  list<int>  $ids
     * @return list<int>
     */
    private function validPositions(int $ministryId, array $ids): array
    {
        if (! $ids) {
            return [];
        }

        return Position::query()
            ->where('ministry_id', $ministryId)
            ->whereNull('archived_at')
            ->whereIn('id', $ids)
            ->pluck('id')
            ->all();
    }
}
