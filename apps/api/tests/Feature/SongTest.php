<?php

use App\Models\Event;
use App\Models\Song;
use App\Models\User;
use Database\Seeders\DemoSeeder;

beforeEach(function () {
    $this->seed(DemoSeeder::class);
    $this->daniel = User::where('email', 'daniel@demo.ministreapp.com.br')->first();
    $this->marcos = User::where('email', 'marcos@demo.ministreapp.com.br')->first();
    $this->ministryId = $this->daniel->memberships()->first()->ministry_id;
    $this->luz = Song::where('title', 'Luz da Manhã')->first();
});

function singer(User $user, $test)
{
    return $test->actingAs($user)->withHeader('X-Ministry-Id', (string) $test->ministryId);
}

it('lists the repertoire with how many times each song was played', function () {
    $response = singer($this->marcos, $this)->getJson('/api/v1/songs')->assertOk();

    $luz = collect($response->json('data'))->firstWhere('title', 'Luz da Manhã');
    expect($luz['played_count'])->toBe(2)
        ->and($luz['last_played_at'])->not->toBeNull()
        ->and($luz)->not->toHaveKey('chordpro');
});

it('filters by most played, new songs, tag and search', function () {
    $most = singer($this->marcos, $this)->getJson('/api/v1/songs?filter=most_played')->json('data');
    expect($most[0]['title'])->toBe('Luz da Manhã');

    $new = singer($this->marcos, $this)->getJson('/api/v1/songs?filter=new')->json('data');
    expect(collect($new)->pluck('title')->all())->toBe(['Santo Lugar']);

    $ceia = singer($this->marcos, $this)->getJson('/api/v1/songs?tag=Ceia')->json('data');
    expect(collect($ceia)->pluck('title')->all())->toBe(['Santo Lugar']);

    $celebracao = singer($this->marcos, $this)->getJson('/api/v1/songs?tag='.urlencode('Celebração'))->json('data');
    expect(collect($celebracao)->pluck('title')->all())->toBe(['Coroado', 'Fiel em Tudo']);
    expect(Song::where('title', 'Coroado')->toBase()->value('tags'))->toContain('Celebração'); // gravado com acento

    $search = singer($this->marcos, $this)->getJson('/api/v1/songs?q=graça')->json('data');
    expect(collect($search)->pluck('title')->all())->toBe(['Rio de Graça']);

    singer($this->marcos, $this)->getJson('/api/v1/songs/tags')
        ->assertOk()->assertJson(['data' => ['Adoração', 'Ceia', 'Celebração']]);
});

it('shows a song with its chord chart to any member', function () {
    singer($this->marcos, $this)->getJson("/api/v1/songs/{$this->luz->id}")
        ->assertOk()
        ->assertJsonPath('data.can_manage', false)
        ->assertJsonPath('data.played_count', 2)
        ->assertJson(fn ($json) => $json->where('data.chordpro', fn ($c) => str_contains($c, '[G]Quando a luz'))->etc());
});

it('lets only leaders create, edit and delete songs', function () {
    singer($this->marcos, $this)->postJson('/api/v1/songs', ['title' => 'Nova', 'original_key' => 'G'])->assertForbidden();
    singer($this->marcos, $this)->patchJson("/api/v1/songs/{$this->luz->id}", ['title' => 'X'])->assertForbidden();
    singer($this->marcos, $this)->deleteJson("/api/v1/songs/{$this->luz->id}")->assertForbidden();

    $id = singer($this->daniel, $this)->postJson('/api/v1/songs', [
        'title' => 'Canção Nova',
        'artist' => 'Ministério Exemplo',
        'original_key' => 'Bb',
        'bpm' => 90,
        'duration_sec' => 210,
        'tags' => [' Celebração ', 'Celebração', ''],
        'links' => ['https://www.youtube.com/watch?v=exemplo', 'https://open.spotify.com/track/exemplo'],
        'chordpro' => "[Bb]Uma canção [F]nova",
    ])->assertCreated()
        ->assertJsonPath('data.tags', ['Celebração'])
        ->assertJsonPath('data.links.0.type', 'youtube')
        ->assertJsonPath('data.links.1.type', 'spotify')
        ->assertJsonPath('data.is_new', true)
        ->json('data.id');

    singer($this->daniel, $this)->patchJson("/api/v1/songs/{$id}", ['original_key' => 'C', 'links' => []])
        ->assertOk()->assertJsonPath('data.original_key', 'C')->assertJsonPath('data.links', []);

    singer($this->daniel, $this)->deleteJson("/api/v1/songs/{$id}")->assertOk();
    expect(Song::find($id))->toBeNull();
});

it('validates the key and the links in Portuguese', function () {
    singer($this->daniel, $this)->postJson('/api/v1/songs', [
        'title' => 'Teste', 'original_key' => 'H', 'links' => ['http://inseguro.com'],
    ])->assertUnprocessable()->assertJsonValidationErrors([
        'original_key' => 'Escolha um tom válido (ex.: G, F#, Bb, Em).',
        'links.0' => 'O link precisa começar com https://.',
    ]);
});

it('keeps a deleted song visible in old schedules', function () {
    $familia = Event::where('title', 'Culto da Família')->where('starts_at', '>', now())->first();
    singer($this->daniel, $this)->deleteJson("/api/v1/songs/{$this->luz->id}")->assertOk();

    singer($this->daniel, $this)->getJson("/api/v1/events/{$familia->id}")
        ->assertOk()->assertJsonPath('data.songs.0.title', 'Luz da Manhã');
    expect(collect(singer($this->daniel, $this)->getJson('/api/v1/songs')->json('data'))->pluck('title'))
        ->not->toContain('Luz da Manhã');
});

it('gives the stage mode every chord chart of a schedule in its key', function () {
    $familia = Event::where('title', 'Culto da Família')->where('starts_at', '>', now())->first();

    $songs = singer($this->marcos, $this)->getJson("/api/v1/events/{$familia->id}/stage")
        ->assertOk()->json('data.songs');

    expect(collect($songs)->pluck('title')->all())->toBe(['Luz da Manhã', 'Rio de Graça', 'Fiel em Tudo', 'Coroado'])
        ->and($songs[1]['key'])->toBe('A')
        ->and($songs[1]['chordpro'])->toContain('{c: Refrão}');
});

it('hides draft schedules from the stage mode of members', function () {
    $familia = Event::where('title', 'Culto da Família')->where('starts_at', '>', now())->first();
    $familia->update(['status' => Event::STATUS_DRAFT]);

    singer($this->marcos, $this)->getJson("/api/v1/events/{$familia->id}/stage")->assertForbidden();
});

it('does not show songs from another ministry', function () {
    $other = User::factory()->create();
    $this->actingAs($other)->postJson('/api/v1/churches', [
        'church_name' => 'Outra Igreja', 'ministry_name' => 'Louvor', 'positions' => ['Vocal'], 'event_types' => ['Culto'],
    ])->assertCreated();

    $this->actingAs($other)->withHeader('X-Ministry-Id', (string) $other->memberships()->first()->ministry_id)
        ->getJson("/api/v1/songs/{$this->luz->id}")->assertForbidden();
});
