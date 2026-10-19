<?php

namespace App\Http\Controllers;

use App\Http\Controllers\FishbowlAPIController;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class CustomerController extends Controller
{
    /**
     * Fetch customers for Select2.
     */
    public function getCustomers(Request $request)
    {
        $customers = Customer::query()
            ->where('active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'phone']);

        return response()->json($customers);
    }

    public function specialPriceNotes(Request $request, $odooCustomerId)
    {
        if (!is_numeric($odooCustomerId) || (int) $odooCustomerId <= 0) {
            return response()->json([
                'message' => 'Invalid Odoo customer id.',
            ], 422);
        }

        $odooCustomerId = (int) $odooCustomerId;
        $user = $request->user();

        if (($user->account_type ?? null) === 'customer' && (int) $user->username !== $odooCustomerId) {
            abort(403);
        }

        $odooBaseUrl = config('services.odoo.base_url');
        $odooApiKey = config('services.odoo.api_key');
        $odooDatabase = config('services.odoo.database');
        $configuredNotesField = config('services.odoo.special_price_notes_field');

        if (empty($odooBaseUrl) || empty($odooApiKey)) {
            return response()->json([
                'message' => 'Odoo is not configured.',
            ], 500);
        }

        if (!preg_match('#^https?://#i', $odooBaseUrl)) {
            $odooBaseUrl = 'https://' . $odooBaseUrl;
        }

        $headers = [
            'Authorization' => 'bearer ' . $odooApiKey,
            'Content-Type' => 'application/json',
        ];

        if ($odooDatabase) {
            $headers['X-Odoo-Database'] = $odooDatabase;
        }

        $baseUrl = rtrim($odooBaseUrl, '/') . '/json/2';
        $notesField = $this->resolveOdooSpecialPriceNotesField($headers, $baseUrl, $configuredNotesField);

        if ($notesField === null) {
            return response()->json([
                'message' => 'Odoo special price notes field was not found on res.partner.',
                'hint' => 'Set ODOO_SPECIAL_PRICE_NOTES_FIELD to the technical field name from Odoo.',
            ], 500);
        }

        $response = Http::withHeaders($headers)
            ->timeout(30)
            ->post($baseUrl . '/res.partner/read', [
                'ids' => [$odooCustomerId],
                'fields' => ['id', $notesField],
            ]);

        if ($response->failed()) {
            return response()->json([
                'message' => 'Odoo customer special price notes lookup failed.',
                'details' => $response->json() ?? $response->body(),
            ], 502);
        }

        $customer = $response->json()[0] ?? null;

        if (!$customer) {
            return response()->json([
                'message' => 'Odoo customer not found.',
            ], 404);
        }

        $notes = $customer[$notesField] ?? null;

        if ($notes === false || $notes === '') {
            $notes = null;
        }

        return response()->json([
            'odoo_customer_id' => $odooCustomerId,
            'special_price_notes' => $notes,
        ]);
    }

    private function resolveOdooSpecialPriceNotesField(array $headers, string $baseUrl, ?string $configuredField): ?string
    {
        $fieldsResponse = Http::withHeaders($headers)
            ->timeout(30)
            ->post($baseUrl . '/res.partner/fields_get', [
                'attributes' => ['string', 'type'],
            ]);

        if ($fieldsResponse->failed()) {
            return $configuredField ?: null;
        }

        $fields = $fieldsResponse->json();

        if ($configuredField && array_key_exists($configuredField, $fields)) {
            return $configuredField;
        }

        $candidates = [
            'x_studio_special_price_notes',
            'x_studio_special_pricing_notes',
            'x_studio_special_price_note',
            'x_special_price_notes',
            'special_price_notes',
        ];

        foreach ($candidates as $candidate) {
            if (array_key_exists($candidate, $fields)) {
                return $candidate;
            }
        }

        foreach ($fields as $fieldName => $field) {
            $label = strtolower((string) ($field['string'] ?? ''));
            $normalizedLabel = preg_replace('/[^a-z0-9]+/', ' ', $label);

            if (
                str_contains($fieldName, 'special')
                && str_contains($fieldName, 'price')
                && str_contains($fieldName, 'note')
            ) {
                return $fieldName;
            }

            if (
                str_contains($normalizedLabel, 'special')
                && str_contains($normalizedLabel, 'price')
                && str_contains($normalizedLabel, 'note')
            ) {
                return $fieldName;
            }
        }

        return null;
    }

    public function getCustomer($id){
        //$sql = "select c.name, t.code TaxCode, t.name TaxRateName from customer c, taxrate t, contact o WHERE c.accountId=$id and c.taxRateId=t.id and c.accountId=o.accountId and o.defaultFlag=true";
        $sql = "select c.name, t.code TaxCode, t.name TaxRateName from customer c LEFT JOIN taxrate t ON c.taxRateId=t.id WHERE c.accountId=$id;";
        $fbAC = new FishbowlAPIController();
        $customer = json_decode($fbAC->dataQuery($sql));

        // addresstype: Bill to (20), Home (40), Main Office (50), ShipTo (10)
        $sql = "select * from address where accountId=$id;";
        $addresses = json_decode($fbAC->dataQuery($sql), true);

        $bill = null;
        $ship = null;
        $main = null;

        foreach($addresses as $address){
            switch($address['typeID']){
                case 20:
                    $bill = $address;
                    break;
                case 10:
                    $ship = $address;
                    break;
                case 50:
                    $main = $address;
                    break;
            }
            if($ship == null && $main != null){
                $ship = $main;
            }
            if($bill == null && $main != null){
                $bill = $main;
            }
        }
        $customer['bill'] = $bill;
        $customer['ship'] = $ship;

        return $customer;
    }

}
