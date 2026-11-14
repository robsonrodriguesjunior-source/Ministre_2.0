<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Item do roteiro do culto (Abertura, Louvor, Palavra…). */
class RundownItem extends Model
{
    protected $fillable = ['event_id', 'sort_order', 'title', 'planned_time', 'duration_min', 'responsible_member_id', 'notes'];

    /** @return BelongsTo<Event, $this> */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /** @return BelongsTo<MinistryMember, $this> */
    public function responsible(): BelongsTo
    {
        return $this->belongsTo(MinistryMember::class, 'responsible_member_id');
    }
}
