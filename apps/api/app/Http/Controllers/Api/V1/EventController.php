<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\DuplicateEvent;
use App\Actions\PublishEvent;
use App\Actions\RemindPending;
use App\Actions\ReplaceAssignments;
use App\Http\Controllers\Controller;
use App\Http\Requests\EventRequest;
use App\Http\Requests\EventSongsRequest;
use App\Http\Requests\RundownRequest;
use App\Http\Requests\TeamRequest;
use App\Http\Resources\EventDetailResource;
use App\Http\Resources\EventSummaryResource;
use App\Models\Event;
use App\Models\EventType;
use App\Models\MinistryMember;
use App\Models\Song;
use App\Services\Availability;
use App\Services\Notifier;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class EventController extends Controller
{
    private const WITH = ['assignments.position', 'assignments.member.user'];

    /** Agenda: escalas entre from e to (padrão: hoje até 60 dias). mine=1 traz só onde estou escalado. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $membership = $this->membership($request);
        $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'mine' => ['nullable', 'boolean'],
        ]);
        $from = $request->date('from') ?? now()->setTimezone(Availability::TZ)->startOfDay()->utc();
        $to = $request->date('to') ?? $from->copy()->addDays(60);

        $events = Event::query()
            ->where('ministry_id', $membership->ministry_id)
            ->whereBetween('starts_at', [$from, $to])
            ->when(! $membership->isLeader(), fn ($q) => $q->where('status', '!=', Event::STATUS_DRAFT))
            ->when($request->boolean('mine'), fn ($q) => $q->whereHas(
                'assignments', fn ($a) => $a->where('ministry_member_id', $membership->id)
            ))
            ->with(self::WITH)
            ->orderBy('starts_at')
            ->get();

        return EventSummaryResource::collection($events);
    }

    public function show(Request $request, Event $event): EventDetailResource
    {
        Gate::authorize('view', $event);

        return new EventDetailResource($event->load([...self::WITH, 'songs.song', 'rundown.responsible.user']));
    }

    public function store(EventRequest $request): JsonResponse
    {
        $membership = $this->membership($request);
        Gate::authorize('manage', $membership->ministry);

        $event = Event::create([
            ...$request->validated(),
            'event_type_id' => $this->validTypeId($request, $membership->ministry_id),
            'starts_at' => CarbonImmutable::parse($request->input('starts_at'))->utc(),
            'ministry_id' => $membership->ministry_id,
            'status' => Event::STATUS_DRAFT,
            'created_by' => $request->user()->id,
        ]);

        return $this->detail($event)->response()->setStatusCode(201);
    }

    public function update(EventRequest $request, Event $event, Notifier $notifier): EventDetailResource
    {
        Gate::authorize('manage', $event);
        $data = $request->validated();
        if ($request->has('event_type_id')) {
            $data['event_type_id'] = $this->validTypeId($request, $event->ministry_id);
        }
        if (isset($data['starts_at'])) {
            $data['starts_at'] = CarbonImmutable::parse($data['starts_at'])->utc();
        }
        $event->update($data);

        // Mudou data/hora/local de uma escala publicada: a equipe é avisada.
        if ($event->status === Event::STATUS_PUBLISHED && $event->wasChanged(['starts_at', 'location'])) {
            $event->assignments()->with('member')->get()->unique('ministry_member_id')
                ->each(fn ($a) => $notifier->changed($a->member, $event));
        }

        return $this->detail($event);
    }

    public function destroy(Event $event): JsonResponse
    {
        Gate::authorize('manage', $event);
        $event->delete();

        return response()->json(['message' => 'Escala excluída.']);
    }

    public function publish(Event $event, PublishEvent $action): EventDetailResource
    {
        Gate::authorize('manage', $event);

        return $this->detail($action->handle($event));
    }

    public function cancel(Event $event, Notifier $notifier): EventDetailResource
    {
        Gate::authorize('manage', $event);
        $wasPublished = $event->status === Event::STATUS_PUBLISHED;
        $event->update(['status' => Event::STATUS_CANCELLED]);
        if ($wasPublished) {
            $event->assignments()->with('member')->get()->unique('ministry_member_id')
                ->each(fn ($a) => $notifier->notify($a->member->user_id, $event->ministry_id, 'cancelled',
                    'Culto cancelado', "{$event->title} · ".Notifier::when($event), ['route' => "/escala/{$event->id}", 'event_id' => $event->id]));
        }

        return $this->detail($event);
    }

    public function duplicate(Request $request, Event $event, DuplicateEvent $action): JsonResponse
    {
        Gate::authorize('manage', $event);
        $request->validate(['starts_at' => ['required', 'date']], [], ['starts_at' => 'a nova data']);
        $copy = $action->handle($event->load(['assignments', 'songs', 'rundown']), CarbonImmutable::parse($request->input('starts_at')), $request->user());

        return $this->detail($copy)->response()->setStatusCode(201);
    }

    public function remindPending(Event $event, RemindPending $action): JsonResponse
    {
        Gate::authorize('manage', $event);
        if ($event->status !== Event::STATUS_PUBLISHED) {
            throw ValidationException::withMessages(['event' => 'Publique a escala antes de lembrar a equipe.']);
        }
        $count = $action->handle($event);

        return response()->json([
            'reminded' => $count,
            'message' => $count === 0
                ? 'Todos os pendentes já foram lembrados nas últimas 6 horas.'
                : ($count === 1 ? 'Lembramos 1 pessoa.' : "Lembramos {$count} pessoas."),
        ]);
    }

    public function assignments(TeamRequest $request, Event $event, ReplaceAssignments $action): EventDetailResource
    {
        Gate::authorize('manage', $event);
        $action->handle($event, $request->input('team'));

        return $this->detail($event);
    }

    public function songs(EventSongsRequest $request, Event $event): EventDetailResource
    {
        Gate::authorize('manage', $event);
        $songIds = collect($request->input('songs'))->pluck('song_id');
        $valid = Song::where('ministry_id', $event->ministry_id)->whereIn('id', $songIds)->pluck('original_key', 'id');

        DB::transaction(function () use ($event, $request, $valid) {
            $event->songs()->delete();
            foreach (array_values($request->input('songs')) as $i => $row) {
                if (! $valid->has($row['song_id'])) {
                    continue;
                }
                $event->songs()->create([
                    'song_id' => $row['song_id'],
                    'sort_order' => $i,
                    'key' => $row['key'] ?? $valid[$row['song_id']],
                    'notes' => $row['notes'] ?? null,
                ]);
            }
        });

        return $this->detail($event);
    }

    /** Modo Palco (5.8): as músicas da escala com a cifra, para o app guardar e usar sem internet. */
    public function stage(Event $event): JsonResponse
    {
        Gate::authorize('view', $event);
        $event->load('songs.song');

        return response()->json(['data' => [
            'event_id' => $event->id,
            'title' => $event->title,
            'starts_at' => $event->starts_at->toIso8601String(),
            'songs' => $event->songs->map(fn ($s) => [
                'song_id' => $s->song_id,
                'title' => $s->song->title,
                'artist' => $s->song->artist,
                'key' => $s->key ?: $s->song->original_key,
                'original_key' => $s->song->original_key,
                'bpm' => $s->song->bpm,
                'duration_sec' => $s->song->duration_sec,
                'chordpro' => $s->song->chordpro ?? '',
            ])->values(),
        ]]);
    }

    public function rundown(RundownRequest $request, Event $event): EventDetailResource
    {
        Gate::authorize('manage', $event);
        $members = MinistryMember::where('ministry_id', $event->ministry_id)->pluck('id');

        DB::transaction(function () use ($event, $request, $members) {
            $event->rundown()->delete();
            foreach (array_values($request->input('items')) as $i => $row) {
                $event->rundown()->create([
                    'sort_order' => $i,
                    'title' => $row['title'],
                    'planned_time' => $row['planned_time'] ?? null,
                    'duration_min' => $row['duration_min'] ?? null,
                    'responsible_member_id' => $members->contains($row['responsible_member_id'] ?? null) ? $row['responsible_member_id'] : null,
                    'notes' => $row['notes'] ?? null,
                ]);
            }
        });

        return $this->detail($event);
    }

    /**
     * Passo 2 do assistente: membros por função, com "não pode neste dia" e "já escalado às 09h00".
     */
    public function availability(Request $request, Availability $availability): JsonResponse
    {
        $membership = $this->membership($request);
        Gate::authorize('manage', $membership->ministry);
        $request->validate(['date' => ['required', 'date_format:Y-m-d'], 'event_id' => ['nullable', 'integer']]);

        $day = CarbonImmutable::parse($request->input('date'), Availability::TZ)->startOfDay();
        $members = MinistryMember::query()
            ->where('ministry_id', $membership->ministry_id)
            ->where('status', MinistryMember::STATUS_ACTIVE)
            ->with(['user', 'positions'])
            ->get();

        $unavailable = $availability->unavailableOn($day, $members->pluck('id'))->keyBy('ministry_member_id');
        $busy = $availability->sameDayAssignments($membership->ministry_id, $day, $request->integer('event_id') ?: null)
            ->groupBy('ministry_member_id');

        $positions = $membership->ministry->positions()->whereNull('archived_at')->get();

        return response()->json([
            'date' => $day->toDateString(),
            'positions' => $positions->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'members' => $members
                    ->filter(fn ($m) => $m->positions->contains('id', $p->id))
                    ->sortBy(fn ($m) => $m->user->name)
                    ->values()
                    ->map(fn ($m) => [
                        'member_id' => $m->id,
                        'user_id' => $m->user_id,
                        'name' => $m->user->name,
                        'avatar_url' => $m->user->avatar_path ? \Illuminate\Support\Facades\Storage::disk('public')->url($m->user->avatar_path) : null,
                        'unavailable' => $unavailable->has($m->id),
                        'unavailable_reason' => $unavailable->get($m->id)?->reason,
                        'busy_at' => $busy->has($m->id)
                            ? $busy[$m->id]->map(fn ($a) => Availability::hour($a->event->starts_at))->unique()->values()
                            : [],
                    ]),
            ]),
        ]);
    }

    private function detail(Event $event): EventDetailResource
    {
        return new EventDetailResource($event->fresh()->load([...self::WITH, 'songs.song', 'rundown.responsible.user']));
    }

    private function validTypeId(Request $request, int $ministryId): ?int
    {
        $id = $request->integer('event_type_id') ?: null;

        return $id && EventType::where('ministry_id', $ministryId)->whereKey($id)->exists() ? $id : null;
    }

    private function membership(Request $request): MinistryMember
    {
        /** @var MinistryMember */
        return $request->attributes->get('membership');
    }
}
