{{-- resources/views/admin/users/index.blade.php --}}
<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            Users
        </h2>
    </x-slot>

    <div class="py-1">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg p-4">

                {{-- Top bar --}}

                <div class="flex items-center justify-between mb-4">
                    <div>
                        <div class="text-lg font-semibold text-gray-800">Users</div>
                        <div class="text-sm text-gray-500">Create and edit users (admin only).</div>
                    </div>

                    <button type="button" id="btnNewUser"
                            class="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white wfs-blue uppercase tracking-widest hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition">
                        New user
                    </button>
                </div>


                {{-- Page messages --}}
                <div id="pageOk" class="hidden mb-3 rounded-md bg-green-50 p-3 text-sm text-green-800"></div>
                <div id="pageErr" class="hidden mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800"></div>

                {{-- Table --}}
                <div class="overflow-x-auto">
                    <table id="usersTable" class="min-w-full w-full text-sm">
                        <thead class="bg-gray-50 text-gray-600">
                        <tr>
                            <th class="px-3 py-2 text-left">Id</th>
                            <th class="px-3 py-2 text-left">Name</th>
                            <th class="px-3 py-2 text-left">Email</th>
                            <th class="px-3 py-2 text-left">Account</th>
                            <th class="px-3 py-2 text-left">Role</th>
                            <th class="px-3 py-2 text-left">Odoo</th>
                            <th class="px-3 py-2 text-left">Active</th>
                            <!-- <th class="px-3 py-2 text-left">Created</th> -->
                            <th class="px-3 py-2 text-left" style="width:140px;">Actions</th>
                        </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100"></tbody>
                    </table>
                </div>

                <div id="modalBackdrop"
                     class="backdrop fixed inset-0 bg-gray-900 bg-opacity-50 hidden z-40">
                </div>
                {{-- Modal (single for create + edit) --}}
                <div id="userModal"
                     class="fixed inset-0 z-50 hidden modal-dialog-centered modal-centered"
                     aria-labelledby="userModalTitle"
                     role="dialog"
                     aria-modal="true">

                    {{-- Backdrop --}}
                    <div class="absolute inset-0 bg-gray-900/50"></div>

                    {{-- Panel --}}
                    <div class="relative mx-auto mt-10 w-full max-w-3xl px-4">
                        <div class="rounded-lg bg-white shadow-lg overflow-hidden">
                            <div class="flex items-center justify-between px-5 py-4 border-b">
                                <div class="text-lg font-semibold text-gray-800" id="userModalTitle">New user</div>
                                <button type="button" id="btnCloseModal"
                                        class="rounded-md p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none"
                                         viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                              d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div class="px-5 py-4">
                                {{-- temp password box (create only) --}}
                                <div id="tempPasswordBox"
                                     class="hidden mb-3 rounded-md bg-blue-50 p-3 text-sm text-blue-900">
                                    Temporary password:
                                    <span class="font-bold" id="tempPasswordText"></span>
                                </div>

                                <div id="modalErr"
                                     class="hidden mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800"></div>

                                <form id="userForm" class="space-y-4">
                                    @csrf
                                    <input type="hidden" id="user_id" value="">

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                            <input id="name" type="text" required
                                                   class="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500">
                                        </div>

                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input id="email" type="email" required
                                                   class="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500">
                                        </div>

                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Account type</label>
                                            <select id="account_type" required
                                                    class="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500">
                                                <option value="customer">customer</option>
                                                <option value="company">company</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Company role</label>
                                            <select id="company_role"
                                                    class="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                                                    disabled>
                                                <option value="staff" selected>staff</option>
                                                <option value="admin">admin</option>
                                            </select>
                                            <div class="mt-1 text-xs text-gray-500">Enabled only if account_type=company</div>
                                        </div>

                                        <div class="md:col-span-2">
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Odoo</label>
                                            <input id="extrafield" type="text"
                                                   class="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500">
                                        </div>

                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                            <select id="active" required
                                                    class="w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500">
                                                <option value="1">active</option>
                                                <option value="0">inactive</option>
                                            </select>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div class="flex items-center justify-end gap-2 px-5 py-4 border-t bg-gray-50">
                                <button type="button" id="btnCancelModal"
                                        class="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest hover:bg-gray-50">
                                    Cancel
                                </button>

                                <button type="button" id="btnSaveUser"
                                        class="inline-flex items-center px-4 py-2 wfs-blue bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition">
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                {{-- /Modal --}}
            </div>
        </div>
    </div>

    {{-- IMPORTANT: your layout must include @stack('scripts') before </body> --}}
    @push('scripts')
        <script>
            // ===== Helpers =====
            function el(id) { return document.getElementById(id); }

            function showBlock(id, msg) {
                const e = el(id);
                e.textContent = msg || '';
                e.classList.remove('hidden');
            }
            function hideBlock(id) {
                const e = el(id);
                e.textContent = '';
                e.classList.add('hidden');
            }

            function openModal() {
                el('modalBackdrop').classList.remove('hidden');
                el('userModal').classList.remove('hidden');
                document.body.classList.add('overflow-hidden');
            }
            function closeModal() {
                el('modalBackdrop').classList.add('hidden');
                el('userModal').classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
            }

            function syncRoleField() {
                const account = el('account_type').value;
                const roleSel = el('company_role');

                if (account === 'company') {
                    roleSel.disabled = false;
                    if (!roleSel.value) roleSel.value = 'staff';
                } else {
                    roleSel.value = 'staff'; // backend will null it anyway
                    roleSel.disabled = true;
                }
            }

            function resetModalForCreate() {
                el('userModalTitle').textContent = 'New user';
                el('user_id').value = '';
                el('name').value = '';
                el('email').value = '';
                el('account_type').value = 'customer';
                el('company_role').value = 'staff';
                el('company_role').disabled = true;
                el('extrafield').value = '';
                el('active').value = '1';

                hideBlock('modalErr');
                hideBlock('tempPasswordBox');
                //el('tempPasswordText').textContent = '';
                //el('passwordHint').classList.remove('hidden');
            }

            function fillModalForEdit(data) {
                el('userModalTitle').textContent = 'Edit user';
                el('user_id').value = data.id;
                el('name').value = data.name ?? '';
                el('email').value = data.email ?? '';
                el('account_type').value = data.account_type ?? 'customer';
                el('company_role').value = (data.company_role ?? 'staff');
                el('extrafield').value = data.extrafield ?? '';
                el('active').value = (data.active === true || data.active === 1 || data.active === "1") ? "1" : "0";

                syncRoleField();

                hideBlock('modalErr');
                hideBlock('tempPasswordBox');
                //el('tempPasswordText').textContent = '';
                //el('passwordHint').classList.add('hidden');
            }

            function getPayload() {
                return {
                    name: el('name').value,
                    email: el('email').value,
                    account_type: el('account_type').value,
                    company_role: el('company_role').disabled ? null : el('company_role').value,
                    extrafield: el('extrafield').value,
                    active: el('active').value,
                };
            }

            async function ajaxJson(url, method, payload) {
                const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

                const opts = {
                    method,
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': token,
                    }
                };

                if (method !== 'GET') {
                    opts.headers['Content-Type'] = 'application/json';
                    opts.body = JSON.stringify(payload ?? {});
                }

                const res = await fetch(url, opts);
                const data = await res.json().catch(() => ({}));

                if (!res.ok) {
                    if (data?.errors) {
                        const first = Object.values(data.errors)[0]?.[0] ?? 'Validation error';
                        throw new Error(first);
                    }
                    throw new Error(data?.message ?? 'Request failed');
                }
                return data;
            }

            // ===== DataTable init =====
            document.addEventListener('DOMContentLoaded', function () {
                // You must have DataTables + jQuery loaded globally (CDN or bundled)
                const table = $('#usersTable').DataTable({
                    processing: true,
                    serverSide: true,
                    ajax: "{{ route('admin.users.data') }}",
                    columns: [
                        { data: 'id', name: 'id' },
                        { data: 'name', name: 'name' },
                        { data: 'email', name: 'email' },
                        { data: 'account_type', name: 'account_type' },
                        { data: 'company_role', name: 'company_role' },
                        { data: 'extrafield', name: 'extrafield' },
                        { data: 'active_html', name: 'active', className: 'text-center', orderable: true, searchable: false },
                        //{ data: 'created_at', name: 'created_at' },
                        { data: 'actions', orderable: false, searchable: false }
                    ],
                });

                // ===== Wire UI =====
                el('account_type').addEventListener('change', syncRoleField);

                el('btnNewUser').addEventListener('click', function () {
                    hideBlock('pageOk');
                    hideBlock('pageErr');
                    resetModalForCreate();
                    openModal();
                });

                el('btnCloseModal').addEventListener('click', closeModal);
                el('btnCancelModal').addEventListener('click', closeModal);

                // click outside panel to close
                el('userModal').addEventListener('click', function (e) {
                    if (e.target === el('userModal')) closeModal();
                });

                // Edit buttons from table
                $('#usersTable').on('click', '.js-edit', async function () {
                    hideBlock('pageOk');
                    hideBlock('pageErr');

                    const id = $(this).data('id');

                    try {
                        resetModalForCreate();
                        const data = await ajaxJson("{{ url('admin/users') }}/" + id, 'GET');
                        fillModalForEdit(data);
                        openModal();
                    } catch (err) {
                        showBlock('pageErr', err.message);
                    }
                });

                el('btnSaveUser').addEventListener('click', async function () {
                    hideBlock('modalErr');
                    //hideBlock('tempPasswordBox');
                    //el('tempPasswordText').textContent = '';

                    const saveButton = this;
                    const id = el('user_id').value;
                    const payload = getPayload();

                    try {
                        saveButton.disabled = true;
                        if (!id) {
                            const data = await ajaxJson("{{ route('admin.users.store') }}", 'POST', payload);
                            showBlock('pageOk', data.message || 'User created.');
                            /*
                            if (data.temp_password) {
                                el('tempPasswordText').textContent = data.temp_password;
                                el('tempPasswordBox').classList.remove('hidden'); // show inside modal
                            }
                             */
                            closeModal();
                        } else {
                            const data = await ajaxJson("{{ url('admin/users') }}/" + id, 'PUT', payload);
                            showBlock('pageOk', data.message || 'User updated.');
                            closeModal();
                        }

                        table.ajax.reload(null, false);
                    } catch (err) {
                        showBlock('modalErr', err.message);
                    } finally {
                        saveButton.disabled = false;
                    }
                });

                // initial state
                syncRoleField();
            });
        </script>
    @endpush
</x-app-layout>
