@extends('layouts.wfs')

@section('title', 'Configure Your Fence')

@section('content')
    <div id="contenido"></div>
@endsection

@push('scripts')
    @include('partials.step-loader')
    <script>
        (function () {
            var params = new URLSearchParams(window.location.search);
            var m = params.get('m');
            var c = params.get('c');
            if (!c || !m) {
                window.location.href = '/';
                return;
            }
            window.wfsLoadStep('/step/' + encodeURIComponent(m) + '/' + encodeURIComponent(c));
            window.history.replaceState({}, '', '/');
        })();
    </script>
@endpush
