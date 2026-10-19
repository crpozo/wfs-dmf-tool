<?php

namespace App\Classes;

use App\Http\Controllers\CustomerController;
use App\Http\Controllers\FishbowlAPIController;

use App\Models\MapOption;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Http;

use ArrayIterator;
use IteratorAggregate;

class Estimate implements IteratorAggregate {
    private $items;

    public function __construct($items = []) {
        $this->items = $items;
    }

    public function getItems(){
        return $this->items;
    }

    public static function fromArray(array $items): self
    {
        $estimate = new self();

        foreach ($items as $item) {

            if (is_array($item)) {
                $qty = $item['qty'] ?? 0;
                $sku = $item['sku'] ?? null;
                $id  = $item['id'] ?? null;
                $sortOrder = $item['sort_order'] ?? 9999;
                $description = $item['description'] ?? null;
            } else {
                $qty = $item->qty ?? 0;
                $sku = $item->sku ?? null;
                $id  = $item->id ?? null;
                $sortOrder = $item->sort_order ?? 9999;
                $description = $item->description ?? null;
            }

            $estimate->add(
                new OdooItem($qty, $sku, $sortOrder, $id, $description)
            );
        }

        return $estimate;
    }

    /* old add for Fishbowl
    public function add(FishbowlItem $item) {
        $found = false;
        foreach($this->items as &$fbItem){
            if($fbItem->sku == $item->sku){
                $fbItem->qty += $item->qty;
                $found = true;
                break;
            }
        }
        if(!$found) {
            $this->items[] = $item;
        }
    }
    */

    public function add(OdooItem $item) {        
        if (trim((string) $item->sku) === 'N/A') {
            return;
        }

        $found = false;
        foreach($this->items as &$oItem){
            $hasCustomDescription = $item->description !== null;
            $sameItem = $hasCustomDescription
                ? ($oItem->description !== null && $oItem->description == $item->description)
                : ($oItem->description === null && $oItem->sku == $item->sku);

            if($sameItem){
                $oItem->qty += $item->qty;
                $found = true;
                break;
            }
        }
        if(!$found) {
            $this->items[] = $item;            
        }        
    }

    public function updateIds()
    {
        $skus = collect($this->items)
            ->pluck('sku')
            ->filter()
            ->map(fn ($sku) => trim($sku))
            ->unique()
            ->values();

        if ($skus->isEmpty()) {
            return $this;
        }

        $odooMappings = DB::table('odoo_materials')
            ->whereIn('sku', $skus)
            ->pluck('odoo_id', 'sku');

        foreach ($this->items as $item) {
            $sku = trim($item->sku ?? '');

            $item->id = $odooMappings[$sku] ?? null;
        }

        return $this;
    }

    // Agregar secciones PRIMARY y HARDWARE en cotización
    public function addSections($matCode){
        $mat = substr($matCode, 0, 1);
        $mapOption = MapOption::getOptionByMaterialAndName($mat, 'CONCRETE');        
        $orderPrimary = 0;
        $orderHardware = $mapOption->sort_order + 2; // el sort_order en BD deja 2 espacios después de concreto, uno para PALLET FEE y otro para sección HARDWARE

        $odooPrimary = new OdooItem(0, "SECTION", $orderPrimary, null, "PRIMARY");
        $odooHardware = new OdooItem(0, "SECTION", $orderHardware, null, "HARDWARE");

        $hayPrimary = false;
        $hayHardware = false;
        foreach ($this->items as $item) {
            if(!$hayHardware && $item->sort_order > $orderHardware){
                $hayHardware = true;
            }
            if(!$hayPrimary && $item->sort_order < $orderHardware){
                $hayPrimary = true;            
            }
            if($hayPrimary && $hayHardware){
                break;
            }
        }
        if($hayPrimary){
            $this->add($odooPrimary);
        }
        if($hayHardware){
            $this->add($odooHardware);
        }                      
        return $this;  
    }        
                    
    public function sortItems()
    {
        usort($this->items, function ($a, $b) {

            $orderA = isset($a->sort_order) ? (int) $a->sort_order : 9999;
            $orderB = isset($b->sort_order) ? (int) $b->sort_order : 9999;

            // 1. Main order: sort_order ASC
            if ($orderA !== $orderB) {
                return $orderA <=> $orderB;
            }

            $qtyA = isset($a->qty) ? (float) $a->qty : 0;
            $qtyB = isset($b->qty) ? (float) $b->qty : 0;

            // 2. Secondary order: qty DESC
            if ($qtyA !== $qtyB) {
                return $qtyB <=> $qtyA;
            }

            // 3. Optional fallback: SKU ASC
            return strcmp($a->sku ?? '', $b->sku ?? '');
        });

        return $this;
    }

    public function getIterator() {
        return new ArrayIterator($this->items);
    }

    function convertToKeyValueMap(array $data, string $key): array
    {
        $result = [];
        foreach ($data as $item) {
            if (isset($item[$key])) {
                $k = $item[$key];
                $val = $item;
                unset($val[$k]);
                $result[$k] = $val;
            }
        }
        return $result;
    }

    public function getFishbowlInfo(){
        //$sql = "SELECT sku, description, price from product where SKU in (";
        $sql = "SELECT p.sku, p.num, p.description, p.price, p.taxableFlag taxable, p.kitFlag kit, u.code uom from product p, uom u WHERE p.uomId=u.id and sku in (";
        foreach($this->items as $item){
            $sql .= "'" . $item->sku . "',";
        }
        $sql = substr($sql, 0, -1) . ");";
        $fbAC = new FishbowlAPIController();
        $data = $fbAC->dataQuery($sql);
        $res = $this->convertToKeyValueMap(json_decode($data, true), 'sku');

        foreach($this->items as $item){
            $fbItem = $res[$item->sku];
            $item->setFishbowlInfo($fbItem['description'], $fbItem['price'], $fbItem['num'], $fbItem['taxable'], $fbItem['kit'], $fbItem['uom']);
        }
    }

    public function getSoNum()
    {
        // Get the next quote number
        $nextQuoteNumber = DB::selectOne('SELECT nextval(\'so_num\') AS quote_number')->quote_number;

        return "DYF-" . $nextQuoteNumber;
    }

    public function sendToFB($customer){
        $cc = new CustomerController();
        $customerInfo = $cc->getCustomer($customer);
        //$estimate = Session::get('estimate');
        $estimate = session('estimate');

        $this->createFishbowlJSON($customerInfo, $estimate);

    }

    public function createFishbowlJSON($customerInfo, $estimate)
    {
        $body = [];
        $header = ["SONum", "Status", "CustomerName", "CustomerContact", "BillToName", "BillToAddress", "BillToCity", "BillToState", "BillToZip", "BillToCountry", "ShipToName", "ShipToAddress",
            "ShipToCity", "ShipToState", "ShipToZip", "ShipToCountry", "ShipToResidential", "CarrierName", "TaxRateName", "PriorityId", "PONum", "VendorPONum", "Date", "Salesman",
            "ShippingTerms", "PaymentTerms", "FOB", "Note", "QuickBooksClassName", "LocationGroupName", "OrderDateScheduled", "URL", "CarrierService", "DateExpired", "Phone", "Email",
            "Category", "CF-ShipExpress SO Return Tracking", "SOItemTypeID", "ProductNumber", "ProductDescription", "ProductQuantity", "UOM", "ProductPrice", "Taxable", "TaxCode",
            "ItemNote", "ItemQuickBooksClassName", "ItemDateScheduled", "ShowItem", "KitItem", "RevisionLevel", "CustomerPartNumber"];

        array_push($body, $header);
        $status = "10"; //Estimate
        $contact = "";
        $carrier = "Will Call";
        $taxRate = "Florida Sale's Tax";
        $priority = "30"; // Normal
        $poNum = "";
        $vendorPoNum = "";
        $bill = $customerInfo['bill'];
        $billToName = $bill['name'];
        $billToAddress = $bill['address'];
        $billToCity = $bill['city'] ?? "";
        $billToState = $bill['stateId'] ?? "";
        $billToCountry = $bill['countryId'] ?? "";
        $billToZip = $bill['zip'] ?? "";
        $ship = $customerInfo['ship'];
        $shipToName = $ship['name'];
        $shipToAddress = $ship['address'];
        $shipToCity = $ship['city'] ?? "";
        $shipToState = $ship['stateId'] ?? "";
        $shipToCountry = $ship['countryId'] ?? "";
        $shipToZip= $ship['zip'] ?? "";
        $shipToResidential = $ship['residentialFlag'] ? "true" : "false";
        $user = Auth::user();
        $salesman = session('username');
        $salesman_email = session('user_email');

        $timestamp = time();
        //$date = gmdate('mm/dd/yyyy', $timestamp);
        $date = date('m/d/Y', $timestamp);

        $shippingTerms = "Prepaid & Billed";
        $payingTerms = "COD";
        $fob = "Origin";
        $note = "";
        $qbClassName = "None";
        $locationGroup = "Main";

        $sonum = $this->getSoNum();
        foreach($estimate as $item){
            $line = [$sonum, $status, $customerInfo[0]->name, $contact, $billToName, $billToAddress, $billToCity, $billToState, $billToZip, $billToCountry, $shipToName, $shipToAddress,
                    $shipToCity, $shipToState, $shipToZip, $shipToCountry, $shipToResidential, $carrier, $taxRate, $priority, $poNum, $vendorPoNum, $date, $salesman,
                    $shippingTerms, $payingTerms, $fob, $note, $qbClassName, $locationGroup, $date, "", "", "", "", $salesman_email,
                    "", "", "10",$item->num, $item->description, $item->qty, $item->uom, $item->price, $item->taxable ? "true" : "false", "ST LE",
                    "", "None", $date, "true", $item->kit ? "true" : "false", "false", ""
            ];
            array_push($body, $line);
        }
        //echo json_encode($body, true);
        $fbAC = new FishbowlAPIController();
        $data = $fbAC->createEstimate($body);
        $ret = "ERROR";
        if($data == "OK"){
            $ret = "Estimate $sonum created in Fishbowl (SANDBOX)";
        }
        echo $ret;
        die;
    }
    
    public function createOdooQuote(
        ?int $customerId = null,
        ?string $reference = 'Fence App Quote',
        ?int $salespersonId = null,
        ?string $pricelist = null,
        ?array $notes = null,        
        ?int $companyId = 1,
        ?int $leadSourceId = null
    ): array {
        $odooBaseUrl = config('services.odoo.base_url');
        $odooApiKey = config('services.odoo.api_key');
        $odooDatabase = config('services.odoo.database');
        
        if (empty($odooBaseUrl)) {
            throw new \RuntimeException('Missing Odoo base URL. Set ODOO_BASE_URL and rebuild the config cache.');
        }

        if (empty($odooApiKey)) {
            throw new \RuntimeException('Missing Odoo API key. Set ODOO_API_KEY and rebuild the config cache.');
        }

        if (!preg_match('#^https?://#i', $odooBaseUrl)) {
            $odooBaseUrl = 'https://' . $odooBaseUrl;
        }

        $customerId = (int) ($customerId ?? config('services.odoo.customer'));

        if($salespersonId == null){
            $salespersonId = $this->resolveOdooSalespersonId($salespersonId);
        }

        $headers = [
            'Authorization' => 'bearer ' . $odooApiKey,
            'Content-Type' => 'application/json',
        ];

        if ($odooDatabase) {
            $headers['X-Odoo-Database'] = $odooDatabase;
        }

        $baseUrl = rtrim($odooBaseUrl, '/') . '/json/2';

        $orderLines = [];

        foreach ($this->items as $item) {
            $sku = trim((string) ($item->sku ?? ''));

            // Section helpers are display-only lines and do not map to an Odoo product.
            if ($sku === 'SECTION') {
                $orderLines[] = [
                    0,
                    0,
                    [
                        'display_type' => 'line_section',
                        'name' => $item->description,
                        'product_qty' => 0.0
                    ],
                ];

                continue;
            }

            if (empty($item->qty) || $item->qty <= 0) {
                continue;
            }

            if (empty($item->id)) {
                throw new \Exception("Missing Odoo product ID for SKU: {$sku}");
            }

            $lineValues = [
                'product_id' => (int) $item->id,
                'product_uom_qty' => (float) $item->qty,
            ];

            if ($item->description !== null) {
                $lineValues['name'] = $item->description;
            }

            $orderLines[] = [
                0,
                0,
                $lineValues,
            ];
        }

        foreach ($notes ?? [] as $note) {
            $note = trim((string) $note);

            if ($note === '') {
                continue;
            }

            $orderLines[] = [
                0,
                0,
                [
                    'display_type' => 'line_note',
                    'name' => $note,
                    'product_qty' => 0.0
                ],
            ];
        }

        if (empty($orderLines)) {
            throw new \Exception('Cannot create Odoo quote: no valid order lines.');
        }
        
        $quoteData = [
            'partner_id' => $customerId,
            'partner_invoice_id' => $customerId,
            'partner_shipping_id'=> $customerId,
            'order_line' => $orderLines,
            'company_id' => $companyId            
        ];
        
        if ($customerId === (int) config('services.odoo.customer')) {
            if (!$leadSourceId) {
                //throw new \InvalidArgumentException('A lead source is required for walk-in Odoo quotes.');
                $quoteData['wfs_lead_source_id'] = $leadSourceId; // Other
            }

            $quoteData['wfs_lead_source_id'] = $leadSourceId;
        }

        if ($reference) {
            $quoteData['client_order_ref'] = $reference;
        }

        if ($pricelist) {
            $quoteData['pricelist_id'] = $this->resolveOdooPricelistId($pricelist);
        }        

        // Optional: set salesperson at creation time.
        // If this causes access issues, create first and update user_id after.
        if ($salespersonId) {
            $quoteData['user_id'] = $salespersonId;
        }
        
        $quoteResponse = Http::withHeaders($headers)
            ->timeout(60)
            ->post($baseUrl . '/sale.order/create', [
                'vals_list' => [$quoteData],
            ]);

        if ($quoteResponse->failed()) {
            throw new \Exception(
                'Odoo quote creation failed: ' . $quoteResponse->body()
            );
        }

        $saleOrderId = $quoteResponse->json()[0] ?? null;

        if (!$saleOrderId) {
            throw new \Exception(
                'Odoo quote creation failed: missing sale order ID. Response: ' . $quoteResponse->body()
            );
        }

        // Apply pricelist prices
        $priceResponse = Http::withHeaders($headers)
            ->timeout(60)
            ->post($baseUrl . '/sale.order/action_update_prices', [
                'ids' => [$saleOrderId],
            ]);

        if ($priceResponse->failed()) {
            throw new \Exception(
                'Odoo price update failed: ' . $priceResponse->body()
            );
        }

        $salespersonResponse = null;
        /*
        if ($salespersonId) {
            $salespersonResponse = Http::withHeaders($headers)
                ->timeout(60)
                ->post($baseUrl . '/sale.order/write', [
                    'ids' => [$saleOrderId],
                    'vals' => [
                        'user_id' => $salespersonId,
                    ],
                ]);

            if ($salespersonResponse->failed()) {
                throw new \Exception(
                    'Odoo salesperson update failed: ' . $salespersonResponse->body()
                );
            }
        }
        */

        // Read quote after final updates so the returned payload reflects the assigned salesperson.
        $readResponse = Http::withHeaders($headers)
            ->timeout(60)
            ->post($baseUrl . '/sale.order/read', [
                'ids' => [$saleOrderId],
                'fields' => ['id', 'name', 'amount_total', 'state', 'pricelist_id', 'user_id', 'create_uid'],
            ]);

        $quote = $readResponse->successful()
            ? ($readResponse->json()[0] ?? null)
            : null;

        return [
            'sale_order_id' => $saleOrderId,
            'quote' => $quote,
            'created_response' => $quoteResponse->json(),
            'price_update_response' => $priceResponse->json(),
            'salesperson_update_response' => $salespersonResponse?->json(),
        ];
    }

    private function resolveOdooSalespersonId(?int $salespersonId): int
    {
        if ($salespersonId !== null) {
            return $salespersonId;
        }

        $user = Auth::user();
        //$companyRole = strtolower(trim((string) ($user->company_role ?? '')));
        $accType = strtolower(trim((string) ($user->account_type ?? '')));
        
        $username = trim((string) ($user->username ?? ''));

        if ($user && $accType === 'company' && $username !== '') {
            return (int) $username;
        }

        return (int) config('services.odoo.user_id');
    }

    private function resolveOdooPricelistId(string $pricelist): int
    {
        $pricelists = [
            'HO' => 3,
            'GC' => 2,
        ];

        $id = $pricelists[$pricelist] ?? null;

        if (!$id) {
            throw new \InvalidArgumentException("Unknown Odoo pricelist: {$pricelist}");
        }

        return $id;
    }

}
