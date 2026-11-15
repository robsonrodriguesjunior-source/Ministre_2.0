<?php

namespace App\Http\Resources;

use App\Models\Song;
use App\Services\SongLookup;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Música da biblioteca. Na lista vem o resumo (com os links para "Ouvir"); no detalhe (`detailed()`) vem também a cifra.
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
            'links' => self::links($this->links),
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
            'can_manage' => (bool) $membership?->isLeader(),
        ];
    }

    /**
     * Links para o botão "Ouvir no YouTube / Spotify / Deezer" (abre fora do app, sem player dentro).
     *
     * @param  list<string>|null  $links
     * @return list<array{url: string, type: string}>
     */
    public static function links(?array $links): array
    {
        return collect($links ?? [])->map(fn ($url) => ['url' => $url, 'type' => SongLookup::source($url)])->values()->all();
    }
}
