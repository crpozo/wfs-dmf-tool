<?php

namespace Tests\Unit;

use App\Http\Requests\StoreQuoteRequest;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class StoreQuoteRequestTest extends TestCase
{
    public function test_it_accepts_the_full_other_lead_source_name_from_odoo(): void
    {
        $request = new StoreQuoteRequest();
        $validator = Validator::make([
            'full_name' => 'Walk In',
            'email' => 'walk-in@example.com',
            'lead_source_id' => 12,
            'hear_about_us' => 'Other (please specify in notes)',
            'fulfillment_method' => 'pickup',
            'company_id' => 1,
            'canvas_image' => 'data:image/png;base64,example',
        ], $request->rules());

        $this->assertFalse($validator->fails(), $validator->errors()->first());
    }
}
