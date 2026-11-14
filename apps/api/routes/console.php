<?php

use App\Actions\SendAutomaticReminders;
use App\Actions\SendWeeklySummary;
use App\Services\Availability;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

// ---- Tarefas do Ministre (o Agendador do Windows chama "schedule:run" a cada minuto) ----

Artisan::command('ministre:reminders', function (SendAutomaticReminders $action) {
    $result = $action->handle();
    $this->info("Lembretes: {$result['pending']} pendentes, {$result['day']} do dia.");
})->purpose('Lembretes automáticos: 2 dias antes (pendentes) e 3 h antes do culto');

Artisan::command('ministre:weekly-summary', function (SendWeeklySummary $action) {
    $this->info('Resumos enviados: '.$action->handle());
})->purpose('Resumo semanal para os líderes');

Schedule::command('ministre:reminders')->everyFifteenMinutes()->withoutOverlapping();
Schedule::command('ministre:weekly-summary')->weeklyOn(1, '9:00')->timezone(Availability::TZ);

// A fila (envio dos avisos para o celular) roda aqui mesmo: pega o que tiver e para.
Schedule::command('queue:work --stop-when-empty --tries=3 --max-time=55')->everyMinute()->withoutOverlapping();
