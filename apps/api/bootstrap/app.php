<?php

use App\Http\Middleware\ResolveMinistry;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // O Apache (HTTPS) repassa as requisições para cá; confia nos cabeçalhos dele.
        $middleware->trustProxies(at: ['127.0.0.1', '::1']);
        $middleware->alias(['ministry' => ResolveMinistry::class]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Na API, sempre JSON e mensagens em português.
        $isApi = fn (Request $request) => $request->is('api/*');
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $isApi($request) || $request->expectsJson());

        $exceptions->render(fn (AuthenticationException $e, Request $request) => $isApi($request)
            ? response()->json(['message' => 'Entre na sua conta para continuar.'], 401) : null);

        $exceptions->render(fn (AuthorizationException|AccessDeniedHttpException $e, Request $request) => $isApi($request)
            ? response()->json(['message' => 'Só líderes do ministério podem fazer isso.'], 403) : null);

        $exceptions->render(fn (NotFoundHttpException $e, Request $request) => $isApi($request)
            ? response()->json(['message' => 'Não encontrado.'], 404) : null);

        $exceptions->render(fn (ThrottleRequestsException $e, Request $request) => $isApi($request)
            ? response()->json([
                'message' => 'Muitas tentativas. Espere um pouco e tente de novo.',
            ], 429, $e->getHeaders()) : null);
    })->create();
