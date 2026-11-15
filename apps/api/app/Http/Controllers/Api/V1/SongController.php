<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SongRequest;
use App\Http\Resources\SongResource;
use App\Models\MinistryMember;
use App\Models\Song;
use App\Services\SongLookup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

/** Repertório do ministério ativo (5.7). Todos veem; só líderes cadastram, editam e apagam. */
class SongController extends Controller
{
    /** Lista com busca (q) e filtro: all · most_played · new, ou uma tag. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'q' => ['nullable', 'string', 'max:80'],
            'filter' => ['nullable', 'in:all,most_played,new'],
            'tag' => ['nullable', 'string', 'max:30'],
        ]);
        $term = $request->input('q');

        $songs = Song::query()
            ->where('ministry_id', $this->membership($request)->ministry_id)
            ->withPlayStats()
            ->when($term, fn ($q) => $q->where(fn ($w) => $w
                ->where('title', 'like', "%{$term}%")
                ->orWhere('artist', 'like', "%{$term}%")))
            ->when($request->filled('tag'), fn ($q) => $q->whereJsonContains('tags', $request->input('tag')))
            ->when($request->input('filter') === 'new', fn ($q) => $q
                ->where('created_at', '>=', now()->subDays(Song::NEW_DAYS))
                ->orderByDesc('created_at'))
            ->when($request->input('filter') === 'most_played', fn ($q) => $q->orderByDesc('played_count'))
            ->orderBy('title')
            ->get();

        return SongResource::collection($songs);
    }

    /** Colou o link (YouTube, Spotify ou Deezer): título, cantor e letra para pré-preencher a música. */
    public function lookup(Request $request, SongLookup $lookup): JsonResponse
    {
        Gate::authorize('manage', $this->membership($request)->ministry);
        $request->validate(['url' => ['required', 'string', 'max:500']], ['url.required' => 'Cole o link da música.']);

        $data = $lookup->lookup($request->input('url'));
        $existing = Song::where('ministry_id', $this->membership($request)->ministry_id)
            ->whereJsonContains('links', $data['url'])->first(['id', 'title']);

        // Já está na biblioteca: avisa em vez de duplicar.
        return response()->json(['data' => $data + ['existing' => $existing ? ['id' => $existing->id, 'title' => $existing->title] : null]]);
    }

    /** As tags usadas no repertório, para os chips de filtro. */
    public function tags(Request $request): JsonResponse
    {
        $tags = Song::where('ministry_id', $this->membership($request)->ministry_id)
            ->pluck('tags')->flatten()->filter()->unique()->sort(SORT_LOCALE_STRING)->values();

        return response()->json(['data' => $tags]);
    }

    public function show(int $song): SongResource
    {
        $model = Song::withPlayStats()->findOrFail($song);
        Gate::authorize('view', $model);

        return (new SongResource($model))->detailed();
    }

    public function store(SongRequest $request): JsonResponse
    {
        $membership = $this->membership($request);
        Gate::authorize('manage', $membership->ministry);

        $song = Song::create([...$this->data($request), 'ministry_id' => $membership->ministry_id]);

        return $this->detail($song)->response()->setStatusCode(201);
    }

    public function update(SongRequest $request, Song $song): SongResource
    {
        Gate::authorize('manage', $song);
        $song->update($this->data($request));

        return $this->detail($song);
    }

    /** Sai do repertório; as escalas antigas continuam mostrando a música. */
    public function destroy(Song $song): JsonResponse
    {
        Gate::authorize('manage', $song);
        $song->delete();

        return response()->json(['message' => 'Música removida do repertório.']);
    }

    /** @return array<string, mixed> */
    private function data(SongRequest $request): array
    {
        $data = $request->validated();
        foreach (['tags', 'links'] as $list) {
            if (array_key_exists($list, $data)) {
                $data[$list] = array_values($data[$list] ?? []);
            }
        }

        return $data;
    }

    private function detail(Song $song): SongResource
    {
        return (new SongResource(Song::withPlayStats()->findOrFail($song->id)))->detailed();
    }

    private function membership(Request $request): MinistryMember
    {
        /** @var MinistryMember */
        return $request->attributes->get('membership');
    }
}
