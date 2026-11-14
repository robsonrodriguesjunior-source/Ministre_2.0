<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Invite */
class InviteResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'role' => $this->role,
            'expires_at' => $this->expires_at->toIso8601String(),
            'max_uses' => $this->max_uses,
            'uses' => $this->uses,
            'usable' => $this->isUsable(),
            // Link para compartilhar no WhatsApp: abre o app (ou a versão web) direto no convite.
            'link' => rtrim((string) config('ministre.app_url'), '/').'/convite/'.$this->code,
        ];
    }
}
