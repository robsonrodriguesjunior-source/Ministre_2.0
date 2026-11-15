<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Colou o link da música (YouTube, Spotify ou Deezer): descobre título e cantor e procura a letra.
 * Nenhuma dessas plataformas informa o tom, então ele fica para a pessoa escolher.
 * Só acessa os endereços dessas plataformas (e do LRCLIB, para a letra).
 */
class SongLookup
{
    private const TIMEOUT = 8;

    /** Links curtos que redirecionam para a página da música. */
    private const SHORT_HOSTS = ['youtu.be', 'spotify.link', 'deezer.page.link', 'link.deezer.com', 'dzr.page.link'];

    /** @return array{source: string, url: string, title: ?string, artist: ?string, bpm: ?int, duration_sec: ?int, lyrics: ?string, key: null} */
    public function lookup(string $url): array
    {
        $url = $this->expand(trim($url));
        $host = $this->host($url);

        $info = match (true) {
            $this->isHost($host, ['youtube.com', 'youtu.be', 'music.youtube.com']) => $this->youtube($url),
            $this->isHost($host, ['spotify.com']) => $this->spotify($url),
            $this->isHost($host, ['deezer.com']) => $this->deezer($url),
            default => throw ValidationException::withMessages(['url' => 'Cole um link do YouTube, do Spotify ou do Deezer.']),
        };

        $info['lyrics'] = $info['title'] ? $this->lyrics($info['title'], $info['artist'], $info['duration_sec']) : null;
        $info['key'] = null; // nenhuma das plataformas informa o tom

        return $info;
    }

    /** Tipo do link para o botão "Ouvir no …". */
    public static function source(string $url): string
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));

        return match (true) {
            str_contains($host, 'youtube.') || str_contains($host, 'youtu.be') => 'youtube',
            str_contains($host, 'spotify.') => 'spotify',
            str_contains($host, 'deezer.') => 'deezer',
            default => 'other',
        };
    }

    // ---- Plataformas ----

    private function youtube(string $url): array
    {
        $data = $this->json('https://www.youtube.com/oembed', ['url' => $url, 'format' => 'json']);
        if (! $data || empty($data['title'])) {
            throw ValidationException::withMessages(['url' => 'Não encontramos esse vídeo no YouTube. Confira o link.']);
        }

        [$artist, $title] = $this->splitYoutubeTitle($data['title'], (string) ($data['author_name'] ?? ''));

        return ['source' => 'youtube', 'url' => $url, 'title' => $title, 'artist' => $artist, 'bpm' => null, 'duration_sec' => null];
    }

    private function spotify(string $url): array
    {
        if (! preg_match('#/track/([A-Za-z0-9]+)#', $url, $m)) {
            throw ValidationException::withMessages(['url' => 'Use o link de uma música do Spotify (não de álbum ou playlist).']);
        }
        $page = $this->get("https://open.spotify.com/track/{$m[1]}");
        $title = $this->meta($page, 'og:title');
        $description = $this->meta($page, 'og:description'); // "Cantor · Álbum · Song · 2021"
        if (! $title) {
            throw ValidationException::withMessages(['url' => 'Não encontramos essa música no Spotify. Confira o link.']);
        }
        $artist = $description ? trim(explode('·', $description)[0]) : null;

        return ['source' => 'spotify', 'url' => "https://open.spotify.com/track/{$m[1]}", 'title' => $title, 'artist' => $artist ?: null, 'bpm' => null, 'duration_sec' => null];
    }

    private function deezer(string $url): array
    {
        if (! preg_match('#/track/(\d+)#', $url, $m)) {
            throw ValidationException::withMessages(['url' => 'Use o link de uma música do Deezer (não de álbum ou playlist).']);
        }
        $data = $this->json("https://api.deezer.com/track/{$m[1]}");
        if (! $data || isset($data['error']) || empty($data['title'])) {
            throw ValidationException::withMessages(['url' => 'Não encontramos essa música no Deezer. Confira o link.']);
        }
        $bpm = (int) round((float) ($data['bpm'] ?? 0));

        return [
            'source' => 'deezer',
            'url' => "https://www.deezer.com/track/{$m[1]}",
            'title' => $data['title_short'] ?? $data['title'],
            'artist' => $data['artist']['name'] ?? null,
            'bpm' => $bpm >= 30 && $bpm <= 300 ? $bpm : null,
            'duration_sec' => isset($data['duration']) ? (int) $data['duration'] : null,
        ];
    }

    // ---- Letra (LRCLIB, gratuito) ----

    private function lyrics(string $title, ?string $artist, ?int $duration): ?string
    {
        $params = ['track_name' => $title];
        if ($artist) {
            $params['artist_name'] = $artist;
        }
        $results = $this->json('https://lrclib.net/api/search', $params);
        if (! $results && $artist) {
            $results = $this->json('https://lrclib.net/api/search', ['q' => "{$title} {$artist}"]);
        }

        $best = collect($results ?: [])
            ->filter(fn ($r) => ! empty($r['plainLyrics']) && empty($r['instrumental']))
            // Prefere a versão com a duração mais parecida (estúdio x ao vivo).
            ->sortBy(fn ($r) => $duration && isset($r['duration']) ? abs($r['duration'] - $duration) : 0)
            ->first();

        return $best ? trim(preg_replace("/\r\n?/", "\n", $best['plainLyrics'])) : null;
    }

    // ---- Apoio ----

    /** "Gabriela Rocha - Lugar Secreto (Ao Vivo) [Clipe Oficial]" -> ["Gabriela Rocha", "Lugar Secreto"] */
    private function splitYoutubeTitle(string $raw, string $channel): array
    {
        $clean = preg_replace('/[\(\[][^\)\]]*(oficial|official|clipe|video|vídeo|lyric|letra|ao vivo|live|audio|áudio|4k|hd|remaster|visualizer|playback)[^\)\]]*[\)\]]/iu', '', $raw);
        $clean = trim(preg_replace('/\s*\|.*$/u', '', $clean)); // "… | Álbum tal"
        $clean = trim(preg_replace('/\s{2,}/u', ' ', $clean), " -–—");

        $channel = trim(preg_replace('/\s*-\s*Topic$|VEVO$|\s+Oficial$|\s+Official$/iu', '', $channel));

        if (preg_match('/^(.+?)\s+[-–—]\s+(.+)$/u', $clean, $m)) {
            // "Cantor - Música"; se o canal for o 2º pedaço, a ordem está invertida.
            return Str::lower($m[2]) === Str::lower($channel) ? [trim($m[2]), trim($m[1])] : [trim($m[1]), trim($m[2])];
        }

        return [$channel ?: null, $clean];
    }

    private function expand(string $url): string
    {
        if (! preg_match('#^https?://#i', $url)) {
            $url = 'https://'.$url;
        }
        if (! filter_var($url, FILTER_VALIDATE_URL)) {
            throw ValidationException::withMessages(['url' => 'Isso não parece um link. Copie o link da música e cole aqui.']);
        }
        // Links curtos: segue o redirecionamento só até descobrir o endereço final.
        for ($i = 0; $i < 4 && in_array($this->host($url), self::SHORT_HOSTS, true); $i++) {
            if ($this->host($url) === 'youtu.be') {
                return 'https://www.youtube.com/watch?v='.trim((string) parse_url($url, PHP_URL_PATH), '/');
            }
            $location = Http::timeout(self::TIMEOUT)->withoutRedirecting()->get($url)->header('Location');
            if (! $location) {
                break;
            }
            $url = $location;
        }

        return $url;
    }

    private function host(string $url): string
    {
        return preg_replace('/^www\./', '', strtolower((string) parse_url($url, PHP_URL_HOST)));
    }

    /** @param  list<string>  $allowed */
    private function isHost(string $host, array $allowed): bool
    {
        foreach ($allowed as $a) {
            if ($host === $a || str_ends_with($host, '.'.$a)) {
                return true;
            }
        }

        return false;
    }

    private function json(string $url, array $query = []): ?array
    {
        try {
            $response = Http::timeout(self::TIMEOUT)->withHeaders(['User-Agent' => 'Ministre/1.0 (ministreapp.com.br)'])->get($url, $query);

            return $response->ok() ? $response->json() : null;
        } catch (\Throwable) {
            return null; // serviço fora do ar: a pessoa preenche à mão
        }
    }

    private function get(string $url): string
    {
        try {
            return (string) Http::timeout(self::TIMEOUT)->withHeaders(['User-Agent' => 'Mozilla/5.0', 'Accept-Language' => 'pt-BR'])->get($url)->body();
        } catch (\Throwable) {
            return '';
        }
    }

    private function meta(string $html, string $property): ?string
    {
        if (! preg_match('/<meta[^>]+property="'.preg_quote($property, '/').'"[^>]+content="([^"]*)"/i', $html, $m)) {
            return null;
        }

        return html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8') ?: null;
    }
}
