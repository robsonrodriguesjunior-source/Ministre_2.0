<?php

use App\Models\Event;
use App\Models\EventAssignment;
use App\Models\MinistryMember;
use App\Models\Position;
use App\Models\User;
use Database\Seeders\DemoSeeder;

// Cadastro direto pelo líder (18/11/2026): nome, WhatsApp e funções; a pessoa entra depois pelo convite pessoal.

beforeEach(function () {
    $this->seed(DemoSeeder::class);
    $this->daniel = User::where('email', 'daniel@demo.ministreapp.com.br')->first();
    $this->marcos = User::where('email', 'marcos@demo.ministreapp.com.br')->first();
    $this->ministryId = $this->daniel->memberships()->first()->ministry_id;
    $this->bateria = Position::where('ministry_id', $this->ministryId)->where('name', 'Bateria')->first();
    $this->violao = Position::where('ministry_id', $this->ministryId)->where('name', 'Violão')->first();
});

function asLeaderOf(User $user, $test)
{
    return $test->actingAs($user)->withHeader('X-Ministry-Id', (string) $test->ministryId);
}

function registerLucas($test): array
{
    return asLeaderOf($test->daniel, $test)->postJson('/api/v1/members', [
        'name' => 'Pedro Henrique',
        'phone' => '(11) 97777-1234',
        'position_ids' => [$test->bateria->id],
    ])->assertCreated()->json();
}

it('lets the leader register a member who can be scheduled right away', function () {
    $res = registerLucas($this);

    expect($res['data']['pending'])->toBeTrue()
        ->and($res['data']['email'])->toBeNull()
        ->and($res['data']['positions'][0]['name'])->toBe('Bateria')
        ->and($res['invite']['code'])->toHaveLength(8)
        ->and($res['invite']['link'])->toContain('/convite/'.$res['invite']['code']);

    $list = asLeaderOf($this->daniel, $this)->getJson('/api/v1/members')->assertOk()->json('data');
    expect(collect($list)->firstWhere('name', 'Pedro Henrique')['pending'])->toBeTrue();

    // A conta provisória nunca entra, nem pede código de senha.
    $temp = User::where('name', 'Pedro Henrique')->first();
    expect($temp->is_placeholder)->toBeTrue();
    $this->postJson('/api/v1/auth/login', ['email' => $temp->email, 'password' => 'qualquer-coisa', 'device_name' => 't'])
        ->assertUnprocessable();
});

it('refuses registration by someone who is not a leader and validates the name', function () {
    asLeaderOf($this->marcos, $this)->postJson('/api/v1/members', ['name' => 'Fulano'])->assertForbidden();
    asLeaderOf($this->daniel, $this)->postJson('/api/v1/members', ['name' => ''])
        ->assertUnprocessable()->assertJsonValidationErrors(['name' => 'Digite o nome da pessoa.']);
});

it('moves the member, functions and schedules to the real account when the invite is accepted', function () {
    $res = registerLucas($this);
    $memberId = $res['data']['id'];
    $tempId = User::where('name', 'Pedro Henrique')->value('id');

    // Já escalado antes de entrar no app.
    $event = Event::where('ministry_id', $this->ministryId)->where('starts_at', '>', now())->first();
    EventAssignment::create(['event_id' => $event->id, 'ministry_member_id' => $memberId, 'position_id' => $this->bateria->id, 'status' => 'pending']);

    // A pessoa abre o link: vê o nome e as funções que o líder marcou.
    $this->getJson('/api/v1/invites/'.$res['invite']['code'])->assertOk()
        ->assertJsonPath('member.name', 'Pedro Henrique')
        ->assertJsonPath('member.positions.0', 'Bateria');

    $lucas = User::factory()->create(['name' => 'Lucas R.', 'phone' => null]);
    $this->actingAs($lucas)->postJson('/api/v1/invites/'.$res['invite']['code'].'/accept', ['positions' => [$this->violao->id]])->assertOk();

    $member = MinistryMember::find($memberId);
    expect($member->user_id)->toBe($lucas->id)
        ->and($member->joined_at)->not->toBeNull()
        ->and($member->positions()->pluck('name')->sort()->values()->all())->toBe(['Bateria', 'Violão'])
        ->and(EventAssignment::where('ministry_member_id', $memberId)->count())->toBe(1)
        ->and(User::withTrashed()->find($tempId))->toBeNull()
        ->and($lucas->fresh()->phone)->toBe('(11) 97777-1234');

    // Convite pessoal é de uso único.
    $other = User::factory()->create();
    $this->actingAs($other)->postJson('/api/v1/invites/'.$res['invite']['code'].'/accept', ['positions' => []])->assertUnprocessable();
});

it('joins everything into the existing member when the person was already in the ministry', function () {
    $res = registerLucas($this);
    $memberId = $res['data']['id'];
    $marcosMember = $this->marcos->memberships()->where('ministry_id', $this->ministryId)->first();
    $event = Event::where('ministry_id', $this->ministryId)->where('starts_at', '>', now())->first();
    EventAssignment::where('event_id', $event->id)->where('ministry_member_id', $marcosMember->id)->delete();
    EventAssignment::create(['event_id' => $event->id, 'ministry_member_id' => $memberId, 'position_id' => $this->bateria->id, 'status' => 'pending']);

    $this->actingAs($this->marcos)->postJson('/api/v1/invites/'.$res['invite']['code'].'/accept', ['positions' => []])->assertOk();

    expect(MinistryMember::find($memberId))->toBeNull()
        ->and($marcosMember->positions()->pluck('name')->all())->toContain('Bateria')
        ->and(EventAssignment::where('event_id', $event->id)->where('ministry_member_id', $marcosMember->id)->exists())->toBeTrue();
});

it('creates a new personal invite on request while the person has not joined', function () {
    $res = registerLucas($this);
    $again = asLeaderOf($this->daniel, $this)->postJson('/api/v1/members/'.$res['data']['id'].'/invite')->assertOk()->json('invite');
    expect($again['code'])->not->toBe($res['invite']['code']);

    $marcosMember = $this->marcos->memberships()->where('ministry_id', $this->ministryId)->first();
    asLeaderOf($this->daniel, $this)->postJson('/api/v1/members/'.$marcosMember->id.'/invite')->assertUnprocessable();
});
