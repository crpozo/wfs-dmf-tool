<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OdooLeadSourceControllerTest extends TestCase
{
    public function test_it_returns_all_available_odoo_lead_sources(): void
    {
        config([
            'services.odoo.base_url' => 'https://odoo.test',
            'services.odoo.api_key' => 'test-key',
            'services.odoo.database' => 'test-database',
        ]);

        Http::fake([
            'https://odoo.test/json/2/wfs.lead.source/search_read' => Http::response([
                ['id' => 4, 'name' => 'Google'],
                ['id' => 12, 'name' => 'Other (please specify in notes)'],
            ]),
        ]);

        $this->getJson(route('odoo.lead_sources.index'))
            ->assertOk()
            ->assertJsonPath('data.0.id', 4)
            ->assertJsonPath('data.1.name', 'Other (please specify in notes)');

        Http::assertSent(function ($request) {
            return $request->url() === 'https://odoo.test/json/2/wfs.lead.source/search_read'
                && $request['domain'] === []
                && $request['fields'] === ['id', 'name']
                && $request['order'] === 'name asc';
        });
    }
}
