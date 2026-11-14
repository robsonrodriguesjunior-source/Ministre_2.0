<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateMeRequest;
use App\Http\Resources\MembershipResource;
use App\Http\Resources\UserResource;
use App\Models\MinistryMember;
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
