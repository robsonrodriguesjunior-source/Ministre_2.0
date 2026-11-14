<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\Event;
use App\Models\MinistryMember;
use Carbon\CarbonImmutable;

/**
 * Cria as notificações do sino. O envio por push (Expo) entra na Etapa 5, usando estas mesmas notificações.
 */
class Notifier
{
    private const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    private const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

    /** "Dom 26 out, 19h" */
    public static function when(Event $event): string
    {
        $d = CarbonImmutable::instance($event->starts_at)->setTimezone(Availability::TZ);

        return self::WEEKDAYS[$d->dayOfWeek].' '.$d->day.' '.self::MONTHS[$d->month - 1].', '.$d->format('G\h').($d->minute ? $d->format('i') : '');
    }

    /** @param  array<string, mixed>  $data */
    public function notify(int $userId, int $ministryId, string $type, string $title, ?string $body, array $data = []): AppNotification
    {
        return AppNotification::create([
            'user_id' => $userId,
            'ministry_id' => $ministryId,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'data' => $data,
        ]);
    }

    public function scheduled(MinistryMember $member, Event $event, string $position): void
    {
        $this->notify($member->user_id, $event->ministry_id, 'scheduled',
            "Você foi escalado no {$position}", "{$event->title} · ".self::when($event),
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
