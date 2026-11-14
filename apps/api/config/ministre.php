<?php

return [
    // Endereço da versão web/instalável (usado nos links de convite).
    'app_url' => env('MINISTRE_APP_URL', 'https://app.ministreapp.com.br'),

    // Avisos no celular (Web Push). As chaves ficam só no .env do servidor.
    'push' => [
        'subject' => env('VAPID_SUBJECT', 'mailto:contato@ministreapp.com.br'),
        'public_key' => env('VAPID_PUBLIC_KEY'),
        'private_key' => env('VAPID_PRIVATE_KEY'),
    ],

    // Quem recebe o e-mail quando o backup diário falha (precisa do envio de e-mail configurado: MAIL_*).
    'admin_email' => env('MINISTRE_ADMIN_EMAIL'),
];
