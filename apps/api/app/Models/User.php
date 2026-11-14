<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'avatar_path',
        'push_prefs',
        'password',
        'terms_accepted_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'terms_accepted_at' => 'datetime',
            'push_prefs' => 'array',
            'password' => 'hashed',
        ];
    }

    /** @return HasMany<MinistryMember, $this> */
    public function memberships(): HasMany
    {
        return $this->hasMany(MinistryMember::class);
    }

    /** Participação ativa no ministério (ou null se não participa). */
    public function membershipIn(int $ministryId): ?MinistryMember
    {
        return $this->memberships()
            ->where('ministry_id', $ministryId)
            ->where('status', MinistryMember::STATUS_ACTIVE)
            ->first();
    }

    /** @return HasMany<AppNotification, $this> */
    public function appNotifications(): HasMany
    {
        return $this->hasMany(AppNotification::class);
    }

    /** @return HasMany<DeviceToken, $this> */
    public function deviceTokens(): HasMany
    {
        return $this->hasMany(DeviceToken::class);
    }

    /** @return HasMany<WebPushSubscription, $this> */
    public function webPushSubscriptions(): HasMany
    {
        return $this->hasMany(WebPushSubscription::class);
    }

    /**
     * Quais avisos chegam no celular (Perfil › Notificações). Tudo ligado até a pessoa desligar.
     * O sino do app registra tudo de qualquer jeito.
     */
    public const PUSH_PREFS = ['escalas', 'lembretes', 'avisos', 'indisponibilidade', 'resumo'];

    /** @return array<string, bool> */
    public function pushPrefs(): array
    {
        $saved = $this->push_prefs ?? [];

        return collect(self::PUSH_PREFS)->mapWithKeys(fn ($key) => [$key => (bool) ($saved[$key] ?? true)])->all();
    }

    public function wantsPush(string $pref): bool
    {
        return $this->pushPrefs()[$pref] ?? true;
    }
}
