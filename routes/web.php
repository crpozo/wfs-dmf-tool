<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DrawFenceController;
use App\Http\Controllers\OdooLeadSourceController;
use App\Http\Controllers\QuoteRequestController;
use App\Http\Controllers\StepController;
use App\Services\FishbowlApiService;
use App\Classes\Estimate;
/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/login', function () {
    return view('welcome');
})->name('login');

Route::get('/estimate', [QuoteRequestController::class, 'estimate'])
    ->name('estimate.index');

Route::post('/estimate', [QuoteRequestController::class, 'storeUser'])
    ->middleware('auth')
    ->name('estimate.store');

Route::post('/quote-request', [QuoteRequestController::class, 'store'])
    ->name('quote.store');

Route::get('/odoo/lead-sources', [OdooLeadSourceController::class, 'index'])
    ->name('odoo.lead_sources.index');

Route::get('/thank-you', function () {
    return view('thank-you');
})->name('thank-you');

Route::get('/dashboard', function () {
    return view('dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/options-list', 'App\Http\Controllers\HomeController@getMaterialsOptionsList');
    Route::get('/sync-users', 'App\Http\Controllers\FishbowlAPIController@syncUsersFromFishbowl');

    Route::get('/customers', [CustomerController::class, 'getCustomers'])->name('customers');
    Route::get('/customers/{odooCustomerId}/special-price-notes', [CustomerController::class, 'specialPriceNotes'])
        ->name('customers.special_price_notes');
    Route::get('/sendtoFB/{customer}', [Estimate::class, 'sendToFB'])->name('sendToFB');
});

/* ******************* */

Route::get('/', function () {
    session(['material' => 1]);
    session(['materials' => []]);
    return view('home');
})->name('quote.create');

Route::get('/goto', function () {
    return view('goto');
})->name('goto');

Route::get('/draw', function () {
    return view('draw');
});

Route::get('/alt', function () {
    return view('alt');
});

Route::get('/test-error-400', fn () => abort(400));
Route::get('/test-error-403', fn () => abort(403));
Route::get('/test-error-500', fn () => abort(500));

Route::view('/metal-gate-form', 'metal_gate_form')->name('metal-gate-form');
Route::view('/metal-gate-standard-form', 'metal_gate_standard_form')->name('metal-gate-standard-form');

Route::get('/drawfence_old', function () {
    $step = session('step');
    $materials = session('materials');

    if (!is_array($materials) || empty($materials)) {
        return redirect()->route('quote.create');
    }

    $hayAl = false;
    $hayMetal = false;
    $hayPVC = false;
    $hayChain = false;
    foreach ($materials as $material) {
        $code = $material['code'];
        $mat = substr($code, 0, 1);
        $hayAl = $hayAl || ($mat == "1");
        $hayChain = $hayChain || ($mat == "2");
        $hayMetal = $hayMetal || ($mat == "3");
        $hayPVC = $hayPVC || ($mat == "4");
    }
    $step++;
    $titleStep = "STEP " . $step;
    return view('simple_draw', ['step' => $titleStep, 'materials' => $materials, 'hayAl' => $hayAl, 'hayChain' => $hayChain, 'hayMetal' => $hayMetal, 'hayPVC' => $hayPVC]);
});

Route::get('/drawfence', function () {
    $step = session('step');
    $materials = session('materials');

    if (!is_array($materials) || empty($materials)) {
        return redirect()->route('quote.create');
    }

    $hayAl = false;
    $hayMetal = false;
    $hayPVC = false;
    $hayChain = false;
    $m = 0;
    $c = 0;
    //foreach($materials as $material){
    foreach ($materials as $materialSlot => $material) {
        $code = $material['code'];
        $mat = substr($code, 0, 1);
        $hayAl = $hayAl || ($mat == "1");
        $hayChain = $hayChain || ($mat == "2");
        $hayMetal = $hayMetal || ($mat == "3");
        $hayPVC = $hayPVC || ($mat == "4");
        $m = $materialSlot; //$mat
        $c = $code;
    }
    $c = substr_replace($c, "0", -1);
    $step++;
    $titleStep = "STEP " . $step;
    return view('simple_draw', ['step' => $titleStep, 'materials' => $materials, 'hayAl' => $hayAl, 'hayChain' => $hayChain, 'hayMetal' => $hayMetal, 'hayPVC' => $hayPVC, 'm' => $m, 'c' => $c]);
});

Route::get('/embed/drawfence', [DrawFenceController::class, 'embed'])
    ->name('drawfence.embed');

Route::get('/embed/drawfence/customizable', [DrawFenceController::class, 'customizable'])
    ->name('drawfence.embed.customizable');

Route::get('/examples/drawfence-embed', function () {
    $materials = [
        1 => [
            'code' => '12121',
            'material' => 'Aluminum',
            'type' => 'Residential',
            'height' => '4 Feet',
            'color' => 'Black',
            'style' => '2 rail smooth bottom residential',
        ],
    ];

    return view('examples.drawfence_embed', [
        'drawFenceEmbedUrl' => route('drawfence.embed.customizable', [
            'materials' => json_encode($materials, JSON_THROW_ON_ERROR),
        ]),
    ]);
})->name('examples.drawfence-embed');

Route::get('/step/{material}/{step}', 'App\Http\Controllers\HomeController@step');

Route::get('/step/{material}/{step}/{height}', 'App\Http\Controllers\HomeController@step_height');

Route::get('/step_old/{material}/{step}', 'App\Http\Controllers\HomeController@step_old');

Route::get('/getDims/{dims}', 'App\Http\Controllers\HomeController@getDims');

Route::get('/estimate/{json}', 'App\Http\Controllers\HomeController@estimate');

Route::post('/load', 'App\Http\Controllers\HomeController@loadFile');

Route::get('/template/{name}', 'App\Http\Controllers\HomeController@loadTemplate');

Route::get('/save/{json}', 'App\Http\Controllers\HomeController@saveFile');

Route::get('/optimize/{length}', 'App\Http\Controllers\HomeController@optimizePanels');

Route::post('/results/send-to-sheets', [\App\Http\Controllers\GoogleSheetsController::class, 'send'])
    ->name('results.copy')->middleware('auth'); // or as you need

Route::get('/steps/export-json', [StepController::class, 'exportJson']);
Route::get('/steps/compare-json', [StepController::class, 'compareJson']);
Route::get('/steps/import-json', [StepController::class, 'importJson']);
Route::get('/steps/duplicate', [StepController::class, 'duplicateBranch']);
Route::get('/steps/leaves', [StepController::class, 'getLeaves']);

// USERS
Route::middleware(['auth', 'can:manage-users'])
    ->prefix('admin')->name('admin.')
    ->group(function () {
        Route::get('/users', [UserController::class, 'index'])->name('users.index');
        Route::get('/users/data', [UserController::class, 'data'])->name('users.data');

        Route::post('/users', [UserController::class, 'store'])->name('users.store');
        Route::get('/users/{user}', [UserController::class, 'show'])->name('users.show'); // fetch for edit modal
        Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
    });

// QUOTE REQUESTS
Route::middleware(['auth', 'can:view-quote-requests'])->group(function () {
    Route::get('/quote-requests', [QuoteRequestController::class, 'index'])
        ->name('quote_requests.index');

    Route::get('/quote-requests/data', [QuoteRequestController::class, 'data'])
        ->name('quote_requests.data');

    Route::get('/quote-requests/test-odoo-log-note', [QuoteRequestController::class, 'testOdooQuotationLogNote'])
        ->name('quote_requests.test_odoo_log_note');

    Route::get('/quote-requests/{quoteRequest}/open-sketch', [QuoteRequestController::class, 'openSketch'])
        ->name('quote_requests.open_sketch');

    Route::get('/quote-requests/sync-odoo-sent-at', [QuoteRequestController::class, 'syncAllOdooSentAt'])
        ->name('quote_requests.sync_all_odoo_sent_at');

    Route::get('/quote-requests/sync-customer-revision-codes', [QuoteRequestController::class, 'syncAllCustomerAndRevisionCodes'])
        ->name('quote_requests.sync_customer_revision_codes');

    Route::get('/quote-requests/{quoteRequest}/sync-odoo-sent-at', [QuoteRequestController::class, 'syncOdooSentAt'])
        ->name('quote_requests.sync_odoo_sent_at');

    Route::post('/quote-requests/{quoteRequest}/mark-sent', [QuoteRequestController::class, 'markSentManually'])
        ->name('quote_requests.mark_sent_manually');

});

Route::get('/test-odoo', function () {

    $headers = [
        'Authorization' => 'bearer ' . env('ODOO_API_KEY'),
        'Content-Type' => 'application/json',
    ];

    // Only include if needed
    if (env('ODOO_DATABASE')) {
        $headers['X-Odoo-Database'] = env('ODOO_DATABASE');
    }

    $response = Http::withHeaders($headers)
        ->post(env('ODOO_BASE_URL') . '/json/2/product.product/search_read', [
            'domain' => [['sale_ok', '=', true]],
            'fields' => ['id', 'name', 'default_code'],
            'limit' => 5,
        ]);

    return [
        'status' => $response->status(),
        'body' => $response->json(),
    ];
});

Route::get('/test-create-odoo-quote', function () {

    $headers = [
        'Authorization' => 'bearer ' . env('ODOO_API_KEY'),
        'Content-Type' => 'application/json',
    ];

    if (env('ODOO_DATABASE')) {
        $headers['X-Odoo-Database'] = env('ODOO_DATABASE');
    }

    $baseUrl = rtrim(env('ODOO_BASE_URL'), '/') . '/json/2';

    $customerId = 842;

    $materials = [
        [
            'sku' => 'ST000780',
            'qty' => 10,
        ],
        [
            'sku' => 'ST000857',
            'qty' => 6,
        ],
    ];

    $orderLines = [];

    foreach ($materials as $material) {
        // 1. Find Odoo product by SKU/Internal Reference
        $productResponse = Http::withHeaders($headers)
            ->post($baseUrl . '/product.product/search_read', [
                'domain' => [
                    ['default_code', '=', $material['sku']],
                    ['sale_ok', '=', true],
                    ['active', '=', true],
                ],
                'fields' => ['id', 'name', 'default_code'],
                'limit' => 1,
            ]);

        if ($productResponse->failed()) {
            return [
                'error' => 'Product search failed',
                'sku' => $material['sku'],
                'status' => $productResponse->status(),
                'body' => $productResponse->body(),
            ];
        }

        $products = $productResponse->json();

        if (empty($products)) {
            return [
                'error' => 'Product not found in Odoo',
                'sku' => $material['sku'],
            ];
        }

        $product = $products[0];

        // 2. Add line command to create sale.order.line
        $orderLines[] = [
            0,
            0,
            [
                'product_id' => $product['id'],
                'product_uom_qty' => $material['qty'],

                // Optional. If omitted, Odoo usually fills product description.
                'name' => $product['name'],
            ],
        ];
    }

    // 3. Create quotation with all lines
    $quoteResponse = Http::withHeaders($headers)
        ->post($baseUrl . '/sale.order/create', [
            'vals_list' => [
                [
                    'partner_id' => $customerId,                    
                    'client_order_ref' => 'Fence App Test Quote',
                    'order_line' => $orderLines,
                ]
            ],
        ]);

    if ($quoteResponse->failed()) {
        return [
            'error' => 'Quote creation failed',
            'status' => $quoteResponse->status(),
            'body' => $quoteResponse->body(),
        ];
    }

    $saleOrderIds = $quoteResponse->json();
    $saleOrderId = $saleOrderIds[0] ?? null;

    // Update Prices
    $updatePricesResponse = Http::withHeaders($headers)
        ->post($baseUrl . '/sale.order/action_update_prices', [
            'ids' => [$saleOrderId],
        ]);

    if ($updatePricesResponse->failed()) {
        return [
            'error' => 'Price update failed',
            'status' => $updatePricesResponse->status(),
            'body' => $updatePricesResponse->body(),
        ];
    }

    
    $writeResponse = Http::withHeaders($headers)
    ->post($baseUrl . '/sale.order/write', [
        'ids' => [$saleOrderId],
        'vals' => [
            'user_id' => 137,
        ],
        'context' => [
            'mail_notrack' => true,
            'tracking_disable' => true,
            'mail_create_nosubscribe' => true,
            'mail_auto_subscribe_no_notify' => true,
            'mail_notify_force_send' => false,
        ],
    ]);
    

    $readResponse = Http::withHeaders($headers)
        ->post($baseUrl . '/sale.order/read', [
            'ids' => [$saleOrderId],
            'fields' => ['id', 'name', 'amount_total', 'state', 'pricelist_id', 'user_id'],
        ]);

    return [
        'created' => true,
        'sale_order_id' => $saleOrderId,
        'quote' => $readResponse->json()[0] ?? null,        

        'read_status' => $readResponse->status(),
        'read_body' => $readResponse->body(),
        'read_json' => $readResponse->json(),

        'status' => $quoteResponse->status(),
        'body' => $quoteResponse->body(),
        'json' => $quoteResponse->json(),
    ];
});

/* FISHBOWL
Route::get('/token', function (FishbowlApiService $fishbowl) {
    //echo cache('fishbowl_token');
    //die;

    $fishbowl->logout();
    if($fishbowl->login()){
        echo $fishbowl->token;
    }
    else{
        echo "ERROR";
    }

    die;
});

Route::get('/query', function (FishbowlApiService $fishbowl) {
    echo print_r($fishbowl->dataQuery("SELECT * from so LIMIT 10;"), true);
    die;
});

Route::get('/api-query', function (FishbowlApiService $fishbowl) {
    echo print_r($fishbowl->dataQuery("SELECT * from so LIMIT 10;"), true);
    die;
});

Route::get('/fbLogout', function (FishbowlApiService $fishbowl) {
    echo $fishbowl->logout();
    die;
});

Route::get('/data-query', [FishbowlApiService::class, 'executeQuery']);
*/

require __DIR__.'/auth.php';
