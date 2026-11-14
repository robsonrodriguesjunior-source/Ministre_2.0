<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetCode extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $name, public string $code, public int $minutes) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Seu código do Ministre: {$this->code}");
    }

    public function content(): Content
    {
        return new Content(text: 'mail.password-reset-code');
    }
}
