<!doctype html>
<html>
<body style="font-family: Arial, sans-serif; color: #222;">
<p>A new quote request was received from <strong>{{ $quoteRequest->full_name }}</strong>.</p>

<h2 style="font-size: 18px;">Customer information</h2>
<table cellpadding="6" cellspacing="0" border="0">
    <tr><th align="left">Name</th><td>{{ $quoteRequest->full_name }}</td></tr>
    <tr><th align="left">Email</th><td>{{ $quoteRequest->email }}</td></tr>
    <tr><th align="left">Phone</th><td>{{ $quoteRequest->phone ?: 'Not provided' }}</td></tr>
    @if($quoteRequest->preferred_contact_method)
        <tr><th align="left">Preferred contact method</th><td>{{ $quoteRequest->preferred_contact_method }}</td></tr>
    @endif
    @if($quoteRequest->zip_code)
        <tr><th align="left">ZIP code</th><td>{{ $quoteRequest->zip_code }}</td></tr>
    @endif
    @if($quoteRequest->property_type)
        <tr><th align="left">Property type</th><td>{{ $quoteRequest->property_type }}</td></tr>
    @endif
    @if($quoteRequest->project_type)
        <tr><th align="left">Project type</th><td>{{ $quoteRequest->project_type }}</td></tr>
    @endif
    @if($quoteRequest->timeline)
        <tr><th align="left">Timeline</th><td>{{ $quoteRequest->timeline }}</td></tr>
    @endif
    @if($quoteRequest->primary_reason)
        <tr><th align="left">Primary reason</th><td>{{ $quoteRequest->primary_reason }}</td></tr>
    @endif
    @if($quoteRequest->hear_about_us)
        <tr><th align="left">How they heard about us</th><td>{{ $quoteRequest->hear_about_us }}</td></tr>
    @endif
    @if($quoteRequest->ref)
        <tr><th align="left">Reference</th><td>{{ $quoteRequest->ref }}</td></tr>
    @endif
    @if(!empty($submittedData['customer_id']))
        <tr><th align="left">Customer ID</th><td>{{ $submittedData['customer_id'] }}</td></tr>
    @endif
    @if(!empty($submittedData['pricelist']))
        <tr><th align="left">Pricelist</th><td>{{ $submittedData['pricelist'] }}</td></tr>
    @endif
    <tr><th align="left">Fulfillment</th><td>{{ $quoteRequest->delivery ? 'Delivery' : 'Pickup' }}</td></tr>
    @if(!$quoteRequest->delivery && $quoteRequest->company_id)
        <tr>
            <th align="left">Pickup location</th>
            <td>{{ [1 => 'Fort Myers', 2 => 'Port Charlotte'][$quoteRequest->company_id] ?? 'Company #' . $quoteRequest->company_id }}</td>
        </tr>
    @endif
</table>

@if(!empty($quoteRequest->map_data))
    <h2 style="font-size: 18px;">Property map</h2>
    <p>
        Drawn on the satellite map{{ !empty($quoteRequest->map_data['address']) ? ' at ' . $quoteRequest->map_data['address'] : '' }}.
        @if($quoteRequest->sketch_image_path)
            The satellite image with the fence is attached.
        @endif
        Lengths were measured on the map and must be confirmed with the customer.
    </p>
@endif

<h2 style="font-size: 18px;">Quote links</h2>
<p>
    <a href="{{ route('quote_requests.open_sketch', $quoteRequest) }}">Open sketch</a>
</p>

@if($quoteRequest->odoo_id && config('services.odoo.base_url'))
    @php
        $odooBaseUrl = config('services.odoo.base_url');
        $odooBaseUrl = preg_match('#^https?://#i', $odooBaseUrl) ? $odooBaseUrl : 'https://' . $odooBaseUrl;
        $odooUrl = rtrim($odooBaseUrl, '/') . '/odoo/sales/' . $quoteRequest->odoo_id;
    @endphp
    <p>
        <a href="{{ $odooUrl }}">Open Odoo quote {{ $quoteRequest->odoo_quote ?: '#' . $quoteRequest->odoo_id }}</a>
    </p>
@else
    <p>Odoo quote: Not available</p>
@endif
</body>
</html>
