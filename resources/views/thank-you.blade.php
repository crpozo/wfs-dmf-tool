@extends('layouts.wfs')

@section('title', 'Thank You')

@section('content')
    <div class="wfs-thanks">
        <img src="@assetv('images/success.png')" alt="" />
        <span class="wfs-eyebrow">Quote request received</span>
        <h1>Thank You!</h1>
        <p>
            Our team is already reviewing your fence sketch and will send your quote to the email
            address you provided. If anything needs clarification, a Western Fence Supply sales
            representative will reach out.
        </p>
        <a href="{{ route('quote.create') }}" class="wfs-btn wfs-btn-primary">
            <i class="fas fa-pencil-ruler"></i> Start a new fence project
        </a>
        <a href="https://www.westernfencesupply.com" class="wfs-btn wfs-btn-outline">
            Back to westernfencesupply.com
        </a>
    </div>
@endsection
