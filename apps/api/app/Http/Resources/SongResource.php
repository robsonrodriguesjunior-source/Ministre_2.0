<?php

namespace App\Http\Resources;

use App\Models\Song;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Música do repertório. Na lista vem o resumo; no detalhe (`detailed()`) vem também a cifra e os links.
 *
 * @mixin Song
 */
class SongResource extends JsonResource
{
    private bool $detail = false;

    public function detailed(): static
    {
        $this->detail = true;

        return $this;
    }

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $summary = [
            'id' => $this->id,
            'title' => $this->title,
            'artist' => $this->artist,
            'original_key' => $this->original_key,
            'bpm' => $this->bpm,
            'duration_sec' => $this->duration_sec,
            'tags' => $this->tags ?? [],
            'played_count' => (int) ($this->played_count ?? 0),
            'last_played_at' => $this->last_played?->toIso8601String(),
            'is_new' => (bool) $this->created_at?->gte(now()->subDays(Song::NEW_DAYS)),
        ];

        if (! $this->detail) {
            return $summary;
        }

        $membership = $request->attributes->get('membership');

        return $summary + [
            'chordpro' => $this->chordpro ?? '',
            'links' => collect($this->links ?? [])->map(fn ($url) => ['url' => $url, 'type' => self::linkType($url)])->values(),
            'can_manage' => (bool) $membership?->isLeader(),
        ];
    }

    /** YouTube, Spotify ou outro, pelo endereço. */
    public static function linkType(string $url): string
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        return match (true) {
            str_contains($host, 'youtube.') || str_contains($host, 'youtu.be') => 'youtube',
            str_contains($host, 'spotify.') => 'spotify',
            default => 'other',
        };
    }
}
