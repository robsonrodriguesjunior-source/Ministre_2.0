<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Tipo de culto (Culto da Família, Santa Ceia…), com dia e horário padrão. */
class EventType extends Model
{
    protected $fillable = ['ministry_id', 'name', 'weekday', 'default_time', 'default_location', 'is_rehearsal'];

    protected function casts(): array
    {
        return ['is_rehearsal' => 'boolean', 'weekday' => 'integer'];
    }

    /** @return BelongsTo<Ministry, $this> */
    public function ministry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class);
    }
}
