<?php

use App\Models\Song;
use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->seed(DemoSeeder::class);
    $this->daniel = User::where('email', 'daniel@demo.ministreapp.com.br')->first();
    $this->marcos = User::where('email', 'marcos@demo.ministreapp.com.br')->first();
    $this->ministryId = $this->daniel->memberships()->first()->ministry_id;
});

function looker(User $user, $test)
{
    return $test->actingAs($user)->withHeader('X-Ministry-Id', (string) $test->ministryId);
}

const LYRICS = "Primeira linha inventada\nSegunda linha inventada\n\nRefrão inventado";

function fakePlatforms(): void
{
    Http::fake([
        'www.youtube.com/oembed*' => Http::response(['title' => 'Cantora Exemplo - Canção de Teste (Ao Vivo) [Clipe Oficial]', 'author_name' => 'Cantora Exemplo']),
        'open.spotify.com/track/*' => Http::response('<html><meta property="og:title" content="Canção de Teste"><meta property="og:description" content="Cantora Exemplo · Álbum · Song · 2024"></html>'),
        'api.deezer.com/track/*' => Http::response(['id' => 123, 'title' => 'Canção de Teste (Ao Vivo)', 'title_short' => 'Canção de Teste', 'artist' => ['name' => 'Cantora Exemplo'], 'bpm' => 72.4, 'duration' => 300]),
        'link.deezer.com/*' => Http::response('', 302, ['Location' => 'https://www.deezer.com/br/track/123']),
        'lrclib.net/api/search*' => Http::response([
            ['trackName' => 'Canção de Teste', 'duration' => 420, 'instrumental' => false, 'plainLyrics' => 'versão ao vivo'],
            ['trackName' => 'Canção de Teste', 'duration' => 301, 'instrumental' => false, 'plainLyrics' => LYRICS],
        ]),
    ]);
}

it('reads title, singer and lyrics from a YouTube link', function () {
    fakePlatforms();
    looker($this->daniel, $this)->postJson('/api/v1/songs/lookup', ['url' => 'https://youtu.be/abc123'])
        ->assertOk()
        ->assertJsonPath('data.source', 'youtube')
        ->assertJsonPath('data.url', 'https://www.youtube.com/watch?v=abc123')
        ->assertJsonPath('data.title', 'Canção de Teste')
        ->assertJsonPath('data.artist', 'Cantora Exemplo')
        ->assertJsonPath('data.key', null)
        ->assertJsonPath('data.existing', null);
});

it('reads a Spotify track link', function () {
    fakePlatforms();
    looker($this->daniel, $this)->postJson('/api/v1/songs/lookup', ['url' => 'https://open.spotify.com/intl-pt/track/4cOdK2wGLETKBW3PvgPWqT?si=xyz'])
        ->assertOk()
        ->assertJsonPath('data.source', 'spotify')
        ->assertJsonPath('data.url', 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT')
        ->assertJsonPath('data.title', 'Canção de Teste')
        ->assertJsonPath('data.artist', 'Cantora Exemplo');
});

it('reads a Deezer short link with tempo, length and the lyrics of the closest version', function () {
    fakePlatforms();
    looker($this->daniel, $this)->postJson('/api/v1/songs/lookup', ['url' => 'https://link.deezer.com/s/abc'])
        ->assertOk()
        ->assertJsonPath('data.source', 'deezer')
        ->assertJsonPath('data.url', 'https://www.deezer.com/track/123')
        ->assertJsonPath('data.title', 'Canção de Teste')
        ->assertJsonPath('data.bpm', 72)
        ->assertJsonPath('data.duration_sec', 300)
        ->assertJsonPath('data.lyrics', LYRICS);
});

it('refuses links from other sites and invalid text', function () {
    fakePlatforms();
    looker($this->daniel, $this)->postJson('/api/v1/songs/lookup', ['url' => 'https://exemplo.com/musica'])
        ->assertUnprocessable()->assertJsonValidationErrors(['url' => 'Cole um link do YouTube, do Spotify ou do Deezer.']);
    looker($this->daniel, $this)->postJson('/api/v1/songs/lookup', ['url' => 'não é link'])
        ->assertUnprocessable()->assertJsonValidationErrors(['url']);
    looker($this->daniel, $this)->postJson('/api/v1/songs/lookup', ['url' => 'https://open.spotify.com/playlist/abc'])
        ->assertUnprocessable()->assertJsonValidationErrors(['url' => 'Use o link de uma música do Spotify (não de álbum ou playlist).']);
});

it('still works without lyrics when the lyrics service has nothing', function () {
    Http::fake([
        'api.deezer.com/track/*' => Http::response(['title' => 'Sem Letra', 'artist' => ['name' => 'Alguém']]),
        'lrclib.net/*' => Http::response([]),
    ]);
    looker($this->daniel, $this)->postJson('/api/v1/songs/lookup', ['url' => 'https://www.deezer.com/track/9'])
        ->assertOk()->assertJsonPath('data.title', 'Sem Letra')->assertJsonPath('data.lyrics', null);
});

it('warns when the song is already in the library', function () {
    fakePlatforms();
    $song = Song::where('title', 'Luz da Manhã')->first();
    $song->update(['links' => ['https://www.deezer.com/track/123']]);

    looker($this->daniel, $this)->postJson('/api/v1/songs/lookup', ['url' => 'https://www.deezer.com/br/track/123'])
        ->assertOk()->assertJsonPath('data.existing.id', $song->id);
});

it('only leaders import songs', function () {
    fakePlatforms();
    looker($this->marcos, $this)->postJson('/api/v1/songs/lookup', ['url' => 'https://youtu.be/abc'])->assertForbidden();
});

it('lists the listen links in the library and in the schedule', function () {
    Song::where('title', 'Luz da Manhã')->first()->update(['links' => ['https://www.deezer.com/track/123', 'https://youtu.be/abc']]);

    $songs = looker($this->marcos, $this)->getJson('/api/v1/songs?q=Luz')->json('data');
    expect($songs[0]['links'])->toBe([
        ['url' => 'https://www.deezer.com/track/123', 'type' => 'deezer'],
        ['url' => 'https://youtu.be/abc', 'type' => 'youtube'],
    ]);

    $familia = \App\Models\Event::where('title', 'Culto da Família')->where('starts_at', '>', now())->first();
    expect(looker($this->marcos, $this)->getJson("/api/v1/events/{$familia->id}")->json('data.songs.0.links.0.type'))->toBe('deezer');
});
