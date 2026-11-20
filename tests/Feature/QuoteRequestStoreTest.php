<?php

namespace Tests\Feature;

use App\Mail\QuoteRequestReceived;
use App\Models\QuoteRequest;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * The public quote, end to end against a real PostgreSQL database with every migration
 * applied (Odoo and the mail server are stand-ins). It is the request that failed in
 * production on 18-20 Nov 2026, when the code was deployed before its migration.
 *
 * Needs the database of .env / the CI service; nothing here reaches Odoo or sends mail.
 */
class QuoteRequestStoreTest extends TestCase
{
    private const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    protected function setUp(): void
    {
        parent::setUp();

        // quote_requests has no "create" migration (the production database came from a
        // dump), so the test creates the table as the dump had it and lets the migrations
        // add their columns.
        DB::statement('CREATE SCHEMA IF NOT EXISTS wfs');

        if (! Schema::hasTable('quote_requests')) {
            Schema::create('quote_requests', function ($table) {
                $table->id();
                $table->string('full_name', 150)->nullable();
                $table->string('email', 254)->nullable();
                $table->string('phone', 30)->nullable();
                $table->string('preferred_contact_method', 20)->nullable();
                $table->string('zip_code', 12)->nullable();
                $table->string('property_type', 40)->nullable();
                $table->string('project_type', 40)->nullable();
                $table->string('timeline', 40)->nullable();
                $table->string('primary_reason', 30)->nullable();
                $table->string('hear_about_us', 255)->nullable();
                $table->json('material')->nullable();
                $table->json('sketch')->nullable();
                $table->unsignedBigInteger('odoo_id')->nullable();
                $table->string('odoo_quote', 64)->nullable();
                $table->timestamp('sent_at')->nullable();
                $table->unsignedBigInteger('user_id')->nullable();
                $table->json('estimate')->nullable();
                $table->string('ref')->nullable();
                $table->boolean('delivery')->nullable();
                $table->integer('company_id')->nullable();
                $table->integer('code_id')->nullable();
                $table->integer('customer_id')->nullable();
                $table->integer('sent_id')->nullable();
                $table->timestamps();
            });
        }

        Artisan::call('migrate', ['--force' => true]);
        DB::table('quote_requests')->delete();

        config([
            'services.odoo.base_url' => 'https://odoo.test',
            'services.odoo.api_key' => 'test-key',
            'services.odoo.customer' => 1823,
            'services.odoo.user_id' => 5,
            'services.odoo.send_attribution' => false,
            'mail.quotes_to' => 'sales@example.test',
        ]);

        Http::preventStrayRequests();
        Mail::fake();
    }

    private function fakeOdoo(): void
    {
        Http::fake([
            'https://odoo.test/json/2/res.partner/fields_get' => Http::response(['x_studio_special_price_notes' => ['string' => 'Special Price Notes']]),
            'https://odoo.test/json/2/res.partner/read' => Http::response([['id' => 1823, 'x_studio_special_price_notes' => false]]),
            'https://odoo.test/json/2/sale.order/create' => Http::response([4242]),
            'https://odoo.test/json/2/sale.order/read' => Http::response([['id' => 4242, 'name' => 'S04242']]),
            'https://odoo.test/json/2/ir.attachment/create' => Http::response([777]),
            'https://odoo.test/*' => Http::response(true),
        ]);
    }

    private function fenceSession(): array
    {
        return [
            'materials' => [1 => ['code' => '12121', 'material' => 'Aluminum', 'type' => 'Residential', 'height' => '4 Feet', 'color' => 'Black', 'style' => '2 rail smooth bottom residential']],
            'sketch' => json_encode([['node1' => 1, 'node2' => 2, 'x1' => 0, 'y1' => 0, 'x2' => 240, 'y2' => 0, 'door' => 0, 'type' => 3, 'material' => 1, 'length' => 24]]),
            'estimate' => [['qty' => 4, 'sku' => 'ST000780', 'id' => 10, 'sort_order' => 1, 'description' => 'Panel']],
            'concrete' => false,
        ];
    }

    private function form(array $extra = []): array
    {
        return $extra + [
            'full_name' => 'Jane Customer',
            'email' => 'jane@example.com',
            'phone' => '555-0100',
            'lead_source_id' => 1,
            'fulfillment_method' => 'delivery',
            'canvas_image' => self::PNG,
        ];
    }

    private function odooQuotesCreated(): int
    {
        return Http::recorded(fn (Request $request) => str_ends_with($request->url(), '/sale.order/create'))->count();
    }

    public function test_a_public_quote_is_saved_with_its_campaign_data(): void
    {
        $this->fakeOdoo();

        $this->withSession($this->fenceSession())
            ->post('/quote-request', $this->form(['attribution' => json_encode(['utm_source' => 'Google', 'gclid' => 'abc'])]))
            ->assertRedirect(route('thank-you'));

        $quote = QuoteRequest::sole();
        $this->assertSame('jane@example.com', $quote->email);
        $this->assertSame('google', $quote->attribution['utm_source']);
        $this->assertSame('S04242', $quote->odoo_quote);
        $this->assertSame(1, $this->odooQuotesCreated());
        Mail::assertSent(QuoteRequestReceived::class, 1);
    }

    public function test_a_quote_without_campaign_data_is_saved_too(): void
    {
        $this->fakeOdoo();

        $this->withSession($this->fenceSession())
            ->post('/quote-request', $this->form())
            ->assertRedirect(route('thank-you'));

        $this->assertNull(QuoteRequest::sole()->attribution);
    }

    public function test_without_a_fence_in_the_session_the_customer_goes_back_to_the_start(): void
    {
        $this->fakeOdoo();

        $this->post('/quote-request', $this->form())
            ->assertRedirect(route('quote.create'))
            ->assertSessionHas('status');

        $this->assertSame(0, QuoteRequest::count());
        $this->assertSame(0, $this->odooQuotesCreated());
    }

    public function test_sending_the_form_twice_does_not_create_a_second_quote(): void
    {
        $this->fakeOdoo();

        $this->withSession($this->fenceSession())->post('/quote-request', $this->form())->assertRedirect(route('thank-you'));
        $this->post('/quote-request', $this->form())->assertRedirect(route('quote.create'));

        $this->assertSame(1, QuoteRequest::count());
        $this->assertSame(1, $this->odooQuotesCreated());
    }

    public function test_the_quote_is_saved_when_odoo_cannot_be_reached(): void
    {
        Http::fake(fn () => throw new ConnectionException('Odoo is unreachable'));

        $this->withSession($this->fenceSession())
            ->post('/quote-request', $this->form())
            ->assertRedirect(route('thank-you'));

        $this->assertNull(QuoteRequest::sole()->odoo_id);
        Mail::assertSent(QuoteRequestReceived::class, 1);
    }

    public function test_the_quote_is_saved_when_the_mail_server_is_down(): void
    {
        $this->fakeOdoo();
        Mail::swap(app('mail.manager'));
        config(['mail.default' => 'smtp', 'mail.mailers.smtp.host' => '127.0.0.1', 'mail.mailers.smtp.port' => 1]);

        $this->withSession($this->fenceSession())
            ->post('/quote-request', $this->form())
            ->assertRedirect(route('thank-you'));

        $this->assertSame(1, QuoteRequest::count());
    }

    public function test_requests_that_used_to_fail_now_answer_with_a_clear_status(): void
    {
        $sketch = rawurlencode(json_encode([['node1' => 1, 'node2' => 2, 'type' => 3, 'material' => 1, 'length' => 24]]));

        $this->get('/estimate/'.$sketch)->assertStatus(409);
        $this->get('/step/1/99')->assertNotFound();
        $this->get('/step/1/abc')->assertNotFound();
        $this->get('/step/9/12121')->assertNotFound();
        $this->get('/step/1/41111')->assertNotFound();
        $this->get('/getDims/x')->assertNotFound();
        $this->get('/template/nope')->assertNotFound();
    }

    public function test_every_question_and_answer_of_the_configurator_still_opens(): void
    {
        $this->withoutVite();

        $codes = [];
        $walk = function (array $question) use (&$walk, &$codes) {
            $codes[] = (string) $question['id'];
            foreach ($question['responses'] as $code => $answer) {
                isset($answer['next']) ? $walk($answer['next']) : $codes[] = (string) $code;
            }
        };
        foreach (json_decode(file_get_contents(resource_path('steps.json')), true) as $material) {
            $walk($material['next']);
        }

        $this->assertGreaterThan(300, count($codes));
        foreach ($codes as $code) {
            $status = $this->get('/step/1/'.$code)->getStatusCode();
            $this->assertSame(200, $status, "/step/1/{$code} answered {$status}");
        }
    }

    public function test_valid_steps_still_work_and_every_response_carries_a_request_id(): void
    {
        $this->withoutVite();

        $this->get('/step/1/10')->assertOk();
        $this->get('/step/1/12121')->assertOk()->assertSessionHas('materials');
        $this->assertNotEmpty($this->get('/')->headers->get('X-Request-Id'));
    }
}
