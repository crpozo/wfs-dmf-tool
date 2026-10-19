<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Quote Requests') }}
        </h2>
    </x-slot>

    <div class="py-4">
        <div class="container-fluid" style="margin-left:15px;">
            <div class="row">
                <div class="col-12">

                    <div class="card shadow-sm">
                        <div class="card-body">

                            <table id="qrTable"
                                   class="table table-striped table-hover align-middle w-100">
                                <thead class="table-light">
                                <tr>
                                    <th class="qr-revision-header" title="Sort by revision status">
                                        <span class="qr-revision-indicator is-neutral" aria-hidden="true"></span>
                                    </th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Ref/PO</th>
                                    <th>Quote</th>
                                    <th>Sketch</th>
                                    <th></th>
                                    <th>Created by</th>
                                    <th>Requested</th>
                                    <th id="sentSyncHeader" class="qr-sent-sync-header">
                                        <span>Sent</span>
                                        <span id="sentSyncSpinner" class="qr-sync-spinner d-none" aria-hidden="true"></span>
                                    </th>
                                </tr>
                                </thead>
                            </table>

                            <div class="mt-2 text-muted small">
                                <i class="bi bi-person-check-fill text-success" style="color:green;"></i>
                                Platform user
                                &nbsp;&nbsp;
                                <i class="bi bi-person text-secondary" style="color:orange;"></i>
                                Guest
                            </div>
                            <div id="sentSyncStatus" class="mt-2 small text-muted d-none"></div>

                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>

    <div id="quoteRequestModal" class="qr-modal" aria-hidden="true">
        <div class="qr-modal-backdrop" data-close-modal></div>
        <div class="qr-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="quoteRequestModalTitle">
            <div class="qr-modal-header">
                <h3 id="quoteRequestModalTitle">Quote Request</h3>
                <button type="button" class="qr-modal-close" aria-label="Close" data-close-modal>&times;</button>
            </div>
            <div class="qr-modal-body">
                <div id="quoteRequestDetails" class="qr-details"></div>
            </div>
        </div>
    </div>

    <div id="manualSentModal" class="qr-modal" aria-hidden="true">
        <div class="qr-modal-backdrop" data-close-manual-sent></div>
        <div class="qr-modal-dialog qr-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="manualSentModalTitle" aria-describedby="manualSentMessage">
            <div class="qr-modal-header">
                <h3 id="manualSentModalTitle">
                    <i class="bi bi-send-check" aria-hidden="true"></i>
                    Confirm manual send
                </h3>
                <button type="button" class="qr-modal-close" aria-label="Close" data-close-manual-sent>&times;</button>
            </div>
            <div class="qr-modal-body">
                <p id="manualSentMessage" class="qr-confirm-message"></p>
                <div id="manualSentError" class="alert alert-danger d-none mb-0" role="alert"></div>
            </div>
            <div class="qr-confirm-footer">
                <button type="button" class="btn btn-outline-secondary" data-close-manual-sent>Cancel</button>
                <button type="button" id="confirmManualSent" class="btn btn-primary">
                    <span class="qr-confirm-button-label">Confirm sent</span>
                    <span class="spinner-border spinner-border-sm ms-1 d-none" aria-hidden="true"></span>
                </button>
            </div>
        </div>
    </div>

    <style>
        #qrTable tbody tr {
            cursor: pointer;
        }

        #qrTable_wrapper .dataTables_length select {
            width: auto !important;
            min-width: 68px;
            padding-right: 30px !important;
            background-position: right 8px center !important;
        }

        #qrTable .qr-revision-header,
        #qrTable tbody td.qr-revision-cell {
            width: 32px;
            max-width: 32px;
            padding-left: 8px;
            padding-right: 8px;
            overflow: visible;
            text-align: center;
        }

        .qr-revision-indicator {
            position: relative;
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 1px solid rgba(15, 23, 42, 0.18);
            border-radius: 50%;
            vertical-align: middle;
        }

        .qr-revision-indicator.is-clear {
            background: #22c55e;
        }

        .qr-revision-indicator.is-neutral {
            background: transparent;
            border-color: #64748b;
            margin-right: 10px;
        }

        .qr-revision-indicator.has-revisions {
            background: #ef4444;
        }

        .qr-revision-tooltip {
            position: absolute;
            top: 50%;
            left: 20px;
            z-index: 1080;
            display: none;
            width: max-content;
            min-width: 180px;
            max-width: 340px;
            padding: 8px 10px;
            transform: translateY(-50%);
            border-radius: 6px;
            background: #111827;
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.28);
            color: #fff;
            font-size: 12px;
            font-weight: 400;
            line-height: 1.4;
            text-align: left;
            white-space: normal;
        }

        .qr-revision-tooltip-line + .qr-revision-tooltip-line {
            margin-top: 4px;
        }

        .qr-revision-indicator.has-revisions:hover .qr-revision-tooltip,
        .qr-revision-indicator.has-revisions:focus .qr-revision-tooltip {
            display: block;
        }

        #qrTable .qr-sent-sync-header {
            cursor: pointer;
            white-space: nowrap;
        }

        #qrTable .qr-mark-sent {
            white-space: nowrap;
        }

        .qr-sync-spinner {
            display: inline-block;
            width: 14px;
            height: 14px;
            margin-left: 6px;
            border: 2px solid #cbd5e1;
            border-top-color: #2563eb;
            border-radius: 9999px;
            vertical-align: -2px;
            animation: qr-sync-spin 0.8s linear infinite;
        }

        @keyframes qr-sync-spin {
            to {
                transform: rotate(360deg);
            }
        }

        #qrTable .qr-user-icons {
            display: inline-flex;
            align-items: center;
            justify-content: flex-start;
            gap: 5px;
            width: 75px;
            white-space: nowrap;
        }

        #qrTable .qr-location-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 25px;
            height: 18px;
            padding: 0 5px;
            border: 1px solid #64748b;
            border-radius: 9999px;
            color: #334155;
            font-size: 10px;
            font-weight: 700;
            line-height: 1;
        }

        #qrTable .qr-user-icon-slot,
        #qrTable .qr-delivery-icon-slot {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 25px;
            min-width: 25px;
        }

        #qrTable .qr-location-badge-fm {
            border-color: #2563eb;
            background: #dbeafe;
            color: #1d4ed8;
        }

        #qrTable .qr-location-badge-pc {
            border-color: #9333ea;
            background: #f3e8ff;
            color: #7e22ce;
        }

        #qrTable .qr-created-by-header {
            width: 90px;
            max-width: 90px;
            font-size: inherit;
            font-weight: inherit;
            white-space: normal;
        }

        #qrTable tbody td.qr-created-sent {
            width: 90px;
            max-width: 90px;
            font-size: 12px;
            white-space: normal;
            overflow-wrap: anywhere;
        }

        #qrTable .qr-sketch-header,
        #qrTable tbody td.qr-sketch-link {
            width: 52px;
            max-width: 52px;
            text-align: center;
        }

        #qrTable .qr-sketch-link a {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 30px;
            height: 30px;
            border-radius: 6px;
            color: #0b1547;
            text-decoration: none;
        }

        #qrTable .qr-sketch-link a:hover {
            background: #eef2ff;
            color: #0b1547;
        }

        .qr-modal {
            display: none;
            position: fixed;
            inset: 0;
            z-index: 2000;
        }

        .qr-modal.is-open {
            display: block;
        }

        .qr-modal-backdrop {
            position: absolute;
            inset: 0;
            background: rgba(17, 24, 39, 0.55);
        }

        .qr-modal-dialog {
            position: relative;
            width: min(920px, calc(100vw - 32px));
            max-height: calc(100vh - 48px);
            margin: 24px auto;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28);
            overflow: hidden;
        }

        .qr-modal-dialog.qr-confirm-dialog {
            width: min(480px, calc(100vw - 32px));
            margin-top: max(80px, 14vh);
        }

        .qr-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 16px 20px;
            border-bottom: 1px solid #e5e7eb;
        }

        .qr-modal-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }

        .qr-modal-close {
            border: 0;
            background: transparent;
            font-size: 28px;
            line-height: 1;
            color: #4b5563;
        }

        .qr-modal-body {
            max-height: calc(100vh - 130px);
            overflow: auto;
            padding: 20px;
        }

        .qr-confirm-message {
            margin: 0;
            color: #374151;
            font-size: 15px;
            line-height: 1.55;
        }

        .qr-confirm-footer {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            padding: 14px 20px;
            border-top: 1px solid #e5e7eb;
            background: #f9fafb;
        }

        .qr-details {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px 24px;
        }

        .qr-detail {
            min-width: 0;
        }

        .qr-detail.qr-detail-wide {
            grid-column: 1 / -1;
        }

        .qr-detail-label {
            margin-bottom: 4px;
            color: #6b7280;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .qr-detail-value {
            overflow-wrap: anywhere;
            color: #111827;
            font-size: 14px;
        }

        .qr-detail-value pre {
            max-height: 220px;
            margin: 0;
            padding: 12px;
            overflow: auto;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            color: #111827;
            font-size: 12px;
            white-space: pre-wrap;
        }

        @media (max-width: 768px) {
            .qr-details {
                grid-template-columns: 1fr;
            }
        }
    </style>

    {{-- Bootstrap Icons --}}
    <link rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">

    {{-- DataTables Bootstrap 5 --}}
    <link rel="stylesheet"
          href="https://cdn.datatables.net/1.13.8/css/dataTables.bootstrap5.min.css">

    {{-- jQuery (REQUIRED for DataTables) --}}
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"
            integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo="
            crossorigin="anonymous"></script>

    <script src="https://cdn.datatables.net/1.13.8/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.13.8/js/dataTables.bootstrap5.min.js"></script>

    <script>
        document.addEventListener('DOMContentLoaded', function () {
            $('#qrTable').DataTable({
                processing: true,
                serverSide: true,
                ajax: "{{ route('quote_requests.data') }}",
                order: [[9, 'desc']], // Requested
                columns: [
                    {
                        data: 'code_id',
                        className: 'qr-revision-cell',
                        width: '32px',
                        searchable: false,
                        orderable: true,
                        render: function (data, type, row) {
                            if (type !== 'display') return data === null ? '' : data;

                            if (data !== null && Number(data) === 0) {
                                return '<span class="qr-revision-indicator is-clear" title="No revision required" aria-label="No revision required"></span>';
                            }

                            var descriptions = Array.isArray(row.revision_descriptions)
                                ? row.revision_descriptions
                                : [];
                            var tooltipLines = descriptions.length
                                ? descriptions.map(function (description) {
                                    return '<div class="qr-revision-tooltip-line">' + escapeHtml(description) + '</div>';
                                }).join('')
                                : '<div class="qr-revision-tooltip-line">Revision code: ' + escapeHtml(data === null ? 'not calculated' : data) + '</div>';
                            var accessibleText = descriptions.length
                                ? descriptions.join('. ')
                                : 'Revision code ' + (data === null ? 'not calculated' : data);

                            return '<span class="qr-revision-indicator has-revisions" tabindex="0" aria-label="' + escapeAttribute(accessibleText) + '">' +
                                '<span class="qr-revision-tooltip" role="tooltip">' + tooltipLines + '</span>' +
                                '</span>';
                        }
                    },
                    { data: 'name' },
                    { data: 'email' },
                    { data: 'phone' },
                    { data: 'ref' },
                    {
                        data: 'odoo_quote',
                        render: function (data, type, row) {
                            if (type !== 'display') return data || '';
                            if (!data || !row.quote_url) return '';
                            return '<a href="' + escapeAttribute(row.quote_url) + '" target="_blank" rel="noopener">' + escapeHtml(data) + '</a>';
                        }
                    },
                    {
                        data: 'sketch_url',
                        className: 'qr-sketch-link',
                        width: '50px',
                        searchable: false,
                        orderable: false,
                        render: function (data, type) {
                            if (type !== 'display' || !data) return '';
                            return '<a href="' + escapeAttribute(data) + '" target="_blank" title="Open sketch" aria-label="Open sketch">' +
                                '<i class="bi bi-pencil-square"></i>' +
                                '</a>';
                        }
                    },
                    {
                        data: 'platform_user',
                        className: 'text-center',
                        searchable: false,
                        orderable: false,
                        width: '100px'
                    },
                    {
                        data: 'created_by',
                        className: 'qr-created-sent',
                        width: '100px'
                    },
                    {
                        data: 'created_at',
                        className: 'qr-created-sent',
                        width: '90px',
                        render: function (data, type, row) {
                            // For sorting/filtering use raw ISO string; for display use formatted
                            if (type === 'sort' || type === 'type') return row.created_at_raw || '';
                            return data || '';
                        }
                    },
                    {
                        data: 'sent_at',
                        className: 'qr-created-sent',
                        width: '100px',
                        render: function (data, type, row) {
                            if (type === 'sort' || type === 'type') return row.sent_at_raw || '';
                            if (data) {
                                var manualIcon = row.sent_manually
                                    ? ' <i class="bi bi-send-check" title="' + escapeAttribute(row.sent_by || 'Sent manually') + '" aria-label="Sent manually by ' + escapeAttribute(row.sent_by || 'unknown user') + '"></i>'
                                    : '';

                                return escapeHtml(data) + manualIcon;
                            }

                            return '<button type="button" class="btn btn-sm btn-outline-primary qr-mark-sent">Mark as Sent</button>';
                        }
                    },
                ]
            });

            var table = $('#qrTable').DataTable();
            var sentSyncRunning = false;
            var pendingManualSent = null;
            var manualSentSubmitting = false;

            $('#qrTable tbody').on('click', '.qr-mark-sent', function (event) {
                event.preventDefault();
                event.stopPropagation();

                var button = this;
                var row = table.row($(button).closest('tr')).data();
                if (!row || !row.manual_sent_url) return;

                var quoteLabel = row.odoo_quote || row.odoo_id || ('#' + row.id);
                pendingManualSent = {
                    button: button,
                    row: row
                };

                $('#manualSentMessage').text('Confirm that the quote ' + quoteLabel + ' was sent manually.');
                $('#manualSentError').addClass('d-none').text('');
                $('#manualSentModal').addClass('is-open').attr('aria-hidden', 'false');
                window.setTimeout(function () {
                    $('#confirmManualSent').trigger('focus');
                }, 0);
            });

            $('[data-close-manual-sent]').on('click', function () {
                closeManualSentModal();
            });

            $('#confirmManualSent').on('click', function () {
                if (!pendingManualSent || manualSentSubmitting) return;

                var button = pendingManualSent.button;
                var row = pendingManualSent.row;
                var confirmButton = this;

                manualSentSubmitting = true;
                button.disabled = true;
                confirmButton.disabled = true;
                $('[data-close-manual-sent]').prop('disabled', true);
                $(confirmButton).find('.spinner-border').removeClass('d-none');
                $('#manualSentError').addClass('d-none').text('');

                fetch(row.manual_sent_url, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': "{{ csrf_token() }}"
                    }
                })
                    .then(function (response) {
                        return response.json().then(function (data) {
                            if (!response.ok) {
                                throw new Error(data.message || 'Unable to mark the quote as sent.');
                            }

                            return data;
                        });
                    })
                    .then(function () {
                        closeManualSentModal(true);
                        table.ajax.reload(null, false);
                    })
                    .catch(function (error) {
                        $('#manualSentError')
                            .removeClass('d-none')
                            .text(error.message || 'Unable to mark the quote as sent.');
                        button.disabled = false;
                    })
                    .finally(function () {
                        manualSentSubmitting = false;
                        confirmButton.disabled = false;
                        $('[data-close-manual-sent]').prop('disabled', false);
                        $(confirmButton).find('.spinner-border').addClass('d-none');
                    });
            });

            $('#sentSyncHeader').on('dblclick', function (event) {
                event.preventDefault();
                event.stopPropagation();

                if (sentSyncRunning) {
                    return;
                }

                sentSyncRunning = true;
                $('#sentSyncSpinner').removeClass('d-none');
                $('#sentSyncStatus')
                    .removeClass('d-none text-danger text-success')
                    .addClass('text-muted')
                    .text('Checking Odoo for sent quotations...');

                fetch("{{ route('quote_requests.sync_all_odoo_sent_at') }}", {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                })
                    .then(function (response) {
                        return response.json().then(function (data) {
                            if (!response.ok) {
                                throw new Error(data.message || 'Unable to sync sent timestamps.');
                            }

                            return data;
                        });
                    })
                    .then(function (data) {
                        $('#sentSyncStatus')
                            .removeClass('text-muted text-danger')
                            .addClass('text-success')
                            .text('Odoo sync complete. Updated ' + (data.updated || 0) + ' quote request(s).');

                        table.ajax.reload(null, false);
                    })
                    .catch(function (error) {
                        $('#sentSyncStatus')
                            .removeClass('text-muted text-success')
                            .addClass('text-danger')
                            .text(error.message || 'Unable to sync sent timestamps.');
                    })
                    .finally(function () {
                        sentSyncRunning = false;
                        $('#sentSyncSpinner').addClass('d-none');
                    });
            });

            $('#qrTable tbody').on('dblclick', 'tr', function () {
                var row = table.row(this).data();
                if (!row) return;

                showQuoteRequestModal(row);
            });

            $('[data-close-modal]').on('click', closeQuoteRequestModal);

            $(document).on('keydown', function (event) {
                if (event.key === 'Escape') {
                    closeManualSentModal();
                    closeQuoteRequestModal();
                }
            });

            function closeManualSentModal(force) {
                if (manualSentSubmitting && !force) return;

                var triggerButton = pendingManualSent ? pendingManualSent.button : null;
                $('#manualSentModal').removeClass('is-open').attr('aria-hidden', 'true');
                $('#manualSentError').addClass('d-none').text('');
                pendingManualSent = null;

                if (triggerButton && document.body.contains(triggerButton)) {
                    triggerButton.focus();
                }
            }

            function showQuoteRequestModal(row) {
                $('#quoteRequestModalTitle').text('Quote Request #' + (row.id || ''));
                $('#quoteRequestDetails').html(buildDetails(row));
                $('#quoteRequestModal').addClass('is-open').attr('aria-hidden', 'false');
            }

            function closeQuoteRequestModal() {
                $('#quoteRequestModal').removeClass('is-open').attr('aria-hidden', 'true');
            }

            function buildDetails(row) {
                var quote = row.odoo_id && row.quote_url
                    ? '<a href="' + escapeAttribute(row.quote_url) + '" target="_blank" rel="noopener">' + escapeHtml(row.odoo_id) + '</a>'
                    : '';

                var details = [
                    ['ID', row.id],
                    ['Quote', quote, true],
                    ['Name', row.name],
                    ['Email', row.email],
                    ['Phone', row.phone],
                    ['Ref/PO', row.ref],
                    ['Fulfillment', row.fulfillment_label],
                    ['Company', row.pickup_location_label],
                    ['ZIP', row.zip_code],
                    ['Property', row.property_type],
                    ['Project', row.project_type],
                    ['Timeline', row.timeline],
                    ['Reason', row.primary_reason, false, true],
                    ['Heard About Us', row.hear_about_us],
                    ['User', row.platform_user_label],
                    ['Created by', row.created_by],
                    ['Requested', row.created_at],
                    ['Sent', row.sent_at]
                ];

                return details.map(function (item) {
                    var label = item[0];
                    var value = item[1];
                    var isHtml = item[2] || false;
                    var wide = item[3] || false;
                    var displayValue = isHtml ? (value || '') : escapeHtml(value || '');

                    return '<div class="qr-detail' + (wide ? ' qr-detail-wide' : '') + '">' +
                        '<div class="qr-detail-label">' + escapeHtml(label) + '</div>' +
                        '<div class="qr-detail-value">' + displayValue + '</div>' +
                        '</div>';
                }).join('');
            }

            function formatJson(value) {
                if (!value || (Array.isArray(value) && value.length === 0)) return '';
                var json = JSON.stringify(value, null, 2);
                return json && json !== '{}' ? '<pre>' + escapeHtml(json) + '</pre>' : '';
            }

            function escapeHtml(value) {
                return String(value)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
            }

            function escapeAttribute(value) {
                return escapeHtml(value);
            }
        });
    </script>
</x-app-layout>
