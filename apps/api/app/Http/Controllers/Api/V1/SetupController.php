<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\EventType;
use App\Models\Ministry;
use App\Models\MinistryMember;
use App\Models\Position;
use App\Models\Unavailability;
use App\Services\Availability;
use App\Services\ImageStore;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Gestão do ministério (5.10, só líderes): funções, tipos de culto, dados do ministério
 * e as indisponibilidades da equipe.
 */
class SetupController extends Controller
{
    // ---- Funções ----

    /** Todas, inclusive as arquivadas (que somem das escolhas mas continuam no histórico). */
    public function positions(Request $request): JsonResponse
    {
        $membership = $this->leader($request);

        return response()->json(['data' => Position::where('ministry_id', $membership->ministry_id)
            ->withCount(['members' => fn ($q) => $q->where('status', MinistryMember::STATUS_ACTIVE)])
            ->orderByRaw('archived_at is not null')->orderBy('sort_order')->get()
            ->map(fn ($p) => $this->position($p))]);
    }

    public function storePosition(Request $request): JsonResponse
    {
        $membership = $this->leader($request);
        $data = $request->validate(['name' => ['required', 'string', 'max:40', $this->uniqueName('positions', $membership->ministry_id)]], [
            'name.unique' => 'Já existe uma função com esse nome.',
        ], ['name' => 'o nome']);

        $position = Position::create([
            'ministry_id' => $membership->ministry_id,
            'name' => trim($data['name']),
            'sort_order' => (int) Position::where('ministry_id', $membership->ministry_id)->max('sort_order') + 1,
        ]);

        return response()->json(['data' => $this->position($position->loadCount('members'))], 201);
    }

    public function updatePosition(Request $request, Position $position): JsonResponse
    {
        $membership = $this->leader($request);
        abort_unless($position->ministry_id === $membership->ministry_id, 404);
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:40', $this->uniqueName('positions', $membership->ministry_id, $position->id)],
            'archived' => ['sometimes', 'boolean'],
        ], ['name.unique' => 'Já existe uma função com esse nome.'], ['name' => 'o nome']);

        if (isset($data['name'])) {
            $position->name = trim($data['name']);
        }
        if (array_key_exists('archived', $data)) {
            $position->archived_at = $data['archived'] ? ($position->archived_at ?? now()) : null;
        }
        $position->save();

        return response()->json(['data' => $this->position($position->loadCount('members'))]);
    }

    /** Nova ordem: a lista de ids na ordem em que devem aparecer. */
    public function reorderPositions(Request $request): JsonResponse
    {
        $membership = $this->leader($request);
        $data = $request->validate(['ids' => ['required', 'array', 'max:60'], 'ids.*' => ['integer']]);

        DB::transaction(function () use ($data, $membership) {
            foreach (array_values($data['ids']) as $i => $id) {
                Position::where('ministry_id', $membership->ministry_id)->whereKey($id)->update(['sort_order' => $i]);
            }
        });

        return $this->positions($request);
    }

    // ---- Tipos de culto ----

    public function storeEventType(Request $request): JsonResponse
    {
        $membership = $this->leader($request);
        $type = EventType::create(['ministry_id' => $membership->ministry_id, ...$this->eventTypeData($request, $membership->ministry_id)]);

        return response()->json(['data' => $this->eventType($type)], 201);
    }

    public function updateEventType(Request $request, EventType $eventType): JsonResponse
    {
        $membership = $this->leader($request);
        abort_unless($eventType->ministry_id === $membership->ministry_id, 404);
        $eventType->update($this->eventTypeData($request, $membership->ministry_id, $eventType->id));

        return response()->json(['data' => $this->eventType($eventType)]);
    }

    /** As escalas já criadas com esse tipo continuam (só perdem o vínculo). */
    public function destroyEventType(Request $request, EventType $eventType): JsonResponse
    {
        $membership = $this->leader($request);
        abort_unless($eventType->ministry_id === $membership->ministry_id, 404);
        $eventType->delete();

        return response()->json(['message' => 'Tipo de culto removido.']);
    }

    // ---- Ministério ----

    public function ministry(Request $request): JsonResponse
    {
        $membership = $this->leader($request);

        return response()->json(['data' => $this->presentMinistry($membership->ministry)]);
    }

    public function updateMinistry(Request $request): JsonResponse
    {
        $membership = $this->leader($request);
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'default_location' => ['sometimes', 'nullable', 'string', 'max:120'],
            'worship_days' => ['sometimes', 'array', 'max:7'],
            'worship_days.*' => ['integer', 'between:0,6'],
        ], [], ['name' => 'o nome', 'default_location' => 'o local padrão']);

        $ministry = $membership->ministry;
        if (array_key_exists('worship_days', $data)) {
            $days = collect($data['worship_days'])->unique()->sort()->values()->all();
            $ministry->settings = [...($ministry->settings ?? []), 'worship_days' => $days];
            unset($data['worship_days']);
        }
        $ministry->fill($data)->save();

        return response()->json(['data' => $this->presentMinistry($ministry)]);
    }

    public function ministryLogo(Request $request, ImageStore $images): JsonResponse
    {
        $membership = $this->leader($request);
        $request->validate(['photo' => ['required', 'file', 'image', 'max:'.ImageStore::MAX_KB]], [
            'photo.image' => 'Escolha uma imagem (JPG ou PNG).',
            'photo.max' => 'A imagem é grande demais (máximo 8 MB).',
        ]);

        $ministry = $membership->ministry;
        $path = $images->storeSquare($request->file('photo'), 'logos');
        $images->delete($ministry->logo_path);
        $ministry->update(['logo_path' => $path]);

        return response()->json(['data' => $this->presentMinistry($ministry)]);
    }

    public function removeMinistryLogo(Request $request, ImageStore $images): JsonResponse
    {
        $ministry = $this->leader($request)->ministry;
        $images->delete($ministry->logo_path);
        $ministry->update(['logo_path' => null]);

        return response()->json(['data' => $this->presentMinistry($ministry)]);
    }

    // ---- Indisponibilidades da equipe ----

    /** Quem não pode no mês (?month=2026-11), da equipe toda. */
    public function teamUnavailability(Request $request): JsonResponse
    {
        $membership = $this->leader($request);
        $request->validate(['month' => ['nullable', 'date_format:Y-m']]);
        $start = $request->filled('month')
            ? CarbonImmutable::createFromFormat('Y-m-d', $request->input('month').'-01', Availability::TZ)->startOfDay()
            : CarbonImmutable::now(Availability::TZ)->startOfMonth();
        $end = $start->endOfMonth();

        $items = Unavailability::query()
            ->whereHas('member', fn ($q) => $q->where('ministry_id', $membership->ministry_id)->where('status', MinistryMember::STATUS_ACTIVE))
            ->whereDate('starts_on', '<=', $end->toDateString())
            ->whereDate('ends_on', '>=', $start->toDateString())
            ->with('member.user')
            ->orderBy('starts_on')
            ->get();

        return response()->json([
            'month' => $start->format('Y-m'),
            'data' => $items->map(fn ($u) => [
                'id' => $u->id,
                'member_id' => $u->ministry_member_id,
                'user_id' => $u->member->user_id,
                'name' => $u->member->user->name,
                'avatar_url' => ImageStore::url($u->member->user->avatar_path),
                'starts_on' => $u->starts_on->toDateString(),
                'ends_on' => $u->ends_on->toDateString(),
                'recurrence_weekday' => $u->recurrence_weekday,
                'reason' => $u->reason,
            ]),
        ]);
    }

    // ---- Apoio ----

    /** @return array<string, mixed> */
    private function eventTypeData(Request $request, int $ministryId, ?int $ignore = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60', $this->uniqueName('event_types', $ministryId, $ignore)],
            'weekday' => ['nullable', 'integer', 'between:0,6'],
            'default_time' => ['nullable', 'date_format:H:i'],
            'default_location' => ['nullable', 'string', 'max:120'],
            'is_rehearsal' => ['sometimes', 'boolean'],
        ], [
            'name.unique' => 'Já existe um tipo de culto com esse nome.',
            'default_time.date_format' => 'Use o horário assim: 19:00.',
        ], ['name' => 'o nome', 'default_location' => 'o local']);

        return [...$data, 'name' => trim($data['name']), 'is_rehearsal' => (bool) ($data['is_rehearsal'] ?? false)];
    }

    private function uniqueName(string $table, int $ministryId, ?int $ignore = null): \Illuminate\Validation\Rules\Unique
    {
        return Rule::unique($table, 'name')->where('ministry_id', $ministryId)->ignore($ignore);
    }

    /** @return array<string, mixed> */
    private function position(Position $p): array
    {
        return [
            'id' => $p->id,
            'name' => $p->name,
            'sort_order' => $p->sort_order,
            'archived' => $p->archived_at !== null,
            'members_count' => (int) ($p->members_count ?? 0),
        ];
    }

    /** @return array<string, mixed> */
    private function eventType(EventType $t): array
    {
        return [
            'id' => $t->id,
            'name' => $t->name,
            'weekday' => $t->weekday,
            'default_time' => $t->default_time ? substr($t->default_time, 0, 5) : null,
            'default_location' => $t->default_location,
            'is_rehearsal' => $t->is_rehearsal,
        ];
    }

    /** @return array<string, mixed> */
    private function presentMinistry(Ministry $m): array
    {
        $m->loadMissing('church');

        return [
            'id' => $m->id,
            'name' => $m->name,
            'church' => $m->church->name,
            'default_location' => $m->default_location,
            'logo_url' => ImageStore::url($m->logo_path),
            'worship_days' => $m->settings['worship_days'] ?? EventType::where('ministry_id', $m->id)
                ->whereNotNull('weekday')->where('is_rehearsal', false)->distinct()->orderBy('weekday')->pluck('weekday')->all(),
            'members_count' => $m->members()->where('status', MinistryMember::STATUS_ACTIVE)->count(),
        ];
    }

    private function leader(Request $request): MinistryMember
    {
        /** @var MinistryMember $membership */
        $membership = $request->attributes->get('membership');
        Gate::authorize('manage', $membership->ministry);

        return $membership;
    }
}
