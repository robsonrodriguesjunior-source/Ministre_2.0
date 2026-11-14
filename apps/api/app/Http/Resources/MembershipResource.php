<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Uma participação do usuário: o ministério, a igreja, o papel e as funções dele ali.
 *
 * @mixin \App\Models\MinistryMember
 */
class MembershipResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'role' => $this->role,
            'ministry' => [
                'id' => $this->ministry->id,
                'name' => $this->ministry->name,
                'type' => $this->ministry->type,
                'default_location' => $this->ministry->default_location,
            ],
            'church' => [
                'id' => $this->ministry->church->id,
                'name' => $this->ministry->church->name,
                'city' => $this->ministry->church->city,
            ],
            'positions' => $this->positions->map(fn ($p) => ['id' => $p->id, 'name' => $p->name])->values(),
        ];
    }
}
