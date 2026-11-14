<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Criar ou editar os dados de uma escala (passo 1 do assistente). */
class EventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // permissão de líder conferida no controller
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'title' => [$required, 'string', 'max:120'],
            'starts_at' => [$required, 'date'],
            'event_type_id' => ['nullable', 'integer'],
            'location' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'is_rehearsal' => ['sometimes', 'boolean'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['title' => 'o nome do culto', 'starts_at' => 'a data e o horário', 'location' => 'o local'];
    }
}
