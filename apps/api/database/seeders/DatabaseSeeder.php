<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /** php artisan migrate:fresh --seed carrega o modo de demonstração. */
    public function run(): void
    {
        $this->call(DemoSeeder::class);
    }
}
