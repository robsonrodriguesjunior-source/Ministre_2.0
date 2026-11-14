<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Uma pessoa numa função de uma escala, com a resposta dela (pendente, confirmado, não pode). */
class EventAssignment extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_DECLINED = 'declined';

    protected $fillable = [
        'event_id', 'ministry_member_id', 'position_id', 'status', 'decline_reason', 'responded_at', 'reminded_at',
        'pending_reminded_at', 'day_reminded_at',
    ];

    protected function casts(): array
    {
        return [
            'responded_at' => 'datetime',
            'reminded_at' => 'datetime',
            'pending_reminded_at' => 'datetime',
            'day_reminded_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Event, $this> */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /** @return BelongsTo<MinistryMember, $this> */
    public function member(): BelongsTo
    {
        return $this->belongsTo(MinistryMember::class, 'ministry_member_id');
    }

    /** @return BelongsTo<Position, $this> */
    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }
}
