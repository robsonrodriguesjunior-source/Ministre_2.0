<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/** Escala de um culto (com o ensaio dentro dela, em rehearsal_at). Datas sempre em UTC. */
class Event extends Model
{
    use SoftDeletes;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_CANCELLED = 'cancelled';

    /** Escala Oficial: todos do ministério veem. Temporária: só quem está escalado (e os líderes). */
    public const VISIBILITY_OFFICIAL = 'official';
    public const VISIBILITY_TEMPORARY = 'temporary';

    protected $fillable = [
        'ministry_id', 'event_type_id', 'title', 'starts_at', 'rehearsal_at', 'ends_at', 'location', 'notes',
        'status', 'visibility', 'is_rehearsal', 'created_by', 'published_at',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'rehearsal_at' => 'datetime',
            'ends_at' => 'datetime',
            'published_at' => 'datetime',
            'is_rehearsal' => 'boolean',
        ];
    }

    /**
     * O que um membro (não líder) enxerga: escalas publicadas ou canceladas que sejam Oficiais
     * ou Temporárias em que ele está escalado. Rascunhos, só os líderes.
     *
     * @param  Builder<Event>  $query
     */
    public function scopeVisibleTo(Builder $query, MinistryMember $member): void
    {
        if ($member->isLeader()) {
            return;
        }
        $query->where('status', '!=', self::STATUS_DRAFT)
            ->where(fn ($q) => $q->where('visibility', self::VISIBILITY_OFFICIAL)
                ->orWhereHas('assignments', fn ($a) => $a->where('ministry_member_id', $member->id)));
    }

    public function isVisibleTo(MinistryMember $member): bool
    {
        if ($member->isLeader()) {
            return true;
        }
        if ($this->status === self::STATUS_DRAFT) {
            return false;
        }

        return $this->visibility !== self::VISIBILITY_TEMPORARY
            || $this->assignments()->where('ministry_member_id', $member->id)->exists();
    }

    /** A pessoa está escalada como ministro (estrela) nesta escala. */
    public function isMinister(?MinistryMember $member): bool
    {
        if (! $member) {
            return false;
        }

        return $this->assignments()->where('ministry_member_id', $member->id)->where('is_minister', true)->exists();
    }

    /** Montar o repertório desta escala: líder sempre; membro só se for o ministro dela (e puder vê-la). */
    public function canEditSongs(?MinistryMember $member): bool
    {
        if (! $member || $member->ministry_id !== $this->ministry_id) {
            return false;
        }
        if ($member->isLeader()) {
            return true;
        }

        return $this->isVisibleTo($member) && $this->isMinister($member);
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
