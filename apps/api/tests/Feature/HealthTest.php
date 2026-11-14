<?php

it('reports the api as up', function () {
    $this->getJson('/api/v1/health')
        ->assertOk()
        ->assertJson([
            'status' => 'ok',
            'app' => 'Ministre',
            'database' => 'ok',
        ]);
});
