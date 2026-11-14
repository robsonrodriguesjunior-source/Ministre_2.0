<?php

use App\Actions\SendAutomaticReminders;
use App\Actions\SendWeeklySummary;
use App\Services\Availability;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schedule;

// ---- Tarefas do Ministre (o Agendador do Windows chama "schedule:run" a cada minuto) ----

Artisan::command('ministre:reminders', function (SendAutomaticReminders $action) {
    $result = $action->handle();
    $this->info("Lembretes: {$result['pending']} pendentes, {$result['day']} do dia.");
})->purpose('Lembretes automáticos: 2 dias antes (pendentes) e 3 h antes do culto');

Artisan::command('ministre:weekly-summary', function (SendWeeklySummary $action) {
    $this->info('Resumos enviados: '.$action->handle());
})->purpose('Resumo semanal para os líderes');

// Chamado pelo scripts/backup/backup.ps1 quando o backup falha.
Artisan::command('ministre:backup-failed {reason}', function (string $reason) {
    Log::error('Backup do Ministre falhou', ['reason' => $reason]);
    $to = config('ministre.admin_email');
    if (! $to) {
        $this->warn('MINISTRE_ADMIN_EMAIL não configurado: o aviso ficou só no log.');

        return;
    }
    Mail::raw(
        'O backup diário do Ministre falhou em '.now(Availability::TZ)->format('d/m/Y H:i').":\n\n{$reason}\n\n"
        .'Detalhes em C:\\ministre-backups\\backup.log na VPS.',
        fn ($message) => $message->to($to)->subject('Ministre: o backup falhou'),
    );
    $this->info("Aviso enviado para {$to}.");
})->purpose('Avisa o administrador que o backup falhou');

Schedule::command('ministre:reminders')->everyFifteenMinutes()->withoutOverlapping();
Schedule::command('ministre:weekly-summary')->weeklyOn(1, '9:00')->timezone(Availability::TZ);

// A fila (envio dos avisos para o celular) roda aqui mesmo: pega o que tiver e para.
Schedule::command('queue:work --stop-when-empty --tries=3 --max-time=55')->everyMinute()->withoutOverlapping();
