<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\Request;

use App\Services\UserSyncService;

class FishbowlApiService
{
    protected $baseUrl;
    public $token;

    public function __construct()
    {
        $this->baseUrl = config('services.fishbowl.api_url') . ":" . config('services.fishbowl.api_port');
        $this->token = null;
    }

    /**
     * Login to the Fishbowl API to obtain an access token.
     *
     * @return bool
     */
    public function login(): bool
    {
        $data = [
            'appName' => config('services.fishbowl.appname'),
            'appId' => config('services.fishbowl.appid'),
            'username' => config('services.fishbowl.username'),
            'password' => config('services.fishbowl.password'),
        ];

        $response = Http::post("{$this->baseUrl}/api/login", $data);
        if ($response->successful()) {
            $this->token = $response->json('token');
            cache(['fishbowl_token' => $this->token], now()->addMinutes(30));
            return true;
        }
        return false;
    }

    /**
     * Logout from the Fishbowl API.
     *
     * @return bool
     */
    public function logout(): bool
    {
        $this->token = cache('fishbowl_token');

        if (!$this->token) {
            return false;
        }

        $response = Http::withToken($this->token)->post("{$this->baseUrl}/api/logout");

        if ($response->successful()) {
            $this->token = null;
            return true;
        }

        return false;
    }

    /**
     * Execute a data query on the Fishbowl API.
     *
     * @param string $query
     * @return array|null
     */
    public function dataQuery(string $query): ?string
    {
        $this->token = cache('fishbowl_token') ?? $this->login() ? cache('fishbowl_token') : null;

        if (!$this->token) {
            return null;
        }
        /*
        $response = Http::withToken($this->token)
            ->get("{$this->baseUrl}/api/data-query", [
                'query' => $query,
            ]);
        */
        $response = Http::withToken($this->token)
            ->withHeaders(['Content-Type' => 'application/sql', 'Cache-Control' => 'no-cache', 'User-Agent' => 'PostmanRuntime/7.42.0', 'Accept' => '*/*', 'Connection' => 'keep-alive'])
            ->send('GET', "{$this->baseUrl}/api/data-query", [
                'body' => $query,  // Send the query as raw text in the bod
            ]);

        if ($response->successful()) {
            return $response->body();
        }

        return null;
    }

    /**
     * Import a Sales Order into Fishbowl.
     *
     * @param array $salesOrderData
     * @return array|null
     */
    public function importSalesOrder(array $salesOrderData): ?string
    {
        $this->token = cache('fishbowl_token') ?? $this->login() ? cache('fishbowl_token') : null;
        if (!$this->token) {
            $this->login();
        }

        /*
        $response = Http::withToken($this->token)
            ->post("{$this->baseUrl}/api/import/SalesOrderDetails", json_encode($salesOrderData,true));
        */
        $response = Http::withToken($this->token)
            ->withHeaders(['Content-Type' => 'application/json', 'Cache-Control' => 'no-cache', 'User-Agent' => 'PostmanRuntime/7.42.0', 'Accept' => '*/*', 'Connection' => 'keep-alive'])
            ->send('POST', "{$this->baseUrl}/api/import/SalesOrderDetails", [
                'body' => json_encode($salesOrderData,true)
            ]);

        if ($response->successful()) {
            return "OK";
        }
        else {
            return $response;
        }
    }

    public function executeQuery(Request $request): ?string
    {
        $request->validate([
            'query' => 'required|string',
            'token' => 'required|string',
            'port' => 'required|string'
        ]);

        $query = $request->input('query');
        $token = $request->input('token');
        $port = $request->input('port');
        if($token == "TOKEN"){
            $token = cache('fishbowl_token') ?? $this->login() ? cache('fishbowl_token') : null;
        }
        $url = config('services.fishbowl.api_url');

        $response = Http::withToken($token)
            ->withHeaders(['Content-Type' => 'application/sql'])
            ->send('GET', "{$url}:{$port}/api/data-query", [
                'body' => $query,
            ]);

        if ($response->successful()) {
            return $response->body();
        } else {
            return $response;
            //return response()->json(['error' => 'Failed to retrieve data'], 400);
        }
    }

    public function syncUsersFromFishbowl()
    {
        $fishbowlUsers = $this->fetchUsersFromFishbowl();

        $userSyncService = new UserSyncService();
        $userSyncService->syncUsers($fishbowlUsers);

        return response()->json(['message' => 'Users synced successfully.']);
    }

    public function fetchUsersFromFishbowl()
    {
        $token = cache('fishbowl_token') ?? $this->login() ? cache('fishbowl_token') : null;

        $query = "select * from sysuser where id in (select userId from usergrouprel where groupId in (1,7))";
        $response = Http::withToken($token)
            ->withHeaders(['Content-Type' => 'application/sql'])
            ->send('GET', "{$this->baseUrl}/api/data-query", [
                'body' => $query,
            ]);

        if ($response->successful()) {
            return json_decode($response->body(),true);
        } else {
            return null;
        }
    }
}
