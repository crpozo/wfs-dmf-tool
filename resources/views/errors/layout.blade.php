<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link
        href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap"
        rel="stylesheet"
    />
    <link rel="stylesheet" href="@assetv('css/bootstrap.css')" />
    <link rel="stylesheet" href="@assetv('css/styles.css')" />
    <link rel="stylesheet" href="@assetv('css/app.css')" />
    <link rel="icon" href="@assetv('images/favicon.ico')" />
    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <title>@yield('title', 'Something went wrong') | Western Fence Supply</title>
    <style>
        body.wfs-error-page {
            min-height: 100vh;
            margin: 0;
            background: #f3f5f8;
            color: #0b1547;
            font-family: "Open Sans", Arial, sans-serif;
        }

        .wfs-error-nav {
            min-height: 72px;
            padding: 16px 28px;
            background: #0b1547;
            display: flex;
            align-items: center;
        }

        .wfs-error-logo {
            height: 40px;
            width: auto;
        }

        .wfs-error-main {
            min-height: calc(100vh - 72px);
            display: grid;
            place-items: center;
            padding: 36px 18px;
            background:
                linear-gradient(rgba(11, 21, 71, 0.72), rgba(11, 21, 71, 0.72)),
                url('/images/blueprint.jpg') center / cover no-repeat;
        }

        .wfs-error-panel {
            width: min(680px, 100%);
            padding: 34px;
            border-top: 6px solid #c9a75c;
            background: #ffffff;
            box-shadow: 0 18px 42px rgba(0, 0, 0, 0.2);
        }

        .wfs-error-code {
            margin: 0 0 8px;
            color: #c9a75c;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        .wfs-error-title {
            margin: 0 0 14px;
            color: #0b1547;
            font-size: clamp(28px, 4vw, 42px);
            font-weight: 700;
            line-height: 1.1;
        }

        .wfs-error-message {
            margin: 0 0 26px;
            color: #384152;
            font-size: 17px;
            line-height: 1.55;
        }

        .wfs-error-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }

        .wfs-error-actions .btn {
            min-width: 132px;
            border-radius: 6px;
            font-weight: 700;
        }

        .wfs-error-actions .btn-primary {
            border-color: #0b1547;
            background: #0b1547;
        }

        .wfs-error-actions .btn-outline-primary {
            border-color: #0b1547;
            color: #0b1547;
        }

        .wfs-error-actions .btn-outline-primary:hover {
            background: #0b1547;
            color: #ffffff;
        }

        @media (max-width: 560px) {
            .wfs-error-nav {
                padding: 14px 18px;
            }

            .wfs-error-panel {
                padding: 26px 22px;
            }

            .wfs-error-actions .btn {
                width: 100%;
            }
        }
    </style>
</head>
<body class="wfs-error-page">
    <nav class="wfs-error-nav" aria-label="Western Fence Supply">
        <a href="{{ route('quote.create') }}">
            <img class="wfs-error-logo" src="{{ asset('images/wfs-logo-wht.svg') }}" alt="Western Fence Supply">
        </a>
    </nav>

    <main class="wfs-error-main">
        <section class="wfs-error-panel" aria-labelledby="error-title">
            <p class="wfs-error-code">@yield('code')</p>
            <h1 class="wfs-error-title" id="error-title">@yield('heading')</h1>
            <p class="wfs-error-message">@yield('message')</p>

            <div class="wfs-error-actions">
                <a class="btn btn-primary" href="{{ route('quote.create') }}">Go Home</a>
                <button class="btn btn-outline-primary" type="button" onclick="history.back()">Go Back</button>
            </div>
        </section>
    </main>
</body>
</html>
