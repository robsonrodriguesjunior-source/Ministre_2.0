<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Church;
use App\Models\Ministry;
use App\Models\MinistryMember;
use App\Models\User;
use App\Services\ChurchManagers;
use App\Services\ImageStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Gestão › Gestores da igreja: quem tem acesso de gestão em todos os departamentos.
 * Só gestores mexem aqui. Quem criou a igreja é gestor fixo (não sai).
 */
class ChurchManagerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $church = $this->church($request);
        $managerIds = DB::table('church_managers')->where('church_id', $church->id)->pluck('user_id')->push($church->owner_user_id)->filter()->unique();

        // Quem pode virar gestor: qualquer pessoa ativa em algum departamento da igreja.
        $people = User::whereIn('id', MinistryMember::whereIn('ministry_id', Ministry::where('church_id', $church->id)->select('id'))
            ->where('status', MinistryMember::STATUS_ACTIVE)->select('user_id'))
            ->orderBy('name')->get();

        $present = fn (User $u) => [
            'user_id' => $u->id,
            'name' => $u->name,
            'avatar_url' => ImageStore::url($u->avatar_path),
            'is_owner' => (int) $u->id === (int) $church->owner_user_id,
            'is_me' => (int) $u->id === (int) $request->user()->id,
        ];

        return response()->json([
            'data' => $people->filter(fn ($u) => $managerIds->contains($u->id))->map($present)->values(),
            'candidates' => $people->reject(fn ($u) => $managerIds->contains($u->id))->map($present)->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $church = $this->church($request);
        $data = $request->validate(['user_id' => ['required', 'integer']]);

        $user = User::find($data['user_id']);
        $belongs = $user && MinistryMember::whereIn('ministry_id', Ministry::where('church_id', $church->id)->select('id'))
            ->where('user_id', $user->id)->where('status', MinistryMember::STATUS_ACTIVE)->exists();
        if (! $belongs) {
            throw ValidationException::withMessages(['user_id' => 'Escolha alguém que já participa de um departamento da igreja.']);
        }

        DB::table('church_managers')->insertOrIgnore(['church_id' => $church->id, 'user_id' => $user->id, 'created_at' => now(), 'updated_at' => now()]);
        ChurchManagers::ensure($user);

        return response()->json(['message' => "{$user->name} agora é gestor da igreja."], 201);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $church = $this->church($request);
        if ((int) $user->id === (int) $church->owner_user_id) {
            throw ValidationException::withMessages(['user_id' => 'Quem criou a igreja é sempre gestor.']);
        }

        ChurchManagers::revoke($user, $church);

        return response()->json(['message' => "{$user->name} deixou de ser gestor da igreja."]);
    }

    private function church(Request $request): Church
    {
        /** @var MinistryMember $membership */
        $membership = $request->attributes->get('membership');
        $church = $membership->ministry->church;
        abort_unless(ChurchManagers::isManager($request->user(), $church), 403, 'Só os gestores da igreja mexem nos gestores.');

        return $church;
    }
}
