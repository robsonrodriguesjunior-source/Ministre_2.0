<?php

namespace App\Http\Resources;

use App\Models\EventAssignment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Culto na lista (Agenda, Início). "mine" = as minhas funções nesta escala e a minha resposta.
 *
 * @mixin \App\Models\Event
 */
class EventSummaryResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $membershipId = $request->attributes->get('membership')?->id;
        $assignments = $this->assignments;

        return [
            'id' => $this->id,
            'title' => $this->title,
            'starts_at' => $this->starts_at->toIso8601String(),
            'rehearsal_at' => $this->rehearsal_at?->toIso8601String(),
            'location' => $this->location,
            'status' => $this->status,
            'visibility' => $this->visibility ?? 'official',
            'is_rehearsal' => $this->is_rehearsal,
            'event_type_id' => $this->event_type_id,
            'team_count' => $assignments->pluck('ministry_member_id')->unique()->count(),
            'confirmed_count' => $assignments->where('status', EventAssignment::STATUS_CONFIRMED)
                ->pluck('ministry_member_id')->unique()->count(),
            'mine' => $assignments->where('ministry_member_id', $membershipId)->values()->map(fn ($a) => [
                'assignment_id' => $a->id,
                'position' => $a->position->name,
                'status' => $a->status,
            ]),
            'faces' => $assignments->unique('ministry_member_id')->take(4)->values()->map(fn ($a) => [
                'user_id' => $a->member->user_id,
                'name' => $a->member->user->name,
                'avatar_url' => (new UserResource($a->member->user))->toArray($request)['avatar_url'],
            ]),
        ];
    }
}
