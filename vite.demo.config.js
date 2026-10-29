import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';

/*
 * Static demo of the property map and 3D view (resources/demo) for client review on
 * GitHub Pages. Output goes to the design preview repository, next to this project:
 *   ../../wfs-design-preview/draw-my-fence-demo  (override with DEMO_OUT_DIR)
 * The demo has its own Maps key, GOOGLE_MAPS_DEMO_KEY in this project's .env, never the
 * app's key: it ends up in a public repository. Restrict it in Google Cloud to the Pages
 * URL only (https://crpozo.github.io/wfs-design-preview/*) and to Maps JavaScript,
 * Places (New) and Geocoding, with daily quotas.
 *
 *   npm run build:demo
 */
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const outDir = resolve(env.DEMO_OUT_DIR || resolve(process.cwd(), '../../wfs-design-preview/draw-my-fence-demo'));

    if (!env.GOOGLE_MAPS_DEMO_KEY) {
        throw new Error('GOOGLE_MAPS_DEMO_KEY is not set in .env (a separate key for the public demo)');
    }
    if (env.GOOGLE_MAPS_DEMO_KEY === env.GOOGLE_MAPS_BROWSER_KEY) {
        throw new Error('GOOGLE_MAPS_DEMO_KEY must not be the app key: the demo is published in a public repository');
    }
    if (!outDir.endsWith('draw-my-fence-demo')) {
        throw new Error(`Refusing to empty ${outDir}: the demo folder must be named draw-my-fence-demo`);
    }

    return {
        root: resolve(process.cwd(), 'resources/demo'),
        base: './',
        publicDir: false,
        define: {
            __DEMO_MAPS_KEY__: JSON.stringify(env.GOOGLE_MAPS_DEMO_KEY),
            __DEMO_MAP_ID__: JSON.stringify(env.GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID'),
        },
        build: {
            outDir,
            emptyOutDir: true,
            // The 3D view chunk (three.js) is ~530 kB, loaded only when "View in 3D" is pressed.
            chunkSizeWarningLimit: 600,
        },
    };
});
