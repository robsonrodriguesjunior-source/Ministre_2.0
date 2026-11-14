<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ministry extends Model
{
    public const TYPES = ['worship', 'reception', 'kids', 'media', 'other'];

    protected $fillable = ['church_id', 'name', 'type', 'default_location', 'logo_path', 'settings'];

    protected function casts(): array
    {
        return ['settings' => 'array'];
    }

    /** @return BelongsTo<Church, $this> */
    public function church(): BelongsTo
    {
        return $this->belongsTo(Church::class);
    }

    /** @return HasMany<MinistryMember, $this> */
    public function members(): HasMany
    {
        return $this->hasMany(MinistryMember::class);
    }

    /** @return HasMany<Position, $this> */
    public function positions(): HasMany
    {
        return $this->hasMany(Position::class)->orderBy('sort_order');
    }

    /** @return HasMany<EventType, $this> */
    public function eventTypes(): HasMany
    {
        return $this->hasMany(EventType::class);
    }

    /** @return HasMany<Invite, $this> */
    public function invites(): HasMany
    {
        return $this->hasMany(Invite::class);
    }
}
