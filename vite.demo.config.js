import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';

/*
 * Static demo of the property map and 3D view (resources/demo) for client review on
 * GitHub Pages. Output goes to the design preview repository, next to this project:
 *   ../../wfs-design-preview/draw-my-fence-demo  (override with DEMO_OUT_DIR)
 * The Maps browser key and map id come from this project's .env; the key is restricted
 * by HTTP referrer, so the Pages domain must be listed on it in Google Cloud.
 *
 *   npm run build:demo
 */
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const outDir = resolve(env.DEMO_OUT_DIR || resolve(process.cwd(), '../../wfs-design-preview/draw-my-fence-demo'));

    if (!env.GOOGLE_MAPS_BROWSER_KEY) {
        throw new Error('GOOGLE_MAPS_BROWSER_KEY is not set in .env');
    }
    if (!outDir.endsWith('draw-my-fence-demo')) {
        throw new Error(`Refusing to empty ${outDir}: the demo folder must be named draw-my-fence-demo`);
    }

    return {
        root: resolve(process.cwd(), 'resources/demo'),
        base: './',
        publicDir: false,
        define: {
            __DEMO_MAPS_KEY__: JSON.stringify(env.GOOGLE_MAPS_BROWSER_KEY),
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
