<?php

namespace Tests\Unit;

use App\Support\QuoteAttribution;
use PHPUnit\Framework\TestCase;

class QuoteAttributionTest extends TestCase
{
    public function test_it_keeps_known_fields_and_lowercases_only_utm_values(): void
    {
        $result = QuoteAttribution::fromJson(json_encode([
            'utm_source' => ' Google ',
            'utm_campaign' => 'Vinyl-Fence-Fall',
            'gclid' => 'Cj0KCQ-AbC',
            'landing_page' => 'https://westernfencesupply.com/vinyl',
            'injected' => 'nope',
        ]));

        $this->assertSame('google', $result['utm_source']);
        $this->assertSame('vinyl-fence-fall', $result['utm_campaign']);
        $this->assertSame('Cj0KCQ-AbC', $result['gclid']);
        $this->assertSame('https://westernfencesupply.com/vinyl', $result['landing_page']);
        $this->assertArrayNotHasKey('injected', $result);
    }

    public function test_it_drops_bad_input_without_failing(): void
    {
        $this->assertNull(QuoteAttribution::fromJson(null));
        $this->assertNull(QuoteAttribution::fromJson('not json'));
        $this->assertNull(QuoteAttribution::fromJson('{"utm_source":"","gclid":""}'));
        $this->assertNull(QuoteAttribution::fromJson(json_encode(['utm_source' => str_repeat('a', 9000)])));

        $result = QuoteAttribution::fromJson(json_encode([
            'utm_source' => ['array'],
            'utm_medium' => 'cpc',
            'landing_page' => 'javascript:alert(1)',
        ]));

        $this->assertSame('', $result['utm_source']);
        $this->assertSame('cpc', $result['utm_medium']);
        $this->assertSame('', $result['landing_page']);
    }

    public function test_it_truncates_long_values(): void
    {
        $result = QuoteAttribution::fromJson(json_encode(['utm_term' => str_repeat('a', 300)]));

        $this->assertSame(150, mb_strlen($result['utm_term']));
    }

    public function test_odoo_fields_match_the_captivea_mapping_and_are_always_sent(): void
    {
        $fields = QuoteAttribution::odooFields(['utm_source' => 'google'], 'John Smith', 'john@example.com', null);

        $this->assertSame([
            'wfs_customer_name',
            'wfs_customer_email',
            'wfs_customer_phone',
            'wfs_utm_source',
            'wfs_utm_medium',
            'wfs_utm_campaign',
            'wfs_utm_term',
            'wfs_utm_content',
            'wfs_gclid',
            'wfs_fbclid',
            'wfs_ttclid',
            'wfs_landing_page',
            'wfs_referrer',
        ], array_keys($fields));

        $this->assertSame('John Smith', $fields['wfs_customer_name']);
        $this->assertSame('', $fields['wfs_customer_phone']);
        $this->assertSame('google', $fields['wfs_utm_source']);
        $this->assertSame('', $fields['wfs_gclid']);
    }
}
