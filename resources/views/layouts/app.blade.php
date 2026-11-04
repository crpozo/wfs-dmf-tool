<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, max-age=0">
        <meta http-equiv="Pragma" content="no-cache">
        <meta http-equiv="Expires" content="0">

        <title>{{ config('app.name', 'Laravel') }}</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />
        <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet" integrity="sha384-tViUnnbYAV00FLIhhi3v/dWt3Jxw4gZQcNoSCxCIFNJVCx7/D55/wXsrNIRANwdD" crossorigin="anonymous">
        <link rel="stylesheet" href="@assetv('css/bootstrap.css')" />
        <link rel="stylesheet" href="@assetv('css/fontawesome.css')" />
        <link rel="stylesheet" href="@assetv('css/styles.css')" />
        <link rel="stylesheet" href="@assetv('css/app.css')" />
        <link rel="icon" href="@assetv('images/favicon.ico')" />

        <!-- Scripts -->
        @vite(['resources/css/app.css', 'resources/js/app.js'])
        @stack('styles')
    </head>
    <body class="font-sans antialiased">
        <div class="min-h-screen bg-gray-100">
            @include('layouts.navigation')

            <!-- Page Heading -->
            @if (isset($header))
                <header class="bg-white shadow">
                    <div class="py-2 text-center">
                        {{ $header }}
                    </div>
                </header>
            @endif

            <!-- Page Content -->
            <main>
                {{ $slot }}
            </main>

        </div>
        <!-- jQuery -->
        <script src="https://code.jquery.com/jquery-3.7.1.min.js" integrity="sha384-1H217gwSVyLSIfaLxHbE7dRb3v4mYCKbpQvzx0cegeju1MVsGrX5xXxAvs/HgeFs" crossorigin="anonymous"></script>

        <!-- DataTables -->
        <link rel="stylesheet" href="https://cdn.datatables.net/1.13.8/css/jquery.dataTables.min.css" integrity="sha384-cya1SKeBBe5YTpHgx4WoICmzqkoHTxoGqjPySUq2nLksbJ/JiKXX2RmhyLz6jwST" crossorigin="anonymous">
        <script src="https://cdn.datatables.net/1.13.8/js/jquery.dataTables.min.js" integrity="sha384-Udt767MMeKelGRBxaCfxX88YDLbViYdQ7T/gkRoB197Jf+OviZ+lsaRAOpS/MIjf" crossorigin="anonymous"></script>
        <script>
            function toggleDropdown() {
                const dropdown = document.getElementById('dropdownContent');
                dropdown.classList.toggle('hidden');
            }
        </script>
        @stack('scripts')
    </body>
</html>
