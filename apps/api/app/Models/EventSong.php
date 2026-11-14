<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Música numa escala, na ordem e no tom desta escala. */
class EventSong extends Model
{
    protected $fillable = ['event_id', 'song_id', 'sort_order', 'key', 'notes'];

    /** @return BelongsTo<Event, $this> */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /** @return BelongsTo<Song, $this> */
    public function song(): BelongsTo
    {
        return $this->belongsTo(Song::class)->withTrashed(); // música apagada continua nas escalas antigas
    }
}
