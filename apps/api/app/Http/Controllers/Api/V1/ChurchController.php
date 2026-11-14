<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\CreateChurchWithMinistry;
use App\Http\Controllers\Controller;
use App\Http\Requests\CreateChurchRequest;
use App\Http\Resources\MembershipResource;
use Illuminate\Http\JsonResponse;

class ChurchController extends Controller
{
    /** "Criar meu ministério": igreja + ministério + funções + tipos de culto; quem cria vira Líder. */
    public function store(CreateChurchRequest $request, CreateChurchWithMinistry $action): JsonResponse
    {
        $membership = $action->handle($request->user(), $request->validated());
        $membership->load(['ministry.church', 'positions']);

        return (new MembershipResource($membership))->response()->setStatusCode(201);
    }
}
