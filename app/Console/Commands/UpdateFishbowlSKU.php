<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use App\Services\FishbowlApiService;

class UpdateFishbowlSKU extends Command
{
    protected $signature = 'fishbowl:export-products {csvFile} {outputFile}';
    protected $description = 'Export Part Number, Product Number, and SKU from Fishbowl to a CSV file';

    private $fishbowlUrl;
    private $username;
    private $password;
    private $token;
    private $fishbowl;

    public function __construct()
    {
        parent::__construct();
        $this->fishbowlUrl = config('services.fishbowl.api_url') . ":" . config('services.fishbowl.api_port');
        $this->username = config('services.fishbowl.username');
        $this->password = config('services.fishbowl.password');
        $this->fishbowl = new FishbowlApiService();
    }

    public function handle()
    {
        $csvFile = $this->argument('csvFile');
        $outputFile = $this->argument('outputFile');

        if (!file_exists($csvFile)) {
            $this->error("File not found: $csvFile");
            return;
        }

        $this->loginToFishbowl();

        $products = $this->readCsv($csvFile);
        $exportData = [];


        foreach ($products as $product) {
            //$this->updateProductSku($product['ProductId'],$product['SKU'],);

            $productDetails = $this->getProductDetails($product['ProductId']);

            if ($productDetails) {
                $exportData[] = [
                    'PartNumber' => $productDetails['PartNumber'] ?? '',
                    'ProductNumber' => $productDetails['ProductNumber'] ?? '',
                    'ProductDescription' => $productDetails['ProductDescription'] ?? '',
                    'SKU' => $product['SKU']
                ];
            }
        }

        $this->logoutFromFishbowl();
        $this->writeCsv($outputFile, $exportData);

        $this->info("Export completed. File saved to $outputFile.");
    }

    private function loginToFishbowl()
    {
        /*
        $response = Http::post("{$this->fishbowlUrl}/api/login", [
            'username' => $this->username,
            'password' => $this->password,
        ]);

        if ($response->failed()) {
            $this->error('Failed to log in to Fishbowl');
            exit;
        }
        */

        $this->fishbowl->login();
        $this->token =  $this->fishbowl->token;
        $this->info('Successfully logged in to Fishbowl.');
    }



    private function updateProductSku($productId, $newSku)
    {
        // Get product details from Fishbowl
        $response = Http::withHeaders(['Authorization' => "Bearer {$this->token}"])
            ->get("{$this->fishbowlUrl}/api/data-query", [
                'query' => "SELECT * FROM product WHERE id = '$productId'"
            ]);

        if ($response->failed() || empty($response->json())) {
            $this->error("Product ID $productId not found in Fishbowl.");
            return;
        }

        $productData = $response->json()[0];
        echo print_r($productData, true);

        if ($productData['sku'] === $newSku) {
            $this->info("SKU for Product ID $productId is already up to date.");
            return;
        }

        echo print_r($productData, true);
        // Update SKU
        $updateResponse = Http::withHeaders(['Authorization' => "Bearer {$this->token}"])
            ->post("{$this->fishbowlUrl}/api/import/Product", [
                'num' => $productData['num'],
                'sku' => $newSku,
            ]);

        if ($updateResponse->failed()) {
            $this->error("Failed to update SKU for Product ID $productId.");
            $this->error("Error: " . $updateResponse->body());
        } else {
            $this->info("Updated SKU for Product ID $productId to $newSku.");
        }
    }

    private function readCsv($filePath)
    {
        $products = [];
        if (($handle = fopen($filePath, 'r')) !== false) {
            fgetcsv($handle); // Skip header row
            while (($data = fgetcsv($handle, 1000, ',')) !== false) {
                $products[] = [
                    'ProductId' => trim($data[0]),
                    'SKU' => trim($data[1])
                ];
            }
            fclose($handle);
        }
        return $products;
    }

    private function getProductDetails($productId)
    {
        // Step 1: Get Product Details, including the partId
        $productResponse = Http::withHeaders(['Authorization' => "Bearer {$this->token}"])
            ->get("{$this->fishbowlUrl}/api/data-query", [
                'query' => "SELECT id, num, sku, partId FROM product WHERE id = '$productId'"
            ]);

        if ($productResponse->failed() || empty($productResponse->json())) {
            $this->error("Product ID $productId not found in Fishbowl.");
            return null;
        }

        $productData = $productResponse->json()[0];

        // Step 2: Get Part Number from part table using partId
        $partId = $productData['partId'] ?? null;
        $partNumber = '';

        if ($partId) {
            $partResponse = Http::withHeaders(['Authorization' => "Bearer {$this->token}"])
                ->get("{$this->fishbowlUrl}/api/data-query", [
                    'query' => "SELECT num FROM part WHERE id = '$partId'"
                ]);

            if (!$partResponse->failed() && !empty($partResponse->json())) {
                $partNumber = $partResponse->json()[0]['num'] ?? '';
            }
        }

        return [
            'PartNumber' => $partNumber, // Now we have the correct Part Number
            'ProductNumber' => $productData['num'] ?? '', // Product Number from product.num
            'SKU' => $productData['sku'] ?? '' // SKU
        ];
    }


    private function writeCsv($filePath, $data)
    {
        $handle = fopen($filePath, 'w');
        fputcsv($handle, ['PartNumber', 'ProductNumber', 'SKU']);

        foreach ($data as $row) {
            fputcsv($handle, $row);
        }

        fclose($handle);
    }

    private function logoutFromFishbowl()
    {
        /*
        Http::withHeaders(['Authorization' => "Bearer {$this->token}"])
            ->post("{$this->fishbowlUrl}/api/logout");
        */
        $this->fishbowl->logout();
        $this->info('Logged out of Fishbowl.');
    }
}
