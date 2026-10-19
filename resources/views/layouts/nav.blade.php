<nav class="navbar" role="navigation" style="position: relative; z-index: 2000; overflow: visible;">
    <div class="nav-inner">
        <div class="nav-inner-left">
            <div class="logo-wrap">
                <a href="https://app.westernfencesupply.com" class="navbar-brand mr-auto align-left">
                    <!-- <img class="site-logo site-logo-scroll" src="/wp-content/themes/westernfencesupply/img/global/western-fence-supply-logo.svg" alt="Western Fence Supply Logo"> -->
                    <img class="site-logo-white" src="/images/wfs-logo-wht.svg" alt="Western Fence Supply Logo White">
                </a>
            </div>
        </div>
        <!-- Settings Dropdown -->
        @if (Auth::check())
            <div class="hidden sm:flex sm:items-center sm:ms-6">
                <div class="relative">
                    <!-- Trigger Button -->
                    <button id="settingsDropdown" onclick="toggleDropdown()" class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-white hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                        <div>{{ Auth::user()->name }}</div>
                        <div class="ms-1">
                            <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a 1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                            </svg>
                        </div>
                    </button>

                    <!-- Dropdown Content -->
                    <div id="dropdownContent" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none" style="z-index: 2001;">
                        {{-- ADMIN ONLY --}}
                        @can('manage-users')
                            <a href="{{ route('admin.users.index') }}"
                               class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                Users
                            </a>
                        @endcan

                        {{-- STAFF ONLY --}}
                        @can('view-quote-requests')
                            <a href="{{ route('quote_requests.index') }}"
                               class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                Quote Requests
                            </a>
                        @endcan

                        <a href="{{ route('profile.edit') }}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            {{ __('Profile') }}
                        </a>
                        <form method="POST" action="{{ route('logout') }}">
                            @csrf
                            <button type="submit" class="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                {{ __('Log Out') }}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        @endif
    </div>
</nav>
