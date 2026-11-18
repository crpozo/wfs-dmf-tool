import { defineConfig } from 'vitest/config';

// Unit tests of the property map's pure modules. The browser tests are in tests/browser.
export default defineConfig({
    test: {
        include: ['tests/js/unit/**/*.test.js'],
        environment: 'node',
    },
});
