<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/** Escala de um culto ou ensaio. starts_at sempre em UTC. */
class Event extends Model
{
    use SoftDeletes;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'ministry_id', 'event_type_id', 'title', 'starts_at', 'ends_at', 'location', 'notes',
        'status', 'is_rehearsal', 'created_by', 'published_at',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'published_at' => 'datetime',
            'is_rehearsal' => 'boolean',
        ];
    }

    /** @return BelongsTo<Ministry, $this> */
    public function ministry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class);
    }

    /** @return BelongsTo<EventType, $this> */
    public function eventType(): BelongsTo
    {
        return $this->belongsTo(EventType::class);
    }

    /** @return HasMany<EventAssignment, $this> */
    public function assignments(): HasMany
    {
        return $this->hasMany(EventAssignment::class);
    }

    /** @return HasMany<EventSong, $this> */
    public function songs(): HasMany
    {
        return $this->hasMany(EventSong::class)->orderBy('sort_order');
    }

    /** @return HasMany<RundownItem, $this> */
    public function rundown(): HasMany
    {
        return $this->hasMany(RundownItem::class)->orderBy('sort_order');
    }
}
