<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Cadastrar ou editar uma música (5.7). */
class SongRequest extends FormRequest
{
    /** Tom: nota (A a G), sustenido ou bemol opcional e "m" para menor. Ex.: G, F#, Bb, Em. */
    public const KEY_PATTERN = '/^[A-G](#|b)?m?$/';

    public function authorize(): bool
    {
        return true; // permissão de líder conferida no controller
    }

    /** Tags sem espaços sobrando, sem vazias e sem repetidas. */
    protected function prepareForValidation(): void
    {
        $tags = $this->input('tags');
        if (is_array($tags)) {
            $clean = array_map(fn ($t) => is_string($t) ? trim($t) : $t, $tags);
            $this->merge(['tags' => array_values(array_unique(array_filter($clean, fn ($t) => $t !== '' && $t !== null)))]);
        }
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'title' => [$required, 'string', 'max:120'],
            'artist' => ['nullable', 'string', 'max:120'],
            'original_key' => [$required, 'string', 'regex:'.self::KEY_PATTERN],
            'bpm' => ['nullable', 'integer', 'between:30,300'],
            'duration_sec' => ['nullable', 'integer', 'between:0,3600'],
            'chordpro' => ['nullable', 'string', 'max:50000'],
            'tags' => ['nullable', 'array', 'max:8'],
            'tags.*' => ['string', 'max:30'],
            'links' => ['nullable', 'array', 'max:5'],
            'links.*' => ['string', 'url:https', 'max:500'],
            // Ministro cadastrando de dentro da escala dele (a permissão é conferida no controller).
            'event_id' => ['nullable', 'integer'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'original_key.regex' => 'Escolha um tom válido (ex.: G, F#, Bb, Em).',
            'links.*.url' => 'O link precisa começar com https://.',
        ];
    }
}
