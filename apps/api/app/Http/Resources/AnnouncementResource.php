<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Aviso do líder. "Lido por N de M" só vai para líderes.
 * O controller preenche reads_count, is_read e members_total.
 *
 * @mixin \App\Models\Announcement
 */
class AnnouncementResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $membership = $request->attributes->get('membership');
        $leader = (bool) $membership?->isLeader();

        return [
            'id' => $this->id,
            'title' => $this->title,
            'body' => $this->body,
            'pinned' => $this->pinned,
            'created_at' => $this->created_at->toIso8601String(),
            'push_sent' => $this->push_sent_at !== null,
            'author' => $this->author ? [
                'id' => $this->author->id,
                'name' => $this->author->name,
                'avatar_url' => (new UserResource($this->author))->toArray($request)['avatar_url'],
            ] : null,
            'is_read' => (bool) ($this->is_read ?? false),
            'can_manage' => $leader,
            'reads' => $this->when($leader, fn () => [
                'count' => (int) ($this->reads_count ?? 0),
                'total' => (int) ($this->members_total ?? 0),
            ]),
        ];
    }
}
