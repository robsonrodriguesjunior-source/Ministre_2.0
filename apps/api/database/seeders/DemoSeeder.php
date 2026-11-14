<?php

namespace Database\Seeders;

use App\Actions\CreateChurchWithMinistry;
use App\Models\Announcement;
use App\Models\Event;
use App\Models\EventAssignment;
use App\Models\EventType;
use App\Models\MinistryMember;
use App\Models\Position;
use App\Models\Song;
use App\Models\Unavailability;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

/**
 * Modo de demonstração (seção 8): php artisan db:seed --class=DemoSeeder
 * Senha de todas as contas de exemplo: demo1234
 * Letras inventadas (nunca usar letra real com direitos autorais).
 */
class DemoSeeder extends Seeder
{
    private const PASSWORD = 'demo1234';
    private const TZ = 'America/Sao_Paulo';

    public function run(CreateChurchWithMinistry $createChurch): void
    {
        $people = [
            'daniel' => ['Pr. Daniel', 'daniel@demo.ministreapp.com.br', ['Ministro']],
            'marcos' => ['Marcos', 'marcos@demo.ministreapp.com.br', ['Violão']],
            'ana' => ['Ana Lima', 'ana@demo.ministreapp.com.br', ['Vocal']],
            'joao' => ['João Pedro', 'joao@demo.ministreapp.com.br', ['Violão']],
            'marina' => ['Marina Costa', 'marina@demo.ministreapp.com.br', ['Teclado']],
            'lucas' => ['Lucas Rocha', 'lucas@demo.ministreapp.com.br', ['Bateria']],
            'clara' => ['Clara Souza', 'clara@demo.ministreapp.com.br', ['Vocal']],
            'rafael' => ['Rafael Nunes', 'rafael@demo.ministreapp.com.br', ['Vocal']],
        ];

        $users = [];
        foreach ($people as $key => [$name, $email]) {
            $users[$key] = User::updateOrCreate(['email' => $email], [
                'name' => $name,
                'password' => self::PASSWORD,
                'terms_accepted_at' => now(),
            ]);
        }

        // Pr. Daniel cria a igreja e vira líder.
        $leader = $createChurch->handle($users['daniel'], [
            'church_name' => 'Igreja Exemplo',
            'city' => 'São Paulo',
            'ministry_name' => 'Louvor',
            'default_location' => 'Templo',
            'positions' => CreateChurchWithMinistry::DEFAULT_POSITIONS,
            'event_types' => array_keys(CreateChurchWithMinistry::DEFAULT_EVENT_TYPES),
        ]);
        $ministry = $leader->ministry;
        $positions = Position::where('ministry_id', $ministry->id)->pluck('id', 'name');

        $members = [];
        foreach ($people as $key => [, , $roles]) {
            $member = $key === 'daniel' ? $leader : MinistryMember::create([
                'ministry_id' => $ministry->id,
                'user_id' => $users[$key]->id,
                'role' => MinistryMember::ROLE_MEMBER,
                'status' => MinistryMember::STATUS_ACTIVE,
                'joined_at' => now(),
            ]);
            $member->positions()->sync(collect($roles)->map(fn ($r) => $positions[$r])->all());
            $members[$key] = $member;
        }

        // ---- Músicas (letras inventadas) ----
        $songs = [];
        foreach ($this->songs() as $data) {
            $daysAgo = $data['days_ago'];
            unset($data['days_ago']);
            $song = Song::create($data + ['ministry_id' => $ministry->id]);
            $song->forceFill(['created_at' => now()->subDays($daysAgo)])->save();
            $songs[$data['title']] = $song;
        }

        // ---- Datas: próximos sábado, domingo, quarta e o domingo seguinte (horário de Brasília) ----
        $today = CarbonImmutable::now(self::TZ)->startOfDay();
        $saturday = $today->next(CarbonImmutable::SATURDAY);
        $sunday = $saturday->addDay();
        $wednesday = $sunday->addDays(3);
        $nextSunday = $sunday->addWeek();
        $at = fn (CarbonImmutable $day, string $time) => $day->setTimeFromTimeString($time)->utc();
        $type = fn (string $name) => EventType::where('ministry_id', $ministry->id)->where('name', $name)->value('id');

        $rehearsal = Event::create([
            'ministry_id' => $ministry->id, 'event_type_id' => $type('Ensaio'), 'title' => 'Ensaio geral',
            'starts_at' => $at($saturday, '16:00'), 'location' => 'Templo', 'status' => Event::STATUS_PUBLISHED,
            'is_rehearsal' => true, 'created_by' => $users['daniel']->id, 'published_at' => now(),
        ]);

        $familia = Event::create([
            'ministry_id' => $ministry->id, 'event_type_id' => $type('Culto da Família'), 'title' => 'Culto da Família',
            'starts_at' => $at($sunday, '19:00'), 'location' => 'Templo', 'status' => Event::STATUS_PUBLISHED,
            'created_by' => $users['daniel']->id, 'published_at' => now(),
            'notes' => 'Chegar 30 minutos antes para passar o som.',
        ]);

        // Equipe do Culto da Família: 7 pessoas, 5 confirmadas (Marcos e Rafael pendentes).
        $team = [
            ['daniel', 'Ministro', 'confirmed'],
            ['ana', 'Vocal', 'confirmed'],
            ['clara', 'Vocal', 'confirmed'],
            ['rafael', 'Vocal', 'pending'],
            ['marcos', 'Violão', 'pending'],
            ['joao', 'Violão', 'confirmed'],
            ['lucas', 'Bateria', 'confirmed'],
        ];
        foreach ($team as [$key, $role, $status]) {
            EventAssignment::create([
                'event_id' => $familia->id,
                'ministry_member_id' => $members[$key]->id,
                'position_id' => $positions[$role],
                'status' => $status,
                'responded_at' => $status === 'pending' ? null : now(),
            ]);
        }
        foreach ([['daniel', 'Ministro'], ['ana', 'Vocal'], ['marcos', 'Violão'], ['lucas', 'Bateria']] as [$key, $role]) {
            EventAssignment::create([
                'event_id' => $rehearsal->id, 'ministry_member_id' => $members[$key]->id,
                'position_id' => $positions[$role], 'status' => 'confirmed', 'responded_at' => now(),
            ]);
        }

        $order = 0;
        foreach (['Luz da Manhã' => 'G', 'Rio de Graça' => 'A', 'Fiel em Tudo' => 'D', 'Coroado' => 'E'] as $title => $key) {
            $familia->songs()->create(['song_id' => $songs[$title]->id, 'sort_order' => $order++, 'key' => $key]);
        }

        $rundown = [
            ['Abertura', '19:00', 5, 'daniel'],
            ['Louvor', '19:05', 25, 'daniel'],
            ['Avisos', '19:30', 5, null],
            ['Palavra', '19:35', 40, null],
            ['Encerramento', '20:15', 10, 'daniel'],
        ];
        foreach ($rundown as $i => [$title, $time, $minutes, $who]) {
            $familia->rundown()->create([
                'sort_order' => $i, 'title' => $title, 'planned_time' => $time, 'duration_min' => $minutes,
                'responsible_member_id' => $who ? $members[$who]->id : null,
            ]);
        }

        // Culto de Oração (Marcos não está escalado) e Santa Ceia (Marcos confirmado).
        $oracao = Event::create([
            'ministry_id' => $ministry->id, 'event_type_id' => $type('Culto de Oração'), 'title' => 'Culto de Oração',
            'starts_at' => $at($wednesday, '19:30'), 'location' => 'Templo', 'status' => Event::STATUS_PUBLISHED,
            'created_by' => $users['daniel']->id, 'published_at' => now(),
        ]);
        foreach ([['daniel', 'Ministro'], ['clara', 'Vocal'], ['joao', 'Violão']] as [$key, $role]) {
            EventAssignment::create([
                'event_id' => $oracao->id, 'ministry_member_id' => $members[$key]->id,
                'position_id' => $positions[$role], 'status' => 'pending',
            ]);
        }

        $ceia = Event::create([
            'ministry_id' => $ministry->id, 'event_type_id' => $type('Santa Ceia'), 'title' => 'Santa Ceia',
            'starts_at' => $at($nextSunday, '19:00'), 'location' => 'Templo', 'status' => Event::STATUS_PUBLISHED,
            'created_by' => $users['daniel']->id, 'published_at' => now(),
        ]);
        foreach ([['daniel', 'Ministro', 'confirmed'], ['ana', 'Vocal', 'pending'], ['marcos', 'Violão', 'confirmed']] as [$key, $role, $status]) {
            EventAssignment::create([
                'event_id' => $ceia->id, 'ministry_member_id' => $members[$key]->id,
                'position_id' => $positions[$role], 'status' => $status,
                'responded_at' => $status === 'confirmed' ? now() : null,
            ]);
        }

        $ceia->songs()->create(['song_id' => $songs['Santo Lugar']->id, 'sort_order' => 0, 'key' => 'C']);
        $ceia->songs()->create(['song_id' => $songs['Coroado']->id, 'sort_order' => 1, 'key' => 'D']);

        // Dois domingos que já passaram, para o repertório mostrar "Tocada N vezes · última em …".
        foreach ([1 => ['Luz da Manhã', 'Rio de Graça', 'Coroado'], 2 => ['Luz da Manhã', 'Fiel em Tudo']] as $weeksAgo => $titles) {
            $past = Event::create([
                'ministry_id' => $ministry->id, 'event_type_id' => $type('Culto da Família'), 'title' => 'Culto da Família',
                'starts_at' => $at($sunday->subWeeks($weeksAgo + 1), '19:00'), 'location' => 'Templo',
                'status' => Event::STATUS_PUBLISHED, 'created_by' => $users['daniel']->id, 'published_at' => now()->subWeeks($weeksAgo + 2),
            ]);
            foreach ($titles as $i => $title) {
                $past->songs()->create(['song_id' => $songs[$title]->id, 'sort_order' => $i, 'key' => $songs[$title]->original_key]);
            }
        }

        // Marina não pode no domingo do Culto da Família.
        Unavailability::create([
            'ministry_member_id' => $members['marina']->id,
            'starts_on' => $sunday->toDateString(),
            'ends_on' => $sunday->toDateString(),
            'reason' => 'Viagem',
        ]);

        Announcement::create([
            'ministry_id' => $ministry->id,
            'author_id' => $users['daniel']->id,
            'title' => 'Domingo',
            'body' => 'Chegar 30 minutos antes no domingo.',
            'pinned' => true,
        ]);
    }

    /**
     * Músicas de exemplo. Todas as letras são inventadas (nunca usar letra real com direitos autorais).
     * "Santo Lugar" foi cadastrada há poucos dias para aparecer no filtro "Novas".
     *
     * @return list<array<string, mixed>>
     */
    private function songs(): array
    {
        return [
            [
                'title' => 'Luz da Manhã', 'artist' => 'Ministério Exemplo', 'original_key' => 'G', 'bpm' => 72,
                'duration_sec' => 240, 'tags' => ['Adoração'], 'links' => [], 'days_ago' => 120,
                'chordpro' => <<<'CHO'
                {title: Luz da Manhã}
                {key: G}
                [G]Quando a luz da ma[D]nhã
                [Em]toca a minha ja[C]nela
                [G]lembro do teu a[D]mor
                [Em]que nunca se [C]cansa

                {c: Refrão}
                [C]Luz da manhã, [G]brilha em mim
                [Em]mostra o caminho [D]até o fim
                [C]luz da manhã, [G]fica aqui
                [Em]tudo o que eu sou [D]vem de [G]ti

                {c: Ponte}
                [Am]Mesmo na noite [C]mais escura
                [G]tua palavra [D]me segura
                CHO,
            ],
            [
                'title' => 'Rio de Graça', 'artist' => 'Ministério Exemplo', 'original_key' => 'A', 'bpm' => 68,
                'duration_sec' => 300, 'tags' => ['Adoração'], 'links' => [], 'days_ago' => 120,
                'chordpro' => <<<'CHO'
                {title: Rio de Graça}
                {key: A}
                [A]Como um rio que [E]desce o monte
                [F#m]tua graça corre em [D]mim
                [A]cada manhã é um [E]começo
                [F#m]teu cuidado [D]não tem [A]fim

                {c: Refrão}
                [D]Rio de graça, [A]leva-me
                [F#m]para perto de [E]ti
                [D]rio de graça, [A]lava-me
                [F#m]quero es[E]tar a[A]qui

                {c: Ponte}
                [D]Corre, corre, [E]rio de graça
                [F#m]enche o vale, [D]enche a praça
                [D]corre, corre, [E]sobre nós
                [F#m]ouço a tua [E]voz
                CHO,
            ],
            [
                'title' => 'Fiel em Tudo', 'artist' => 'Ministério Exemplo', 'original_key' => 'D', 'bpm' => 80,
                'duration_sec' => 240, 'tags' => ['Celebração'], 'links' => [], 'days_ago' => 90,
                'chordpro' => <<<'CHO'
                {title: Fiel em Tudo}
                {key: D}
                [D]Em cada passo [A]que eu der
                [Bm]tua mão me se[G]gura
                [D]no vale ou no [A]monte
                [Bm]teu amor per[G]dura

                {c: Refrão}
                [G]Fiel em tudo, [D]fiel em tudo
                [Bm]nunca me dei[A]xou
                [G]fiel em tudo, [D]fiel em tudo
                [Bm]teu amor fi[A]cou [D]
                CHO,
            ],
            [
                'title' => 'Coroado', 'artist' => 'Ministério Exemplo', 'original_key' => 'E', 'bpm' => 64,
                'duration_sec' => 360, 'tags' => ['Adoração', 'Celebração'], 'links' => [], 'days_ago' => 60,
                'chordpro' => <<<'CHO'
                {title: Coroado}
                {key: E}
                [E]Toda a terra can[B]ta
                [C#m]o céu se le[A]vanta
                [E]o Rei está co[B]roado
                [C#m]e reina para [A]sempre

                {c: Refrão}
                [A]Coroado, co[E]roado
                [B]digno é o teu [C#m]nome
                [A]coroado, co[E]roado
                [B]para sempre [E]Rei
                CHO,
            ],
            [
                'title' => 'Santo Lugar', 'artist' => 'Ministério Exemplo', 'original_key' => 'C', 'bpm' => 70,
                'duration_sec' => 270, 'tags' => ['Ceia'], 'links' => [], 'days_ago' => 5,
                'chordpro' => <<<'CHO'
                {title: Santo Lugar}
                {key: C}
                [C]Neste santo lu[G]gar
                [Am]venho me pros[F]trar
                [C]tua presença é o [G]meu lar
                [Am]quero aqui fi[F]car

                {c: Refrão}
                [F]Santo, [G]santo
                [Em]é o teu [Am]nome
                [F]santo, [G]santo
                [C]sempre vou can[G]tar
                CHO,
            ],
        ];
    }
}
