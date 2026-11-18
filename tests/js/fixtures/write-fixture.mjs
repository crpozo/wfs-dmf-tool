/*
 * Writes tests/fixtures/property-map-scenarios.json: the scenarios as plain JSON, so the
 * PHP tests (framing of the satellite photo) and the browser tests use the same drawings.
 * Run with: node tests/js/fixtures/write-fixture.mjs
 */
import fs from 'node:fs';
import { SCENARIOS } from './scenarios.js';

const target = new URL('../../fixtures/property-map-scenarios.json', import.meta.url);
const existing = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : {};
const out = {};
for (const [name, project] of Object.entries(SCENARIOS)) {
    // `frame` is written by the PHP test suite's generator and kept across rewrites.
    out[name] = { project, frame: existing[name]?.frame ?? null };
}
fs.writeFileSync(target, `${JSON.stringify(out, null, 1)}\n`);
