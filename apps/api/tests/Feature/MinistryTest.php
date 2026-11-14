<?php

use App\Actions\CreateChurchWithMinistry;
use App\Models\Invite;
use App\Models\MinistryMember;
use App\Models\User;
use Database\Seeders\DemoSeeder;

function createMinistryFor(User $leader): MinistryMember
{
    return app(CreateChurchWithMinistry::class)->handle($leader, [
        'church_name' => 'Igreja Exemplo',
        'city' => 'São Paulo',
        'ministry_name' => 'Louvor',
        'positions' => ['Ministro', 'Vocal', 'Violão'],
        'event_types' => ['Culto da Família', 'Ensaio'],
    ]);
}

it('creates church, ministry, positions and event types, and the creator becomes leader', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/churches', [
        'church_name' => 'Igreja Exemplo',
        'city' => 'São Paulo',
        'ministry_name' => 'Louvor',
        'positions' => ['Ministro', 'Vocal', 'Violão'],
        'event_types' => ['Culto da Família'],
    ])->assertCreated()
        ->assertJsonPath('data.role', 'leader')
        ->assertJsonPath('data.ministry.name', 'Louvor')
        ->assertJsonPath('data.church.name', 'Igreja Exemplo');

    $membership = $user->memberships()->first();
    expect($membership->ministry->positions()->count())->toBe(3)
        ->and($membership->ministry->eventTypes()->first()->weekday)->toBe(0);

    $this->actingAs($user)->getJson('/api/v1/me/ministries')
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

it('lets a leader create an invite and a new person join with it choosing positions', function () {
    $leader = User::factory()->create();
    $membership = createMinistryFor($leader);
    $vocal = $membership->ministry->positions()->where('name', 'Vocal')->first();

    $invite = $this->actingAs($leader)
        ->withHeader('X-Ministry-Id', (string) $membership->ministry_id)
        ->postJson('/api/v1/invites')
        ->assertCreated()
        ->json('data');

    expect($invite['code'])->toHaveLength(8)
        ->and($invite['link'])->toEndWith('/convite/'.$invite['code']);

    // Prévia pública (sem login).
    auth()->forgetGuards();
    $this->getJson('/api/v1/invites/'.strtolower($invite['code']))
        ->assertOk()
        ->assertJsonPath('ministry.name', 'Louvor')
        ->assertJsonPath('church.name', 'Igreja Exemplo')
        ->assertJsonCount(3, 'positions');

    $newcomer = User::factory()->create();
    $this->actingAs($newcomer)->postJson('/api/v1/invites/'.$invite['code'].'/accept', ['positions' => [$vocal->id]])
        ->assertOk()
        ->assertJsonPath('data.role', 'member')
        ->assertJsonPath('data.positions.0.name', 'Vocal');

    expect(Invite::first()->uses)->toBe(1);

    $this->actingAs($newcomer)->postJson('/api/v1/invites/'.$invite['code'].'/accept', ['positions' => []])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code.0', 'Você já faz parte deste ministério.');
});

it('refuses expired invites and unknown codes', function () {
    $leader = User::factory()->create();
    $membership = createMinistryFor($leader);
    $invite = Invite::create([
        'ministry_id' => $membership->ministry_id, 'code' => 'ABCDEFGH', 'role' => 'member',
        'expires_at' => now()->subDay(),
    ]);

    $this->actingAs(User::factory()->create())
        ->postJson('/api/v1/invites/'.$invite->code.'/accept', ['positions' => []])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code.0', 'Este convite expirou ou já foi usado.');

    $this->getJson('/api/v1/invites/ZZZZZZZZ')
        ->assertNotFound()
        ->assertJsonPath('message', 'Convite não encontrado. Confira o código.');
});

it('ignores positions from another ministry when joining', function () {
    $leaderA = User::factory()->create();
    $a = createMinistryFor($leaderA);
    $b = createMinistryFor(User::factory()->create());
    $foreign = $b->ministry->positions()->first();
    $invite = Invite::create([
        'ministry_id' => $a->ministry_id, 'code' => 'JOINAAAA', 'role' => 'member', 'expires_at' => now()->addDay(),
    ]);

    $this->actingAs(User::factory()->create())
        ->postJson('/api/v1/invites/JOINAAAA/accept', ['positions' => [$foreign->id]])
        ->assertOk()
        ->assertJsonCount(0, 'data.positions');
});

it('only leaders can create, list and cancel invites', function () {
    $leader = User::factory()->create();
    $membership = createMinistryFor($leader);
    $member = User::factory()->create();
    MinistryMember::create([
        'ministry_id' => $membership->ministry_id, 'user_id' => $member->id,
        'role' => 'member', 'status' => 'active', 'joined_at' => now(),
    ]);
    $invite = Invite::create([
        'ministry_id' => $membership->ministry_id, 'code' => 'LEADERS1', 'role' => 'member', 'expires_at' => now()->addDay(),
    ]);
    $header = ['X-Ministry-Id' => (string) $membership->ministry_id];

    $this->actingAs($member)->withHeaders($header)->postJson('/api/v1/invites')
        ->assertForbidden()
        ->assertJsonPath('message', 'Só líderes do ministério podem fazer isso.');
    $this->actingAs($member)->withHeaders($header)->getJson('/api/v1/invites')->assertForbidden();
    $this->actingAs($member)->withHeaders($header)->deleteJson('/api/v1/invites/'.$invite->id)->assertForbidden();

    $this->actingAs($leader)->withHeaders($header)->getJson('/api/v1/invites')->assertOk()->assertJsonCount(1, 'data');
    $this->actingAs($leader)->withHeaders($header)->deleteJson('/api/v1/invites/'.$invite->id)->assertOk();
});

it('blocks access to a ministry the user does not belong to', function () {
    $mine = createMinistryFor(User::factory()->create());
    $outsider = User::factory()->create();

    $this->actingAs($outsider)
        ->withHeader('X-Ministry-Id', (string) $mine->ministry_id)
        ->getJson('/api/v1/invites')
        ->assertForbidden()
        ->assertJsonPath('message', 'Você não participa deste ministério.');

    $this->flushHeaders();
    $this->actingAs($outsider)->getJson('/api/v1/invites')
        ->assertStatus(400)
        ->assertJsonPath('message', 'Escolha um ministério para continuar.');
});

it('a removed member loses access', function () {
    $leader = User::factory()->create();
    $membership = createMinistryFor($leader);
    $membership->update(['status' => MinistryMember::STATUS_REMOVED]);

    $this->actingAs($leader)
        ->withHeader('X-Ministry-Id', (string) $membership->ministry_id)
        ->getJson('/api/v1/invites')
        ->assertForbidden();
});

it('loads the demo data from section 8', function () {
    $this->seed(DemoSeeder::class);

    $marcos = User::where('email', 'marcos@demo.ministreapp.com.br')->first();
    $membership = $marcos->memberships()->with('positions')->first();

    expect($membership->role)->toBe('member')
        ->and($membership->positions->pluck('name')->all())->toBe(['Violão'])
        ->and(User::where('email', 'daniel@demo.ministreapp.com.br')->first()->memberships()->first()->role)->toBe('leader');

    $familia = \App\Models\Event::where('title', 'Culto da Família')->first();
    expect($familia->assignments()->count())->toBe(7)
        ->and($familia->assignments()->where('status', 'confirmed')->count())->toBe(5)
        ->and($familia->songs()->count())->toBe(4);
});
