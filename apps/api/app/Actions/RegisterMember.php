<?php

namespace App\Actions;

use App\Models\Invite;
use App\Models\MinistryMember;
use App\Models\Position;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Líder cadastra um membro direto (nome, WhatsApp, funções): a pessoa já pode ser escalada.
 * Por baixo, o membro fica numa conta provisória (sem senha utilizável, e-mail interno) e ganha
 * um convite pessoal; quando a pessoa aceita, o membro passa para a conta verdadeira dela
 * (AcceptInvite) com funções e escalas.
 */
class RegisterMember
{
    public const PLACEHOLDER_DOMAIN = 'convite.ministreapp.com.br';

    public function __construct(private CreateInvite $invites) {}

    /**
     * @param  list<int>  $positionIds
     * @return array{0: MinistryMember, 1: Invite}
     */
    public function handle(MinistryMember $leader, User $by, string $name, ?string $phone, array $positionIds, string $role = MinistryMember::ROLE_MEMBER): array
    {
        return DB::transaction(function () use ($leader, $by, $name, $phone, $positionIds, $role) {
            $user = User::create([
                'name' => $name,
                'email' => 'pendente-'.Str::uuid().'@'.self::PLACEHOLDER_DOMAIN,
                'phone' => $phone,
                'password' => Str::random(64),
                'is_placeholder' => true,
            ]);

            $member = MinistryMember::create([
                'ministry_id' => $leader->ministry_id,
                'user_id' => $user->id,
                'role' => $role,
                'status' => MinistryMember::STATUS_ACTIVE,
                'joined_at' => null,
            ]);

            $valid = Position::query()
                ->where('ministry_id', $leader->ministry_id)
                ->whereNull('archived_at')
                ->whereIn('id', $positionIds)
                ->pluck('id')
                ->all();
            $member->positions()->sync($valid);

            return [$member, $this->personalInvite($member, $by)];
        });
    }

    /** Convite pessoal (uso único, 60 dias). Gera um novo a cada pedido de reenvio. */
    public function personalInvite(MinistryMember $member, User $by): Invite
    {
        $invite = $this->invites->handle($member, $by, $member->role, 60, 1);
        $invite->update(['member_id' => $member->id]);

        return $invite;
    }
}
