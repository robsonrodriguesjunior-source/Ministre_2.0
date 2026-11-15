<?php

use App\Models\Event;
use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\DemoSeeder;

beforeEach(function () {
    $this->seed(DemoSeeder::class);
    $this->daniel = User::where('email', 'daniel@demo.ministreapp.com.br')->first();
    $this->marcos = User::where('email', 'marcos@demo.ministreapp.com.br')->first();
    $this->clara = User::where('email', 'clara@demo.ministreapp.com.br')->first();
    $this->ministryId = $this->daniel->memberships()->first()->ministry_id;
    $this->jovens = Event::where('title', 'Culto de Jovens')->first();
    $this->familia = Event::where('title', 'Culto da Família')->where('starts_at', '>', now())->first();
});

function viewer(User $user, $test)
{
    return $test->actingAs($user)->withHeader('X-Ministry-Id', (string) $test->ministryId);
}

it('shows an official schedule to everyone, even who is not scheduled', function () {
    $oracao = Event::where('title', 'Culto de Oração')->first(); // Marcos não está nela
    expect($oracao->visibility)->toBe(Event::VISIBILITY_OFFICIAL);

    expect(collect(viewer($this->marcos, $this)->getJson('/api/v1/events')->json('data'))->pluck('title'))->toContain('Culto de Oração');
    viewer($this->marcos, $this)->getJson("/api/v1/events/{$oracao->id}")->assertOk();
});

it('shows a temporary schedule only to who is scheduled and to leaders', function () {
    $titles = fn (User $u) => collect(viewer($u, $this)->getJson('/api/v1/events')->json('data'))->pluck('title');

    expect($titles($this->marcos))->not->toContain('Culto de Jovens')
        ->and($titles($this->clara))->toContain('Culto de Jovens')
        ->and($titles($this->daniel))->toContain('Culto de Jovens');

    viewer($this->marcos, $this)->getJson("/api/v1/events/{$this->jovens->id}")->assertForbidden();
    viewer($this->marcos, $this)->getJson("/api/v1/events/{$this->jovens->id}/stage")->assertForbidden();
    viewer($this->clara, $this)->getJson("/api/v1/events/{$this->jovens->id}")->assertOk()->assertJsonPath('data.visibility', 'temporary');
});

it('a member added to a temporary schedule starts seeing it', function () {
    $marcos = $this->marcos->memberships()->first();
    $violao = \App\Models\Position::where('ministry_id', $this->ministryId)->where('name', 'Violão')->first();
    $team = $this->jovens->assignments->map(fn ($a) => ['member_id' => $a->ministry_member_id, 'position_id' => $a->position_id])->all();

    viewer($this->daniel, $this)->putJson("/api/v1/events/{$this->jovens->id}/assignments", [
        'team' => [...$team, ['member_id' => $marcos->id, 'position_id' => $violao->id]],
    ])->assertOk();

    viewer($this->marcos, $this)->getJson("/api/v1/events/{$this->jovens->id}")->assertOk();
});

it('the leader creates a temporary schedule with the rehearsal inside it', function () {
    $start = CarbonImmutable::now()->addDays(12)->setTime(22, 0);
    $data = viewer($this->daniel, $this)->postJson('/api/v1/events', [
        'title' => 'Culto especial',
        'starts_at' => $start->toIso8601String(),
        'rehearsal_at' => $start->subDay()->toIso8601String(),
        'visibility' => 'temporary',
    ])->assertCreated()->json('data');

    expect($data['visibility'])->toBe('temporary')
        ->and(CarbonImmutable::parse($data['rehearsal_at'])->equalTo($start->subDay()))->toBeTrue();

    viewer($this->daniel, $this)->patchJson("/api/v1/events/{$data['id']}", ['visibility' => 'banana'])
        ->assertUnprocessable()->assertJsonValidationErrors(['visibility']);
});

it('shows the rehearsal of the week on the home screen, from inside the schedule', function () {
    $home = viewer($this->marcos, $this)->getJson('/api/v1/home')->assertOk()->json();

    expect($home['next_event']['title'])->toBe('Culto da Família')
        ->and($home['next_event']['rehearsal_at'])->not->toBeNull();
    if ($home['rehearsal']) { // só aparece quando o ensaio cai nesta semana
        expect($home['rehearsal']['title'])->toBe('Culto da Família')
            ->and($home['rehearsal']['starts_at'])->toBe($home['next_event']['rehearsal_at']);
    }
});

it('duplicating keeps the rehearsal the same time before the service', function () {
    $newStart = CarbonImmutable::instance($this->familia->starts_at)->addWeeks(3);
    $copy = viewer($this->daniel, $this)->postJson("/api/v1/events/{$this->familia->id}/duplicate", ['starts_at' => $newStart->toIso8601String()])
        ->assertCreated()->json('data');

    $gap = $this->familia->starts_at->getTimestamp() - $this->familia->rehearsal_at->getTimestamp();
    expect(CarbonImmutable::parse($copy['starts_at'])->getTimestamp() - CarbonImmutable::parse($copy['rehearsal_at'])->getTimestamp())->toBe($gap);
});
