<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\AcceptInvite;
use App\Actions\CreateInvite;
use App\Http\Controllers\Controller;
use App\Http\Requests\AcceptInviteRequest;
use App\Http\Requests\CreateInviteRequest;
use App\Http\Resources\InviteResource;
use App\Http\Resources\MembershipResource;
use App\Models\Invite;
use App\Models\MinistryMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class InviteController extends Controller
{
    /** Prévia pública do convite: nome da igreja, do ministério e as funções para escolher. */
    public function preview(string $code): JsonResponse
    {
        $invite = $this->findByCode($code);
        $ministry = $invite->ministry()->with(['church', 'positions' => fn ($q) => $q->whereNull('archived_at')])->first();

        return response()->json([
            'code' => $invite->code,
            'usable' => $invite->isUsable(),
            'role' => $invite->role,
            'church' => ['name' => $ministry->church->name, 'city' => $ministry->church->city],
            'ministry' => ['id' => $ministry->id, 'name' => $ministry->name],
            'positions' => $ministry->positions->map(fn ($p) => ['id' => $p->id, 'name' => $p->name])->values(),
        ]);
    }

    public function accept(AcceptInviteRequest $request, string $code, AcceptInvite $action): JsonResponse
    {
        $membership = $action->handle($request->user(), $this->findByCode($code), $request->input('positions', []));
        $membership->load(['ministry.church', 'positions']);

        return (new MembershipResource($membership))->response()->setStatusCode(200);
    }

    // ---- Gestão (líder do ministério ativo) ----

    public function index(Request $request): AnonymousResourceCollection
    {
        $membership = $this->membership($request);
        Gate::authorize('manage', $membership->ministry);

        return InviteResource::collection(
            Invite::where('ministry_id', $membership->ministry_id)->latest()->get()
        );
    }

    public function store(CreateInviteRequest $request, CreateInvite $action): JsonResponse
    {
        $membership = $this->membership($request);
        Gate::authorize('manage', $membership->ministry);

        $invite = $action->handle(
            $membership,
            $request->user(),
            $request->input('role') ?? MinistryMember::ROLE_MEMBER,
            (int) ($request->input('days_valid') ?? 30),
            $request->input('max_uses') !== null ? (int) $request->input('max_uses') : null,
        );

        return (new InviteResource($invite))->response()->setStatusCode(201);
    }

    public function destroy(Request $request, Invite $invite): JsonResponse
    {
        Gate::authorize('delete', $invite);
        $invite->delete();

        return response()->json(['message' => 'Convite cancelado.']);
    }

    private function findByCode(string $code): Invite
    {
        return Invite::where('code', CreateInvite::normalize($code))->firstOr(
            fn () => abort(response()->json(['message' => 'Convite não encontrado. Confira o código.'], 404))
        );
    }

    private function membership(Request $request): MinistryMember
    {
        /** @var MinistryMember */
        return $request->attributes->get('membership');
    }
}
