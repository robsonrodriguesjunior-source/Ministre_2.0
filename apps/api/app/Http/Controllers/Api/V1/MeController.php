<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateMeRequest;
use App\Http\Resources\MembershipResource;
use App\Http\Resources\UserResource;
use App\Models\MinistryMember;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MeController extends Controller
{
    public function show(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    public function update(UpdateMeRequest $request): UserResource
    {
        $user = $request->user();
        $user->update($request->validated());

        return new UserResource($user);
    }

    /** Quais avisos chegam no celular (Perfil › Notificações). */
    public function notificationPrefs(Request $request): JsonResponse
    {
        return response()->json(['data' => $request->user()->pushPrefs()]);
    }

    public function updateNotificationPrefs(Request $request): JsonResponse
    {
        $rules = collect(User::PUSH_PREFS)->mapWithKeys(fn ($key) => [$key => ['sometimes', 'boolean']])->all();
        $changes = collect($request->validate($rules))->map(fn ($v) => (bool) $v)->all();

        $user = $request->user();
        $user->update(['push_prefs' => [...$user->pushPrefs(), ...$changes]]);

        return response()->json(['data' => $user->pushPrefs()]);
    }

    /** Ministérios de que a pessoa participa (alimenta o seletor de ministério). */
    public function ministries(Request $request): AnonymousResourceCollection
    {
        $memberships = $request->user()->memberships()
            ->where('status', MinistryMember::STATUS_ACTIVE)
            ->with(['ministry.church', 'positions'])
            ->orderBy('joined_at')
            ->get();

        return MembershipResource::collection($memberships);
    }
}
