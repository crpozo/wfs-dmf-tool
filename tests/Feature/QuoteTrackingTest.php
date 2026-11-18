<?php

namespace Tests\Feature;

use App\Classes\Estimate;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class QuoteTrackingTest extends TestCase
{
    private function fakeOdoo(): void
    {
        config([
            'services.odoo.base_url' => 'https://odoo.test',
            'services.odoo.api_key' => 'test-key',
            'services.odoo.customer' => 1823,
        ]);

        Http::preventStrayRequests();
        Http::fake(['https://odoo.test/*' => Http::response([99])]);
    }

    private function estimate(): Estimate
    {
        return Estimate::fromArray([
            ['qty' => 1, 'sku' => 'ABC', 'id' => 10, 'sort_order' => 1, 'description' => 'Panel'],
        ]);
    }

    private function createdValues(): array
    {
        $created = Http::recorded(fn (Request $request) => str_ends_with($request->url(), '/sale.order/create'));

        return $created[0][0]->data()['vals_list'][0];
    }

    public function test_extra_fields_reach_the_odoo_quote(): void
    {
        $this->fakeOdoo();

        $this->estimate()->createOdooQuote(null, 'Fence App Quote', 5, null, null, 1, 7, [
            'wfs_customer_email' => 'john@example.com',
            'wfs_utm_source' => 'google',
        ]);

        $values = $this->createdValues();

        $this->assertSame('john@example.com', $values['wfs_customer_email']);
        $this->assertSame('google', $values['wfs_utm_source']);
        $this->assertSame(7, $values['wfs_lead_source_id']);
    }

    public function test_the_quote_stays_as_today_without_extra_fields(): void
    {
        $this->fakeOdoo();

        $this->estimate()->createOdooQuote(null, 'Fence App Quote', 5, null, null, 1, 7);

        $this->assertEmpty(array_filter(
            array_keys($this->createdValues()),
            fn (string $key) => str_starts_with($key, 'wfs_') && $key !== 'wfs_lead_source_id'
        ));
    }

    public function test_tag_manager_only_renders_when_configured(): void
    {
        config(['services.gtm.id' => null]);
        $without = view('partials.tracking_head')->render();

        $this->assertStringContainsString('wfs-attribution.js', $without);
        $this->assertStringNotContainsString('googletagmanager', $without);

        config(['services.gtm.id' => 'GTM-TEST123']);
        $with = view('partials.tracking_head')->render();

        $this->assertStringContainsString('googletagmanager', $with);
        $this->assertStringContainsString('"GTM-TEST123"', $with);
    }

    public function test_thank_you_sends_form_submit_only_after_a_public_quote(): void
    {
        $this->withoutVite();

        $this->get('/thank-you')->assertOk()->assertDontSee('form_submit', false);

        $this->withSession(['dmf_form_submit' => 'https://app.westernfencesupply.com/quote'])
            ->get('/thank-you')
            ->assertOk()
            ->assertSee("event: 'form_submit'", false)
            ->assertSee("form_name: 'dmf_app'", false);
    }
}
