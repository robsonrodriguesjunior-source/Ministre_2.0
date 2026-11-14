<?php

namespace App\Actions;

use App\Models\Event;
use App\Models\EventAssignment;
use App\Models\MinistryMember;
use App\Services\Availability;
use App\Services\Notifier;
use Carbon\CarbonImmutable;

/** Resumo semanal para os líderes, segunda às 9h: "3 escalas esta semana, 2 pessoas pendentes". */
class SendWeeklySummary
{
    public function __construct(private Notifier $notifier) {}

    /** @return int quantos líderes receberam */
    public function handle(): int
    {
        $start = CarbonImmutable::now(Availability::TZ)->startOfWeek(CarbonImmutable::MONDAY);
        $range = [$start->utc(), $start->endOfWeek(CarbonImmutable::SUNDAY)->utc()];

        $events = Event::where('status', Event::STATUS_PUBLISHED)->whereBetween('starts_at', $range)->get(['id', 'ministry_id']);
        $sent = 0;

        foreach ($events->groupBy('ministry_id') as $ministryId => $ministryEvents) {
            $pending = EventAssignment::whereIn('event_id', $ministryEvents->pluck('id'))
                ->where('status', EventAssignment::STATUS_PENDING)
                ->distinct()
                ->count('ministry_member_id');

            $leaders = MinistryMember::where('ministry_id', $ministryId)
                ->where('role', MinistryMember::ROLE_LEADER)
                ->where('status', MinistryMember::STATUS_ACTIVE)
                ->get();

            foreach ($leaders as $leader) {
                $this->notifier->weeklySummary($leader, $ministryEvents->count(), $pending);
                $sent++;
            }
        }

        return $sent;
    }
}
