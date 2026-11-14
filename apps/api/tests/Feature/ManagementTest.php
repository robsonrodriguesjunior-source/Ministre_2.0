<?php

use App\Models\EventAssignment;
use App\Models\EventType;
use App\Models\MinistryMember;
use App\Models\Position;
use App\Models\User;
use Database\Seeders\DemoSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seed(DemoSeeder::class);
    $this->daniel = User::where('email', 'daniel@demo.ministreapp.com.br')->first();
    $this->marcos = User::where('email', 'marcos@demo.ministreapp.com.br')->first();
    $this->ministryId = $this->daniel->memberships()->first()->ministry_id;
    $this->marcosMember = $this->marcos->memberships()->first();
});

function lead(User $user, $test)
{
    return $test->actingAs($user)->withHeader('X-Ministry-Id', (string) $test->ministryId);
}

/** Uma foto JPEG de verdade (o GD precisa conseguir ler). */
function photo(int $w = 900, int $h = 600): UploadedFile
{
    $img = imagecreatetruecolor($w, $h);
    imagefill($img, 0, 0, imagecolorallocate($img, 247, 115, 28));
    $path = tempnam(sys_get_temp_dir(), 'foto').'.jpg';
    imagejpeg($img, $path);

    return new UploadedFile($path, 'foto.jpg', 'image/jpeg', null, true);
}

// ---- Perfil ----

it('updates name and phone, and the profile photo becomes a small square', function () {
    Storage::fake('public');

    lead($this->marcos, $this)->patchJson('/api/v1/me', ['name' => 'Marcos Andrade', 'phone' => '(11) 99999-0000'])
        ->assertOk()->assertJsonPath('data.name', 'Marcos Andrade');

    $url = lead($this->marcos, $this)->post('/api/v1/me/avatar', ['photo' => photo()], ['Accept' => 'application/json'])
        ->assertOk()->json('data.avatar_url');
    $path = $this->marcos->fresh()->avatar_path;
    expect($url)->toContain($path);
    Storage::disk('public')->assertExists($path);
    [$w, $h] = getimagesizefromstring(Storage::disk('public')->get($path));
    expect([$w, $h])->toBe([512, 512]);

    lead($this->marcos, $this)->deleteJson('/api/v1/me/avatar')->assertOk()->assertJsonPath('data.avatar_url', null);
    Storage::disk('public')->assertMissing($path);
});

it('refuses a file that is not an image', function () {
    Storage::fake('public');
    lead($this->marcos, $this)->post('/api/v1/me/avatar', ['photo' => UploadedFile::fake()->create('nota.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])
        ->assertUnprocessable()->assertJsonValidationErrors(['photo' => 'Escolha uma foto (JPG ou PNG).']);
});

it('shows my simple stats for the year', function () {
    lead($this->marcos, $this)->getJson('/api/v1/me/stats')->assertOk()
        ->assertJsonStructure(['data' => ['year', 'events', 'confirmed_rate']])
        ->assertJsonPath('data.events', fn ($n) => $n >= 2);
});

it('deletes the account only after typing EXCLUIR and keeps the history anonymous', function () {
    lead($this->marcos, $this)->deleteJson('/api/v1/me', ['confirm' => 'excluir'])
        ->assertUnprocessable()->assertJsonValidationErrors(['confirm']);

    $pastCount = EventAssignment::where('ministry_member_id', $this->marcosMember->id)
        ->whereHas('event', fn ($q) => $q->where('starts_at', '<', now()))->count();

    lead($this->marcos, $this)->deleteJson('/api/v1/me', ['confirm' => 'EXCLUIR'])->assertOk();

    $gone = User::withTrashed()->find($this->marcos->id);
    expect($gone->trashed())->toBeTrue()
        ->and($gone->name)->toBe('Pessoa removida')
        ->and($gone->email)->toEndWith('@ministreapp.invalid')
        ->and($gone->phone)->toBeNull()
        ->and($gone->tokens()->count())->toBe(0)
        ->and($this->marcosMember->fresh()->status)->toBe(MinistryMember::STATUS_REMOVED);
    // Saiu das escalas futuras; as passadas ficam (anônimas).
    expect(EventAssignment::where('ministry_member_id', $this->marcosMember->id)->count())->toBe($pastCount);

    $this->postJson('/api/v1/auth/login', ['email' => 'marcos@demo.ministreapp.com.br', 'password' => 'demo1234'])->assertUnprocessable();
});

it('does not let the only leader delete the account while there is a team', function () {
    lead($this->daniel, $this)->deleteJson('/api/v1/me', ['confirm' => 'EXCLUIR'])
        ->assertUnprocessable()->assertJsonValidationErrors(['confirm']);
});

// ---- Membros ----

it('lists the members for leaders only', function () {
    lead($this->marcos, $this)->getJson('/api/v1/members')->assertForbidden();

    $members = lead($this->daniel, $this)->getJson('/api/v1/members')->assertOk()->json('data');
    expect($members)->toHaveCount(8)
        ->and($members[0]['role'])->toBe('leader')
        ->and($members[0]['is_me'])->toBeTrue();
});

it('changes role and positions of a member', function () {
    $teclado = Position::where('ministry_id', $this->ministryId)->where('name', 'Teclado')->first();

    lead($this->daniel, $this)->patchJson("/api/v1/members/{$this->marcosMember->id}", [
        'role' => 'leader', 'position_ids' => [$teclado->id],
    ])->assertOk()->assertJsonPath('data.role', 'leader')->assertJsonPath('data.positions.0.name', 'Teclado');

    // Agora o Marcos também é líder e pode gerenciar.
    lead($this->marcos, $this)->getJson('/api/v1/members')->assertOk();
});

it('never leaves the ministry without a leader', function () {
    $danielMember = $this->daniel->memberships()->first();
    lead($this->daniel, $this)->patchJson("/api/v1/members/{$danielMember->id}", ['role' => 'member'])
        ->assertUnprocessable()->assertJsonValidationErrors(['role' => 'O ministério precisa de pelo menos um líder.']);
    lead($this->daniel, $this)->deleteJson("/api/v1/members/{$danielMember->id}")->assertUnprocessable();
});

it('removes a member from future schedules but keeps the history', function () {
    lead($this->daniel, $this)->deleteJson("/api/v1/members/{$this->marcosMember->id}")->assertOk();

    expect($this->marcosMember->fresh()->status)->toBe(MinistryMember::STATUS_REMOVED)
        ->and(EventAssignment::where('ministry_member_id', $this->marcosMember->id)
            ->whereHas('event', fn ($q) => $q->where('starts_at', '>', now()))->count())->toBe(0);
    lead($this->marcos, $this)->getJson('/api/v1/home')->assertForbidden();
});

// ---- Funções ----

it('creates, renames, reorders and archives positions', function () {
    lead($this->marcos, $this)->postJson('/api/v1/manage/positions', ['name' => 'Sax'])->assertForbidden();

    $id = lead($this->daniel, $this)->postJson('/api/v1/manage/positions', ['name' => 'Sax'])->assertCreated()->json('data.id');
    lead($this->daniel, $this)->postJson('/api/v1/manage/positions', ['name' => 'Sax'])
        ->assertUnprocessable()->assertJsonValidationErrors(['name' => 'Já existe uma função com esse nome.']);
    lead($this->daniel, $this)->patchJson("/api/v1/manage/positions/{$id}", ['name' => 'Saxofone'])->assertOk()->assertJsonPath('data.name', 'Saxofone');

    $ids = Position::where('ministry_id', $this->ministryId)->orderBy('sort_order')->pluck('id')->all();
    $reversed = array_reverse($ids);
    $list = lead($this->daniel, $this)->putJson('/api/v1/manage/positions/order', ['ids' => $reversed])->assertOk()->json('data');
    expect(collect($list)->pluck('id')->all())->toBe($reversed);

    lead($this->daniel, $this)->patchJson("/api/v1/manage/positions/{$id}", ['archived' => true])->assertOk()->assertJsonPath('data.archived', true);
    // Arquivada some das escolhas (assistente e convite).
    expect(collect(lead($this->daniel, $this)->getJson('/api/v1/positions')->json('data'))->pluck('name'))->not->toContain('Saxofone');
});

// ---- Tipos de culto ----

it('creates, edits and removes service types', function () {
    $id = lead($this->daniel, $this)->postJson('/api/v1/manage/event-types', [
        'name' => 'Culto Jovem', 'weekday' => 6, 'default_time' => '19:30', 'default_location' => 'Salão',
    ])->assertCreated()->assertJsonPath('data.default_time', '19:30')->json('data.id');

    lead($this->daniel, $this)->patchJson("/api/v1/manage/event-types/{$id}", ['name' => 'Culto Jovem', 'default_time' => '7h'])
        ->assertUnprocessable()->assertJsonValidationErrors(['default_time' => 'Use o horário assim: 19:00.']);
    lead($this->daniel, $this)->patchJson("/api/v1/manage/event-types/{$id}", ['name' => 'Culto Jovem', 'weekday' => 5, 'default_time' => '20:00'])
        ->assertOk()->assertJsonPath('data.weekday', 5);

    lead($this->daniel, $this)->deleteJson("/api/v1/manage/event-types/{$id}")->assertOk();
    expect(EventType::find($id))->toBeNull();
});

// ---- Ministério ----

it('edits the ministry name, place, service days and logo', function () {
    Storage::fake('public');

    lead($this->daniel, $this)->patchJson('/api/v1/manage/ministry', [
        'name' => 'Louvor Central', 'default_location' => 'Templo Novo', 'worship_days' => [3, 0, 0],
    ])->assertOk()->assertJsonPath('data.name', 'Louvor Central')->assertJsonPath('data.worship_days', [0, 3]);

    $logo = lead($this->daniel, $this)->post('/api/v1/manage/ministry/logo', ['photo' => photo(400, 400)], ['Accept' => 'application/json'])
        ->assertOk()->json('data.logo_url');
    expect($logo)->toContain('logos/');

    // Aparece para todos no seletor de ministério.
    expect(lead($this->marcos, $this)->getJson('/api/v1/me/ministries')->json('data.0.ministry.logo_url'))->toBe($logo);
    lead($this->marcos, $this)->patchJson('/api/v1/manage/ministry', ['name' => 'X'])->assertForbidden();
});

// ---- Indisponibilidades da equipe ----

it('shows who cannot serve in the month', function () {
    $sunday = \App\Models\Unavailability::first()->starts_on;

    $data = lead($this->daniel, $this)->getJson('/api/v1/manage/unavailabilities?month='.$sunday->format('Y-m'))->assertOk()->json('data');
    expect(collect($data)->pluck('name'))->toContain('Marina Costa');

    lead($this->marcos, $this)->getJson('/api/v1/manage/unavailabilities')->assertForbidden();
});
