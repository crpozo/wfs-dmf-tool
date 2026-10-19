<?php

namespace Tests\Feature;

use App\Mail\QuoteRequestReceived;
use App\Models\QuoteRequest;
use Tests\TestCase;

class QuoteRequestReceivedMailTest extends TestCase
{
    public function test_it_contains_the_customer_details_and_quote_links(): void
    {
        config([
            'app.url' => 'https://fence.test',
            'services.odoo.base_url' => 'odoo.test',
        ]);

        $quoteRequest = new QuoteRequest([
            'full_name' => 'Jane Customer',
            'email' => 'jane@example.com',
            'phone' => '555-0100',
            'delivery' => false,
            'company_id' => 2,
            'odoo_id' => 321,
            'odoo_quote' => 'S00321',
        ]);
        $quoteRequest->id = 42;

        $mail = new QuoteRequestReceived($quoteRequest, [
            'customer_id' => 1886,
            'pricelist' => 'GC',
        ]);

        $mail->assertHasSubject('New Quote Request - Jane Customer');
        $mail->assertSeeInHtml('jane@example.com');
        $mail->assertSeeInHtml('Port Charlotte');
        $mail->assertSeeInHtml('GC');
        $mail->assertSeeInHtml('https://fence.test/quote-requests/42/open-sketch');
        $mail->assertSeeInHtml('https://odoo.test/odoo/sales/321');
    }
}
