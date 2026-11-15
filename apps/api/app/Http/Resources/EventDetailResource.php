<?php

namespace App\Http\Resources;

use App\Actions\RemindPending;
use App\Models\EventAssignment;
use Illuminate\Http\Request;

/**
 * Escala completa: equipe, repertório e roteiro.
 *
 * @mixin \App\Models\Event
 */
class EventDetailResource extends EventSummaryResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $membership = $request->attributes->get('membership');
        $pending = $this->assignments->where('status', EventAssignment::STATUS_PENDING);
        $remindable = $pending->filter(fn ($a) => ! $a->reminded_at || $a->reminded_at->lte(now()->subHours(RemindPending::HOURS)));

        return parent::toArray($request) + [
            'notes' => $this->notes,
            'can_manage' => (bool) $membership?->isLeader(),
            // Líder ou o ministro (estrela) desta escala: monta o repertório.
            'can_edit_songs' => $this->resource->canEditSongs($membership),
            'pending_count' => $pending->pluck('ministry_member_id')->unique()->count(),
            'remindable_count' => $remindable->pluck('ministry_member_id')->unique()->count(),
            'team' => $this->assignments
                ->sortBy(fn ($a) => [$a->position->sort_order, $a->member->user->name])
                ->values()
                ->map(fn ($a) => [
                    'assignment_id' => $a->id,
                    'member_id' => $a->ministry_member_id,
                    'user_id' => $a->member->user_id,
                    'name' => $a->member->user->name,
                    'avatar_url' => (new UserResource($a->member->user))->toArray($request)['avatar_url'],
                    'position_id' => $a->position_id,
                    'position' => $a->position->name,
                    'status' => $a->status,
                    'is_minister' => (bool) $a->is_minister,
                    'decline_reason' => $a->decline_reason,
                    'is_me' => $a->ministry_member_id === $membership?->id,
                ]),
            'songs' => $this->songs->map(fn ($s) => [
                'id' => $s->id,
                'song_id' => $s->song_id,
                'title' => $s->song->title,
                'artist' => $s->song->artist,
                'key' => $s->key ?: $s->song->original_key,
                'original_key' => $s->song->original_key,
                'bpm' => $s->song->bpm,
                'duration_sec' => $s->song->duration_sec,
                'links' => SongResource::links($s->song->links),
                'sort_order' => $s->sort_order,
            ]),
            'rundown' => $this->rundown->map(fn ($r) => [
                'id' => $r->id,
                'title' => $r->title,
                'planned_time' => $r->planned_time ? substr($r->planned_time, 0, 5) : null,
                'duration_min' => $r->duration_min,
                'responsible_member_id' => $r->responsible_member_id,
                'responsible' => $r->responsible?->user?->name,
                'notes' => $r->notes,
            ]),
        ];
    }
}
