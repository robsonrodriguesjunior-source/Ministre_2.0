<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthController extends Controller
{
    /**
     * Confirma que a API está no ar e se o banco responde.
     */
    public function __invoke(): JsonResponse
    {
        try {
            DB::select('select 1');
            $database = 'ok';
        } catch (Throwable) {
            $database = 'error';
        }

        return response()->json([
            'status' => 'ok',
            'app' => config('app.name'),
            'database' => $database,
            'time' => now()->toIso8601String(),
        ]);
    }
}
