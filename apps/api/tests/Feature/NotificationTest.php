<?php

use App\Actions\SendAutomaticReminders;
use App\Actions\SendWeeklySummary;
use App\Jobs\SendPush;
use App\Models\Announcement;
use App\Models\AppNotification;
use App\Models\Event;
use App\Models\EventAssignment;
use App\Models\User;
use App\Models\WebPushSubscription;
use App\Services\Availability;
use App\Services\Notifier;
use App\Services\PushSender;
use Carbon\CarbonImmutable;
use Database\Seeders\DemoSeeder;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    $this->seed(DemoSeeder::class);
    $this->daniel = User::where('email', 'daniel@demo.ministreapp.com.br')->first();
    $this->marcos = User::where('email', 'marcos@demo.ministreapp.com.br')->first();
    $this->ana = User::where('email', 'ana@demo.ministreapp.com.br')->first();
    $this->ministryId = $this->daniel->memberships()->first()->ministry_id;
    $this->familia = Event::where('title', 'Culto da Família')->where('starts_at', '>', now())->first();
});

function as_user(User $user, $test)
{
    return $test->actingAs($user)->withHeader('X-Ministry-Id', (string) $test->ministryId);
}

// ---- Avisos ----

it('lets the leader post an announcement that reaches the whole team', function () {
    Queue::fake();

    as_user($this->daniel, $this)->postJson('/api/v1/announcements', [
        'title' => 'Ensaio extra', 'body' => 'Sexta às 20h no templo.', 'pinned' => false, 'send_push' => true,
    ])->assertCreated()->assertJsonPath('message', 'Aviso enviado para 7 pessoas.');

    $notified = AppNotification::where('type', 'announcement')->where('title', 'Ensaio extra')->pluck('user_id');
    expect($notified)->toHaveCount(7)->not->toContain($this->daniel->id);
    Queue::assertPushed(SendPush::class, 7);
});

it('does not send to the phone when the leader turns push off', function () {
    Queue::fake();

    as_user($this->daniel, $this)->postJson('/api/v1/announcements', [
        'title' => 'Só no app', 'body' => 'Sem push.', 'send_push' => false,
    ])->assertCreated()->assertJsonPath('message', 'Aviso publicado.');

    expect(AppNotification::where('title', 'Só no app')->count())->toBe(7);
    Queue::assertNothingPushed();
});

it('only leaders write, edit and delete announcements', function () {
    $aviso = Announcement::where('title', 'Domingo')->first();

    as_user($this->marcos, $this)->postJson('/api/v1/announcements', ['title' => 'X', 'body' => 'Y'])->assertForbidden();
    as_user($this->marcos, $this)->patchJson("/api/v1/announcements/{$aviso->id}", ['pinned' => false])->assertForbidden();
    as_user($this->marcos, $this)->deleteJson("/api/v1/announcements/{$aviso->id}")->assertForbidden();

    as_user($this->daniel, $this)->patchJson("/api/v1/announcements/{$aviso->id}", ['pinned' => false])
        ->assertOk()->assertJsonPath('data.pinned', false);
    as_user($this->daniel, $this)->deleteJson("/api/v1/announcements/{$aviso->id}")->assertOk();
    expect(AppNotification::where('type', 'announcement')->where('title', 'Domingo')->count())->toBe(0);
});

it('shows "read by N of M" only to leaders, and opening the list marks as read', function () {
    $leader = as_user($this->daniel, $this)->getJson('/api/v1/announcements')->assertOk()->json('data');
    expect($leader[0]['title'])->toBe('Domingo') // fixado no topo
        ->and($leader[0]['reads'])->toBe(['count' => 1, 'total' => 7])
        ->and($leader[1]['reads'])->toBe(['count' => 3, 'total' => 7]);

    $member = as_user($this->marcos, $this)->getJson('/api/v1/announcements')->json('data');
    expect($member[0])->not->toHaveKey('reads')->and($member[0]['is_read'])->toBeFalse();

    as_user($this->marcos, $this)->postJson('/api/v1/announcements/read-all')->assertOk()->assertJson(['read' => 2]);
    expect(as_user($this->marcos, $this)->getJson('/api/v1/announcements')->json('data.0.is_read'))->toBeTrue();
    expect(as_user($this->daniel, $this)->getJson('/api/v1/announcements')->json('data.0.reads.count'))->toBe(2);
    expect(AppNotification::where('user_id', $this->marcos->id)->where('type', 'announcement')->whereNull('read_at')->count())->toBe(0);
});

it('validates the announcement in Portuguese', function () {
    as_user($this->daniel, $this)->postJson('/api/v1/announcements', ['title' => '', 'body' => ''])
        ->assertUnprocessable()->assertJsonValidationErrors(['title', 'body']);
});

// ---- Sino ----

it('lists my notifications with the unread count and marks them as read', function () {
    $response = as_user($this->marcos, $this)->getJson('/api/v1/notifications')->assertOk();
    expect($response->json('unread'))->toBe(2)
        ->and($response->json('data.0.title'))->toBe('Domingo')
        ->and($response->json('data.0.route'))->toBe('/avisos');

    $id = $response->json('data.1.id');
    as_user($this->marcos, $this)->postJson("/api/v1/notifications/{$id}/read")->assertOk()->assertJson(['unread' => 1]);
    as_user($this->marcos, $this)->postJson('/api/v1/notifications/read-all')->assertOk()->assertJson(['unread' => 0]);
    expect(as_user($this->marcos, $this)->getJson('/api/v1/home')->json('unread_notifications'))->toBe(0);
});

it('does not let someone read another person notification', function () {
    $mine = AppNotification::where('user_id', $this->daniel->id)->first();
    as_user($this->marcos, $this)->postJson("/api/v1/notifications/{$mine->id}/read")->assertNotFound();
});

// ---- Preferências e celular ----

it('keeps the bell but skips the phone when the person turns a type off', function () {
    Queue::fake();
    as_user($this->marcos, $this)->getJson('/api/v1/me/notifications')
        ->assertOk()->assertJson(['data' => ['escalas' => true, 'lembretes' => true, 'avisos' => true]]);

    as_user($this->marcos, $this)->patchJson('/api/v1/me/notifications', ['escalas' => false])
        ->assertOk()->assertJsonPath('data.escalas', false)->assertJsonPath('data.avisos', true);

    $member = $this->marcos->memberships()->first();
    app(Notifier::class)->scheduled($member, $this->familia, 'Violão');
    app(Notifier::class)->reminder($member, $this->familia);

    Queue::assertPushed(SendPush::class, 1); // só o lembrete
    expect(AppNotification::where('user_id', $this->marcos->id)->where('type', 'scheduled')->count())->toBe(3);
});

it('registers the phone for push and moves it when someone else logs in', function () {
    $sub = ['endpoint' => 'https://web.push.apple.com/abc123', 'keys' => ['p256dh' => 'chave', 'auth' => 'segredo']];

    $this->actingAs($this->marcos)->postJson('/api/v1/push/subscriptions', $sub)->assertOk();
    $this->actingAs($this->ana)->postJson('/api/v1/push/subscriptions', $sub)->assertOk();
    expect(WebPushSubscription::count())->toBe(1)->and(WebPushSubscription::first()->user_id)->toBe($this->ana->id);

    $this->actingAs($this->ana)->deleteJson('/api/v1/push/subscriptions', ['endpoint' => $sub['endpoint']])->assertOk();
    expect(WebPushSubscription::count())->toBe(0);

    $this->actingAs($this->ana)->postJson('/api/v1/push/subscriptions', [...$sub, 'endpoint' => 'http://inseguro.com'])
        ->assertUnprocessable();
    $this->actingAs($this->ana)->getJson('/api/v1/push/config')->assertOk()->assertJsonStructure(['public_key']);
});

it('does not push a notification that was already seen in the app', function () {
    $sender = Mockery::mock(PushSender::class);
    $sender->shouldNotReceive('send');
    $this->app->instance(PushSender::class, $sender);

    $n = AppNotification::where('user_id', $this->marcos->id)->whereNotNull('read_at')->first();
    (new SendPush($n->id))->handle($sender);
});

it('sends the push with the title, text and screen to open', function () {
    $sender = Mockery::mock(PushSender::class);
    $sender->shouldReceive('send')->once()->withArgs(fn ($user, $title, $body, $route) => $user->is($this->marcos)
        && $title === 'Confirme sua presença' && str_contains($body, 'Culto da Família') && $route === "/escala/{$this->familia->id}");
    $this->app->instance(PushSender::class, $sender);

    app(Notifier::class)->reminder($this->marcos->memberships()->first(), $this->familia);
});

// ---- Lembretes automáticos ----

it('reminds pending people up to 2 days before, only once', function () {
    Queue::fake();
    $this->familia->update(['starts_at' => now()->addHours(30)]);

    $first = app(SendAutomaticReminders::class)->handle();
    $second = app(SendAutomaticReminders::class)->handle();

    expect($first['pending'])->toBe(2) // Marcos e Rafael
        ->and($second['pending'])->toBe(0)
        ->and(AppNotification::where('type', 'reminder')->where('user_id', $this->marcos->id)->count())->toBe(1);
});

it('reminds everyone 3 hours before, except who cannot go', function () {
    Queue::fake();
    $this->familia->update(['starts_at' => now()->addHours(2)]);
    EventAssignment::where('event_id', $this->familia->id)
        ->where('ministry_member_id', $this->ana->memberships()->first()->id)
        ->update(['status' => 'declined']);

    $result = app(SendAutomaticReminders::class)->handle();

    expect($result['day'])->toBe(6)->and($result['pending'])->toBe(0);
    $hour = CarbonImmutable::instance($this->familia->fresh()->starts_at)->setTimezone(Availability::TZ);
    $note = AppNotification::where('type', 'day_reminder')->where('user_id', $this->marcos->id)->first();
    expect($note->title)->toBe('Hoje '.Notifier::hour($hour).' · Culto da Família')
        ->and($note->body)->toBe('Você: Violão');
    expect(AppNotification::where('type', 'day_reminder')->where('user_id', $this->ana->id)->exists())->toBeFalse();
});

it('does not remind about drafts or past services', function () {
    Queue::fake();
    $this->familia->update(['starts_at' => now()->addHours(30), 'status' => Event::STATUS_DRAFT]);

    expect(app(SendAutomaticReminders::class)->handle())->toBe(['pending' => 0, 'day' => 0]);
});

it('sends the leader a weekly summary on Monday morning', function () {
    Queue::fake();
    $monday = CarbonImmutable::instance($this->familia->starts_at)->setTimezone(Availability::TZ)
        ->startOfWeek(CarbonImmutable::MONDAY)->setTime(9, 0);
    $this->travelTo($monday);

    expect(app(SendWeeklySummary::class)->handle())->toBe(1);
    $summary = AppNotification::where('type', 'weekly')->where('user_id', $this->daniel->id)->latest('id')->first();
    expect($summary->title)->toEndWith('esta semana')->and($summary->body)->toContain('pendente');
});
