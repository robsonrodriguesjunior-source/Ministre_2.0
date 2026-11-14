<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/** Música do repertório, com a cifra em ChordPro. */
class Song extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'ministry_id', 'title', 'artist', 'original_key', 'bpm', 'duration_sec', 'chordpro',
        'tags', 'links', 'times_played', 'last_played_at',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
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
}
