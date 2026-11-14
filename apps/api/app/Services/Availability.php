<?php

namespace App\Services;

use App\Models\Event;
use App\Models\EventAssignment;
use App\Models\MinistryMember;
use App\Models\Unavailability;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Quem pode servir num dia: indisponibilidades (dia, período ou "toda quarta") e quem já está
 * escalado em outro culto no mesmo dia. Os dias são contados no fuso do Brasil.
 */
class Availability
{
    public const TZ = 'America/Sao_Paulo';

    public static function localDate(CarbonInterface $utc): CarbonImmutable
    {
        return CarbonImmutable::instance($utc)->setTimezone(self::TZ)->startOfDay();
    }

    /** Indisponibilidades que cobrem o dia (para os membros informados). */
    public function unavailableOn(CarbonImmutable $day, ?Collection $memberIds = null): Collection
    {
        $date = $day->toDateString();
        $weekday = $day->dayOfWeek;

        return Unavailability::query()
            ->when($memberIds, fn ($q) => $q->whereIn('ministry_member_id', $memberIds))
            ->whereDate('starts_on', '<=', $date)
            ->whereDate('ends_on', '>=', $date)
            ->where(fn ($q) => $q->whereNull('recurrence_weekday')->orWhere('recurrence_weekday', $weekday))
            ->get();
    }

    public function isUnavailable(MinistryMember $member, CarbonImmutable $day): bool
    {
        return $this->unavailableOn($day, collect([$member->id]))->isNotEmpty();
    }

    /**
     * Escalas (publicadas ou rascunho) do ministério no mesmo dia, menos a própria.
     *
     * @return Collection<int, EventAssignment>
     */
    public function sameDayAssignments(int $ministryId, CarbonImmutable $day, ?int $exceptEventId = null): Collection
    {
        $start = $day->setTimezone(self::TZ)->startOfDay()->utc();
        $end = $start->addDay();

        return EventAssignment::query()
            ->whereHas('event', fn ($q) => $q
                ->where('ministry_id', $ministryId)
                ->where('status', '!=', Event::STATUS_CANCELLED)
                ->whereBetween('starts_at', [$start, $end])
                ->when($exceptEventId, fn ($q) => $q->where('id', '!=', $exceptEventId)))
            ->with('event')
            ->get();
    }

    /** "Domingo · 19h00" no fuso do Brasil. */
    public static function hour(CarbonInterface $utc): string
    {
        return CarbonImmutable::instance($utc)->setTimezone(self::TZ)->format('H\hi');
    }
}
