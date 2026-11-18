<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Convite para entrar num ministério (código de 8 caracteres ou link ministre://convite/CODIGO). */
class Invite extends Model
{
    protected $fillable = ['ministry_id', 'member_id', 'code', 'role', 'created_by', 'expires_at', 'max_uses', 'uses'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'max_uses' => 'integer', 'uses' => 'integer'];
    }

    public function isUsable(): bool
    {
        return $this->expires_at->isFuture() && ($this->max_uses === null || $this->uses < $this->max_uses);
    }

    /** Convite pessoal: o membro que o líder já cadastrou (null = convite aberto). @return BelongsTo<MinistryMember, $this> */
    public function member(): BelongsTo
    {
        return $this->belongsTo(MinistryMember::class, 'member_id');
    }

    /** @return BelongsTo<Ministry, $this> */
    public function ministry(): BelongsTo
    {
        return $this->belongsTo(Ministry::class);
    }
}
