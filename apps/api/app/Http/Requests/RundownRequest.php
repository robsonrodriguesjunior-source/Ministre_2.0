<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RundownRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'items' => ['present', 'array', 'max:40'],
            'items.*.title' => ['required', 'string', 'max:80'],
            'items.*.planned_time' => ['nullable', 'date_format:H:i'],
            'items.*.duration_min' => ['nullable', 'integer', 'min:0', 'max:600'],
            'items.*.responsible_member_id' => ['nullable', 'integer'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ];
    }
}
