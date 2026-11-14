<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventAssignment;
use App\Models\MinistryMember;
use App\Services\Notifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** Confirmar presença e "Não posso" — cada pessoa só responde as próprias escalas. */
class AssignmentController extends Controller
{
    public function confirm(Request $request, EventAssignment $assignment): JsonResponse
    {
        $assignments = $this->ownAssignments($request, $assignment);
        foreach ($assignments as $a) {
            $a->update(['status' => EventAssignment::STATUS_CONFIRMED, 'decline_reason' => null, 'responded_at' => now()]);
        }

        return response()->json(['status' => 'confirmed', 'message' => 'Presença confirmada.']);
    }

    public function decline(Request $request, EventAssignment $assignment, Notifier $notifier): JsonResponse
    {
        $request->validate(['reason' => ['nullable', 'string', 'max:120']], [], ['reason' => 'o motivo']);
        $assignments = $this->ownAssignments($request, $assignment);
        $reason = $request->input('reason');

        foreach ($assignments as $a) {
            $wasDeclined = $a->status === EventAssignment::STATUS_DECLINED;
            $a->update(['status' => EventAssignment::STATUS_DECLINED, 'decline_reason' => $reason, 'responded_at' => now()]);
            if (! $wasDeclined) {
                $notifier->declined($a->member, $a->event, $a->position->name, $reason);
            }
        }

        return response()->json(['status' => 'declined', 'message' => 'O líder foi avisado.']);
    }

    /**
     * A atribuição precisa ser minha e de uma escala publicada e futura. Respondo por todas as
     * minhas funções naquela escala de uma vez (ex.: Vocal + Violão).
     *
     * @return \Illuminate\Support\Collection<int, EventAssignment>
     */
    private function ownAssignments(Request $request, EventAssignment $assignment)
    {
        $assignment->load('event', 'member');
        $membership = $request->user()->membershipIn($assignment->event->ministry_id);

        if (! $membership || $membership->id !== $assignment->ministry_member_id) {
            abort(response()->json(['message' => 'Você só pode responder as suas escalas.'], 403));
        }
        if ($assignment->event->status !== Event::STATUS_PUBLISHED) {
            throw ValidationException::withMessages(['event' => 'Esta escala não está publicada.']);
        }
        if ($assignment->event->starts_at->isPast()) {
            throw ValidationException::withMessages(['event' => 'Este culto já aconteceu.']);
        }

        return EventAssignment::where('event_id', $assignment->event_id)
            ->where('ministry_member_id', $membership->id)
            ->with(['event', 'position', 'member.user'])
            ->get();
    }
}
