@extends('layouts.wfs')

@section('title', 'Start With The Material')

@section('content')
    @if (session('status'))
        <div class="alert alert-warning" role="status">{{ session('status') }}</div>
    @endif

    <div id="contenido">
        @include('partials.material-step', ['slot' => 1])
    </div>

@endsection

@push('scripts')
    @include('partials.step-loader')
@endpush
