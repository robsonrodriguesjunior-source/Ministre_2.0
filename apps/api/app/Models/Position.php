<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Função no ministério (Vocal, Violão…). */
class Position extends Model
{
    protected $fillable = ['ministry_id', 'name', 'sort_order', 'archived_at'];

    protected function casts(): array
    {
        return ['archived_at' => 'datetime'];
    }

    /** @param Builder<Position> $query */
    public function scopeActive(Builder $query): void
    {
        $query->whereNull('archived_at');
    }

    /** @return BelongsTo<Ministry, $this> */
    public function ministry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class);
    }
}
