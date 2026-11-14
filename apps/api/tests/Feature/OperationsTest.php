<?php

use Illuminate\Support\Facades\Mail;

it('only logs the backup failure while no admin e-mail is configured', function () {
    Mail::fake();
    config(['ministre.admin_email' => null]);

    $this->artisan('ministre:backup-failed', ['reason' => 'disco cheio'])
        ->expectsOutputToContain('MINISTRE_ADMIN_EMAIL não configurado')
        ->assertSuccessful();
    Mail::assertNothingOutgoing();
});

it('e-mails the admin when the backup fails', function () {
    config(['ministre.admin_email' => 'admin@exemplo.com', 'mail.default' => 'array']);

    $this->artisan('ministre:backup-failed', ['reason' => 'OneDrive fora do ar'])
        ->expectsOutputToContain('Aviso enviado para admin@exemplo.com')
        ->assertSuccessful();

    $sent = app('mailer')->getSymfonyTransport()->messages();
    expect($sent)->toHaveCount(1)
        ->and($sent->first()->getOriginalMessage()->getSubject())->toBe('Ministre: o backup falhou')
        ->and($sent->first()->getOriginalMessage()->getTextBody())->toContain('OneDrive fora do ar');
});

it('sends whoever opens the API address to the app', function () {
    $this->get('/')->assertRedirect(config('ministre.app_url'));
});
