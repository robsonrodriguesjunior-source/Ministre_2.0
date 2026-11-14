<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\EventAssignment;
use App\Models\MinistryMember;
use App\Models\Position;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Gestão › Membros (5.10, só líderes): papel, funções e remover. */
class MemberController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $membership = $this->leader($request);

        $members = MinistryMember::where('ministry_id', $membership->ministry_id)
            ->where('status', MinistryMember::STATUS_ACTIVE)
            ->with(['user', 'positions'])
            ->get()
            ->sortBy(fn ($m) => [$m->role === MinistryMember::ROLE_LEADER ? 0 : 1, mb_strtolower($m->user->name)])
            ->values();

        return response()->json(['data' => $members->map(fn ($m) => $this->present($request, $m, $membership))]);
    }

    public function update(Request $request, MinistryMember $member): JsonResponse
    {
        $membership = $this->leader($request);
        $this->sameMinistry($membership, $member);

        $data = $request->validate([
            'role' => ['sometimes', Rule::in([MinistryMember::ROLE_LEADER, MinistryMember::ROLE_MEMBER])],
            'position_ids' => ['sometimes', 'array', 'max:40'],
            'position_ids.*' => ['integer'],
        ]);

        if (($data['role'] ?? null) === MinistryMember::ROLE_MEMBER && $member->isLeader()) {
            $this->ensureAnotherLeader($member, 'role', 'O ministério precisa de pelo menos um líder.');
        }

        DB::transaction(function () use ($data, $member) {
            if (isset($data['role'])) {
                $member->update(['role' => $data['role']]);
            }
            if (array_key_exists('position_ids', $data)) {
                $valid = Position::where('ministry_id', $member->ministry_id)->whereNull('archived_at')
                    ->whereIn('id', $data['position_ids'])->pluck('id');
                $member->positions()->sync($valid);
            }
        });

        return response()->json(['data' => $this->present($request, $member->fresh(['user', 'positions']), $membership)]);
    }

    /** Remove do ministério: sai das escalas que ainda não aconteceram; o histórico fica. */
    public function destroy(Request $request, MinistryMember $member): JsonResponse
    {
        $membership = $this->leader($request);
        $this->sameMinistry($membership, $member);
        if ($member->isLeader()) {
            $this->ensureAnotherLeader($member, 'member', 'O ministério precisa de pelo menos um líder.');
        }

        DB::transaction(function () use ($member) {
            EventAssignment::where('ministry_member_id', $member->id)
                ->whereHas('event', fn ($q) => $q->where('starts_at', '>', now()))
                ->delete();
            $member->update(['status' => MinistryMember::STATUS_REMOVED]);
        });

        return response()->json(['message' => "{$member->user->name} saiu do ministério."]);
    }

    /** @return array<string, mixed> */
    private function present(Request $request, MinistryMember $m, MinistryMember $me): array
    {
        return [
            'id' => $m->id,
            'user_id' => $m->user_id,
            'name' => $m->user->name,
            'email' => $m->user->email,
            'phone' => $m->user->phone,
            'avatar_url' => (new UserResource($m->user))->toArray($request)['avatar_url'],
            'role' => $m->role,
            'positions' => $m->positions->sortBy('sort_order')->map(fn ($p) => ['id' => $p->id, 'name' => $p->name])->values(),
            'joined_at' => $m->joined_at?->toIso8601String(),
            'is_me' => $m->id === $me->id,
        ];
    }

    private function ensureAnotherLeader(MinistryMember $member, string $field, string $message): void
    {
        $others = MinistryMember::where('ministry_id', $member->ministry_id)->where('id', '!=', $member->id)
            ->where('status', MinistryMember::STATUS_ACTIVE)->where('role', MinistryMember::ROLE_LEADER)->exists();
        if (! $others) {
            throw ValidationException::withMessages([$field => $message]);
        }
    }

    private function sameMinistry(MinistryMember $me, MinistryMember $member): void
    {
        abort_unless($member->ministry_id === $me->ministry_id && $member->status === MinistryMember::STATUS_ACTIVE, 404);
    }

    private function leader(Request $request): MinistryMember
    {
        /** @var MinistryMember $membership */
        $membership = $request->attributes->get('membership');
        Gate::authorize('manage', $membership->ministry);

        return $membership;
    }
}
