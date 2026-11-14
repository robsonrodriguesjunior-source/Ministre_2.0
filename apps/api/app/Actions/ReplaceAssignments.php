<?php

namespace App\Actions;

use App\Models\Event;
use App\Models\EventAssignment;
use App\Models\MinistryMember;
use App\Models\Position;
use App\Services\Availability;
use App\Services\Notifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Troca a equipe inteira de uma escala (PUT /events/{id}/assignments).
 * - Quem marcou indisponibilidade na data é recusado (422) com mensagem clara.
 * - Quem continua mantém a resposta; quem entra começa Pendente.
 * - Em escala publicada: quem entra e quem sai recebem aviso.
 */
class ReplaceAssignments
{
    public function __construct(private Availability $availability, private Notifier $notifier) {}

    /** @param  list<array{member_id: int, position_id: int}>  $team */
    public function handle(Event $event, array $team): void
    {
        $day = Availability::localDate($event->starts_at);

        $members = MinistryMember::query()
            ->where('ministry_id', $event->ministry_id)
            ->where('status', MinistryMember::STATUS_ACTIVE)
            ->whereIn('id', collect($team)->pluck('member_id'))
            ->with('user')
            ->get()
            ->keyBy('id');

        $positions = Position::query()
            ->where('ministry_id', $event->ministry_id)
            ->whereIn('id', collect($team)->pluck('position_id'))
            ->get()
            ->keyBy('id');

        $unavailable = $this->availability->unavailableOn($day, $members->keys())->pluck('ministry_member_id')->unique();

        $wanted = [];
        foreach ($team as $i => $row) {
            $member = $members->get($row['member_id']);
            $position = $positions->get($row['position_id']);
            if (! $member || ! $position) {
                throw ValidationException::withMessages(["team.$i" => 'Pessoa ou função inválida para este ministério.']);
            }
            if ($unavailable->contains($member->id)) {
                throw ValidationException::withMessages([
                    "team.$i" => "{$member->user->name} marcou que não pode neste dia.",
                ]);
            }
            $wanted[$member->id.'-'.$position->id] = [$member, $position];
        }

        DB::transaction(function () use ($event, $wanted) {
            $current = $event->assignments()->with(['member.user', 'position'])->get()
                ->keyBy(fn (EventAssignment $a) => $a->ministry_member_id.'-'.$a->position_id);
            $published = $event->status === Event::STATUS_PUBLISHED;

            // Saem
            $removedMembers = [];
            foreach ($current as $key => $assignment) {
                if (! isset($wanted[$key])) {
                    $assignment->delete();
                    $removedMembers[$assignment->ministry_member_id] = $assignment->member;
                }
            }

            // Entram
            $added = [];
            foreach ($wanted as $key => [$member, $position]) {
                if (! $current->has($key)) {
                    EventAssignment::create([
                        'event_id' => $event->id,
                        'ministry_member_id' => $member->id,
                        'position_id' => $position->id,
                        'status' => EventAssignment::STATUS_PENDING,
                    ]);
                    $added[] = [$member, $position];
                    unset($removedMembers[$member->id]); // trocou de função: não "saiu"
                }
            }

            if ($published) {
                foreach ($added as [$member, $position]) {
                    $this->notifier->scheduled($member, $event, $position->name);
                }
                $stillIn = collect($wanted)->map(fn ($pair) => $pair[0]->id)->values();
                foreach ($removedMembers as $memberId => $member) {
                    if (! $stillIn->contains($memberId)) {
                        $this->notifier->removed($member, $event);
                    }
                }
            }
        });
    }
}
