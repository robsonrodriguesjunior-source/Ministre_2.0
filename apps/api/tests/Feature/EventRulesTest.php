<?php

use App\Models\AppNotification;
use App\Models\Event;
use App\Models\EventAssignment;
use App\Models\MinistryMember;
use App\Models\Unavailability;
use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\DemoSeeder;

beforeEach(function () {
    $this->seed(DemoSeeder::class);
    $this->daniel = User::where('email', 'daniel@demo.ministreapp.com.br')->first();
    $this->marcos = User::where('email', 'marcos@demo.ministreapp.com.br')->first();
    $this->marina = User::where('email', 'marina@demo.ministreapp.com.br')->first();
    $this->ministryId = $this->daniel->memberships()->first()->ministry_id;
    $this->familia = Event::where('title', 'Culto da Família')->first();
    $this->member = fn (User $u) => $u->memberships()->first();
    $this->position = fn (string $name) => \App\Models\Position::where('ministry_id', $this->ministryId)->where('name', $name)->first();
});

function actor(User $user, $test)
{
    return $test->actingAs($user)->withHeader('X-Ministry-Id', (string) $test->ministryId);
}

it('blocks scheduling someone who marked unavailable on the day', function () {
    $marina = ($this->member)($this->marina);
    $teclado = ($this->position)('Teclado');

    actor($this->daniel, $this)->putJson("/api/v1/events/{$this->familia->id}/assignments", [
        'team' => [['member_id' => $marina->id, 'position_id' => $teclado->id]],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['team.0' => 'Marina Costa marcou que não pode neste dia.']);
});

it('availability lists who cannot and who is already scheduled that day', function () {
    $day = CarbonImmutable::instance($this->familia->starts_at)->setTimezone('America/Sao_Paulo')->toDateString();

    $data = actor($this->daniel, $this)->getJson("/api/v1/events/availability?date={$day}")->assertOk()->json('positions');
    $teclado = collect($data)->firstWhere('name', 'Teclado')['members'];
    $violao = collect($data)->firstWhere('name', 'Violão')['members'];

    expect(collect($teclado)->firstWhere('name', 'Marina Costa')['unavailable'])->toBeTrue()
        ->and(collect($violao)->firstWhere('name', 'Marcos')['busy_at'])->toBe(['19h00']);
});

it('keeps answers for who stays, new people start pending and get notified', function () {
    $team = $this->familia->assignments()->get()->map(fn ($a) => ['member_id' => $a->ministry_member_id, 'position_id' => $a->position_id])->all();
    $marinaId = ($this->member)(User::where('email', 'marina@demo.ministreapp.com.br')->first())->id;
    Unavailability::query()->delete();
    $team[] = ['member_id' => $marinaId, 'position_id' => ($this->position)('Teclado')->id];

    actor($this->daniel, $this)->putJson("/api/v1/events/{$this->familia->id}/assignments", ['team' => $team])->assertOk();

    expect($this->familia->assignments()->where('status', 'confirmed')->count())->toBe(5)
        ->and(EventAssignment::where('ministry_member_id', $marinaId)->where('event_id', $this->familia->id)->value('status'))->toBe('pending')
        ->and(AppNotification::where('user_id', $this->marina->id)->where('type', 'scheduled')->exists())->toBeTrue();
});

it('members cannot create, edit or publish events', function () {
    actor($this->marcos, $this)->postJson('/api/v1/events', ['title' => 'X', 'starts_at' => now()->addDay()->toIso8601String()])
        ->assertForbidden();
    actor($this->marcos, $this)->patchJson("/api/v1/events/{$this->familia->id}", ['title' => 'Outro'])->assertForbidden();
    actor($this->marcos, $this)->postJson("/api/v1/events/{$this->familia->id}/remind-pending")->assertForbidden();
});

it('drafts are hidden from members and publishing notifies the team', function () {
    $draft = actor($this->daniel, $this)->postJson('/api/v1/events', [
        'title' => 'Culto Jovem', 'starts_at' => now()->addDays(10)->toIso8601String(), 'location' => 'Templo',
    ])->assertCreated()->json('data');

    expect($draft['status'])->toBe('draft');
    actor($this->daniel, $this)->putJson("/api/v1/events/{$draft['id']}/assignments", [
        'team' => [['member_id' => ($this->member)($this->marcos)->id, 'position_id' => ($this->position)('Violão')->id]],
    ])->assertOk();
    expect(AppNotification::where('user_id', $this->marcos->id)->count())->toBe(0); // rascunho não notifica

    actor($this->marcos, $this)->getJson("/api/v1/events/{$draft['id']}")->assertForbidden();
    $titles = collect(actor($this->marcos, $this)->getJson('/api/v1/events')->json('data'))->pluck('title');
    expect($titles)->not->toContain('Culto Jovem');

    actor($this->daniel, $this)->postJson("/api/v1/events/{$draft['id']}/publish")->assertOk()->assertJsonPath('data.status', 'published');
    expect(AppNotification::where('user_id', $this->marcos->id)->where('type', 'scheduled')->value('title'))->toBe('Você foi escalado no Violão');
});

it('a member confirms and declines only their own assignment, and the leader is told', function () {
    $mine = $this->familia->assignments()->where('ministry_member_id', ($this->member)($this->marcos)->id)->first();
    $other = $this->familia->assignments()->where('ministry_member_id', '!=', ($this->member)($this->marcos)->id)->first();

    actor($this->marcos, $this)->postJson("/api/v1/assignments/{$mine->id}/confirm")->assertOk();
    expect($mine->fresh()->status)->toBe('confirmed');

    actor($this->marcos, $this)->postJson("/api/v1/assignments/{$other->id}/confirm")
        ->assertForbidden()
        ->assertJsonPath('message', 'Você só pode responder as suas escalas.');

    actor($this->marcos, $this)->postJson("/api/v1/assignments/{$mine->id}/decline", ['reason' => 'Viagem'])->assertOk();
    expect($mine->fresh()->status)->toBe('declined')
        ->and($mine->fresh()->decline_reason)->toBe('Viagem')
        ->and(AppNotification::where('user_id', $this->daniel->id)->where('type', 'declined')->value('title'))->toBe('Marcos não pode (Violão)');
});

it('reminds only pending people, at most once every 6 hours', function () {
    $first = actor($this->daniel, $this)->postJson("/api/v1/events/{$this->familia->id}/remind-pending")->assertOk()->json();
    expect($first['reminded'])->toBe(2); // Marcos e Rafael

    $again = actor($this->daniel, $this)->postJson("/api/v1/events/{$this->familia->id}/remind-pending")->assertOk()->json();
    expect($again['reminded'])->toBe(0)
        ->and($again['message'])->toBe('Todos os pendentes já foram lembrados nas últimas 6 horas.');

    $this->travel(7)->hours();
    expect(actor($this->daniel, $this)->postJson("/api/v1/events/{$this->familia->id}/remind-pending")->json('reminded'))->toBe(2);
});

it('duplicates to another date as a draft, leaving out who is unavailable there', function () {
    $newDate = CarbonImmutable::instance($this->familia->starts_at)->addWeeks(3);
    Unavailability::create([
        'ministry_member_id' => ($this->member)($this->marcos)->id,
        'starts_on' => $newDate->setTimezone('America/Sao_Paulo')->toDateString(),
        'ends_on' => $newDate->setTimezone('America/Sao_Paulo')->toDateString(),
    ]);

    $copy = actor($this->daniel, $this)->postJson("/api/v1/events/{$this->familia->id}/duplicate", ['starts_at' => $newDate->toIso8601String()])
        ->assertCreated()->json('data');

    expect($copy['status'])->toBe('draft')
        ->and(collect($copy['team'])->pluck('name'))->not->toContain('Marcos')
        ->and(count($copy['team']))->toBe(6)
        ->and(collect($copy['team'])->every(fn ($t) => $t['status'] === 'pending'))->toBeTrue()
        ->and(count($copy['songs']))->toBe(4);
});

it('marking unavailable can decline the conflicting events and warn the leader', function () {
    $day = CarbonImmutable::instance($this->familia->starts_at)->setTimezone('America/Sao_Paulo')->toDateString();

    $conflicts = actor($this->marcos, $this)->getJson("/api/v1/unavailabilities/conflicts?starts_on={$day}")->assertOk()->json('data');
    expect($conflicts)->toHaveCount(1)->and($conflicts[0]['title'])->toBe('Culto da Família');

    $res = actor($this->marcos, $this)->postJson('/api/v1/unavailabilities', [
        'starts_on' => $day, 'reason' => 'Trabalho', 'decline_conflicts' => true,
    ])->assertCreated()->json();

    expect($res['declined'])->toBe(1)
        ->and($this->familia->assignments()->where('ministry_member_id', ($this->member)($this->marcos)->id)->value('status'))->toBe('declined')
        ->and(AppNotification::where('user_id', $this->daniel->id)->where('type', 'declined')->exists())->toBeTrue();

    expect(actor($this->marcos, $this)->getJson('/api/v1/unavailabilities')->json('data'))->toHaveCount(1);
});

it('weekly unavailability blocks only that weekday', function () {
    $marcos = ($this->member)($this->marcos);
    $wednesday = CarbonImmutable::now('America/Sao_Paulo')->next(CarbonImmutable::WEDNESDAY);
    actor($this->marcos, $this)->postJson('/api/v1/unavailabilities', [
        'starts_on' => $wednesday->toDateString(), 'repeat_weekly' => true,
    ])->assertCreated()->assertJsonPath('data.recurrence_weekday', 3);

    $svc = app(\App\Services\Availability::class);
    expect($svc->isUnavailable($marcos, $wednesday->addWeeks(2)))->toBeTrue()
        ->and($svc->isUnavailable($marcos, $wednesday->addWeeks(2)->addDay()))->toBeFalse();
});

it('home brings the next event where I am scheduled with my position', function () {
    $home = actor($this->marcos, $this)->getJson('/api/v1/home')->assertOk()->json();

    expect($home['next_event']['title'])->toBeIn(['Ensaio geral', 'Culto da Família'])
        ->and($home['announcement']['body'])->toBe('Chegar 30 minutos antes no domingo.')
        ->and($home['next_event']['mine'][0]['position'])->toBe('Violão');
});
