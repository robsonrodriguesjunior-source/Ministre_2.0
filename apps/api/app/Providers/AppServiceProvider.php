<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Login: 5 tentativas por minuto por e-mail + IP (seção 7).
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)->by(
            mb_strtolower((string) $request->input('email')).'|'.$request->ip()
        ));

        // Esqueci a senha / trocar senha: 3 por minuto e 10 por hora por e-mail.
        RateLimiter::for('forgot', fn (Request $request) => [
            Limit::perMinute(3)->by('forgot-min|'.mb_strtolower((string) $request->input('email')).'|'.$request->ip()),
            Limit::perHour(10)->by('forgot-hour|'.mb_strtolower((string) $request->input('email'))),
        ]);

        RateLimiter::for('register', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));
    }
}
