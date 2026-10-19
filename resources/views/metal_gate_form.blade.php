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
        :root {
            --gate-blue: #101b63;
            --gate-line: #c9c9c9;
            --gate-fill: #f3f3f3;
            --gate-header: #c8c8c8;
        }

        body.metal-gate-page {
            min-height: 100vh;
            margin: 0;
            background: #eef2f7;
            color: #000000;
            font-family: "Open Sans", Arial, sans-serif;
        }

        .gate-form-shell {
            max-width: 980px;
            margin: 24px auto;
            padding: 26px 24px 32px;
            background: #ffffff;
            box-shadow: 0 16px 38px rgba(15, 23, 42, 0.14);
        }

        .gate-form {
            display: grid;
            gap: 14px;
        }

        .gate-form-top {
            display: grid;
            grid-template-columns: 240px 1fr 280px;
            align-items: start;
            gap: 24px;
        }

        .gate-logo {
            width: 220px;
            max-width: 100%;
        }

        .gate-title {
            margin: -6px 0 0;
            text-align: center;
            font-size: 25px;
            font-weight: 700;
        }

        .gate-field-inline {
            display: flex;
            align-items: center;
            gap: 8px;
            min-height: 42px;
            padding: 8px;
            border: 2px solid var(--gate-blue);
            border-radius: 8px;
            font-weight: 700;
        }

        .gate-stack {
            border: 2px solid var(--gate-blue);
            border-radius: 8px;
            overflow: hidden;
        }

        .gate-stack .gate-field-inline {
            border: 0;
            border-radius: 0;
        }

        .gate-stack .gate-field-inline + .gate-field-inline {
            border-top: 1px solid var(--gate-blue);
        }

        .gate-input,
        .gate-textarea {
            width: 100%;
            min-width: 0;
            border: 0;
            background: var(--gate-fill);
            font: inherit;
            font-weight: 400;
            outline: 1px solid transparent;
        }

        .gate-input {
            height: 26px;
            padding: 2px 8px;
        }

        .gate-textarea {
            min-height: 74px;
            padding: 8px;
            resize: vertical;
        }

        .gate-input:focus,
        .gate-textarea:focus {
            outline-color: #8ba0ff;
        }

        .gate-grid-two {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
        }

        .gate-contact-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            padding: 8px;
            border-top: 1px solid var(--gate-blue);
        }

        .gate-contact-field {
            display: flex;
            align-items: center;
            gap: 7px;
        }

        .gate-contact-field + .gate-contact-field {
            padding-left: 8px;
            border-left: 1px solid var(--gate-blue);
        }

        .gate-contact-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #000000;
            color: #ffffff;
            font-size: 13px;
            font-weight: 700;
            line-height: 1;
        }

        .gate-main-grid {
            display: grid;
            grid-template-columns: 1fr 280px;
            gap: 14px 80px;
            align-items: start;
        }

        .gate-panel {
            border: 2px solid var(--gate-blue);
            border-radius: 7px;
            overflow: hidden;
            background: #ffffff;
        }

        .gate-panel-title {
            min-height: 22px;
            padding: 2px 10px;
            background: var(--gate-header);
            border-bottom: 1px solid var(--gate-blue);
            text-align: center;
            font-weight: 700;
            line-height: 1.15;
        }

        .gate-panel-body {
            padding: 10px;
        }

        .gate-options-row {
            display: flex;
            align-items: center;
            gap: 36px;
            min-height: 42px;
            padding: 8px 14px;
            border: 2px solid var(--gate-blue);
            border-radius: 8px;
        }

        .gate-check,
        .gate-radio {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            margin: 0;
            font-weight: 400;
        }

        .gate-check input,
        .gate-radio input,
        .gate-custom-size input[type="radio"] {
            position: static;
            width: 16px;
            height: 16px;
            opacity: 1;
            margin: 0;
        }

        .gate-material-grid {
            display: grid;
            grid-template-columns: 92px 170px 1fr;
        }

        .gate-material-col {
            padding: 12px 14px;
        }

        .gate-material-col + .gate-material-col {
            border-left: 1px solid var(--gate-blue);
        }

        .gate-subtitle {
            margin-bottom: 16px;
            font-weight: 700;
        }

        .gate-option-stack {
            display: grid;
            gap: 12px;
        }

        .gate-lock-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
            align-items: end;
            margin-top: 12px;
        }

        .gate-lock-box {
            display: grid;
            gap: 8px;
            justify-items: center;
        }

        .gate-lock-plate {
            position: relative;
            width: 76px;
            height: 52px;
            border: 1px solid #c5c8d0;
            background: linear-gradient(135deg, #d7d9df, #f7f7f7 48%, #aeb2bf);
            box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.18);
        }

        .gate-lock-plate::before {
            content: "";
            position: absolute;
            left: 18px;
            top: 12px;
            width: 28px;
            height: 28px;
            border: 2px solid #8c8f96;
            border-radius: 50%;
            background: #ffffff;
        }

        .gate-lock-plate.double::after {
            content: "";
            position: absolute;
            left: 18px;
            bottom: 8px;
            width: 20px;
            height: 20px;
            border: 2px solid #8c8f96;
            border-radius: 50%;
            background: #ffffff;
        }

        .gate-lock-plate.double::before {
            top: 7px;
            width: 20px;
            height: 20px;
        }

        .gate-angle-options {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            text-align: center;
        }

        .gate-angle-small {
            display: block;
            margin-top: 2px;
            font-size: 10px;
            font-weight: 700;
        }

        .gate-angle-diagrams {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
            justify-items: center;
            margin: 8px 0 12px;
        }

        .mini-gate {
            position: relative;
            width: 54px;
            height: 82px;
            border: 1px solid var(--gate-line);
            transform: skewY(-5deg);
        }

        .mini-gate.right {
            transform: skewY(5deg);
        }

        .mini-gate::before,
        .mini-gate::after {
            content: "";
            position: absolute;
            left: 5px;
            right: 5px;
            height: 1px;
            background: var(--gate-line);
        }

        .mini-gate::before {
            top: 28px;
        }

        .mini-gate::after {
            bottom: 28px;
        }

        .gate-slope {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-weight: 700;
        }

        .gate-slope .gate-input {
            max-width: 88px;
        }

        .gate-orientation {
            display: grid;
            grid-template-columns: 130px 130px;
            gap: 22px;
            align-items: start;
            padding-left: 20px;
        }

        .gate-orientation-card {
            display: grid;
            gap: 6px;
            justify-items: center;
        }

        .gate-sketch {
            position: relative;
            width: 98px;
            height: 150px;
            border: 1px solid #9d9d9d;
            background:
                linear-gradient(#9d9d9d, #9d9d9d) center 48% / 100% 1px no-repeat,
                linear-gradient(#9d9d9d, #9d9d9d) center 52% / 100% 1px no-repeat,
                #ffffff;
        }

        .gate-sketch.horizontal {
            width: 122px;
            background:
                linear-gradient(#9d9d9d, #9d9d9d) 50% 0 / 1px 100% no-repeat,
                linear-gradient(#9d9d9d, #9d9d9d) 54% 0 / 1px 100% no-repeat,
                #ffffff;
        }

        .gate-sketch::before {
            content: "";
            position: absolute;
            inset: 4px;
            border: 1px solid #d0d0d0;
        }

        .gate-dimensions .gate-panel-body {
            padding: 0;
        }

        .gate-dimension-row {
            display: grid;
            grid-template-columns: 76px repeat(4, 1fr);
            align-items: center;
            gap: 10px;
            min-height: 58px;
            padding: 10px 12px;
        }

        .gate-dimension-row + .gate-dimension-row {
            border-top: 1px solid var(--gate-blue);
        }

        .gate-dimension-label {
            font-weight: 700;
        }

        .gate-dimension-label small {
            display: block;
            margin-top: 3px;
            font-size: 10px;
            font-weight: 400;
        }

        .gate-custom-size {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .gate-custom-size .gate-input {
            max-width: 88px;
        }

        .gate-hinge {
            display: grid;
            gap: 12px;
            align-items: start;
            justify-items: start;
            padding-left: 8px;
        }

        .gate-hinge img {
            width: 130px;
            max-width: 100%;
            opacity: 0.82;
        }

        .gate-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 8px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
        }

        .gate-actions .btn {
            min-width: 110px;
            border-radius: 6px;
            font-weight: 700;
        }

        @media (max-width: 860px) {
            .gate-form-shell {
                margin: 0;
                padding: 18px 14px;
            }

            .gate-form-top,
            .gate-grid-two,
            .gate-main-grid {
                grid-template-columns: 1fr;
            }

            .gate-title {
                margin: 0;
                text-align: left;
            }

            .gate-material-grid,
            .gate-dimension-row {
                grid-template-columns: 1fr;
            }

            .gate-material-col + .gate-material-col {
                border-left: 0;
                border-top: 1px solid var(--gate-blue);
            }

            .gate-contact-row,
            .gate-lock-grid,
            .gate-orientation {
                grid-template-columns: 1fr;
            }

            .gate-contact-field + .gate-contact-field {
                padding-left: 0;
                border-left: 0;
            }
        }

        @media print {
            body.metal-gate-page {
                background: #ffffff;
            }

            .gate-form-shell {
                margin: 0;
                box-shadow: none;
            }

            .gate-actions {
                display: none;
            }
        }
    </style>
</head>
<body class="metal-gate-page">
    <main class="gate-form-shell">
        <form class="gate-form" method="GET" action="#">
            <div class="gate-form-top">
                <div>
                    <img class="gate-logo" src="{{ asset('images/wfs-logo-clr.png') }}" alt="Western Fence Supply">
                </div>

                <label class="gate-field-inline">
                    <span>Sale Order No:</span>
                    <input class="gate-input" type="text" name="sale_order_no">
                </label>

                <div class="gate-stack">
                    <label class="gate-field-inline">
                        <span>Work No:</span>
                        <input class="gate-input" type="text" name="work_no">
                    </label>
                    <label class="gate-field-inline">
                        <span>Date:</span>
                        <input class="gate-input" type="date" name="date">
                    </label>
                </div>
            </div>

            <h1 class="gate-title">Metal Gate Form</h1>

            <div class="gate-grid-two">
                <section class="gate-panel" aria-label="Customer information">
                    <label class="gate-field-inline">
                        <span>Customer:</span>
                        <input class="gate-input" type="text" name="customer">
                    </label>
                    <label class="gate-field-inline">
                        <span>Address:</span>
                        <input class="gate-input" type="text" name="address">
                    </label>
                    <div class="gate-contact-row">
                        <label class="gate-contact-field">
                            <span class="gate-contact-icon" aria-hidden="true">P</span>
                            <input class="gate-input" type="tel" name="phone" aria-label="Phone">
                        </label>
                        <label class="gate-contact-field">
                            <span class="gate-contact-icon" aria-hidden="true">@</span>
                            <input class="gate-input" type="email" name="email" aria-label="Email">
                        </label>
                    </div>
                </section>

                <section class="gate-panel" aria-label="Purchase order and notes">
                    <label class="gate-field-inline">
                        <span>PO:</span>
                        <input class="gate-input" type="text" name="po">
                    </label>
                    <label class="gate-field-inline d-block">
                        <span class="d-block mb-1">Notes:</span>
                        <textarea class="gate-textarea" name="notes"></textarea>
                    </label>
                </section>
            </div>

            <div class="gate-main-grid">
                <label class="gate-field-inline" style="max-width: 185px;">
                    <span>Qty:</span>
                    <input class="gate-input" type="number" name="qty" min="1">
                </label>

                <div class="gate-options-row">
                    <label class="gate-radio">
                        <input type="radio" name="profile_type" value="flat">
                        <span>Flat</span>
                    </label>
                    <label class="gate-radio">
                        <input type="radio" name="profile_type" value="angle">
                        <span>Angle</span>
                    </label>
                </div>

                <section class="gate-panel">
                    <div class="gate-panel-title">Material Info</div>
                    <div class="gate-material-grid">
                        <div class="gate-material-col">
                            <div class="gate-subtitle">Size</div>
                            <div class="gate-option-stack">
                                <label class="gate-radio">
                                    <input type="radio" name="size" value="1x2">
                                    <span>1 x 2</span>
                                </label>
                                <label class="gate-radio">
                                    <input type="radio" name="size" value="2x2">
                                    <span>2 x 2</span>
                                </label>
                            </div>
                        </div>

                        <div class="gate-material-col">
                            <div class="gate-subtitle">Color</div>
                            <div class="gate-option-stack">
                                <label class="gate-radio">
                                    <input type="radio" name="color" value="galv">
                                    <span>Galv</span>
                                </label>
                                <label class="gate-radio">
                                    <input type="radio" name="color" value="white">
                                    <span>White</span>
                                </label>
                                <label class="gate-radio">
                                    <input type="radio" name="color" value="bronze">
                                    <span>Bronze</span>
                                </label>
                                <label class="gate-radio">
                                    <input type="radio" name="color" value="black">
                                    <span>Black (1x2 only)</span>
                                </label>
                            </div>
                        </div>

                        <div class="gate-material-col">
                            <label class="gate-check justify-content-center">
                                <input type="checkbox" name="lock_box" value="1">
                                <span>Lock Box</span>
                            </label>

                            <div class="gate-lock-grid">
                                <label class="gate-lock-box">
                                    <span class="gate-radio">
                                        <input type="radio" name="lock_box_type" value="single">
                                        <span>Single</span>
                                    </span>
                                    <span class="gate-lock-plate" aria-hidden="true"></span>
                                </label>
                                <label class="gate-lock-box">
                                    <span class="gate-radio">
                                        <input type="radio" name="lock_box_type" value="double">
                                        <span>Double</span>
                                    </span>
                                    <span class="gate-lock-plate double" aria-hidden="true"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="gate-panel">
                    <div class="gate-panel-title">Angle Outside View</div>
                    <div class="gate-panel-body">
                        <div class="gate-angle-options">
                            <label class="gate-radio justify-content-center">
                                <input type="radio" name="angle_view" value="ll_hr">
                                <span>LL/HR <small class="gate-angle-small">Low Left/High Right</small></span>
                            </label>
                            <label class="gate-radio justify-content-center">
                                <input type="radio" name="angle_view" value="hl_lr">
                                <span>HL/LR <small class="gate-angle-small">High Left/Low Right</small></span>
                            </label>
                        </div>

                        <div class="gate-angle-diagrams" aria-hidden="true">
                            <span class="mini-gate"></span>
                            <span class="mini-gate right"></span>
                        </div>

                        <label class="gate-slope">
                            <span>Slope</span>
                            <input class="gate-input" type="number" name="slope" step="0.01">
                            <span>in</span>
                        </label>
                    </div>
                </section>

                <section>
                    <div class="gate-orientation">
                        <label class="gate-orientation-card">
                            <span class="gate-radio">
                                <input type="radio" name="orientation" value="vertical">
                                <span>Vertical</span>
                            </span>
                            <span class="gate-sketch" aria-hidden="true"></span>
                        </label>

                        <label class="gate-orientation-card">
                            <span class="gate-radio">
                                <input type="radio" name="orientation" value="horizontal">
                                <span>Horizontal</span>
                            </span>
                            <span class="gate-sketch horizontal" aria-hidden="true"></span>
                        </label>
                    </div>
                </section>

                <section class="gate-panel gate-dimensions">
                    <div class="gate-panel-title">Vertical</div>
                    <div class="gate-panel-body">
                        <div class="gate-dimension-row">
                            <div class="gate-dimension-label">Height <small>Vertical</small></div>
                            <label class="gate-radio"><input type="radio" name="height_vertical" value="60"><span>6 ft<br>(60 in)</span></label>
                            <label class="gate-radio"><input type="radio" name="height_vertical" value="48"><span>5 ft<br>(48 in)</span></label>
                            <label class="gate-radio"><input type="radio" name="height_vertical" value="36"><span>4 ft<br>(36 in)</span></label>
                            <label class="gate-custom-size"><input type="radio" name="height_vertical" value="custom"><input class="gate-input" type="number" name="height_vertical_custom" aria-label="Custom vertical height"></label>
                        </div>

                        <div class="gate-dimension-row">
                            <div class="gate-dimension-label">Height <small>Horizontal</small></div>
                            <label class="gate-radio"><input type="radio" name="height_horizontal" value="70"><span>6 ft<br>(70 in)</span></label>
                            <label class="gate-radio"><input type="radio" name="height_horizontal" value="58"><span>5 ft<br>(58 in)</span></label>
                            <label class="gate-radio"><input type="radio" name="height_horizontal" value="46"><span>4 ft<br>(46 in)</span></label>
                            <label class="gate-custom-size"><input type="radio" name="height_horizontal" value="custom"><input class="gate-input" type="number" name="height_horizontal_custom" aria-label="Custom horizontal height"></label>
                        </div>

                        <div class="gate-dimension-row">
                            <div class="gate-dimension-label">Width</div>
                            <label class="gate-radio"><input type="radio" name="width" value="71"><span>71 in</span></label>
                            <label class="gate-radio"><input type="radio" name="width" value="59"><span>59 in</span></label>
                            <label class="gate-radio"><input type="radio" name="width" value="47"><span>47 in</span></label>
                            <label class="gate-custom-size"><input type="radio" name="width" value="custom"><input class="gate-input" type="number" name="width_custom" aria-label="Custom width"></label>
                        </div>
                    </div>
                </section>

                <section class="gate-hinge">
                    <label class="gate-check">
                        <input type="checkbox" name="t_hinge_8" value="1">
                        <span>8&quot; T-Hinge</span>
                    </label>
                    <img src="{{ asset('images/male-hinge.jpg') }}" alt="T-hinge reference">
                </section>
            </div>

            <div class="gate-actions">
                <button type="reset" class="btn btn-outline-secondary">Clear</button>
                <button type="button" class="btn btn-primary" onclick="window.print()">Print</button>
            </div>
        </form>
    </main>
</body>
</html>
