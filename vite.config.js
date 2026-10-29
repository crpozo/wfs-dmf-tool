import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js',
                // Property map: loaded only on the drawing step, Google Maps itself is fetched on demand.
                'resources/css/property-map.css',
                'resources/js/property-map/index.js',
            ],
            refresh: true,
        }),
    ],
    build: {
        // The 3D view chunk (three.js) is ~530 kB, loaded only when "View in 3D" is pressed.
        chunkSizeWarningLimit: 600,
    },
});
