<?php

namespace App\Services;

use App\Mail\PasswordResetCode;
use App\Models\PasswordReset;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * "Esqueci a senha": manda um código de 6 dígitos por e-mail (válido por 15 minutos, 5 tentativas)
 * e troca a senha com ele. Nunca revela se o e-mail tem conta.
 */
class PasswordResetService
{
    private const MINUTES = 15;
    private const MAX_ATTEMPTS = 5;

    public function sendCode(string $email): void
    {
        $user = User::where('email', $email)->first();
        if (! $user || $user->is_placeholder) {
            return; // resposta igual para quem tem e quem não tem conta
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        PasswordReset::where('email', $email)->delete();
        PasswordReset::create([
            'email' => $email,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::MINUTES),
        ]);

        Mail::to($user->email)->send(new PasswordResetCode($user->name, $code, self::MINUTES));
    }

    public function reset(string $email, string $code, string $password): User
    {
        $reset = PasswordReset::where('email', $email)->latest('id')->first();
        $user = User::where('email', $email)->first();

        if (! $reset || ! $user || $reset->expires_at->isPast() || $reset->attempts >= self::MAX_ATTEMPTS) {
            throw ValidationException::withMessages(['code' => 'Código inválido ou expirado. Peça um novo.']);
        }

        if (! Hash::check($code, $reset->code_hash)) {
            $reset->increment('attempts');
            throw ValidationException::withMessages(['code' => 'Código incorreto.']);
        }

        $user->forceFill(['password' => $password])->save();
        $user->tokens()->delete(); // sai de todos os aparelhos
        PasswordReset::where('email', $email)->delete();

        return $user;
    }
}
