<?php

namespace App\Actions;

use App\Models\Event;
use App\Models\EventAssignment;
use App\Services\Notifier;
use Illuminate\Support\Collection;

/**
 * Lembretes automáticos (5.9), rodando a cada 15 minutos pelo agendador:
 * - até 2 dias antes do culto, para quem ainda está Pendente;
 * - no dia do culto, 3 h antes, para todos os escalados que não disseram "não posso".
 * Cada lembrete vai uma vez só por pessoa e escala.
 */
class SendAutomaticReminders
{
    public const PENDING_HOURS = 48;
    public const DAY_HOURS = 3;

    public function __construct(private Notifier $notifier) {}

    /** @return array{pending: int, day: int} quantas pessoas foram lembradas */
    public function handle(): array
    {
        return ['pending' => $this->pending(), 'day' => $this->dayOf()];
    }

    private function pending(): int
    {
        $assignments = $this->upcoming(self::PENDING_HOURS, from: self::DAY_HOURS)
            ->where('status', EventAssignment::STATUS_PENDING)
            ->whereNull('pending_reminded_at')
            ->get();

        return $this->byPerson($assignments, function ($member, $event) {
            $this->notifier->reminder($member, $event);
        }, 'pending_reminded_at');
    }

    private function dayOf(): int
    {
        $assignments = $this->upcoming(self::DAY_HOURS)
            ->where('status', '!=', EventAssignment::STATUS_DECLINED)
            ->whereNull('day_reminded_at')
            ->get();

        return $this->byPerson($assignments, function ($member, $event, Collection $mine) {
            $positions = $mine->pluck('position.name')->unique()->join(', ', ' e ');
            $this->notifier->dayReminder($member, $event, $positions);
        }, 'day_reminded_at');
    }

    /** Escalações de cultos publicados que começam daqui a `from` até `hours` horas. */
    private function upcoming(int $hours, int $from = 0)
    {
        return EventAssignment::query()
            ->whereHas('event', fn ($q) => $q
                ->where('status', Event::STATUS_PUBLISHED)
                ->where('starts_at', '>', now()->addHours($from))
                ->where('starts_at', '<=', now()->addHours($hours)))
            ->with(['event', 'member.user', 'position']);
    }

    /** Uma mensagem por pessoa e escala, mesmo que ela esteja em duas funções. */
    private function byPerson(Collection $assignments, callable $send, string $column): int
    {
        $count = 0;
        foreach ($assignments->groupBy(fn ($a) => $a->event_id.'-'.$a->ministry_member_id) as $mine) {
            $first = $mine->first();
            if ($first->member?->user) {
                $send($first->member, $first->event, $mine);
                $count++;
            }
            EventAssignment::whereKey($mine->pluck('id'))->update([$column => now()]);
        }

        return $count;
    }
}
