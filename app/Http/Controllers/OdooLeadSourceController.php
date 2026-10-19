<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OdooLeadSourceController extends Controller
{
    public function index()
    {
        $odoo = $this->getOdooApiConfig();

        if ($odoo === null) {
            return response()->json([
                'message' => 'Odoo is not configured.',
            ], 500);
        }

        $payload = [
            'domain' => [],
            'fields' => ['id', 'name'],
            'order' => 'name asc',
        ];

        $response = Http::withHeaders($odoo['headers'])
            ->timeout(30)
            ->post($odoo['base_url'] . '/wfs.lead.source/search_read', $payload);

        if ($response->failed()) {
            Log::warning('Odoo lead source lookup failed.', [
                'status' => $response->status(),
                'response' => $response->body(),
            ]);

            return response()->json([
                'message' => 'Odoo lead source lookup failed.',
            ], 502);
        }

        return response()->json([
            'data' => $response->json(),
        ]);
    }

    private function getOdooApiConfig(): ?array
    {
        $odooBaseUrl = config('services.odoo.base_url');
        $odooApiKey = config('services.odoo.api_key');
        $odooDatabase = config('services.odoo.database');

        if (empty($odooBaseUrl) || empty($odooApiKey)) {
            return null;
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

        return [
            'base_url' => rtrim($odooBaseUrl, '/') . '/json/2',
            'headers' => $headers,
        ];
    }

}
