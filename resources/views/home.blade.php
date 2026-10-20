@extends('layouts.wfs')

@section('title', 'Start With The Material')

@section('content')
    <div id="contenido">
        @include('partials.material-step', ['slot' => 1])
    </div>

    @include('partials.video-help')
@endsection

@push('scripts')
    @include('partials.step-loader')
@endpush
