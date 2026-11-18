import { defineConfig, devices } from '@playwright/test';

/*
 * Browser tests of the property map: the real drawing page (served by `php artisan
 * serve`, with the built assets) against a stand-in for Google Maps. See
 * tests/browser/support/fake-google.js for what that does and does not prove.
 *
 * Before running: `npm run build`, a .env with APP_KEY and GOOGLE_MAPS_BROWSER_KEY set to
 * any placeholder (the map partial only renders with a key; nothing is sent to Google).
 */
const PORT = Number(process.env.WFS_TEST_PORT || 8123);

export default defineConfig({
    testDir: 'tests/browser',
    outputDir: 'storage/framework/testing/playwright',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [['list']],
    use: {
        baseURL: `http://127.0.0.1:${PORT}`,
        trace: 'off',
        video: 'off',
    },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } },
        { name: 'phone', use: { ...devices['Pixel 7'] } },
    ],
    webServer: {
        command: `php artisan serve --host=127.0.0.1 --port=${PORT}`,
        url: `http://127.0.0.1:${PORT}/`,
        reuseExistingServer: true,
        timeout: 60000,
    },
});
