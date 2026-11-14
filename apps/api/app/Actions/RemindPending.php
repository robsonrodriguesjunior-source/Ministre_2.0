<?php

namespace App\Actions;

use App\Models\Event;
use App\Models\EventAssignment;
use App\Services\Notifier;

/** "Lembrar pendentes": avisa só quem não respondeu, no máximo uma vez a cada 6 horas por pessoa. */
class RemindPending
{
    public const HOURS = 6;

    public function __construct(private Notifier $notifier) {}

    /** @return int quantas pessoas foram lembradas */
    public function handle(Event $event): int
    {
        $pending = $event->assignments()
            ->where('status', EventAssignment::STATUS_PENDING)
            ->with('member.user')
            ->get();

        $count = 0;
        $alreadyNotified = [];
        foreach ($pending as $assignment) {
            if ($assignment->reminded_at && $assignment->reminded_at->gt(now()->subHours(self::HOURS))) {
                continue;
            }
            // Uma pessoa em duas funções recebe um lembrete só.
            if (! isset($alreadyNotified[$assignment->ministry_member_id])) {
                $this->notifier->reminder($assignment->member, $event);
                $alreadyNotified[$assignment->ministry_member_id] = true;
                $count++;
            }
            $assignment->update(['reminded_at' => now()]);
        }

        return $count;
    }
}
