<?php

use App\Http\Controllers\Api\V1\AnnouncementController;
use App\Http\Controllers\Api\V1\AssignmentController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CatalogController;
use App\Http\Controllers\Api\V1\ChurchController;
use App\Http\Controllers\Api\V1\ChurchManagerController;
use App\Http\Controllers\Api\V1\ChurchOverviewController;
use App\Http\Controllers\Api\V1\EventController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\HomeController;
use App\Http\Controllers\Api\V1\InviteController;
use App\Http\Controllers\Api\V1\MeController;
use App\Http\Controllers\Api\V1\MemberController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\PushController;
use App\Http\Controllers\Api\V1\SetupController;
use App\Http\Controllers\Api\V1\SongController;
use App\Http\Controllers\Api\V1\UnavailabilityController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', HealthController::class);

    // ---- Conta (sem login) ----
    Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:register');
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/auth/forgot', [AuthController::class, 'forgot'])->middleware('throttle:forgot');
    Route::post('/auth/reset', [AuthController::class, 'reset'])->middleware('throttle:forgot');

    // Prévia do convite (mostra igreja e ministério antes de entrar).
    Route::get('/invites/{code}', [InviteController::class, 'preview'])->middleware('throttle:30,1');

    // ---- Com login ----
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::get('/me', [MeController::class, 'show']);
        Route::patch('/me', [MeController::class, 'update']);
        Route::get('/me/ministries', [MeController::class, 'ministries']);
        Route::get('/me/notifications', [MeController::class, 'notificationPrefs']);
        Route::patch('/me/notifications', [MeController::class, 'updateNotificationPrefs']);
        Route::post('/me/avatar', [MeController::class, 'avatar'])->middleware('throttle:20,1');
        Route::delete('/me/avatar', [MeController::class, 'removeAvatar']);
        Route::delete('/me', [MeController::class, 'destroy'])->middleware('throttle:5,1');

        // Avisos no celular (Web Push)
        Route::get('/push/config', [PushController::class, 'config']);
        Route::post('/push/subscriptions', [PushController::class, 'subscribe'])->middleware('throttle:20,1');
        Route::delete('/push/subscriptions', [PushController::class, 'unsubscribe']);
        Route::post('/push/devices', [PushController::class, 'registerDevice'])->middleware('throttle:20,1');
        Route::delete('/push/devices', [PushController::class, 'unregisterDevice']);
        Route::post('/push/test', [PushController::class, 'test'])->middleware('throttle:5,1');

        Route::post('/churches', [ChurchController::class, 'store']);
        Route::post('/invites/{code}/accept', [InviteController::class, 'accept']);

        // ---- Dentro de um ministério (cabeçalho X-Ministry-Id) ----
        Route::middleware('ministry')->group(function () {
            Route::get('/invites', [InviteController::class, 'index']);
            Route::post('/invites', [InviteController::class, 'store']);
            Route::delete('/invites/{invite}', [InviteController::class, 'destroy'])->whereNumber('invite');

            Route::get('/home', HomeController::class);
            Route::get('/me/stats', [MeController::class, 'stats']);

            // Gestores da igreja (pastor ou administrador): todos os departamentos
            Route::get('/church/overview', [ChurchOverviewController::class, 'show']);
            Route::get('/church/managers', [ChurchManagerController::class, 'index']);
            Route::post('/church/managers', [ChurchManagerController::class, 'store']);
            Route::delete('/church/managers/{user}', [ChurchManagerController::class, 'destroy'])->whereNumber('user');

            // Gestão do ministério (só líderes)
            Route::get('/members', [MemberController::class, 'index']);
            Route::post('/members', [MemberController::class, 'store']);
            Route::post('/members/{member}/invite', [MemberController::class, 'invite'])->whereNumber('member');
            Route::patch('/members/{member}', [MemberController::class, 'update'])->whereNumber('member');
            Route::delete('/members/{member}', [MemberController::class, 'destroy'])->whereNumber('member');
            Route::get('/manage/positions', [SetupController::class, 'positions']);
            Route::post('/manage/positions', [SetupController::class, 'storePosition']);
            Route::put('/manage/positions/order', [SetupController::class, 'reorderPositions']);
            Route::patch('/manage/positions/{position}', [SetupController::class, 'updatePosition'])->whereNumber('position');
            Route::post('/manage/event-types', [SetupController::class, 'storeEventType']);
            Route::patch('/manage/event-types/{eventType}', [SetupController::class, 'updateEventType'])->whereNumber('eventType');
            Route::delete('/manage/event-types/{eventType}', [SetupController::class, 'destroyEventType'])->whereNumber('eventType');
            Route::get('/manage/ministry', [SetupController::class, 'ministry']);
            Route::patch('/manage/ministry', [SetupController::class, 'updateMinistry']);
            Route::post('/manage/ministry/logo', [SetupController::class, 'ministryLogo'])->middleware('throttle:20,1');
            Route::delete('/manage/ministry/logo', [SetupController::class, 'removeMinistryLogo']);
            Route::get('/manage/unavailabilities', [SetupController::class, 'teamUnavailability']);

            // Escalas
            Route::get('/events/availability', [EventController::class, 'availability']);
            Route::get('/events', [EventController::class, 'index']);
            Route::post('/events', [EventController::class, 'store']);
            Route::get('/events/{event}', [EventController::class, 'show'])->whereNumber('event');
            Route::patch('/events/{event}', [EventController::class, 'update'])->whereNumber('event');
            Route::delete('/events/{event}', [EventController::class, 'destroy'])->whereNumber('event');
            Route::post('/events/{event}/publish', [EventController::class, 'publish'])->whereNumber('event');
            Route::post('/events/{event}/cancel', [EventController::class, 'cancel'])->whereNumber('event');
            Route::post('/events/{event}/duplicate', [EventController::class, 'duplicate'])->whereNumber('event');
            Route::post('/events/{event}/remind-pending', [EventController::class, 'remindPending'])->whereNumber('event');
            Route::put('/events/{event}/assignments', [EventController::class, 'assignments'])->whereNumber('event');
            Route::put('/events/{event}/minister', [EventController::class, 'minister'])->whereNumber('event');
            Route::put('/events/{event}/songs', [EventController::class, 'songs'])->whereNumber('event');
            Route::put('/events/{event}/rundown', [EventController::class, 'rundown'])->whereNumber('event');
            Route::get('/events/{event}/stage', [EventController::class, 'stage'])->whereNumber('event');

            Route::post('/assignments/{assignment}/confirm', [AssignmentController::class, 'confirm'])->whereNumber('assignment');
            Route::post('/assignments/{assignment}/decline', [AssignmentController::class, 'decline'])->whereNumber('assignment');

            // Indisponibilidade
            Route::get('/unavailabilities', [UnavailabilityController::class, 'index']);
            Route::get('/unavailabilities/conflicts', [UnavailabilityController::class, 'conflicts']);
            Route::post('/unavailabilities', [UnavailabilityController::class, 'store']);
            Route::delete('/unavailabilities/{unavailability}', [UnavailabilityController::class, 'destroy'])->whereNumber('unavailability');

            // Listas de apoio
            Route::get('/positions', [CatalogController::class, 'positions']);
            Route::get('/event-types', [CatalogController::class, 'eventTypes']);

            // Avisos e sino
            Route::get('/announcements', [AnnouncementController::class, 'index']);
            Route::post('/announcements', [AnnouncementController::class, 'store']);
            Route::post('/announcements/read-all', [AnnouncementController::class, 'readAll']);
            Route::patch('/announcements/{announcement}', [AnnouncementController::class, 'update'])->whereNumber('announcement');
            Route::delete('/announcements/{announcement}', [AnnouncementController::class, 'destroy'])->whereNumber('announcement');
            Route::get('/notifications', [NotificationController::class, 'index']);
            Route::post('/notifications/read-all', [NotificationController::class, 'readAll']);
            Route::post('/notifications/{notification}/read', [NotificationController::class, 'read'])->whereNumber('notification');

            // Repertório
            Route::get('/songs', [SongController::class, 'index']);
            Route::get('/songs/tags', [SongController::class, 'tags']);
            Route::post('/songs/lookup', [SongController::class, 'lookup'])->middleware('throttle:30,1');
            Route::post('/songs', [SongController::class, 'store']);
            Route::get('/songs/{song}', [SongController::class, 'show'])->whereNumber('song');
            Route::patch('/songs/{song}', [SongController::class, 'update'])->whereNumber('song');
            Route::delete('/songs/{song}', [SongController::class, 'destroy'])->whereNumber('song');
        });
    });
});
