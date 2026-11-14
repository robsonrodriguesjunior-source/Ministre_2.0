<?php

namespace App\Actions;

use App\Models\EventAssignment;
use App\Models\MinistryMember;
use App\Models\User;
use App\Services\ImageStore;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * "Excluir minha conta" (Apple e LGPD): apaga os dados pessoais e deixa o histórico anônimo.
 * - nome vira "Pessoa removida"; e-mail, celular, foto e senha somem;
 * - sai de todos os ministérios e das escalas que ainda não aconteceram;
 * - escalas passadas continuam (para a contagem do ministério), mas sem identificar a pessoa.
 */
class DeleteAccount
{
    public function __construct(private ImageStore $images) {}

    public function handle(User $user): void
    {
        $this->ensureNotLastLeader($user);

        DB::transaction(function () use ($user) {
            $memberIds = $user->memberships()->pluck('id');

            // Escalas futuras: sai delas.
            EventAssignment::whereIn('ministry_member_id', $memberIds)
                ->whereHas('event', fn ($q) => $q->where('starts_at', '>', now()))
                ->delete();

            MinistryMember::whereIn('id', $memberIds)->update(['status' => MinistryMember::STATUS_REMOVED]);

            $user->tokens()->delete();
            $user->deviceTokens()->delete();
            $user->webPushSubscriptions()->delete();
            $user->appNotifications()->delete();
            DB::table('password_resets')->where('email', $user->email)->delete();

            $this->images->delete($user->avatar_path);
            $user->forceFill([
                'name' => 'Pessoa removida',
                'email' => 'removido-'.$user->id.'-'.Str::lower(Str::random(8)).'@ministreapp.invalid',
                'phone' => null,
                'avatar_path' => null,
                'push_prefs' => null,
                'password' => Str::random(64),
                'remember_token' => null,
            ])->save();
            $user->delete(); // soft delete: some do app, o histórico continua anônimo
        });
    }

    /** Um ministério com equipe não pode ficar sem líder. */
    private function ensureNotLastLeader(User $user): void
    {
        foreach ($user->memberships()->where('status', MinistryMember::STATUS_ACTIVE)->where('role', MinistryMember::ROLE_LEADER)->with('ministry')->get() as $m) {
            $otherLeaders = MinistryMember::where('ministry_id', $m->ministry_id)
                ->where('id', '!=', $m->id)->where('status', MinistryMember::STATUS_ACTIVE)->where('role', MinistryMember::ROLE_LEADER)->exists();
            $otherMembers = MinistryMember::where('ministry_id', $m->ministry_id)
                ->where('id', '!=', $m->id)->where('status', MinistryMember::STATUS_ACTIVE)->exists();

            if (! $otherLeaders && $otherMembers) {
                throw ValidationException::withMessages([
                    'confirm' => "Você é o único líder de {$m->ministry->name}. Antes de excluir a conta, torne outra pessoa líder em Gestão › Membros.",
                ]);
            }
        }
    }
}
