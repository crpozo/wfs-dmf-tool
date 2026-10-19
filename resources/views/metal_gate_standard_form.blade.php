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

    <title>Metal Gate Form | Western Fence Supply</title>
    <style>
        body.metal-gate-standard-page {
            min-height: 100vh;
            background: #f3f5f8;
            color: #111827;
            font-family: "Open Sans", Arial, sans-serif;
        }

        .standard-gate-nav {
            min-height: 56px;
            padding: 10px 24px;
            background: #0b1547;
            display: flex;
            align-items: center;
        }

        .standard-gate-logo {
            height: 34px;
            width: auto;
        }

        .standard-gate-wrap {
            width: min(1180px, calc(100% - 28px));
            margin: 18px auto 30px;
        }

        .standard-gate-header {
            display: flex;
            justify-content: space-between;
            gap: 18px;
            align-items: end;
            margin-bottom: 12px;
        }

        .standard-gate-title {
            margin: 0;
            color: #0b1547;
            font-size: 26px;
            font-weight: 700;
        }

        .standard-gate-subtitle {
            margin: 3px 0 0;
            color: #4b5563;
            font-size: 14px;
        }

        .standard-gate-form {
            display: grid;
            gap: 12px;
        }

        .standard-gate-section {
            padding: 14px;
            border: 1px solid #d7dce5;
            border-radius: 8px;
            background: #ffffff;
        }

        .standard-gate-section-title {
            margin: 0 0 10px;
            color: #0b1547;
            font-size: 16px;
            font-weight: 700;
        }

        .standard-gate-grid {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            gap: 10px 12px;
        }

        .standard-gate-field {
            grid-column: span 4;
        }

        .standard-gate-field.span-2 {
            grid-column: span 2;
        }

        .standard-gate-field.span-3 {
            grid-column: span 3;
        }

        .standard-gate-field.span-6 {
            grid-column: span 6;
        }

        .standard-gate-field.span-8 {
            grid-column: span 8;
        }

        .standard-gate-field.span-12 {
            grid-column: span 12;
        }

        .standard-gate-form .form-label,
        .standard-gate-legend {
            color: #1f2937;
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .standard-gate-form .form-control,
        .standard-gate-form .form-select {
            min-height: 36px;
            padding-top: 5px;
            padding-bottom: 5px;
            border-color: #cbd5e1;
            border-radius: 6px;
            font-size: 14px;
        }

        .standard-gate-form textarea.form-control {
            min-height: 76px;
        }

        .standard-gate-field.compact .form-label {
            font-size: 11px;
            margin-bottom: 2px;
        }

        .standard-gate-field.compact .form-control {
            min-height: 30px;
            padding-top: 3px;
            padding-bottom: 3px;
            font-size: 13px;
        }

        .standard-gate-options {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 6px 12px;
            margin-top: 4px;
        }

        .standard-gate-option {
            display: flex;
            align-items: center;
            gap: 8px;
            min-height: 26px;
            margin: 0;
            color: #111827;
            font-size: 14px;
            font-weight: 400;
        }

        .standard-gate-option input[type="radio"],
        .standard-gate-option input[type="checkbox"] {
            position: static;
            width: 16px;
            height: 16px;
            margin: 0;
            opacity: 1;
        }

        .standard-gate-subgrid {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            gap: 10px 12px;
        }

        .standard-gate-subcard {
            grid-column: span 4;
            padding: 10px;
            border: 1px solid #cbd5e1;
            border-radius: 7px;
            background: #fbfcfe;
        }

        .standard-gate-subcard.span-8 {
            grid-column: span 8;
        }

        .standard-gate-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }

        .standard-gate-actions .btn {
            min-width: 120px;
            border-radius: 6px;
            font-weight: 700;
        }

        .standard-gate-actions .btn-primary {
            border-color: #0b1547;
            background: #0b1547;
        }

        .standard-gate-two-col {
            display: grid;
            grid-template-columns: 0.82fr 1.18fr;
            gap: 12px;
            align-items: start;
        }

        @media (max-width: 900px) {
            .standard-gate-header {
                align-items: start;
                flex-direction: column;
            }

            .standard-gate-field,
            .standard-gate-field.span-2,
            .standard-gate-field.span-3,
            .standard-gate-field.span-6,
            .standard-gate-field.span-8 {
                grid-column: span 12;
            }

            .standard-gate-subcard,
            .standard-gate-subcard.span-8 {
                grid-column: span 12;
            }

            .standard-gate-options {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .standard-gate-two-col {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 560px) {
            .standard-gate-nav {
                padding: 14px 18px;
            }

            .standard-gate-wrap {
                width: min(100% - 20px, 1120px);
                margin-top: 18px;
            }

            .standard-gate-section {
                padding: 18px;
            }

            .standard-gate-options {
                grid-template-columns: 1fr;
            }

            .standard-gate-actions {
                flex-direction: column-reverse;
            }

            .standard-gate-actions .btn {
                width: 100%;
            }
        }
    </style>
</head>
<body class="metal-gate-standard-page">
    <nav class="standard-gate-nav" aria-label="Western Fence Supply">
        <a href="{{ route('quote.create') }}">
            <img class="standard-gate-logo" src="{{ asset('images/wfs-logo-wht.svg') }}" alt="Western Fence Supply">
        </a>
    </nav>

    <main class="standard-gate-wrap">
        <div class="standard-gate-header">
            <div>
                <h1 class="standard-gate-title">Metal Gate Form</h1>
                <p class="standard-gate-subtitle">Standard web form for collecting gate order and fabrication details.</p>
            </div>
            <a class="btn btn-outline-secondary" href="{{ route('metal-gate-form') }}">Paper Form View</a>
        </div>

        <form class="standard-gate-form" method="GET" action="#">
            <section class="standard-gate-section">
                <h2 class="standard-gate-section-title">Order and Customer Information</h2>
                <div class="standard-gate-grid">
                    <div class="standard-gate-field">
                        <label class="form-label" for="sale_order_no">Sale Order No.</label>
                        <input class="form-control" id="sale_order_no" type="text" name="sale_order_no">
                    </div>
                    <div class="standard-gate-field">
                        <label class="form-label" for="work_no">Work No.</label>
                        <input class="form-control" id="work_no" type="text" name="work_no">
                    </div>
                    <div class="standard-gate-field">
                        <label class="form-label" for="date">Date</label>
                        <input class="form-control" id="date" type="date" name="date" value="{{ now()->toDateString() }}">
                    </div>
                    <div class="standard-gate-field span-6 compact">
                        <label class="form-label" for="customer">Customer</label>
                        <input class="form-control" id="customer" type="text" name="customer">
                    </div>
                    <div class="standard-gate-field span-3 compact">
                        <label class="form-label" for="phone">Phone</label>
                        <input class="form-control" id="phone" type="tel" name="phone">
                    </div>
                    <div class="standard-gate-field span-3 compact">
                        <label class="form-label" for="po">PO</label>
                        <input class="form-control" id="po" type="text" name="po">
                    </div>
                    <div class="standard-gate-field span-4 compact">
                        <label class="form-label" for="email">Email</label>
                        <input class="form-control" id="email" type="email" name="email">
                    </div>
                    <div class="standard-gate-field span-8 compact">
                        <label class="form-label" for="address">Address</label>
                        <input class="form-control" id="address" type="text" name="address">
                    </div>
                    <div class="standard-gate-field span-4">
                        <label class="form-label" for="qty">Quantity</label>
                        <input class="form-control" id="qty" type="number" name="qty" min="1">
                    </div>
                    <div class="standard-gate-field span-8">
                        <label class="form-label" for="notes">Notes</label>
                        <textarea class="form-control" id="notes" name="notes"></textarea>
                    </div>
                </div>
            </section>

            <section class="standard-gate-section">
                <h2 class="standard-gate-section-title">Material Information</h2>
                <div class="standard-gate-subgrid">
                    <div class="standard-gate-subcard">
                        <fieldset>
                            <legend class="standard-gate-legend">Size</legend>
                            <div class="standard-gate-options">
                                <label class="standard-gate-option">
                                    <input type="radio" name="size" value="1x2">
                                    <span>1 x 2</span>
                                </label>
                                <label class="standard-gate-option">
                                    <input type="radio" name="size" value="2x2">
                                    <span>2 x 2</span>
                                </label>
                            </div>
                        </fieldset>
                    </div>
                    <div class="standard-gate-subcard span-8">
                        <fieldset>
                            <legend class="standard-gate-legend">Color</legend>
                            <div class="standard-gate-options">
                                <label class="standard-gate-option">
                                    <input type="radio" name="color" value="galv">
                                    <span>Galv</span>
                                </label>
                                <label class="standard-gate-option">
                                    <input type="radio" name="color" value="white">
                                    <span>White</span>
                                </label>
                                <label class="standard-gate-option">
                                    <input type="radio" name="color" value="bronze">
                                    <span>Bronze</span>
                                </label>
                                <label class="standard-gate-option">
                                    <input type="radio" name="color" value="black">
                                    <span>Black (1x2 only)</span>
                                </label>
                            </div>
                        </fieldset>
                    </div>
                    <div class="standard-gate-subcard">
                        <fieldset>
                            <legend class="standard-gate-legend">Options</legend>
                            <div class="standard-gate-options">
                                <label class="standard-gate-option">
                                    <input type="checkbox" name="lock_box" value="1">
                                    <span>Lock Box</span>
                                </label>
                                <label class="standard-gate-option">
                                    <input type="checkbox" name="t_hinge_8" value="1">
                                    <span>8&quot; T-Hinge</span>
                                </label>
                            </div>
                        </fieldset>
                    </div>
                    <div class="standard-gate-subcard span-8">
                        <fieldset>
                            <legend class="standard-gate-legend">Lock Box Type</legend>
                            <div class="standard-gate-options">
                                <label class="standard-gate-option">
                                    <input type="radio" name="lock_box_type" value="single">
                                    <span>Single</span>
                                </label>
                                <label class="standard-gate-option">
                                    <input type="radio" name="lock_box_type" value="double">
                                    <span>Double</span>
                                </label>
                            </div>
                        </fieldset>
                    </div>
                </div>
            </section>

            <div class="standard-gate-two-col">
                <section class="standard-gate-section">
                    <h2 class="standard-gate-section-title">Angle Details</h2>
                    <div class="standard-gate-grid">
                        <div class="standard-gate-field span-12">
                            <fieldset>
                                <legend class="standard-gate-legend">Outside View</legend>
                                <div class="standard-gate-options">
                                    <label class="standard-gate-option">
                                        <input type="radio" name="angle_view" value="ll_hr">
                                        <span>LL/HR - Low Left/High Right</span>
                                    </label>
                                    <label class="standard-gate-option">
                                        <input type="radio" name="angle_view" value="hl_lr">
                                        <span>HL/LR - High Left/Low Right</span>
                                    </label>
                                </div>
                            </fieldset>
                        </div>
                        <div class="standard-gate-field span-6">
                            <label class="form-label" for="slope">Slope (in)</label>
                            <input class="form-control" id="slope" type="number" name="slope" step="0.01">
                        </div>
                    </div>
                </section>

                <section class="standard-gate-section">
                    <h2 class="standard-gate-section-title">Gate Layout and Dimensions</h2>
                    <div class="standard-gate-grid">
                        <div class="standard-gate-field span-12">
                            <fieldset>
                                <legend class="standard-gate-legend">Orientation</legend>
                                <div class="standard-gate-options">
                                    <label class="standard-gate-option">
                                        <input type="radio" name="orientation" value="vertical">
                                        <span>Vertical</span>
                                    </label>
                                    <label class="standard-gate-option">
                                        <input type="radio" name="orientation" value="horizontal">
                                        <span>Horizontal</span>
                                    </label>
                                </div>
                            </fieldset>
                        </div>

                        <div class="standard-gate-field span-4">
                            <label class="form-label" for="height_vertical">Vertical Height</label>
                            <select class="form-select" id="height_vertical" name="height_vertical">
                                <option value="">Select</option>
                                <option value="60">6 ft (60 in)</option>
                                <option value="48">5 ft (48 in)</option>
                                <option value="36">4 ft (36 in)</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                        <div class="standard-gate-field span-2">
                            <label class="form-label" for="height_vertical_custom">Custom</label>
                            <input class="form-control" id="height_vertical_custom" type="number" name="height_vertical_custom" aria-label="Custom vertical height">
                        </div>
                        <div class="standard-gate-field span-4">
                            <label class="form-label" for="height_horizontal">Horizontal Height</label>
                            <select class="form-select" id="height_horizontal" name="height_horizontal">
                                <option value="">Select</option>
                                <option value="70">6 ft (70 in)</option>
                                <option value="58">5 ft (58 in)</option>
                                <option value="46">4 ft (46 in)</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                        <div class="standard-gate-field span-2">
                            <label class="form-label" for="height_horizontal_custom">Custom</label>
                            <input class="form-control" id="height_horizontal_custom" type="number" name="height_horizontal_custom" aria-label="Custom horizontal height">
                        </div>

                        <div class="standard-gate-field span-4">
                            <label class="form-label" for="width">Width</label>
                            <select class="form-select" id="width" name="width">
                                <option value="">Select</option>
                                <option value="71">71 in</option>
                                <option value="59">59 in</option>
                                <option value="47">47 in</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                        <div class="standard-gate-field span-2">
                            <label class="form-label" for="width_custom">Custom</label>
                            <input class="form-control" id="width_custom" type="number" name="width_custom" aria-label="Custom width">
                        </div>
                    </div>
                </section>
            </div>

            <div class="standard-gate-actions">
                <button type="reset" class="btn btn-outline-secondary">Clear</button>
                <button type="button" class="btn btn-primary" onclick="window.print()">Print</button>
            </div>
        </form>
    </main>
</body>
</html>
