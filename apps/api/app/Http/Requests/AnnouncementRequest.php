<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Escrever ou editar um aviso (5.9). */
class AnnouncementRequest extends FormRequest
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
            'body' => [$required, 'string', 'max:5000'],
            'pinned' => ['sometimes', 'boolean'],
            'send_push' => ['sometimes', 'boolean'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['title' => 'o título', 'body' => 'o texto'];
    }
}
