<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\PasswordResetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->string('name')->trim()->toString(),
            'email' => $request->input('email'),
            'phone' => $request->input('phone'),
            'password' => $request->input('password'),
            'terms_accepted_at' => now(),
        ]);

        return $this->tokenResponse($user, $request->input('device_name'), 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->input('email'))->first();

        if (! $user || ! Hash::check($request->input('password'), $user->password)) {
            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        return $this->tokenResponse($user, $request->input('device_name'));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Você saiu.']);
    }

    public function forgot(ForgotPasswordRequest $request, PasswordResetService $service): JsonResponse
    {
        $service->sendCode($request->input('email'));

        return response()->json([
            'message' => 'Se houver uma conta com este e-mail, enviamos um código de 6 dígitos.',
        ]);
    }

    public function reset(ResetPasswordRequest $request, PasswordResetService $service): JsonResponse
    {
        $user = $service->reset($request->input('email'), $request->input('code'), $request->input('password'));

        return $this->tokenResponse($user, 'reset');
    }

    private function tokenResponse(User $user, ?string $device, int $status = 200): JsonResponse
    {
        $token = $user->createToken($device ?: 'app')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => new UserResource($user),
        ], $status);
    }
}
