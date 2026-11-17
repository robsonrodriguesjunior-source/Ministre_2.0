<?php

use App\Models\Event;
use App\Models\EventAssignment;
use App\Models\Ministry;
use App\Models\MinistryMember;
use App\Models\Position;
use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\DemoSeeder;

beforeEach(function () {
    $this->seed(DemoSeeder::class);
    $this->daniel = User::where('email', 'daniel@demo.ministreapp.com.br')->first();
    $this->marcos = User::where('email', 'marcos@demo.ministreapp.com.br')->first();
    $this->louvor = $this->daniel->memberships()->first()->ministry;

    // Segundo departamento da mesma igreja: Recepção, com o Marcos servindo também.
    $this->recepcao = Ministry::create(['church_id' => $this->louvor->church_id, 'name' => 'Recepção', 'type' => 'reception']);
    $this->porta = Position::create(['ministry_id' => $this->recepcao->id, 'name' => 'Porta', 'sort_order' => 1]);
    $this->marcosRecepcao = MinistryMember::create([
        'ministry_id' => $this->recepcao->id, 'user_id' => $this->marcos->id,
        'role' => MinistryMember::ROLE_MEMBER, 'status' => MinistryMember::STATUS_ACTIVE, 'joined_at' => now(),
    ]);
});

function overview(User $user, int $ministryId, string $month)
{
    return test()->actingAs($user)->withHeader('X-Ministry-Id', (string) $ministryId)->getJson('/api/v1/church/overview?month='.$month);
}

it('shows the pastor every department of the church, grouped by service time', function () {
    $louvorEvent = Event::where('ministry_id', $this->louvor->id)->where('status', Event::STATUS_PUBLISHED)->where('starts_at', '>', now())->orderBy('starts_at')->first();
    $month = CarbonImmutable::parse($louvorEvent->starts_at)->setTimezone('America/Sao_Paulo')->format('Y-m');

    // Recepção no mesmo horário do culto do Louvor.
    $rec = Event::create([
        'ministry_id' => $this->recepcao->id, 'title' => $louvorEvent->title, 'starts_at' => $louvorEvent->starts_at,
        'status' => Event::STATUS_PUBLISHED, 'visibility' => Event::VISIBILITY_OFFICIAL, 'created_by' => $this->daniel->id,
    ]);
    EventAssignment::create(['event_id' => $rec->id, 'ministry_member_id' => $this->marcosRecepcao->id, 'position_id' => $this->porta->id, 'status' => EventAssignment::STATUS_CONFIRMED]);
    // Rascunho não aparece.
    Event::create([
        'ministry_id' => $this->recepcao->id, 'title' => 'Rascunho', 'starts_at' => $louvorEvent->starts_at->copy()->addHour(),
        'status' => Event::STATUS_DRAFT, 'visibility' => Event::VISIBILITY_OFFICIAL, 'created_by' => $this->daniel->id,
    ]);

    $res = overview($this->daniel, $this->louvor->id, $month)->assertOk();

    expect(collect($res->json('ministries'))->pluck('name')->all())->toContain('Louvor', 'Recepção');
    $service = collect($res->json('services'))->firstWhere('starts_at', $louvorEvent->starts_at->toIso8601String());
    expect(collect($service['departments'])->pluck('ministry')->all())->toContain('Louvor', 'Recepção');
    expect(collect($res->json('services'))->pluck('title')->all())->not->toContain('Rascunho');

    // Marcos aparece uma vez só, com os dois departamentos somados.
    $marcos = collect($res->json('people'))->where('user_id', $this->marcos->id);
    expect($marcos)->toHaveCount(1)
        ->and($marcos->first()['ministries'])->toContain('Louvor', 'Recepção')
        ->and($marcos->first()['scheduled'])->toBeGreaterThanOrEqual(1);
});

it('counts a person in two positions of the same service only once', function () {
    $event = Event::create([
        'ministry_id' => $this->recepcao->id, 'title' => 'Culto de Ensino', 'starts_at' => now()->addDays(3),
        'status' => Event::STATUS_PUBLISHED, 'visibility' => Event::VISIBILITY_OFFICIAL, 'created_by' => $this->daniel->id,
    ]);
    $cafe = Position::create(['ministry_id' => $this->recepcao->id, 'name' => 'Café', 'sort_order' => 2]);
    foreach ([$this->porta, $cafe] as $p) {
        EventAssignment::create(['event_id' => $event->id, 'ministry_member_id' => $this->marcosRecepcao->id, 'position_id' => $p->id, 'status' => EventAssignment::STATUS_PENDING]);
    }
    $month = CarbonImmutable::parse($event->starts_at)->setTimezone('America/Sao_Paulo')->format('Y-m');
    $before = Event::where('ministry_id', $this->louvor->id)->where('status', Event::STATUS_PUBLISHED)
        ->whereHas('assignments.member', fn ($q) => $q->where('user_id', $this->marcos->id))
        ->get()->filter(fn ($e) => CarbonImmutable::parse($e->starts_at)->setTimezone('America/Sao_Paulo')->format('Y-m') === $month)->count();

    $marcos = collect(overview($this->daniel, $this->louvor->id, $month)->assertOk()->json('people'))->firstWhere('user_id', $this->marcos->id);
    expect($marcos['scheduled'])->toBe($before + 1);
});

it('is only for the pastor who owns the church', function () {
    $month = now()->format('Y-m');
    overview($this->marcos, $this->louvor->id, $month)->assertForbidden();

    $this->actingAs($this->marcos)->getJson('/api/v1/me/ministries')->assertOk()
        ->assertJsonPath('data.0.church.is_manager', false);
    $this->actingAs($this->daniel)->getJson('/api/v1/me/ministries')->assertOk()
        ->assertJsonPath('data.0.church.is_owner', true);
});

it('gives the church manager leader access in every department, and the leader only in his own team', function () {
    // O gestor (quem criou a igreja) passa a liderar a Recepção sem ser convidado.
    $ministries = collect($this->actingAs($this->daniel)->getJson('/api/v1/me/ministries')->assertOk()->json('data'));
    $rec = $ministries->firstWhere('ministry.name', 'Recepção');
    expect($rec['role'])->toBe('leader')->and($rec['church']['is_manager'])->toBeTrue();

    // Ana vira líder só da Recepção: manda lá, mas não entra na gestão do Louvor.
    $ana = User::where('email', 'ana@demo.ministreapp.com.br')->first();
    MinistryMember::create(['ministry_id' => $this->recepcao->id, 'user_id' => $ana->id, 'role' => MinistryMember::ROLE_LEADER, 'status' => MinistryMember::STATUS_ACTIVE, 'joined_at' => now()]);
    $this->actingAs($ana)->withHeader('X-Ministry-Id', (string) $this->recepcao->id)->getJson('/api/v1/members')->assertOk();
    $this->actingAs($ana)->withHeader('X-Ministry-Id', (string) $this->louvor->id)->getJson('/api/v1/members')->assertForbidden();
    overview($ana, $this->recepcao->id, now()->format('Y-m'))->assertForbidden();

    // Líder não rebaixa nem remove o gestor.
    $danielRec = MinistryMember::where('ministry_id', $this->recepcao->id)->where('user_id', $this->daniel->id)->first();
    $this->actingAs($ana)->withHeader('X-Ministry-Id', (string) $this->recepcao->id)
        ->patchJson("/api/v1/members/{$danielRec->id}", ['role' => 'member'])->assertUnprocessable();
    $this->actingAs($ana)->withHeader('X-Ministry-Id', (string) $this->recepcao->id)
        ->deleteJson("/api/v1/members/{$danielRec->id}")->assertUnprocessable();
});

it('lets a manager name another manager (not necessarily the pastor) and undo it cleanly', function () {
    $as = fn (User $u) => $this->actingAs($u)->withHeader('X-Ministry-Id', (string) $this->louvor->id);

    // Marcos (membro do Louvor e da Recepção) vira gestor: lidera os dois e vê o painel.
    $as($this->daniel)->postJson('/api/v1/church/managers', ['user_id' => $this->marcos->id])->assertCreated();
    expect(MinistryMember::where('user_id', $this->marcos->id)->where('status', 'active')->pluck('role')->unique()->all())->toBe(['leader']);
    overview($this->marcos, $this->louvor->id, now()->format('Y-m'))->assertOk();
    expect(collect($as($this->daniel)->getJson('/api/v1/church/managers')->json('data'))->pluck('user_id')->all())->toContain($this->daniel->id, $this->marcos->id);

    // Deixa de ser gestor: volta a ser membro comum onde era membro.
    $as($this->daniel)->deleteJson("/api/v1/church/managers/{$this->marcos->id}")->assertOk();
    expect(MinistryMember::where('user_id', $this->marcos->id)->where('status', 'active')->pluck('role')->unique()->all())->toBe(['member']);
    overview($this->marcos, $this->louvor->id, now()->format('Y-m'))->assertForbidden();

    // Quem criou a igreja não sai; membro comum não mexe nos gestores.
    $as($this->daniel)->deleteJson("/api/v1/church/managers/{$this->daniel->id}")->assertUnprocessable();
    $as($this->marcos)->getJson('/api/v1/church/managers')->assertForbidden();
});
