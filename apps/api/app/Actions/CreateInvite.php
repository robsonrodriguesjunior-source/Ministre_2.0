<?php

namespace App\Actions;

use App\Models\Invite;
use App\Models\MinistryMember;
use App\Models\User;

/** Gera um convite com código de 8 caracteres fácil de digitar (sem 0/O, 1/I/L). */
class CreateInvite
{
    private const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    public function handle(MinistryMember $leader, User $by, string $role = MinistryMember::ROLE_MEMBER, int $daysValid = 30, ?int $maxUses = null): Invite
    {
        return Invite::create([
            'ministry_id' => $leader->ministry_id,
            'code' => $this->uniqueCode(),
            'role' => $role,
            'created_by' => $by->id,
            'expires_at' => now()->addDays($daysValid),
            'max_uses' => $maxUses,
            'uses' => 0,
        ]);
    }

    public static function normalize(string $code): string
    {
        return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code) ?? '');
    }

    private function uniqueCode(): string
    {
        do {
            $code = '';
            for ($i = 0; $i < 8; $i++) {
                $code .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
            }
        } while (Invite::where('code', $code)->exists());

        return $code;
    }
}
