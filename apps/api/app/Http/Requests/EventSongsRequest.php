<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EventSongsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'songs' => ['present', 'array', 'max:40'],
            'songs.*.song_id' => ['required', 'integer'],
            'songs.*.key' => ['nullable', 'string', 'max:8'],
            'songs.*.notes' => ['nullable', 'string', 'max:255'],
        ];
    }
}
