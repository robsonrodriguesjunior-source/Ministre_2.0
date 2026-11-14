<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Marcar indisponibilidade: dia único ou período, motivo opcional e "repetir toda semana". */
class UnavailabilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'starts_on' => ['required', 'date_format:Y-m-d'],
            'ends_on' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:starts_on'],
            'reason' => ['nullable', 'string', 'max:120'],
            'repeat_weekly' => ['sometimes', 'boolean'],
            'decline_conflicts' => ['sometimes', 'boolean'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['starts_on' => 'a data', 'ends_on' => 'a data final', 'reason' => 'o motivo'];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['ends_on.after_or_equal' => 'A data final precisa ser depois da inicial.'];
    }
}
