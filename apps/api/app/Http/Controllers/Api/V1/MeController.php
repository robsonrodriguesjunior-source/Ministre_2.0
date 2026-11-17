<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\DeleteAccount;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateMeRequest;
use App\Http\Resources\MembershipResource;
use App\Http\Resources\UserResource;
use App\Models\Event;
use App\Models\EventAssignment;
use App\Models\MinistryMember;
use App\Models\User;
use App\Services\Availability;
use App\Services\ChurchManagers;
use App\Services\ImageStore;
use Carbon\CarbonImmutable;
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

    /** Foto de perfil (câmera ou galeria): recortada em quadrado e reduzida. */
    public function avatar(Request $request, ImageStore $images): UserResource
    {
        $request->validate(['photo' => ['required', 'file', 'image', 'max:'.ImageStore::MAX_KB]], [
            'photo.image' => 'Escolha uma foto (JPG ou PNG).',
            'photo.max' => 'A foto é grande demais (máximo 8 MB).',
        ]);

        $user = $request->user();
        $path = $images->storeSquare($request->file('photo'), 'avatars');
        $images->delete($user->avatar_path);
        $user->update(['avatar_path' => $path]);

        return new UserResource($user);
    }

    public function removeAvatar(Request $request, ImageStore $images): UserResource
    {
        $user = $request->user();
        $images->delete($user->avatar_path);
        $user->update(['avatar_path' => null]);

        return new UserResource($user);
    }

    /** "12 escalas este ano · 92% de presença confirmada" no ministério ativo. */
    public function stats(Request $request): JsonResponse
    {
        /** @var MinistryMember $membership */
        $membership = $request->attributes->get('membership');
        $year = CarbonImmutable::now(Availability::TZ)->startOfYear();
        $range = [$year->utc(), $year->endOfYear()->utc()];

        $assignments = EventAssignment::where('ministry_member_id', $membership->id)
            ->whereHas('event', fn ($q) => $q->where('status', Event::STATUS_PUBLISHED)->whereBetween('starts_at', $range))
            ->with('event:id,starts_at')
            ->get();

        // Presença: das escalas que já aconteceram, quantas a pessoa confirmou.
        $past = $assignments->filter(fn ($a) => $a->event->starts_at->isPast());
        $rate = $past->isEmpty() ? null : (int) round(100 * $past->where('status', EventAssignment::STATUS_CONFIRMED)->count() / $past->count());

        return response()->json(['data' => [
            'year' => $year->year,
            'events' => $assignments->pluck('event_id')->unique()->count(),
            'confirmed_rate' => $rate,
        ]]);
    }

    /** Excluir minha conta: precisa digitar EXCLUIR. */
    public function destroy(Request $request, DeleteAccount $action): JsonResponse
    {
        $request->validate(['confirm' => ['required', 'in:EXCLUIR']], [
            'confirm.required' => 'Digite EXCLUIR para confirmar.',
            'confirm.in' => 'Digite EXCLUIR, em letras maiúsculas, para confirmar.',
        ]);
        $action->handle($request->user());

        return response()->json(['message' => 'Sua conta foi excluída.']);
    }

    /** Ministérios de que a pessoa participa (alimenta o seletor de ministério). */
    public function ministries(Request $request): AnonymousResourceCollection
    {
        // Gestor da igreja enxerga (e lidera) todos os departamentos dela.
        ChurchManagers::ensure($request->user());

        $memberships = $request->user()->memberships()
            ->where('status', MinistryMember::STATUS_ACTIVE)
            ->with(['ministry.church', 'positions'])
            ->orderBy('joined_at')
            ->get();

        return MembershipResource::collection($memberships);
    }
}
