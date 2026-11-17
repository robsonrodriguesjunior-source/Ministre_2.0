<?php

namespace App\Http\Middleware;

use App\Models\Ministry;
use App\Models\MinistryMember;
use App\Services\ChurchManagers;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Lê o ministério ativo do cabeçalho X-Ministry-Id e confere se o usuário participa dele.
 * Depois disso, controllers usam $request->attributes->get('membership').
 * Ninguém vê dados de um ministério de que não participa.
 */
class ResolveMinistry
{
    public function handle(Request $request, Closure $next): Response
    {
        $ministryId = (int) $request->header('X-Ministry-Id');

        if ($ministryId <= 0) {
            return response()->json(['message' => 'Escolha um ministério para continuar.'], 400);
        }

        /** @var \App\Models\User $user */
        $user = $request->user();
        $find = fn () => MinistryMember::query()
            ->where('ministry_id', $ministryId)
            ->where('user_id', $user->id)
            ->where('status', MinistryMember::STATUS_ACTIVE)
            ->with('ministry')
            ->first();
        $membership = $find();

        // O Gestor da igreja (pastor ou administrador) é líder em todos os departamentos dela.
        if (! $membership?->isLeader()) {
            $ministry = Ministry::with('church')->find($ministryId);
            if ($ministry && ChurchManagers::isManager($user, $ministry->church)) {
                ChurchManagers::ensure($user);
                $membership = $find();
            }
        }

        if (! $membership) {
            return response()->json(['message' => 'Você não participa deste ministério.'], 403);
        }

        $request->attributes->set('membership', $membership);

        return $next($request);
    }
}
