<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventSummaryResource;
use App\Models\Announcement;
use App\Models\AppNotification;
use App\Models\Event;
use App\Models\MinistryMember;
use App\Models\Song;
use App\Services\Availability;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Tudo da tela Início numa chamada só (5.2). */
class HomeController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        /** @var MinistryMember $membership */
        $membership = $request->attributes->get('membership');
        $with = ['assignments.position', 'assignments.member.user'];
        $now = now();

        // Próximo culto publicado em que estou escalado (e que ainda não acabou: até 3 h depois do início).
        $next = Event::query()
            ->where('ministry_id', $membership->ministry_id)
            ->where('status', Event::STATUS_PUBLISHED)
            ->where('starts_at', '>=', $now->copy()->subHours(3))
            ->whereHas('assignments', fn ($q) => $q->where('ministry_member_id', $membership->id))
            ->with($with)
            ->orderBy('starts_at')
            ->first();

        // Esta semana (até domingo): ensaio, músicas novas no repertório e o último aviso.
        $weekEnd = CarbonImmutable::now(Availability::TZ)->endOfWeek(CarbonImmutable::SUNDAY)->utc();
        $rehearsal = Event::query()
            ->where('ministry_id', $membership->ministry_id)
            ->where('status', Event::STATUS_PUBLISHED)
            ->where('is_rehearsal', true)
            ->whereBetween('starts_at', [$now, $weekEnd])
            ->orderBy('starts_at')
            ->first();

        $songsCount = $next ? $next->songs()->count() : 0;
        $newSongs = $next
            ? $next->songs()->whereHas('song', fn ($q) => $q->where('created_at', '>=', $now->copy()->subDays(30)))->count()
            : 0;

        $announcement = Announcement::where('ministry_id', $membership->ministry_id)
            ->with('author')
            ->orderByDesc('pinned')
            ->latest()
            ->first();

        return response()->json([
            'next_event' => $next ? new EventSummaryResource($next) : null,
            'rehearsal' => $rehearsal ? [
                'id' => $rehearsal->id,
                'title' => $rehearsal->title,
                'starts_at' => $rehearsal->starts_at->toIso8601String(),
                'location' => $rehearsal->location,
            ] : null,
            'songs' => $next ? ['event_id' => $next->id, 'count' => $songsCount, 'new' => $newSongs] : null,
            'announcement' => $announcement ? [
                'id' => $announcement->id,
                'title' => $announcement->title,
                'body' => $announcement->body,
                'created_at' => $announcement->created_at->toIso8601String(),
                'author' => $announcement->author ? [
                    'id' => $announcement->author->id,
                    'name' => $announcement->author->name,
                ] : null,
            ] : null,
            'unread_notifications' => AppNotification::where('user_id', $request->user()->id)->whereNull('read_at')->count(),
            'songs_total' => Song::where('ministry_id', $membership->ministry_id)->count(),
        ]);
    }
}
