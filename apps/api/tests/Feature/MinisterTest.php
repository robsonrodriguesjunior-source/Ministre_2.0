<?php

use App\Models\AppNotification;
use App\Models\Event;
use App\Models\EventAssignment;
use App\Models\Position;
use App\Models\Song;
use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Support\Facades\Http;

// Ministro da escala: só o líder marca a estrela; o ministro monta o repertório só daquela escala.
beforeEach(function () {
    $this->seed(DemoSeeder::class);
    $this->daniel = User::where('email', 'daniel@demo.ministreapp.com.br')->first();
    $this->marcos = User::where('email', 'marcos@demo.ministreapp.com.br')->first();
    $this->ministryId = $this->daniel->memberships()->first()->ministry_id;
    $this->marcosMember = $this->marcos->memberships()->first();
    $this->familia = Event::where('title', 'Culto da Família')->where('starts_at', '>', now())->first();
    $this->song = Song::where('ministry_id', $this->ministryId)->first();
    // Outra escala em que o Marcos está, mas sem estrela.
    $this->other = Event::whereKeyNot($this->familia->id)
        ->whereHas('assignments', fn ($q) => $q->where('ministry_member_id', $this->marcosMember->id))
        ->where('starts_at', '>', now())->first();
});

function as_(User $user, $test)
{
    return $test->actingAs($user)->withHeader('X-Ministry-Id', (string) $test->ministryId);
}

function star($test, Event $event, int $memberId, bool $on = true)
{
    return as_($test->daniel, $test)->putJson("/api/v1/events/{$event->id}/minister", ['member_id' => $memberId, 'minister' => $on]);
}

it('a member without the star cannot change the repertoire of a schedule', function () {
    as_($this->marcos, $this)->getJson("/api/v1/events/{$this->familia->id}")->assertOk()->assertJsonPath('data.can_edit_songs', false);
    as_($this->marcos, $this)->putJson("/api/v1/events/{$this->familia->id}/songs", ['songs' => [['song_id' => $this->song->id]]])
        ->assertForbidden();
});

it('only the leader can set the minister star', function () {
    as_($this->marcos, $this)->putJson("/api/v1/events/{$this->familia->id}/minister", ['member_id' => $this->marcosMember->id, 'minister' => true])
        ->assertForbidden();

    star($this, $this->familia, $this->marcosMember->id)->assertOk();
    expect(EventAssignment::where('event_id', $this->familia->id)->where('ministry_member_id', $this->marcosMember->id)->where('is_minister', true)->exists())->toBeTrue();
});

it('the star only goes to someone scheduled in that schedule', function () {
    $inTeam = EventAssignment::where('event_id', $this->familia->id)->pluck('ministry_member_id');
    $outsider = \App\Models\MinistryMember::where('ministry_id', $this->ministryId)->whereNotIn('id', $inTeam)->first();
    star($this, $this->familia, $outsider->id)->assertStatus(422);
});

it('the minister edits the repertoire of their schedule and gets notified', function () {
    star($this, $this->familia, $this->marcosMember->id)->assertOk();

    $detail = as_($this->marcos, $this)->getJson("/api/v1/events/{$this->familia->id}")->assertOk();
    $detail->assertJsonPath('data.can_edit_songs', true);
    expect(collect($detail->json('data.team'))->firstWhere('member_id', $this->marcosMember->id)['is_minister'])->toBeTrue();

    as_($this->marcos, $this)->putJson("/api/v1/events/{$this->familia->id}/songs", ['songs' => [['song_id' => $this->song->id, 'key' => 'A']]])
        ->assertOk()->assertJsonPath('data.songs.0.key', 'A');

    expect(AppNotification::where('user_id', $this->marcos->id)->where('type', 'minister')->exists())->toBeTrue();
});

it('the minister cannot touch schedules where they are not the minister', function () {
    star($this, $this->familia, $this->marcosMember->id)->assertOk();
    expect($this->other)->not->toBeNull();

    as_($this->marcos, $this)->getJson("/api/v1/events/{$this->other->id}")->assertOk()->assertJsonPath('data.can_edit_songs', false);
    as_($this->marcos, $this)->putJson("/api/v1/events/{$this->other->id}/songs", ['songs' => [['song_id' => $this->song->id]]])
        ->assertForbidden();
});

it('the minister creates a new song only from inside their schedule', function () {
    $new = ['title' => 'Canção do ministro', 'original_key' => 'D'];
    as_($this->marcos, $this)->postJson('/api/v1/songs', $new)->assertForbidden();

    star($this, $this->familia, $this->marcosMember->id)->assertOk();
    as_($this->marcos, $this)->postJson('/api/v1/songs', $new)->assertForbidden(); // sem dizer a escala
    as_($this->marcos, $this)->postJson('/api/v1/songs', [...$new, 'event_id' => $this->other->id])->assertForbidden();
    as_($this->marcos, $this)->postJson('/api/v1/songs', [...$new, 'event_id' => $this->familia->id])->assertCreated();
});

it('the minister cannot edit or delete songs of the library', function () {
    star($this, $this->familia, $this->marcosMember->id)->assertOk();
    as_($this->marcos, $this)->patchJson("/api/v1/songs/{$this->song->id}", ['title' => 'Outro nome'])->assertForbidden();
    as_($this->marcos, $this)->deleteJson("/api/v1/songs/{$this->song->id}")->assertForbidden();
});

it('removing the star takes the permission away', function () {
    star($this, $this->familia, $this->marcosMember->id)->assertOk();
    star($this, $this->familia, $this->marcosMember->id, false)->assertOk();
    as_($this->marcos, $this)->putJson("/api/v1/events/{$this->familia->id}/songs", ['songs' => []])->assertForbidden();
});

it('the star stays when the leader changes the minister position', function () {
    star($this, $this->familia, $this->marcosMember->id)->assertOk();
    $teclado = Position::where('ministry_id', $this->ministryId)->where('name', 'Teclado')->first();
    $team = $this->familia->assignments()->get()->map(fn ($a) => [
        'member_id' => $a->ministry_member_id,
        'position_id' => $a->ministry_member_id === $this->marcosMember->id ? $teclado->id : $a->position_id,
    ])->all();

    as_($this->daniel, $this)->putJson("/api/v1/events/{$this->familia->id}/assignments", ['team' => $team])->assertOk();
    expect(EventAssignment::where('event_id', $this->familia->id)->where('ministry_member_id', $this->marcosMember->id)->value('is_minister'))->toBeTrue();
});

it('importing by link is for the leader or someone who is a minister', function () {
    Http::fake(['*' => Http::response('', 404)]);
    as_($this->marcos, $this)->postJson('/api/v1/songs/lookup', ['url' => 'https://www.youtube.com/watch?v=abc'])->assertForbidden();

    star($this, $this->familia, $this->marcosMember->id)->assertOk();
    $status = as_($this->marcos, $this)->postJson('/api/v1/songs/lookup', ['url' => 'https://www.youtube.com/watch?v=abc'])->status();
    expect($status)->not->toBe(403);
});
