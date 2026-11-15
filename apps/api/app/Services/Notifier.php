<?php

namespace App\Services;

use App\Jobs\SendPush;
use App\Models\Announcement;
use App\Models\AppNotification;
use App\Models\Event;
use App\Models\MinistryMember;
use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * Cria as notificações do sino e, se a pessoa quiser, manda também para o celular (fila SendPush).
 */
class Notifier
{
    private const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    private const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

    /** Cada tipo de notificação obedece a uma preferência do Perfil (User::PUSH_PREFS). */
    public const PREF_BY_TYPE = [
        'scheduled' => 'escalas',
        'minister' => 'escalas',
        'removed' => 'escalas',
        'changed' => 'escalas',
        'cancelled' => 'escalas',
        'reminder' => 'lembretes',
        'day_reminder' => 'lembretes',
        'declined' => 'indisponibilidade',
        'announcement' => 'avisos',
        'weekly' => 'resumo',
    ];

    /** "Dom 26 out, 19h" */
    public static function when(Event $event): string
    {
        $d = CarbonImmutable::instance($event->starts_at)->setTimezone(Availability::TZ);

        return self::WEEKDAYS[$d->dayOfWeek].' '.$d->day.' '.self::MONTHS[$d->month - 1].', '.self::hour($d);
    }

    /** "19h", "19h30" */
    public static function hour(CarbonImmutable $d): string
    {
        return $d->format('G\h').($d->minute ? $d->format('i') : '');
    }

    /** @param  array<string, mixed>  $data */
    public function notify(int $userId, int $ministryId, string $type, string $title, ?string $body, array $data = [], bool $push = true): AppNotification
    {
        $notification = AppNotification::create([
            'user_id' => $userId,
            'ministry_id' => $ministryId,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'data' => $data,
        ]);

        $user = User::find($userId);
        if ($push && $user?->wantsPush(self::PREF_BY_TYPE[$type] ?? 'escalas')) {
            SendPush::dispatch($notification->id);
        }

        return $notification;
    }

    /** Novo aviso do líder para a equipe (o autor não recebe). */
    public function announcement(Announcement $announcement, bool $push): int
    {
        $members = MinistryMember::where('ministry_id', $announcement->ministry_id)
            ->where('status', MinistryMember::STATUS_ACTIVE)
            ->where('user_id', '!=', $announcement->author_id)
            ->pluck('user_id');

        foreach ($members as $userId) {
            $this->notify($userId, $announcement->ministry_id, 'announcement',
                $announcement->title, str($announcement->body)->squish()->limit(140)->toString(),
                ['route' => '/avisos', 'announcement_id' => $announcement->id], $push);
        }

        return $members->count();
    }

    /** No dia do culto, 3 h antes: "Hoje 19h · Culto da Família · Você: Violão". */
    public function dayReminder(MinistryMember $member, Event $event, string $positions): void
    {
        $d = CarbonImmutable::instance($event->starts_at)->setTimezone(Availability::TZ);
        $this->notify($member->user_id, $event->ministry_id, 'day_reminder',
            'Hoje '.self::hour($d).' · '.$event->title, "Você: {$positions}",
            ['route' => "/escala/{$event->id}", 'event_id' => $event->id]);
    }

    /** Segunda às 9h, para o líder: "3 escalas esta semana, 2 pessoas pendentes". */
    public function weeklySummary(MinistryMember $leader, int $events, int $pending): void
    {
        $title = $events === 1 ? '1 escala esta semana' : "{$events} escalas esta semana";
        $body = match (true) {
            $pending === 0 => 'Todo mundo já respondeu.',
            $pending === 1 => '1 pessoa pendente.',
            default => "{$pending} pessoas pendentes.",
        };
        $this->notify($leader->user_id, $leader->ministry_id, 'weekly', $title, $body, ['route' => '/agenda']);
    }

    public function scheduled(MinistryMember $member, Event $event, string $position): void
    {
        $this->notify($member->user_id, $event->ministry_id, 'scheduled',
            "Você foi escalado no {$position}", "{$event->title} · ".self::when($event),
            ['route' => "/escala/{$event->id}", 'event_id' => $event->id]);
    }

    /** O líder marcou a estrela: a pessoa é o ministro e cuida do repertório desta escala. */
    public function minister(MinistryMember $member, Event $event): void
    {
        $this->notify($member->user_id, $event->ministry_id, 'minister',
            'Você é o ministro deste culto', "{$event->title} · ".self::when($event).'. Você pode montar o repertório.',
            ['route' => "/escala/{$event->id}", 'event_id' => $event->id]);
    }

    public function removed(MinistryMember $member, Event $event): void
    {
        $this->notify($member->user_id, $event->ministry_id, 'removed',
            'Você saiu de uma escala', "{$event->title} · ".self::when($event),
            ['route' => "/escala/{$event->id}", 'event_id' => $event->id]);
    }

    public function changed(MinistryMember $member, Event $event): void
    {
        $this->notify($member->user_id, $event->ministry_id, 'changed',
            'Escala alterada', "{$event->title} · ".self::when($event),
            ['route' => "/escala/{$event->id}", 'event_id' => $event->id]);
    }

    public function reminder(MinistryMember $member, Event $event): void
    {
        $this->notify($member->user_id, $event->ministry_id, 'reminder',
            'Confirme sua presença', "{$event->title} · ".self::when($event),
            ['route' => "/escala/{$event->id}", 'event_id' => $event->id]);
    }

    /** Avisa os líderes que alguém não pode. */
    public function declined(MinistryMember $who, Event $event, string $position, ?string $reason): void
    {
        $leaders = MinistryMember::where('ministry_id', $event->ministry_id)
            ->where('role', MinistryMember::ROLE_LEADER)
            ->where('status', MinistryMember::STATUS_ACTIVE)
            ->where('id', '!=', $who->id)
            ->get();

        foreach ($leaders as $leader) {
            $this->notify($leader->user_id, $event->ministry_id, 'declined',
                "{$who->user->name} não pode ({$position})",
                "{$event->title} · ".self::when($event).($reason ? " · {$reason}" : ''),
                ['route' => "/escala/{$event->id}", 'event_id' => $event->id]);
        }
    }
}
