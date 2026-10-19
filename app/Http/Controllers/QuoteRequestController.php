<?php

namespace App\Http\Controllers;

use App\Http\Controllers\FishbowlAPIController;
use App\Models\User;
use App\Classes\Estimate;
use Illuminate\Http\Request;
use App\Http\Requests\StoreQuoteRequest;
use App\Models\Customer;
use App\Models\QuoteRequest;
use App\Mail\QuoteRequestReceived;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class QuoteRequestController extends Controller
{
    public function store(StoreQuoteRequest $request)
    {
        //$quoteRequest = QuoteRequest::create($request->validated());
        $data = $request->validated();
        $data['delivery'] = $data['fulfillment_method'] === 'delivery';
        $data['company_id'] = $data['delivery'] ? 1 : (int) $data['company_id'];
        unset($data['fulfillment_method']);

        // Inject JSON from session (NOT from form)
        $data['sketch'] = session('sketch');
        $data['material'] = session()->get('materials', []);
        
        $code = $data['material']['1']['code'];
        $pvc = (substr($code,0,1) == '4');
        $notes = null;
        if($pvc){
            $notes = [];
            /*
            if(substr($code,0,3) == '431'){
                $notes[] = '3" Pickets';
            }
            if(substr($code,0,3) == '432'){
                $notes[] = '3" Pickets + Dog ear';
            } 
            */           
            $notes[] = 'To ensure optimal results with an ideal aesthetic finish, please contact a sales representative.';
            $notes[] = 'Para garantizar una optimización con un acabado estético ideal, por favor comuníquese con un representante de ventas';
        }

        $data['material']['concrete'] = (bool) session()->get('concrete', false);
        $estimate = session('estimate');
        $data['estimate'] = $estimate;

        $estimateObj = Estimate::fromArray(
            session('estimate', [])
        );

        $data['customer_id'] = config('services.odoo.customer'); // WALK IN
        $data['code_id'] = app(HomeController::class)->calculateRevision(
            $data['sketch'],
            $this->extractMaterialCodes($data['material']),
            $data['customer_id']
        );

        $odooQuote = $this->createOdooQuoteData(
            $estimateObj,
            null,
            'Fence App Quote',
            null,
            'HO',
            $notes,
            $data['company_id'],
            (int) $data['lead_source_id']
        );

        $data['odoo_id'] = $odooQuote['odoo_id'];
        $data['odoo_quote'] = $odooQuote['odoo_quote'];

        if ($odooQuote['odoo_id']) {
            try {
                $this->addOdooQuotationLogNote(
                    (int) $odooQuote['odoo_id'],
                    $data['canvas_image'],
                    'DrawMyFence App Sketch '
                );
            } catch (\Throwable $exception) {
                Log::warning('Odoo quotation sketch log note failed.', [
                    'odoo_id' => (int) $odooQuote['odoo_id'],
                    'exception' => $exception->getMessage(),
                ]);
            }
        }

        unset($data['canvas_image'], $data['lead_source_id']);

        $qr = QuoteRequest::create($data);

        $this->sendQuoteRequestEmail($qr, $request->safe()->except('canvas_image'));

        // Optional: clear sketch after save
        session()->forget('json');
        session()->forget('materials');
        session()->forget('estimate');

        return redirect()
            ->route('thank-you');
    }

    public function estimate(){
        if (Auth::check()) {
            return redirect()->route('quote.create');
        }

        return view('quote');
    }

    public function storeUser(Request $request)
    {
        $user = Auth::user();

        $rules = [
            'full_name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:254'],
            'phone' => ['nullable', 'string', 'max:30'],
            'ref' => ['nullable', 'string', 'max:255'],
            'pricelist' => ['nullable', 'string', 'in:HO,GC'],
            'lead_source_id' => ['nullable', 'integer', 'min:1'],
            'hear_about_us' => [
                'nullable',
                'string',
                'max:' . StoreQuoteRequest::HEAR_ABOUT_US_MAX_LENGTH,
            ],
            'fulfillment_method' => ['required', 'string', 'in:pickup,delivery'],
            'company_id' => ['nullable', 'integer', 'in:1,2', 'required_if:fulfillment_method,pickup'],
            'canvas_image' => ['required', 'string'],
        ];

        if ($user->account_type === 'company') {
            $rules['customer_id'] = ['required', 'integer', 'exists:customers,id'];
        }

        $validated = $request->validate($rules);

        $customerId = null;

        if ($user->account_type === 'company') {
            $customer = Customer::findOrFail($validated['customer_id']);
            $customerId = (int) $customer->id;

            if ($customerId !== 1886) {
                $validated['pricelist'] = null;
            } else {
                $validated['pricelist'] ??= 'HO';
            }
        } elseif (is_numeric($user->username)) {
            $customerId = (int) $user->username;
        }

        if ($customerId === (int) config('services.odoo.customer')) {
            $request->validate([
                'lead_source_id' => ['required', 'integer', 'min:1'],
            ]);
        }

        $delivery = false;
        if($validated['fulfillment_method'] != null){
            $delivery = $validated['fulfillment_method'] == 'delivery';
        }

        $data = [
            'user_id' => $user->id,
            'full_name' => $validated['full_name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'ref' => $validated['ref'] ?? null,
            'hear_about_us' => $validated['hear_about_us'] ?? null,
            'delivery' => $delivery,
            'company_id' => $validated['fulfillment_method'] === 'pickup'
                ? (int) $validated['company_id']
                : 1,
        ];

        $data['sketch'] = session('sketch');
        $data['material'] = session()->get('materials', []);
        $data['material']['concrete'] = (bool) session()->get('concrete', false);
        
        $code = $data['material']['1']['code'];
        $pvc = (substr($code,0,1) == '4');
        $notes = null;
        if($pvc){
            $notes = [];
            /*
            if(substr($code,0,3) == '431'){
                $notes[] = '3" Pickets';
            }
            if(substr($code,0,3) == '432'){
                $notes[] = '3" Pickets + Dog ear';
            }
            */
            $notes[] = 'To ensure optimal results with an ideal aesthetic finish, please contact a sales representative.';            
            $notes[] = 'Para garantizar una optimización con un acabado estético ideal, por favor comuníquese con un representante de ventas';            
        }    

        $estimate = session('estimate');
        $data['estimate'] = $estimate;

        $estimateObj = Estimate::fromArray(
            session('estimate', [])
        );

        $data['customer_id'] = $customerId;
        $data['code_id'] = app(HomeController::class)->calculateRevision(
            $data['sketch'],
            $this->extractMaterialCodes($data['material']),
            $data['customer_id']
        );

        $odooQuote = $this->createOdooQuoteData(
            $estimateObj,
            $customerId,
            $data['ref'] ?: 'Fence App Quote',
            null,
            $validated['pricelist'] ?? null,
            $notes,            
            $data['company_id'],
            isset($validated['lead_source_id']) ? (int) $validated['lead_source_id'] : null
        );

        $data['odoo_id'] = $odooQuote['odoo_id'];
        $data['odoo_quote'] = $odooQuote['odoo_quote'];

        if ($odooQuote['odoo_id']) {
            try {
                $this->addOdooQuotationLogNote(
                    (int) $odooQuote['odoo_id'],
                    $validated['canvas_image'],
                    'DrawMyFence App Sketch '
                );
            } catch (\Throwable $exception) {
                Log::warning('Odoo quotation sketch log note failed.', [
                    'odoo_id' => (int) $odooQuote['odoo_id'],
                    'exception' => $exception->getMessage(),
                ]);
            }
        }

        $qr = QuoteRequest::create($data);

        $this->sendQuoteRequestEmail($qr, collect($validated)->except('canvas_image')->all());

        // Optional: clear sketch after save
        session()->forget('json');
        session()->forget('materials');
        session()->forget('estimate');

        return redirect()
            ->route('thank-you');
    }

    public function index()
    {
        return view('quote_requests.index');
    }

    private function sendQuoteRequestEmail(QuoteRequest $quoteRequest, array $submittedData): void
    {
        $recipient = config('mail.quotes_to');

        if (blank($recipient)) {
            Log::warning('Quote request email was not sent because QUOTES_EMAIL is not configured.', [
                'quote_request_id' => $quoteRequest->id,
            ]);

            return;
        }

        Mail::to($recipient)->send(new QuoteRequestReceived($quoteRequest, $submittedData));
    }

    public function openSketch(QuoteRequest $quoteRequest)
    {
        $materials = $this->normalizeJsonValue($quoteRequest->material);
        $sketch = $this->normalizeJsonValue($quoteRequest->sketch);

        if (!is_array($materials) || !is_array($sketch)) {
            abort(404, 'This quote request does not have a saved material selection and sketch.');
        }

        $sketch = array_values(array_filter($sketch, function ($item) {
            return is_array($item)
                && array_key_exists('node1', $item)
                && array_key_exists('node2', $item)
                && array_key_exists('x1', $item)
                && array_key_exists('y1', $item)
                && array_key_exists('x2', $item)
                && array_key_exists('y2', $item);
        }));

        $step = $materials[1]['code'] ?? null;

        if (empty($step) || empty($sketch)) {
            abort(404, 'This quote request does not have a saved material selection and sketch.');
        }

        session()->forget(['materials', 'estimate', 'concrete']);
        session()->put('materials', []);
        session()->put('material', 1);
        session()->put('quote_request_sketch_to_load', $sketch);

        return redirect('/step/1/' . $step);
    }

    public function syncOdooSentAt(QuoteRequest $quoteRequest)
    {
        if (empty($quoteRequest->odoo_id)) {
            return response()->json([
                'message' => 'Quote request does not have an Odoo quotation id.',
            ], 422);
        }

        $odoo = $this->readOdooQuotation((int) $quoteRequest->odoo_id);
        $quotation = $odoo['quotation'];
        $state = (string) ($quotation['state'] ?? '');

        if (!in_array($state, ['sent', 'sale', 'done'], true)) {
            return response()->json([
                'message' => 'Odoo quotation has not been sent yet.',
                'sent' => false,
                'odoo_id' => $quoteRequest->odoo_id,
                'odoo_state' => $state,
                'sent_at' => $quoteRequest->sent_at?->toIso8601String(),
            ]);
        }

        $sentAt = $this->getOdooQuotationSentAt((int) $quoteRequest->odoo_id)
            ?? ($quotation['write_date'] ?? null)
            ?? ($quotation['date_order'] ?? null);

        if (!$sentAt) {
            return response()->json([
                'message' => 'Odoo quotation is marked sent, but no sent timestamp was found.',
                'sent' => true,
                'odoo_id' => $quoteRequest->odoo_id,
                'odoo_state' => $state,
                'sent_at' => null,
            ], 422);
        }

        $quoteRequest->forceFill([
            'sent_at' => Carbon::parse($sentAt),
        ])->save();

        return response()->json([
            'message' => 'Quote request sent timestamp synced.',
            'sent' => true,
            'odoo_id' => $quoteRequest->odoo_id,
            'odoo_state' => $state,
            'sent_at' => $quoteRequest->sent_at->toIso8601String(),
        ]);
    }

    public function markSentManually(Request $request, QuoteRequest $quoteRequest)
    {
        if ($quoteRequest->sent_at) {
            return response()->json([
                'message' => 'This quote request has already been marked as sent.',
            ], 409);
        }

        if ($quoteRequest->odoo_id) {
            $syncResponse = $this->syncOdooSentAt($quoteRequest);
            $syncResult = $syncResponse->getData(true);
            $quoteRequest->refresh();

            if (($syncResult['sent'] ?? false) && !empty($syncResult['sent_at'])) {
                return response()->json([
                    'message' => 'The sent timestamp was refreshed from Odoo.',
                    'source' => 'odoo',
                    'sent_at' => $quoteRequest->sent_at->toIso8601String(),
                    'sent_id' => null,
                ]);
            }

            if ($quoteRequest->sent_at) {
                return response()->json([
                    'message' => 'This quote request has already been marked as sent.',
                ], 409);
            }
        }

        $sentAt = now();
        $updated = QuoteRequest::query()
            ->whereKey($quoteRequest->getKey())
            ->whereNull('sent_at')
            ->update([
                'sent_at' => $sentAt,
                'sent_id' => $request->user()->getAuthIdentifier(),
            ]);

        if (!$updated) {
            return response()->json([
                'message' => 'This quote request has already been marked as sent.',
            ], 409);
        }

        return response()->json([
            'message' => 'Quote request marked as sent manually.',
            'sent_at' => $sentAt->toIso8601String(),
            'sent_id' => (int) $request->user()->getAuthIdentifier(),
        ]);
    }

    public function syncAllOdooSentAt()
    {
        $quoteRequests = QuoteRequest::query()
            ->whereNull('sent_at')
            ->whereNotNull('odoo_id')
            ->get(['id', 'odoo_id']);

        if ($quoteRequests->isEmpty()) {
            return response()->json([
                'message' => 'No unsynced quote requests found.',
                'checked' => 0,
                'updated' => 0,
                'odoo_api_calls' => 0,
            ]);
        }

        $odooIds = $quoteRequests
            ->pluck('odoo_id')
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values();

        if ($odooIds->isEmpty()) {
            return response()->json([
                'message' => 'No valid Odoo quotation ids found.',
                'checked' => $quoteRequests->count(),
                'updated' => 0,
                'odoo_api_calls' => 0,
            ]);
        }

        $quotations = collect($this->readOdooQuotations($odooIds->all()))
            ->filter(fn ($quotation) => in_array((string) ($quotation['state'] ?? ''), ['sent', 'sale', 'done'], true))
            ->keyBy(fn ($quotation) => (int) $quotation['id']);

        if ($quotations->isEmpty()) {
            return response()->json([
                'message' => 'No Odoo quotations have been sent yet.',
                'checked' => $quoteRequests->count(),
                'updated' => 0,
                'odoo_api_calls' => 1,
            ]);
        }

        $sentTimestamps = $this->getOdooQuotationsSentAt($quotations->keys()->all());

        $updated = 0;
        $missingTimestamp = 0;

        foreach ($quoteRequests as $quoteRequest) {
            $odooId = (int) $quoteRequest->odoo_id;
            $quotation = $quotations->get($odooId);

            if (!$quotation) {
                continue;
            }

            $sentAt = $sentTimestamps[$odooId]
                ?? ($quotation['write_date'] ?? null)
                ?? ($quotation['date_order'] ?? null);

            if (!$sentAt) {
                $missingTimestamp++;
                continue;
            }

            $quoteRequest->forceFill([
                'sent_at' => Carbon::parse($sentAt),
            ])->save();

            $updated++;
        }

        return response()->json([
            'message' => 'Quote request sent timestamps synced.',
            'checked' => $quoteRequests->count(),
            'sent_in_odoo' => $quotations->count(),
            'updated' => $updated,
            'missing_timestamp' => $missingTimestamp,
            'odoo_api_calls' => 2,
        ]);
    }

    public function syncAllCustomerAndRevisionCodes()
    {
        $quoteRequests = QuoteRequest::query()
            ->orderBy('id')
            ->get([
                'id',
                'odoo_id',
                'customer_id',
                'code_id',
                'material',
                'sketch',
            ]);

        $homeController = app(HomeController::class);
        $results = [];
        $updated = 0;
        $unchanged = 0;
        $skipped = 0;
        $failed = 0;

        foreach ($quoteRequests as $quoteRequest) {
            if (empty($quoteRequest->odoo_id)) {
                $skipped++;
                $results[] = [
                    'id' => $quoteRequest->id,
                    'status' => 'skipped',
                    'message' => 'Quote request does not have an Odoo quote ID.',
                ];
                continue;
            }

            try {
                $customerId = $this->getOdooQuoteCustomerId((int) $quoteRequest->odoo_id);
                $materials = $this->normalizeJsonValue($quoteRequest->material);
                $sketch = $this->normalizeJsonValue($quoteRequest->sketch);
                $materialCodes = $this->extractMaterialCodes($materials);

                $revisionCode = $homeController->calculateRevision(
                    is_array($sketch) ? $sketch : [],
                    $materialCodes,
                    $customerId
                );

                $quoteRequest->forceFill([
                    'customer_id' => $customerId,
                    'code_id' => $revisionCode,
                ]);

                $wasChanged = $quoteRequest->isDirty(['customer_id', 'code_id']);

                if ($wasChanged) {
                    $quoteRequest->save();
                    $updated++;
                } else {
                    $unchanged++;
                }

                $results[] = [
                    'id' => $quoteRequest->id,
                    'odoo_id' => (int) $quoteRequest->odoo_id,
                    'customer_id' => $customerId,
                    'code_id' => $revisionCode,
                    'status' => $wasChanged ? 'updated' : 'unchanged',
                ];
            } catch (\Throwable $exception) {
                $failed++;
                Log::warning('Quote request customer and revision sync failed.', [
                    'quote_request_id' => $quoteRequest->id,
                    'odoo_id' => $quoteRequest->odoo_id,
                    'exception' => $exception->getMessage(),
                ]);

                $results[] = [
                    'id' => $quoteRequest->id,
                    'odoo_id' => (int) $quoteRequest->odoo_id,
                    'status' => 'failed',
                    'message' => $exception->getMessage(),
                ];
            }
        }

        return response()->json([
            'message' => 'Quote request customers and revision codes synchronized.',
            'checked' => $quoteRequests->count(),
            'updated' => $updated,
            'unchanged' => $unchanged,
            'skipped' => $skipped,
            'failed' => $failed,
            'records' => $results,
        ]);
    }

    private function normalizeJsonValue($value)
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);

            return json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
        }

        return $value;
    }

    private function extractMaterialCodes($materials): array
    {
        if (!is_array($materials)) {
            return [];
        }

        $materialCodes = [];

        foreach ($materials as $key => $material) {
            if (is_array($material) && isset($material['code'])) {
                $materialCodes[$key] = $material['code'];
            }
        }

        return $materialCodes;
    }

    public function data_old(Request $request)
    {
        // Basic server-side support for DataTables parameters
        $draw   = (int) $request->get('draw', 1);
        $start  = (int) $request->get('start', 0);
        $length = (int) $request->get('length', 10);
        $search = $request->input('search.value');

        $baseQuery = QuoteRequest::query()
            ->with('user:id,name,email') // only if you have relation user()
            ->select(['id', 'user_id', 'created_at', 'sent_at']);

        $recordsTotal = (clone $baseQuery)->count();

        if (!empty($search)) {
            // If you store guest name/email fields, add them here too.
            $baseQuery->where(function ($q) use ($search) {
                $q->where('id', '::text', 'like', "%{$search}%");
            })->orWhereHas('user', function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $recordsFiltered = (clone $baseQuery)->count();

        $rows = $baseQuery
            ->orderByDesc('created_at')
            ->skip($start)
            ->take($length)
            ->get()
            ->map(function ($qr) {
                return [
                    'id' => $qr->id,
                    'customer' => $qr->user ? $qr->user->name : '(Guest)',
                    'email' => $qr->user ? $qr->user->email : '',
                    'created_at' => optional($qr->created_at)->format('Y-m-d H:i'),
                    'sent_at' => $qr->sent_at ? $qr->sent_at->format('Y-m-d H:i') : '',
                ];
            });

        return response()->json([
            'draw' => $draw,
            'recordsTotal' => $recordsTotal,
            'recordsFiltered' => $recordsFiltered,
            'data' => $rows,
        ]);
    }

    public function data_test(Request $request)
    {
        $draw   = (int) $request->get('draw', 1);
        $start  = (int) $request->get('start', 0);
        $length = (int) $request->get('length', 10);
        $search = $request->input('search.value');

        // Map DataTables column index -> DB column/expression
        // IMPORTANT: keep this in sync with the Blade columns order
        $orderableMap = [
            0 => 'id',
            1 => 'full_name',
            2 => 'email',
            // "Platform user?" icon column: sort by whether user_id is null
            // Postgres: (user_id IS NULL) false/true. We'll sort with NULLS LAST logic using CASE
            3 => null,
            4 => 'created_at',
            5 => 'sent_at',
        ];

        $baseQuery = QuoteRequest::query()->select([
            'id', 'full_name', 'email', 'user_id', 'delivery', 'company_id', 'created_at', 'sent_at'
        ]);

        $recordsTotal = (clone $baseQuery)->count();

        if (!empty($search)) {
            $baseQuery->where(function ($q) use ($search) {
                // Postgres: ilike for case-insensitive
                $q->where('full_name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhereRaw("CAST(id AS TEXT) ILIKE ?", ["%{$search}%"]);
            });
        }

        $recordsFiltered = (clone $baseQuery)->count();

        // Sorting
        $orderColIndex = (int) $request->input('order.0.column', 0);
        $orderDir      = $request->input('order.0.dir', 'desc') === 'asc' ? 'asc' : 'desc';

        if ($orderColIndex === 3) {
            // Sort icon column:
            // Put platform users (user_id NOT NULL) first when desc (or last when asc), consistently.
            // CASE returns 1 for platform user, 0 for guest.
            $baseQuery->orderByRaw(
                "CASE WHEN user_id IS NULL THEN 0 ELSE 1 END {$orderDir}"
            )->orderBy('id', 'desc');
        } else {
            $dbCol = $orderableMap[$orderColIndex] ?? 'quote_requests.created_at';
            $baseQuery->orderBy($dbCol, $orderDir);
        }

        $rows = $baseQuery
            ->skip($start)
            ->take($length)
            ->get()
            ->map(function ($qr) {
                $isPlatformUser = !is_null($qr->user_id);

                // Use a simple unicode icon to avoid extra libs:
                // 👤 = platform user, 🚶 = guest. Change to FontAwesome/Lucide if you prefer.
                $icon = $isPlatformUser ? '👤' : '🚶';

                $icon = $qr->user_id
                    ? '<i class="bi bi-person-check-fill text-success" style="color:green;" title="Platform user"></i>'
                    : '<i class="bi bi-person text-secondary" style="color:orange;" title="Guest"></i>';

                return [
                    'id' => $qr->id,
                    'name' => $qr->full_name,
                    'email' => $qr->email,
                    'platform_user' => $this->buildUserColumnIcons($qr),
                    'created_at' => optional($qr->created_at)->format('Y-m-d H:i'),
                    'sent_at' => $qr->sent_at ? $qr->sent_at->format('Y-m-d H:i') : '',
                ];
            });

        return response()->json([
            'draw' => $draw,
            'recordsTotal' => $recordsTotal,
            'recordsFiltered' => $recordsFiltered,
            'data' => $rows,
        ]);
    }

    public function data(Request $request)
    {
        $draw   = (int) $request->get('draw', 1);
        $start  = (int) $request->get('start', 0);
        $length = (int) $request->get('length', 10);
        $search = $request->input('search.value');

        // Map DataTables column index -> DB column/expression
        // IMPORTANT: keep this in sync with the Blade columns order
        $orderableMap = [
            0 => null, // revision status is ordered as green/red groups below
            1 => 'quote_requests.full_name',
            2 => 'quote_requests.email',
            3 => 'quote_requests.phone',
            4 => 'quote_requests.ref',
            5 => 'quote_requests.odoo_id',
            6 => null, // sketch link
            7 => null, // icon (user_id)
            8 => 'created_by',
            9 => 'quote_requests.created_at',
            10 => 'quote_requests.sent_at',
        ];

        $baseQuery = QuoteRequest::query()
            ->leftJoin('users as creators', 'quote_requests.user_id', '=', 'creators.id')
            ->leftJoin('users as senders', 'quote_requests.sent_id', '=', 'senders.id')
            ->select([
                'quote_requests.id',
                'quote_requests.odoo_id',
                'quote_requests.odoo_quote',
                'quote_requests.code_id',
                'quote_requests.full_name',
                'quote_requests.email',
                'quote_requests.phone',
                'quote_requests.ref',
                'quote_requests.delivery',
                'quote_requests.company_id',
                'quote_requests.preferred_contact_method',
                'quote_requests.zip_code',
                'quote_requests.property_type',
                'quote_requests.project_type',
                'quote_requests.timeline',
                'quote_requests.primary_reason',
                'quote_requests.hear_about_us',
                'quote_requests.material',
                'quote_requests.sketch',
                'quote_requests.estimate',
                'quote_requests.user_id',
                'quote_requests.created_at',
                'quote_requests.sent_at',
                'quote_requests.sent_id',
                'creators.name as created_by',
                'senders.name as sent_by',
            ]);

        $recordsTotal = (clone $baseQuery)->count();

        if (!empty($search)) {
            $baseQuery->where(function ($q) use ($search) {
                $q->where('quote_requests.full_name', 'ilike', "%{$search}%")
                    ->orWhere('quote_requests.email', 'ilike', "%{$search}%")
                    ->orWhere('quote_requests.phone', 'ilike', "%{$search}%")
                    ->orWhere('quote_requests.ref', 'ilike', "%{$search}%")
                    ->orWhereRaw("CAST(quote_requests.delivery AS TEXT) ILIKE ?", ["%{$search}%"])
                    ->orWhere('quote_requests.zip_code', 'ilike', "%{$search}%")
                    ->orWhere('quote_requests.property_type', 'ilike', "%{$search}%")
                    ->orWhere('quote_requests.project_type', 'ilike', "%{$search}%")
                    ->orWhere('quote_requests.timeline', 'ilike', "%{$search}%")
                    ->orWhere('quote_requests.primary_reason', 'ilike', "%{$search}%")
                    ->orWhere('quote_requests.hear_about_us', 'ilike', "%{$search}%")
                    ->orWhere('creators.name', 'ilike', "%{$search}%")
                    ->orWhereRaw("CAST(quote_requests.odoo_id AS TEXT) ILIKE ?", ["%{$search}%"])
                    ->orWhereRaw("CAST(quote_requests.id AS TEXT) ILIKE ?", ["%{$search}%"]);
            });
        }

        $recordsFiltered = (clone $baseQuery)->count();

        // Sorting
        $orderColIndex = (int) $request->input('order.0.column', 0);
        $orderDir      = $request->input('order.0.dir', 'desc') === 'asc' ? 'asc' : 'desc';

        if ($orderColIndex === 0) {
            $baseQuery->orderByRaw(
                "CASE WHEN quote_requests.code_id = 0 THEN 0 ELSE 1 END {$orderDir}"
            )->orderBy('quote_requests.id', 'desc');
        } elseif ($orderColIndex === 7) {
            $baseQuery->orderByRaw(
                "CASE WHEN quote_requests.user_id IS NULL THEN 0 ELSE 1 END {$orderDir}"
            )->orderBy('quote_requests.id', 'desc');
        } else {
            $dbCol = $orderableMap[$orderColIndex] ?? 'quote_requests.created_at';
            $dbCol ??= 'quote_requests.created_at';
            $baseQuery->orderBy($dbCol, $orderDir);
        }

        $floridaTimezone = 'America/New_York';
        $quoteCodeDescriptions = DB::table('quote_codes')
            ->orderBy('id')
            ->pluck('description', 'id');

        $rows = $baseQuery->skip($start)->take($length)->get()->map(function ($qr) use ($floridaTimezone, $quoteCodeDescriptions) {
            $odooBaseUrl = config('services.odoo.base_url');
            if ($odooBaseUrl && !preg_match('#^https?://#i', $odooBaseUrl)) {
                $odooBaseUrl = 'https://' . $odooBaseUrl;
            }

            $quoteUrl = $qr->odoo_id
                ? rtrim((string) $odooBaseUrl, '/') . '/odoo/sales/' . $qr->odoo_id
                : null;

            $revisionCode = $qr->code_id === null ? null : (int) $qr->code_id;
            $revisionDescriptions = $revisionCode === null
                ? []
                : $quoteCodeDescriptions
                    ->filter(function ($description, $flag) use ($revisionCode) {
                        $flag = (int) $flag;
                        $isSingleFlag = $flag > 0 && ($flag & ($flag - 1)) === 0;

                        return $isSingleFlag && ($revisionCode & $flag) === $flag;
                    })
                    ->values()
                    ->all();

            return [
                'id' => $qr->id,
                'code_id' => $revisionCode,
                'revision_descriptions' => $revisionDescriptions,
                'odoo_id' => $qr->odoo_id,
                'odoo_quote' => $qr->odoo_quote,
                'quote_url' => $quoteUrl,
                'sketch_url' => route('quote_requests.open_sketch', $qr->id),
                'manual_sent_url' => route('quote_requests.mark_sent_manually', $qr->id),
                'name' => $qr->full_name,
                'email' => $qr->email,
                'phone' => $qr->phone,
                'ref' => $qr->ref,
                'delivery' => $qr->delivery,
                'fulfillment_label' => $this->formatFulfillmentMethod($qr->delivery),
                'pickup_location_id' => $qr->company_id,
                'pickup_location_label' => $this->formatPickupLocation($qr->company_id),
                'preferred_contact_method' => $qr->preferred_contact_method,
                'zip_code' => $qr->zip_code,
                'property_type' => $qr->property_type,
                'project_type' => $qr->project_type,
                'timeline' => $qr->timeline,
                'primary_reason' => $qr->primary_reason,
                'hear_about_us' => $qr->hear_about_us,
                'platform_user' => $this->buildUserColumnIcons($qr),
                'platform_user_label' => $qr->user_id ? 'Platform user' : 'Guest',
                'created_by' => $qr->created_by ?? '',
                'created_at'     => $qr->created_at?->copy()->timezone($floridaTimezone)->format('Y-m-d H:i'),
                'created_at_raw' => $qr->created_at?->toIso8601String(),
                'sent_at'        => $qr->sent_at ? $qr->sent_at->copy()->timezone($floridaTimezone)->format('Y-m-d H:i') : '',
                'sent_at_raw'    => $qr->sent_at ? $qr->sent_at->toIso8601String() : null,
                'sent_manually'  => $qr->sent_id !== null,
                'sent_by'        => $qr->sent_by ?? '',
            ];
        });

        return response()->json([
            'draw' => $draw,
            'recordsTotal' => $recordsTotal,
            'recordsFiltered' => $recordsFiltered,
            'data' => $rows,
        ]);
    }

    private function formatFulfillmentMethod($delivery): string
    {
        $default = 'Pick Up';
        if($delivery){
            $default = 'Delivery';
        }
        return $default;        
    }

    private function formatPickupLocation($locationId): string
    {
        return match ((int) $locationId) {
            1 => 'Fort Myers',
            2 => 'Port Charlotte',
            default => 'Fort Myers',
        };
    }

    private function buildUserColumnIcons($quoteRequest): string
    {
        $locationBadge = match ((int) $quoteRequest->company_id) {
            1 => '<span class="qr-location-badge qr-location-badge-fm" title="Fort Myers">FM</span>',
            2 => '<span class="qr-location-badge qr-location-badge-pc" title="Port Charlotte">PC</span>',
            default => '',
        };

        $userIcon = $quoteRequest->user_id
            ? '<span class="qr-user-icon-slot"><i class="bi bi-person-check-fill text-success" style="color:green;" title="Platform user"></i></span>'
            : '<span class="qr-user-icon-slot"><i class="bi bi-person text-secondary" style="color:orange;" title="Guest"></i></span>';

        $deliveryIcon = (bool) $quoteRequest->delivery
            ? '<span class="qr-delivery-icon-slot"><i class="bi bi-truck text-primary" title="Delivery"></i></span>'
            : '<span class="qr-delivery-icon-slot"></span>';

        return '<span class="qr-user-icons">' . $locationBadge . $userIcon . $deliveryIcon . '</span>';
    }

    private function getOdooApiConfig(): array
    {
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

    public function testOdooQuotationLogNote(Request $request)
    {
        $validated = $request->validate([
            'quotation_id' => ['required', 'integer', 'min:1'],
            'note' => ['required', 'string'],
        ]);

        try {
            $result = $this->addOdooQuotationLogNote(
                (int) $validated['quotation_id'],
                null,
                $validated['note']
            );

            return response()->json([
                'success' => true,
                'quotation_id' => (int) $validated['quotation_id'],
                'result' => $result,
            ]);
        } catch (\Throwable $exception) {
            Log::warning('Odoo quotation log note test failed.', [
                'quotation_id' => (int) $validated['quotation_id'],
                'exception' => $exception->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'quotation_id' => (int) $validated['quotation_id'],
                'message' => $exception->getMessage(),
            ], 502);
        }
    }

    public function addOdooQuotationLogNote(
        int $odooQuotationId,
        ?string $base64Image,
        string $note
    ): array {
        if ($odooQuotationId <= 0) {
            throw new \InvalidArgumentException('The Odoo quotation ID must be greater than zero.');
        }

        $note = trim($note);

        if ($note === '') {
            throw new \InvalidArgumentException('The Odoo log note cannot be empty.');
        }

        $odoo = $this->getOdooApiConfig();
        $attachmentId = null;

        if ($base64Image !== null && trim($base64Image) !== '') {
            [$imageData, $mimeType, $extension] = $this->normalizeBase64Image($base64Image);

            $attachmentResponse = Http::withHeaders($odoo['headers'])
                ->timeout(60)
                ->post($odoo['base_url'] . '/ir.attachment/create', [
                    'vals_list' => [[
                        'name' => "quotation-{$odooQuotationId}-sketch.{$extension}",
                        'type' => 'binary',
                        'datas' => $imageData,
                        'mimetype' => $mimeType,
                        'res_model' => 'sale.order',
                        'res_id' => $odooQuotationId,
                    ]],
                ]);

            if ($attachmentResponse->failed()) {
                throw new \RuntimeException(
                    'Odoo quotation image attachment failed: ' . $attachmentResponse->body()
                );
            }

            $attachmentId = $attachmentResponse->json()[0] ?? null;

            if (!$attachmentId) {
                throw new \RuntimeException(
                    'Odoo quotation image attachment failed: missing attachment ID. Response: '
                    . $attachmentResponse->body()
                );
            }
        }

        $messageData = [
            'ids' => [$odooQuotationId],
            'body' => $note,
            'message_type' => 'comment',
            'subtype_xmlid' => 'mail.mt_note',
        ];

        if ($attachmentId !== null) {
            $messageData['attachment_ids'] = [(int) $attachmentId];
        }

        $messageResponse = Http::withHeaders($odoo['headers'])
            ->timeout(60)
            ->post($odoo['base_url'] . '/sale.order/message_post', $messageData);

        if ($messageResponse->failed()) {
            throw new \RuntimeException(
                'Odoo quotation log note failed: ' . $messageResponse->body()
            );
        }

        return [
            'message' => $messageResponse->json(),
            'attachment_id' => $attachmentId ? (int) $attachmentId : null,
        ];
    }

    public function getOdooQuoteCustomerId(int $odooQuoteId): int
    {
        if ($odooQuoteId <= 0) {
            throw new \InvalidArgumentException('The Odoo quote ID must be greater than zero.');
        }

        $odoo = $this->getOdooApiConfig();

        $response = Http::withHeaders($odoo['headers'])
            ->timeout(30)
            ->post($odoo['base_url'] . '/sale.order/read', [
                'ids' => [$odooQuoteId],
                'fields' => ['partner_id'],
            ]);

        if ($response->failed()) {
            throw new \RuntimeException(
                'Odoo quote customer lookup failed: ' . $response->body()
            );
        }

        $quote = $response->json()[0] ?? null;

        if (!$quote) {
            throw new \RuntimeException("Odoo quote {$odooQuoteId} was not found.");
        }

        $partner = $quote['partner_id'] ?? null;
        $customerId = is_array($partner) ? ($partner[0] ?? null) : $partner;

        if (!is_numeric($customerId) || (int) $customerId <= 0) {
            throw new \RuntimeException(
                "Odoo quote {$odooQuoteId} does not have a valid customer."
            );
        }

        return (int) $customerId;
    }

    private function normalizeBase64Image(string $base64Image): array
    {
        $base64Image = trim($base64Image);
        $mimeType = 'image/png';
        $encodedImage = $base64Image;

        if (preg_match('/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s', $base64Image, $matches)) {
            $mimeType = strtolower($matches[1]);
            $encodedImage = $matches[2];
        }

        $encodedImage = preg_replace('/\s+/', '', $encodedImage);
        $decodedImage = base64_decode($encodedImage, true);

        if ($decodedImage === false || $decodedImage === '') {
            throw new \InvalidArgumentException('The quotation image is not valid base64 data.');
        }

        $extension = match ($mimeType) {
            'image/jpeg' => 'jpg',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            'image/bmp' => 'bmp',
            'image/svg+xml' => 'svg',
            default => 'png',
        };

        return [base64_encode($decodedImage), $mimeType, $extension];
    }

    private function createOdooQuoteData(
        Estimate $estimate,
        ?int $customerId,
        ?string $reference,
        ?int $salespersonId,
        ?string $pricelist,
        ?array $notes,
        ?int $companyId,
        ?int $leadSourceId
    ): array {
        try {
            $result = $estimate->createOdooQuote(
                $customerId,
                $reference,
                $salespersonId,
                $pricelist,
                $notes,
                $companyId,
                $leadSourceId
            );

            return [
                'odoo_id' => $result['sale_order_id'] ?? null,
                'odoo_quote' => $result['quote']['name'] ?? null,
            ];
        } catch (\Throwable $exception) {
            Log::warning('Odoo quote creation failed; saving quote request without Odoo quote.', [
                'customer_id' => $customerId,
                'reference' => $reference,
                'company_id' => $companyId,
                'exception' => $exception->getMessage(),
            ]);

            return [
                'odoo_id' => null,
                'odoo_quote' => null,
            ];
        }
    }

    private function readOdooQuotation(int $odooQuotationId): array
    {
        $odoo = $this->getOdooApiConfig();

        $response = Http::withHeaders($odoo['headers'])
            ->timeout(30)
            ->post($odoo['base_url'] . '/sale.order/read', [
                'ids' => [$odooQuotationId],
                'fields' => ['id', 'name', 'state', 'date_order', 'write_date'],
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Odoo quotation lookup failed: ' . $response->body());
        }

        $quotation = $response->json()[0] ?? null;

        if (!$quotation) {
            abort(404, 'Odoo quotation was not found.');
        }

        return [
            'quotation' => $quotation,
            'odoo' => $odoo,
        ];
    }

    private function readOdooQuotations(array $odooQuotationIds): array
    {
        $odoo = $this->getOdooApiConfig();

        $response = Http::withHeaders($odoo['headers'])
            ->timeout(60)
            ->post($odoo['base_url'] . '/sale.order/read', [
                'ids' => array_values($odooQuotationIds),
                'fields' => ['id', 'name', 'state', 'date_order', 'write_date'],
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Odoo quotations lookup failed: ' . $response->body());
        }

        return $response->json() ?? [];
    }

    private function getOdooQuotationSentAt(int $odooQuotationId): ?string
    {
        $odoo = $this->getOdooApiConfig();

        $response = Http::withHeaders($odoo['headers'])
            ->timeout(30)
            ->post($odoo['base_url'] . '/mail.message/search_read', [
                'domain' => [
                    ['model', '=', 'sale.order'],
                    ['res_id', '=', $odooQuotationId],
                    ['message_type', '=', 'email'],
                ],
                'fields' => ['id', 'date', 'subject', 'message_type'],
                'limit' => 1,
                'order' => 'date asc',
            ]);

        if ($response->failed()) {
            Log::warning('Odoo quotation sent timestamp lookup failed.', [
                'odoo_id' => $odooQuotationId,
                'response' => $response->body(),
            ]);

            return null;
        }

        return $response->json()[0]['date'] ?? null;
    }

    private function getOdooQuotationsSentAt(array $odooQuotationIds): array
    {
        if (empty($odooQuotationIds)) {
            return [];
        }

        $odoo = $this->getOdooApiConfig();

        $response = Http::withHeaders($odoo['headers'])
            ->timeout(60)
            ->post($odoo['base_url'] . '/mail.message/search_read', [
                'domain' => [
                    ['model', '=', 'sale.order'],
                    ['res_id', 'in', array_values($odooQuotationIds)],
                    ['message_type', '=', 'email'],
                ],
                'fields' => ['id', 'res_id', 'date', 'subject', 'message_type'],
                'order' => 'date asc',
            ]);

        if ($response->failed()) {
            Log::warning('Odoo quotations sent timestamp lookup failed.', [
                'odoo_ids' => $odooQuotationIds,
                'response' => $response->body(),
            ]);

            return [];
        }

        $sentAtByOdooId = [];

        foreach ($response->json() ?? [] as $message) {
            $odooId = (int) ($message['res_id'] ?? 0);

            if ($odooId && !isset($sentAtByOdooId[$odooId]) && !empty($message['date'])) {
                $sentAtByOdooId[$odooId] = $message['date'];
            }
        }

        return $sentAtByOdooId;
    }
}
