<?php

use App\Http\Controllers\Api\V1\AssignmentController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CatalogController;
use App\Http\Controllers\Api\V1\ChurchController;
use App\Http\Controllers\Api\V1\EventController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\HomeController;
use App\Http\Controllers\Api\V1\InviteController;
use App\Http\Controllers\Api\V1\MeController;
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

        Route::post('/churches', [ChurchController::class, 'store']);
        Route::post('/invites/{code}/accept', [InviteController::class, 'accept']);

        // ---- Dentro de um ministério (cabeçalho X-Ministry-Id) ----
        Route::middleware('ministry')->group(function () {
            Route::get('/invites', [InviteController::class, 'index']);
            Route::post('/invites', [InviteController::class, 'store']);
            Route::delete('/invites/{invite}', [InviteController::class, 'destroy'])->whereNumber('invite');

            Route::get('/home', HomeController::class);

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
            Route::put('/events/{event}/songs', [EventController::class, 'songs'])->whereNumber('event');
            Route::put('/events/{event}/rundown', [EventController::class, 'rundown'])->whereNumber('event');

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
            Route::get('/songs', [CatalogController::class, 'songs']);
        });
    });
});
