<?php

namespace App\Actions;

use App\Models\Event;
use App\Models\User;
use App\Services\Availability;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * "Duplicar para outra data": copia local, visibilidade, ensaio, equipe e músicas como rascunho.
 * O ensaio vai junto, com a mesma antecedência em relação ao culto (ex.: sábado 16h para culto de domingo 19h).
 * Quem está indisponível na nova data fica de fora.
 */
class DuplicateEvent
{
    public function __construct(private Availability $availability) {}

    public function handle(Event $source, CarbonImmutable $startsAt, User $by): Event
    {
        return DB::transaction(function () use ($source, $startsAt, $by) {
            $copy = $source->replicate(['status', 'published_at', 'created_by']);
            $copy->fill([
                'starts_at' => $startsAt->utc(),
                'rehearsal_at' => $source->rehearsal_at
                    ? $startsAt->utc()->subSeconds($source->starts_at->getTimestamp() - $source->rehearsal_at->getTimestamp())
                    : null,
                'ends_at' => null,
                'status' => Event::STATUS_DRAFT,
                'published_at' => null,
                'created_by' => $by->id,
            ])->save();

            $unavailable = $this->availability
                ->unavailableOn(Availability::localDate($copy->starts_at))
                ->pluck('ministry_member_id');

            foreach ($source->assignments as $a) {
                if ($unavailable->contains($a->ministry_member_id)) {
                    continue;
                }
                $copy->assignments()->create([
                    'ministry_member_id' => $a->ministry_member_id,
                    'position_id' => $a->position_id,
                    'status' => 'pending',
                ]);
            }
            foreach ($source->songs as $s) {
                $copy->songs()->create($s->only(['song_id', 'sort_order', 'key', 'notes']));
            }
            foreach ($source->rundown as $r) {
                $copy->rundown()->create($r->only(['sort_order', 'title', 'planned_time', 'duration_min', 'responsible_member_id', 'notes']));
            }

            return $copy;
        });
    }
}
