import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import test from 'node:test';
import {chrome, execute, hasChrome, startServer} from './helpers/chromium.mjs';

const fixture = '/tests/fixtures/animated-arc-browser.html';
const names = ['svgPie', 'svgDoughnut', 'canvasPie', 'canvasDoughnut'];

test('animated pie and doughnut geometry stays finite in Chromium', {skip: !hasChrome(), timeout: 20000}, async () => {
  const server = await startServer();
  const {port} = server.address();
  const profile = await mkdtemp('/private/tmp/xsquare-charts-animated-arc-');
  try {
    const {stdout} = await execute(chrome, [
      '--headless=new', '--disable-gpu', '--no-first-run', '--no-sandbox',
      '--disable-background-networking', '--disable-extensions',
      `--user-data-dir=${profile}`, '--virtual-time-budget=3000', '--dump-dom',
      `http://127.0.0.1:${port}${fixture}`,
    ], {maxBuffer: 2 * 1024 * 1024, timeout: 15000});
    assert.match(stdout, /data-animated-arc-ready="true"/);
    const result = JSON.parse(stdout.match(/<output id="result">([^<]+)<\/output>/)[1]);
    assert.deepEqual(result.errors, []);

    for (const frame of [result.initial, result.during, result.final]) {
      for (const name of names) {
        assert.equal(frame[name].finite, true, `${name} has finite arc geometry`);
      }
    }
    for (const frame of [result.initial, result.during, result.final]) {
      for (const name of ['svgPie', 'svgDoughnut']) {
        assert.ok(frame[name].pathCount >= 5, `${name} rendered every arc`);
        assert.equal(frame[name].validPaths, true, `${name} has no invalid SVG path values`);
      }
    }
    assert.equal(result.initial.svgPie.animationEnabled, true, 'Pie is created with animation enabled');
    assert.equal(result.initial.svgDoughnut.animationEnabled, true, 'Doughnut is created with animation enabled');
  } finally {
    await new Promise((resolveServer) => server.close(resolveServer));
    await rm(profile, {force: true, recursive: true});
  }
});
