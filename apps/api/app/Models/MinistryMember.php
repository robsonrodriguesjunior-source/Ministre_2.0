<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class MinistryMember extends Model
{
    use SoftDeletes;

    public const ROLE_LEADER = 'leader';
    public const ROLE_MEMBER = 'member';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_REMOVED = 'removed';

    protected $fillable = ['ministry_id', 'user_id', 'role', 'granted_by_manager', 'status', 'joined_at'];

    protected function casts(): array
    {
        return ['joined_at' => 'datetime'];
    }

    public function isLeader(): bool
    {
        return $this->role === self::ROLE_LEADER && $this->status === self::STATUS_ACTIVE;
    }

    /** @return BelongsTo<Ministry, $this> */
    public function ministry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsToMany<Position, $this> */
    public function positions(): BelongsToMany
    {
        return $this->belongsToMany(Position::class, 'member_positions')->withTimestamps();
    }
}
