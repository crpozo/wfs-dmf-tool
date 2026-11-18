<?php

namespace App\Support;

/**
 * Campaign data captured in the browser (see public/js/wfs-attribution.js) and
 * sent with a public quote. It comes from the visitor, so it is never trusted:
 * only known keys are kept and every value is cleaned and truncated.
 */
final class QuoteAttribution
{
    private const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    private const CLICK_FIELDS = ['gclid', 'fbclid', 'ttclid'];
    private const URL_FIELDS = ['landing_page', 'referrer'];

    private const MAX_PAYLOAD_BYTES = 8000;
    private const MAX_UTM_LENGTH = 150;
    private const MAX_CLICK_LENGTH = 255;
    private const MAX_URL_LENGTH = 500;

    /**
     * @return array<string, string>|null null when there is nothing usable to store
     */
    public static function fromJson(?string $json): ?array
    {
        if ($json === null || $json === '' || strlen($json) > self::MAX_PAYLOAD_BYTES) {
            return null;
        }

        $decoded = json_decode($json, true);

        if (!is_array($decoded)) {
            return null;
        }

        $clean = [];

        foreach (self::UTM_FIELDS as $field) {
            $clean[$field] = mb_strtolower(self::text($decoded[$field] ?? null, self::MAX_UTM_LENGTH));
        }

        foreach (self::CLICK_FIELDS as $field) {
            $clean[$field] = self::text($decoded[$field] ?? null, self::MAX_CLICK_LENGTH);
        }

        foreach (self::URL_FIELDS as $field) {
            $clean[$field] = self::url($decoded[$field] ?? null);
        }

        return array_filter($clean, fn (string $value) => $value !== '') === [] ? null : $clean;
    }

    /**
     * Fields for sale.order/create, named as in Captivea's mapping. Every field
     * is always sent; those with no value go empty.
     *
     * @param  array<string, string>|null  $attribution
     * @return array<string, string>
     */
    public static function odooFields(?array $attribution, string $name, string $email, ?string $phone): array
    {
        $fields = [
            'wfs_customer_name' => $name,
            'wfs_customer_email' => $email,
            'wfs_customer_phone' => (string) $phone,
        ];

        foreach (array_merge(self::UTM_FIELDS, self::CLICK_FIELDS, self::URL_FIELDS) as $field) {
            $fields['wfs_' . $field] = $attribution[$field] ?? '';
        }

        return $fields;
    }

    private static function text(mixed $value, int $maxLength): string
    {
        if (!is_string($value)) {
            return '';
        }

        return mb_substr(trim((string) preg_replace('/[\x00-\x1F\x7F]/u', '', $value)), 0, $maxLength);
    }

    private static function url(mixed $value): string
    {
        $url = self::text($value, self::MAX_URL_LENGTH);

        return preg_match('#^https?://#i', $url) === 1 ? $url : '';
    }
}
