<?php

namespace App\View\Components;

use Illuminate\View\Component;
use Illuminate\View\View;

/**
 * Standard Laravel Breeze layout component.
 * Recreated during the AWS migration (Oct 2026): this file was missing from the
 * code handover zip but exists on the original server. Renders resources/views/layouts/app.blade.php.
 */
class AppLayout extends Component
{
    public function render(): View
    {
        return view('layouts.app');
    }
}
