<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Church extends Model
{
    protected $fillable = ['name', 'city', 'slug', 'plan', 'owner_user_id'];

    /** @return HasMany<Ministry, $this> */
    public function ministries(): HasMany
    {
        return $this->hasMany(Ministry::class);
    }

    /** @return BelongsTo<User, $this> */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }
}
