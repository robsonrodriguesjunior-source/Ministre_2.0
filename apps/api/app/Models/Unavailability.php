<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** "Não posso" num dia, num período ou toda semana num dia (recurrence_weekday). */
class Unavailability extends Model
{
    protected $fillable = ['ministry_member_id', 'starts_on', 'ends_on', 'reason', 'recurrence_weekday'];

    protected function casts(): array
    {
        return ['starts_on' => 'date', 'ends_on' => 'date', 'recurrence_weekday' => 'integer'];
    }

    /** @return BelongsTo<MinistryMember, $this> */
    public function member(): BelongsTo
    {
        return $this->belongsTo(MinistryMember::class, 'ministry_member_id');
    }
}
