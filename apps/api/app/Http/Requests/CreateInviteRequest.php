<?php

namespace App\Http\Requests;

use App\Models\MinistryMember;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateInviteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // a permissão de líder é conferida no controller (MinistryPolicy@manage)
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'role' => ['nullable', Rule::in([MinistryMember::ROLE_MEMBER, MinistryMember::ROLE_LEADER])],
            'days_valid' => ['nullable', 'integer', 'min:1', 'max:90'],
            'max_uses' => ['nullable', 'integer', 'min:1', 'max:500'],
        ];
    }
}
