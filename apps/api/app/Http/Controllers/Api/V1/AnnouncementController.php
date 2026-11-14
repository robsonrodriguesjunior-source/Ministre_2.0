<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AnnouncementRequest;
use App\Http\Resources\AnnouncementResource;
use App\Models\Announcement;
use App\Models\AnnouncementRead;
use App\Models\AppNotification;
use App\Models\MinistryMember;
use App\Services\Notifier;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

/** Avisos do ministério (5.9): o líder escreve, todos leem; o líder vê "lido por N de M". */
class AnnouncementController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $membership = $this->membership($request);

        return AnnouncementResource::collection($this->load($request, Announcement::where('ministry_id', $membership->ministry_id)
            ->orderByDesc('pinned')
            ->latest()
            ->latest('id')
            ->limit(100)));
    }

    public function store(AnnouncementRequest $request, Notifier $notifier): JsonResponse
    {
        $membership = $this->membership($request);
        Gate::authorize('manage', $membership->ministry);

        $push = $request->boolean('send_push', true);
        $announcement = Announcement::create([
            'ministry_id' => $membership->ministry_id,
            'author_id' => $request->user()->id,
            'title' => $request->input('title'),
            'body' => $request->input('body'),
            'pinned' => $request->boolean('pinned'),
            'push_sent_at' => $push ? now() : null,
        ]);
        $notified = $notifier->announcement($announcement, $push);

        return response()->json([
            'data' => $this->one($request, $announcement),
            'message' => $push ? "Aviso enviado para {$notified} ".($notified === 1 ? 'pessoa' : 'pessoas').'.' : 'Aviso publicado.',
        ], 201);
    }

    public function update(AnnouncementRequest $request, Announcement $announcement): JsonResponse
    {
        Gate::authorize('manage', $announcement);
        $announcement->update($request->safe()->only(['title', 'body', 'pinned']));

        return response()->json(['data' => $this->one($request, $announcement)]);
    }

    public function destroy(Announcement $announcement): JsonResponse
    {
        Gate::authorize('manage', $announcement);
        AppNotification::where('type', 'announcement')->where('data->announcement_id', $announcement->id)->delete();
        $announcement->delete();

        return response()->json(['message' => 'Aviso apagado.']);
    }

    /** Abrir a tela de Avisos marca tudo como lido (e tira do sino as notificações de aviso). */
    public function readAll(Request $request): JsonResponse
    {
        $membership = $this->membership($request);
        $userId = $request->user()->id;

        $ids = Announcement::where('ministry_id', $membership->ministry_id)
            ->whereDoesntHave('reads', fn ($q) => $q->where('user_id', $userId))
            ->pluck('id');
        foreach ($ids as $id) {
            AnnouncementRead::firstOrCreate(['announcement_id' => $id, 'user_id' => $userId], ['read_at' => now()]);
        }
        AppNotification::where('user_id', $userId)
            ->where('ministry_id', $membership->ministry_id)
            ->where('type', 'announcement')
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['read' => $ids->count()]);
    }

    /**
     * Carrega autor, "lido por N de M" (sem contar quem escreveu) e se eu já li.
     *
     * @param  \Illuminate\Database\Eloquent\Builder<Announcement>  $query
     * @return Collection<int, Announcement>
     */
    private function load(Request $request, $query): Collection
    {
        $membership = $this->membership($request);
        $userId = $request->user()->id;
        $members = MinistryMember::where('ministry_id', $membership->ministry_id)
            ->where('status', MinistryMember::STATUS_ACTIVE)
            ->pluck('user_id');

        $announcements = $query->with('author')
            ->withCount(['reads' => fn ($q) => $q
                ->whereIn('user_id', $members)
                ->whereColumn('announcement_reads.user_id', '!=', 'announcements.author_id')])
            ->withExists(['reads as is_read' => fn ($q) => $q->where('user_id', $userId)])
            ->get();

        return $announcements->each(function (Announcement $a) use ($members, $userId) {
            $a->setAttribute('members_total', $members->reject(fn ($id) => $id === $a->author_id)->count());
            $a->setAttribute('is_read', $a->is_read || $a->author_id === $userId);
        });
    }

    /** @return array<string, mixed> */
    private function one(Request $request, Announcement $announcement): array
    {
        $loaded = $this->load($request, Announcement::whereKey($announcement->id))->first();

        return (new AnnouncementResource($loaded))->toArray($request);
    }

    private function membership(Request $request): MinistryMember
    {
        /** @var MinistryMember */
        return $request->attributes->get('membership');
    }
}
