<?php

namespace App\Services;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\MinistryMember;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Regra de acesso (pedido do dono do produto):
 * - o Gestor da igreja (o pastor ou quem administra o app) tem acesso de gestão em TODOS os departamentos;
 * - o líder tem acesso total só no departamento em que é líder.
 *
 * Quem criou a igreja é sempre gestor; ele pode nomear outros (tabela church_managers).
 * O gestor vira líder de verdade em cada departamento, assim todas as regras de líder
 * já valem para ele. O que o sistema criou/promoveu fica marcado em granted_by_manager
 * para ser desfeito quando a pessoa deixa de ser gestora.
 */
class ChurchManagers
{
    public static function isManager(User $user, Church $church): bool
    {
        return (int) $church->owner_user_id === (int) $user->id
            || DB::table('church_managers')->where('church_id', $church->id)->where('user_id', $user->id)->exists();
    }

    /** Ids das igrejas em que a pessoa é gestora. */
    public static function churchIds(User $user)
    {
        return Church::where('owner_user_id', $user->id)->pluck('id')
            ->merge(DB::table('church_managers')->where('user_id', $user->id)->pluck('church_id'))
            ->unique()->values();
    }

    /** Garante que o gestor é líder ativo em todos os departamentos das igrejas que ele administra. */
    public static function ensure(User $user): void
    {
        $ministryIds = Ministry::whereIn('church_id', self::churchIds($user))->pluck('id');

        foreach ($ministryIds as $ministryId) {
            $member = MinistryMember::withTrashed()->firstOrNew(['ministry_id' => $ministryId, 'user_id' => $user->id]);
            $wasActive = $member->exists && ! $member->trashed() && $member->status === MinistryMember::STATUS_ACTIVE;

            if (! $wasActive) {
                $member->granted_by_manager = 'created';
            } elseif ($member->role !== MinistryMember::ROLE_LEADER) {
                $member->granted_by_manager = 'promoted';
            }
            if ($member->trashed()) {
                $member->restore();
            }
            $member->role = MinistryMember::ROLE_LEADER;
            $member->status = MinistryMember::STATUS_ACTIVE;
            $member->joined_at ??= now();
            if ($member->isDirty()) {
                $member->save();
            }
        }
    }

    /** Deixa de ser gestor: desfaz só o que o sistema tinha criado ou promovido. */
    public static function revoke(User $user, Church $church): void
    {
        DB::table('church_managers')->where('church_id', $church->id)->where('user_id', $user->id)->delete();

        MinistryMember::whereIn('ministry_id', Ministry::where('church_id', $church->id)->select('id'))
            ->where('user_id', $user->id)->whereNotNull('granted_by_manager')
            ->get()
            ->each(function (MinistryMember $m) {
                $m->update($m->granted_by_manager === 'created'
                    ? ['status' => MinistryMember::STATUS_REMOVED, 'granted_by_manager' => null]
                    : ['role' => MinistryMember::ROLE_MEMBER, 'granted_by_manager' => null]);
            });
    }

    /** Este membro é gestor da igreja do departamento? (líderes não podem rebaixar nem remover gestores) */
    public static function isManagerMember(MinistryMember $member): bool
    {
        return $member->user && self::isManager($member->user, $member->ministry->church);
    }
}
