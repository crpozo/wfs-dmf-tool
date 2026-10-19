<?php

namespace App\Providers;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Blade::directive('assetv', function ($expression) {
            return "<?php \$__assetvPath = {$expression}; echo e(asset(\$__assetvPath) . '?v=' . (file_exists(public_path(\$__assetvPath)) ? filemtime(public_path(\$__assetvPath)) : time())); ?>";
        });
    }
}
