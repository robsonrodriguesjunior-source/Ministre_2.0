<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\EventType;
use App\Models\MinistryMember;
use App\Models\Position;
use App\Models\Song;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Listas de apoio do ministério ativo (funções, tipos de culto e músicas).
 * A gestão completa (criar, renomear, arquivar) chega na Etapa 6; o repertório completo na Etapa 4.
 */
class CatalogController extends Controller
{
    public function positions(Request $request): JsonResponse
    {
        return response()->json(['data' => Position::where('ministry_id', $this->ministryId($request))
            ->whereNull('archived_at')->orderBy('sort_order')->get(['id', 'name', 'sort_order'])]);
    }

    public function eventTypes(Request $request): JsonResponse
    {
        return response()->json(['data' => EventType::where('ministry_id', $this->ministryId($request))
            ->orderBy('id')->get()->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'weekday' => $t->weekday,
                'default_time' => $t->default_time ? substr($t->default_time, 0, 5) : null,
                'default_location' => $t->default_location,
                'is_rehearsal' => $t->is_rehearsal,
            ])]);
    }

    public function songs(Request $request): JsonResponse
    {
        $request->validate(['q' => ['nullable', 'string', 'max:80']]);

        return response()->json(['data' => Song::where('ministry_id', $this->ministryId($request))
            ->when($request->filled('q'), fn ($q) => $q->where(fn ($w) => $w
                ->where('title', 'like', '%'.$request->input('q').'%')
                ->orWhere('artist', 'like', '%'.$request->input('q').'%')))
            ->orderBy('title')
            ->get(['id', 'title', 'artist', 'original_key', 'bpm', 'duration_sec'])]);
    }

    private function ministryId(Request $request): int
    {
        /** @var MinistryMember $membership */
        $membership = $request->attributes->get('membership');

        return $membership->ministry_id;
    }
}
