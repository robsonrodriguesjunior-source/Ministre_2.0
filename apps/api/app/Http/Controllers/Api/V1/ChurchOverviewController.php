<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventAssignment;
use App\Models\Ministry;
use App\Models\MinistryMember;
use App\Services\Availability;
use App\Services\ChurchManagers;
use App\Services\ImageStore;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Painel do gestor da igreja (pastor ou administrador): todos os departamentos da igreja num mês.
 * - cultos: os horários do mês, com cada departamento escalado e quantos confirmaram;
 * - frequência: quantas vezes cada pessoa foi escalada e quantas confirmou, somando os departamentos.
 * Só os gestores da igreja veem. Rascunhos e cultos cancelados ficam de fora.
 */
class ChurchOverviewController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        /** @var MinistryMember $membership */
        $membership = $request->attributes->get('membership');
        $church = $membership->ministry->church;
        abort_unless(ChurchManagers::isManager($request->user(), $church), 403, 'Só os gestores da igreja veem o painel da igreja.');

        $request->validate(['month' => ['nullable', 'date_format:Y-m']]);
        $start = $request->filled('month')
            ? CarbonImmutable::createFromFormat('Y-m-d', $request->input('month').'-01', Availability::TZ)->startOfDay()
            : CarbonImmutable::now(Availability::TZ)->startOfMonth();
        $end = $start->endOfMonth();

        $ministries = Ministry::where('church_id', $church->id)->orderBy('id')->get(['id', 'name', 'type']);
        $ministryIds = $ministries->pluck('id');

        $events = Event::query()
            ->whereIn('ministry_id', $ministryIds)
            ->where('status', Event::STATUS_PUBLISHED)
            ->whereBetween('starts_at', [$start->utc(), $end->utc()])
            ->with(['assignments' => fn ($q) => $q->with(['member' => fn ($m) => $m->withTrashed()->with('user'), 'position'])])
            ->orderBy('starts_at')
            ->get();

        $now = CarbonImmutable::now();
        $names = $ministries->keyBy('id');

        // ---- Cultos: departamentos que servem no mesmo horário ficam juntos ----
        $services = $events->groupBy(fn (Event $e) => $e->starts_at->toIso8601String())->map(function ($group, $startsAt) use ($names) {
            $departments = $group->map(function (Event $e) use ($names) {
                $a = $e->assignments;
                $minister = $a->firstWhere('is_minister', true);

                return [
                    'event_id' => $e->id,
                    'ministry_id' => $e->ministry_id,
                    'ministry' => $names[$e->ministry_id]->name ?? '',
                    'type' => $names[$e->ministry_id]->type ?? 'other',
                    'title' => $e->title,
                    'visibility' => $e->visibility,
                    'minister' => $minister?->member?->user?->name,
                    'total' => $a->count(),
                    'confirmed' => $a->where('status', EventAssignment::STATUS_CONFIRMED)->count(),
                    'pending' => $a->where('status', EventAssignment::STATUS_PENDING)->count(),
                    'declined' => $a->where('status', EventAssignment::STATUS_DECLINED)->count(),
                    'people' => $a->map(fn (EventAssignment $x) => [
                        'name' => $x->member?->user?->name ?? 'Pessoa removida',
                        'avatar_url' => ImageStore::url($x->member?->user?->avatar_path),
                        'user_id' => $x->member?->user_id,
                        'position' => $x->position?->name,
                        'status' => $x->status,
                        'is_minister' => (bool) $x->is_minister,
                    ])->values(),
                ];
            })->values();

            return [
                'starts_at' => $startsAt,
                'title' => $group->first()->title,
                'total' => $departments->sum('total'),
                'confirmed' => $departments->sum('confirmed'),
                'departments' => $departments,
            ];
        })->values();

        // ---- Frequência por pessoa (somando os departamentos) ----
        $people = [];
        $members = MinistryMember::query()
            ->whereIn('ministry_id', $ministryIds)
            ->where('status', MinistryMember::STATUS_ACTIVE)
            ->with('user')
            ->get();
        foreach ($members as $m) {
            if (! $m->user) {
                continue;
            }
            $p = &$people[$m->user_id];
            $p ??= ['user_id' => $m->user_id, 'name' => $m->user->name, 'avatar_url' => ImageStore::url($m->user->avatar_path), 'ministries' => [], 'scheduled' => 0, 'confirmed' => 0, 'declined' => 0, 'pending' => 0, 'past' => 0, 'past_confirmed' => 0];
            $p['ministries'][] = $names[$m->ministry_id]->name ?? '';
            unset($p);
        }

        $seen = [];
        foreach ($events as $e) {
            foreach ($e->assignments as $a) {
                $uid = $a->member?->user_id;
                if (! $uid || ! isset($people[$uid])) {
                    continue; // quem saiu da igreja não entra na frequência
                }
                // Uma pessoa em 2 funções no mesmo culto conta como 1 escala.
                $key = $uid.'-'.$e->id;
                if (isset($seen[$key])) {
                    continue;
                }
                $seen[$key] = true;
                $p = &$people[$uid];
                $p['scheduled']++;
                $p[$a->status]++;
                if ($e->starts_at->lessThan($now)) {
                    $p['past']++;
                    if ($a->status === EventAssignment::STATUS_CONFIRMED) {
                        $p['past_confirmed']++;
                    }
                }
                unset($p);
            }
        }

        $list = collect($people)->map(function ($p) {
            $p['ministries'] = array_values(array_unique($p['ministries']));
            $p['confirmed_rate'] = $p['past'] > 0 ? (int) round(100 * $p['past_confirmed'] / $p['past']) : null;
            unset($p['past_confirmed']);

            return $p;
        })->sortBy([['scheduled', 'desc'], ['name', 'asc']])->values();

        $serving = $list->where('scheduled', '>', 0);
        $rates = $serving->pluck('confirmed_rate')->filter(fn ($r) => $r !== null);

        return response()->json([
            'month' => $start->format('Y-m'),
            'church' => ['id' => $church->id, 'name' => $church->name],
            'ministries' => $ministries->map(fn ($m) => ['id' => $m->id, 'name' => $m->name, 'type' => $m->type])->values(),
            'summary' => [
                'services' => $services->count(),
                'people_serving' => $serving->count(),
                'people_idle' => $list->where('scheduled', 0)->count(),
                'confirmed_rate' => $rates->isEmpty() ? null : (int) round($rates->avg()),
            ],
            'services' => $services,
            'people' => $list,
        ]);
    }
}
