<?php

namespace App\Actions;

use App\Models\Church;
use App\Models\Ministry;
use App\Models\MinistryMember;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * "Criar meu ministério" (onboarding): cria a igreja, o ministério, as funções e os tipos de culto
 * escolhidos. Quem cria vira Líder.
 */
class CreateChurchWithMinistry
{
    /** Funções pré-marcadas no onboarding (seção 5.1). */
    public const DEFAULT_POSITIONS = ['Ministro', 'Vocal', 'Violão', 'Guitarra', 'Baixo', 'Teclado', 'Bateria', 'Som', 'Projeção'];

    /** Tipos de culto pré-marcados, com dia (0 = domingo) e horário padrão. */
    public const DEFAULT_EVENT_TYPES = [
        'Culto da Família' => ['weekday' => 0, 'time' => '19:00', 'rehearsal' => false],
        'Culto de Oração' => ['weekday' => 3, 'time' => '19:30', 'rehearsal' => false],
        'Santa Ceia' => ['weekday' => 0, 'time' => '19:00', 'rehearsal' => false],
        'Ensaio' => ['weekday' => 6, 'time' => '16:00', 'rehearsal' => true],
    ];

    /**
     * @param  array{church_name: string, city?: ?string, ministry_name: string, positions: list<string>, event_types: list<string>, default_location?: ?string}  $data
     */
    public function handle(User $user, array $data): MinistryMember
    {
        return DB::transaction(function () use ($user, $data) {
            $church = Church::create([
                'name' => $data['church_name'],
                'city' => $data['city'] ?? null,
                'slug' => $this->uniqueSlug($data['church_name']),
                'owner_user_id' => $user->id,
            ]);

            $ministry = Ministry::create([
                'church_id' => $church->id,
                'name' => $data['ministry_name'],
                'type' => 'worship',
                'default_location' => $data['default_location'] ?? null,
            ]);

            foreach (array_values(array_unique($data['positions'])) as $i => $name) {
                $ministry->positions()->create(['name' => $name, 'sort_order' => $i]);
            }

            foreach (array_values(array_unique($data['event_types'])) as $name) {
                $defaults = self::DEFAULT_EVENT_TYPES[$name] ?? null;
                $ministry->eventTypes()->create([
                    'name' => $name,
                    'weekday' => $defaults['weekday'] ?? null,
                    'default_time' => $defaults['time'] ?? null,
                    'default_location' => $data['default_location'] ?? null,
                    'is_rehearsal' => $defaults['rehearsal'] ?? false,
                ]);
            }

            return MinistryMember::create([
                'ministry_id' => $ministry->id,
                'user_id' => $user->id,
                'role' => MinistryMember::ROLE_LEADER,
                'status' => MinistryMember::STATUS_ACTIVE,
                'joined_at' => now(),
            ]);
        });
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'igreja';
        $slug = $base;
        $n = 2;
        while (Church::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$n++;
        }

        return $slug;
    }
}
