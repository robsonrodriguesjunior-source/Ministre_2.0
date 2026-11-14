<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\MinistryMember;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** O sino (5.9): as notificações da pessoa no ministério ativo, das mais novas para as mais antigas. */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = $this->mine($request)->latest()->latest('id')->limit(60)->get();

        return response()->json([
            'data' => $items->map(fn (AppNotification $n) => [
                'id' => $n->id,
                'type' => $n->type,
                'title' => $n->title,
                'body' => $n->body,
                'route' => $n->data['route'] ?? null,
                'read' => $n->read_at !== null,
                'created_at' => $n->created_at->toIso8601String(),
            ]),
            'unread' => $this->mine($request)->whereNull('read_at')->count(),
        ]);
    }

    public function read(Request $request, int $notification): JsonResponse
    {
        $this->mine($request)->whereKey($notification)->firstOrFail()->update(['read_at' => now()]);

        return response()->json(['unread' => $this->mine($request)->whereNull('read_at')->count()]);
    }

    public function readAll(Request $request): JsonResponse
    {
        $this->mine($request)->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['unread' => 0]);
    }

    /** @return Builder<AppNotification> */
    private function mine(Request $request): Builder
    {
        /** @var MinistryMember $membership */
        $membership = $request->attributes->get('membership');

        return AppNotification::where('user_id', $request->user()->id)
            ->where(fn ($q) => $q->where('ministry_id', $membership->ministry_id)->orWhereNull('ministry_id'));
    }
}
