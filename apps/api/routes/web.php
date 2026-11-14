<?php

use Illuminate\Support\Facades\Route;

// Quem abrir api.ministreapp.com.br no navegador vai para o app.
Route::redirect('/', rtrim((string) config('ministre.app_url'), '/'));
