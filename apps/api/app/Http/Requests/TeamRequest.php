<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TeamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'team' => ['present', 'array', 'max:60'],
            'team.*.member_id' => ['required', 'integer'],
            'team.*.position_id' => ['required', 'integer'],
        ];
    }
}
