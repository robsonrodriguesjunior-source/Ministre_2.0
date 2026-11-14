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
}
