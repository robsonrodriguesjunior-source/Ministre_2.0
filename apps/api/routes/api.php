<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ChurchController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\InviteController;
use App\Http\Controllers\Api\V1\MeController;
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
        });
    });
});
