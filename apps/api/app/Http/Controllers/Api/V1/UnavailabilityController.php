<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UnavailabilityRequest;
use App\Models\Event;
use App\Models\EventAssignment;
use App\Models\MinistryMember;
use App\Models\Unavailability;
use App\Services\Availability;
use App\Services\Notifier;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/** Indisponibilidade (5.6): as minhas datas em que não posso servir. */
class UnavailabilityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $membership = $this->membership($request);
        $today = CarbonImmutable::now(Availability::TZ)->toDateString();

        $items = Unavailability::where('ministry_member_id', $membership->id)
            ->whereDate('ends_on', '>=', $today)
            ->orderBy('starts_on')
            ->get();

        return response()->json(['data' => $items->map(fn ($u) => $this->present($u))]);
    }

    /** Antes de salvar: em quais escalas eu já estou nessas datas? ("Quer avisar o líder?") */
    public function conflicts(UnavailabilityRequest $request): JsonResponse
    {
        $membership = $this->membership($request);

        return response()->json([
            'data' => $this->conflictingAssignments($membership, $this->range($request))
                ->unique('event_id')
                ->values()
                ->map(fn ($a) => [
                    'event_id' => $a->event_id,
                    'title' => $a->event->title,
                    'starts_at' => $a->event->starts_at->toIso8601String(),
                    'position' => $a->position->name,
                ]),
        ]);
    }

    public function store(UnavailabilityRequest $request, Notifier $notifier): JsonResponse
    {
        $membership = $this->membership($request);
        [$starts, $ends, $weekday] = $this->range($request);

        $item = Unavailability::create([
            'ministry_member_id' => $membership->id,
            'starts_on' => $starts->toDateString(),
            'ends_on' => $ends->toDateString(),
            'reason' => $request->input('reason'),
            'recurrence_weekday' => $weekday,
        ]);

        // "Quer avisar o líder que não pode?" -> marca Não pode nas escalas e avisa os líderes.
        $declined = 0;
        if ($request->boolean('decline_conflicts')) {
            foreach ($this->conflictingAssignments($membership, [$starts, $ends, $weekday]) as $a) {
                if ($a->status !== EventAssignment::STATUS_DECLINED) {
                    $a->update([
                        'status' => EventAssignment::STATUS_DECLINED,
                        'decline_reason' => $request->input('reason'),
                        'responded_at' => now(),
                    ]);
                    $notifier->declined($a->member, $a->event, $a->position->name, $request->input('reason'));
                    $declined++;
                }
            }
        }

        return response()->json(['data' => $this->present($item), 'declined' => $declined], 201);
    }

    public function destroy(Request $request, Unavailability $unavailability): JsonResponse
    {
        if ($unavailability->ministry_member_id !== $this->membership($request)->id) {
            return response()->json(['message' => 'Você só pode apagar as suas indisponibilidades.'], 403);
        }
        $unavailability->delete();

        return response()->json(['message' => 'Indisponibilidade removida.']);
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable, 2: ?int} */
    private function range(UnavailabilityRequest $request): array
    {
        $starts = CarbonImmutable::parse($request->input('starts_on'), Availability::TZ)->startOfDay();
        $weekly = $request->boolean('repeat_weekly');
        // "Repetir toda semana" sem data final vale por um ano.
        $ends = $request->filled('ends_on')
            ? CarbonImmutable::parse($request->input('ends_on'), Availability::TZ)->startOfDay()
            : ($weekly ? $starts->addYear() : $starts);

        return [$starts, $ends, $weekly ? $starts->dayOfWeek : null];
    }

    /**
     * Minhas atribuições em escalas publicadas/rascunho que caem nas datas (respeitando "toda quarta").
     *
     * @param  array{0: CarbonImmutable, 1: CarbonImmutable, 2: ?int}  $range
     * @return Collection<int, EventAssignment>
     */
    private function conflictingAssignments(MinistryMember $membership, array $range): Collection
    {
        [$starts, $ends, $weekday] = $range;

        return EventAssignment::query()
            ->where('ministry_member_id', $membership->id)
            ->whereHas('event', fn ($q) => $q
                ->where('status', '!=', Event::STATUS_CANCELLED)
                ->whereBetween('starts_at', [$starts->utc(), $ends->addDay()->utc()]))
            ->with(['event', 'position', 'member.user'])
            ->get()
            ->filter(fn ($a) => $weekday === null || Availability::localDate($a->event->starts_at)->dayOfWeek === $weekday)
            ->filter(fn ($a) => $a->event->starts_at->isFuture())
            ->values();
    }

    /** @return array<string, mixed> */
    private function present(Unavailability $u): array
    {
        return [
            'id' => $u->id,
            'starts_on' => $u->starts_on->toDateString(),
            'ends_on' => $u->ends_on->toDateString(),
            'reason' => $u->reason,
            'recurrence_weekday' => $u->recurrence_weekday,
        ];
    }

    private function membership(Request $request): MinistryMember
    {
        /** @var MinistryMember */
        return $request->attributes->get('membership');
    }
}
