<?php

use App\Mail\PasswordResetCode;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

function registerPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Marcos Silva',
        'email' => 'Marcos@Exemplo.com',
        'phone' => '11999990000',
        'password' => 'senhaforte123',
        'terms' => true,
    ], $overrides);
}

it('creates an account and returns a token', function () {
    $response = $this->postJson('/api/v1/auth/register', registerPayload());

    $response->assertCreated()
        ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']])
        ->assertJsonPath('user.email', 'marcos@exemplo.com');

    expect(User::where('email', 'marcos@exemplo.com')->first()->terms_accepted_at)->not->toBeNull();
});

it('requires accepting the terms and a password of 8+ characters', function () {
    $this->postJson('/api/v1/auth/register', registerPayload(['terms' => false, 'password' => '123']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['terms', 'password'])
        ->assertJsonPath('errors.password.0', 'A senha precisa ter pelo menos 8 caracteres.');
});

it('does not allow two accounts with the same e-mail', function () {
    User::factory()->create(['email' => 'marcos@exemplo.com']);

    $this->postJson('/api/v1/auth/register', registerPayload())
        ->assertUnprocessable()
        ->assertJsonPath('errors.email.0', 'Já existe uma conta com este e-mail.');
});

it('logs in with e-mail and password', function () {
    User::factory()->create(['email' => 'ana@exemplo.com', 'password' => 'senhaforte123']);

    $this->postJson('/api/v1/auth/login', ['email' => 'ANA@exemplo.com', 'password' => 'senhaforte123'])
        ->assertOk()
        ->assertJsonStructure(['token', 'user']);
});

it('refuses a wrong password with a message in portuguese', function () {
    User::factory()->create(['email' => 'ana@exemplo.com', 'password' => 'senhaforte123']);

    $this->postJson('/api/v1/auth/login', ['email' => 'ana@exemplo.com', 'password' => 'errada'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.email.0', 'E-mail ou senha incorretos.');
});

it('blocks login after 5 attempts per minute', function () {
    User::factory()->create(['email' => 'ana@exemplo.com', 'password' => 'senhaforte123']);

    foreach (range(1, 5) as $_) {
        $this->postJson('/api/v1/auth/login', ['email' => 'ana@exemplo.com', 'password' => 'errada']);
    }

    $this->postJson('/api/v1/auth/login', ['email' => 'ana@exemplo.com', 'password' => 'senhaforte123'])
        ->assertStatus(429);
});

it('logs out and revokes the token', function () {
    $user = User::factory()->create();
    $token = $user->createToken('app')->plainTextToken;

    $this->withToken($token)->postJson('/api/v1/auth/logout')->assertOk();

    expect($user->tokens()->count())->toBe(0);
});

it('asks to log in on protected routes', function () {
    $this->getJson('/api/v1/me')
        ->assertUnauthorized()
        ->assertJsonPath('message', 'Entre na sua conta para continuar.');
});

it('resets the password with the 6-digit code sent by e-mail', function () {
    Mail::fake();
    $user = User::factory()->create(['email' => 'ana@exemplo.com', 'password' => 'senhaantiga1']);
    $user->createToken('celular');

    $this->postJson('/api/v1/auth/forgot', ['email' => 'ana@exemplo.com'])->assertOk();

    $code = null;
    Mail::assertSent(PasswordResetCode::class, function (PasswordResetCode $mail) use (&$code) {
        $code = $mail->code;

        return $mail->hasTo('ana@exemplo.com');
    });

    $this->postJson('/api/v1/auth/reset', ['email' => 'ana@exemplo.com', 'code' => '000000' === $code ? '111111' : '000000', 'password' => 'senhanova123'])
        ->assertUnprocessable();

    $this->postJson('/api/v1/auth/reset', ['email' => 'ana@exemplo.com', 'code' => $code, 'password' => 'senhanova123'])
        ->assertOk()
        ->assertJsonStructure(['token']);

    // Os aparelhos antigos saem; a senha nova funciona.
    expect($user->fresh()->tokens()->where('name', 'celular')->exists())->toBeFalse();
    $this->postJson('/api/v1/auth/login', ['email' => 'ana@exemplo.com', 'password' => 'senhanova123'])->assertOk();
});

it('does not reveal whether an e-mail has an account', function () {
    Mail::fake();

    $this->postJson('/api/v1/auth/forgot', ['email' => 'ninguem@exemplo.com'])
        ->assertOk()
        ->assertJsonPath('message', 'Se houver uma conta com este e-mail, enviamos um código de 6 dígitos.');

    Mail::assertNothingSent();
});
