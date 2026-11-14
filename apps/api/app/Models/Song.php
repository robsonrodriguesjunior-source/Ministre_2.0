<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/** Música do repertório, com a cifra em ChordPro. */
class Song extends Model
{
    use SoftDeletes;

    /** "Novas" no filtro do repertório: cadastradas nos últimos 30 dias. */
    public const NEW_DAYS = 30;

    protected $fillable = [
        'ministry_id', 'title', 'artist', 'original_key', 'bpm', 'duration_sec', 'chordpro',
        'tags', 'links', 'times_played', 'last_played_at',
    ];

    protected function casts(): array
    {
        return [
            // Acentos gravados como estão ("Celebração"): o MariaDB 10.4 não acha a tag no formato ç.
            'tags' => 'json:unicode',
            'links' => 'array',
            'bpm' => 'integer',
            'duration_sec' => 'integer',
            'times_played' => 'integer',
            'last_played_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Ministry, $this> */
    public function ministry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class);
    }

    /** @return HasMany<EventSong, $this> */
    public function eventSongs(): HasMany
    {
        return $this->hasMany(EventSong::class);
    }

    /**
     * "Tocada N vezes · última em 12 out": conta as escalas publicadas que já aconteceram.
     * Calculado na hora, sem contador para manter em dia.
     *
     * @param  Builder<Song>  $query
     */
    public function scopeWithPlayStats(Builder $query): void
    {
        $played = fn (string $aggregate) => EventSong::query()
            ->join('events', 'events.id', '=', 'event_songs.event_id')
            ->whereColumn('event_songs.song_id', 'songs.id')
            ->where('events.status', Event::STATUS_PUBLISHED)
            ->where('events.starts_at', '<', now())
            ->whereNull('events.deleted_at')
            ->selectRaw($aggregate);

        $query->select('songs.*')
            ->selectSub($played('count(*)'), 'played_count')
            ->selectSub($played('max(events.starts_at)'), 'last_played')
            ->withCasts(['played_count' => 'integer', 'last_played' => 'datetime']);
    }
}
