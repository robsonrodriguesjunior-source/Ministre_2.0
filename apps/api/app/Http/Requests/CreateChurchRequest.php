<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateChurchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'church_name' => ['required', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:120'],
            'ministry_name' => ['required', 'string', 'max:80'],
            'default_location' => ['nullable', 'string', 'max:120'],
            'positions' => ['required', 'array', 'min:1', 'max:40'],
            'positions.*' => ['required', 'string', 'max:40'],
            'event_types' => ['present', 'array', 'max:20'],
            'event_types.*' => ['required', 'string', 'max:60'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['positions.min' => 'Escolha pelo menos uma função.'];
    }
}
