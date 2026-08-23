import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdtemp, readFile, rm, stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import {dirname, extname, resolve, sep} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

const execute = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const mimeTypes = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8'};

function startServer() {
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const file = resolve(root, pathname.slice(1));
    if (!file.startsWith(root + sep)) {
      response.writeHead(404).end();
      return;
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, {'Content-Type': mimeTypes[extname(file)] || 'application/octet-stream'});
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolveServer) => server.listen(0, '127.0.0.1', () => resolveServer(server)));
}

test('SVG fixtures render in actual Chromium', {skip: !existsSync(chrome), timeout: 20000}, async () => {
  const server = await startServer();
  const {port} = server.address();
  const profile = await mkdtemp('/private/tmp/xsquare-charts-chrome-');
  const screenshot = `${profile}/fixtures.png`;
  try {
    const {stdout} = await execute(chrome, [
      '--headless=new', '--disable-gpu', '--no-first-run', '--no-sandbox',
      '--disable-background-networking', '--disable-extensions',
      `--user-data-dir=${profile}`, '--virtual-time-budget=3000', '--dump-dom', `--screenshot=${screenshot}`,
      `http://127.0.0.1:${port}/tests/fixtures/svg-browser.html`,
    ], {maxBuffer: 2 * 1024 * 1024, timeout: 15000});
    assert.match(stdout, /data-svg-ready="true"/);
    const result = JSON.parse(stdout.match(/<output id="result">([^<]+)<\/output>/)[1]);
    assert.ifError(result.error);
    assert.equal(result.svgCharts, 18);
    assert.equal(result.svgNoCanvas, true);
    assert.equal(result.rendererSurfaceSwitch, true);
    assert.equal(result.line, true);
    assert.equal(result.fill, true);
    assert.equal(result.exportsValid, true);
    assert.equal(result.histogram, true);
    assert.equal(result.radial, true);
    assert.equal(result.radialTooltip, true);
    assert.equal(result.scatter, true);
    assert.equal(result.bubble, true);
    assert.equal(result.cartesianScales, true);
    assert.equal(result.text, 12);
    assert.equal(result.legend, true);
    assert.equal(result.legacySvgRoots, 0);
    assert.equal(result.tooltipVisible, true);
    assert.equal(result.tooltipAboveSvg, true);
    assert.equal(result.tooltipHidden, true);
    assert.equal(result.tooltipReused, true);
    assert.equal(result.tooltipRemovedForCanvas, true);
    assert.equal(result.tooltipRestoredForSvg, true);
    assert.equal(result.tooltipPointStyle, true);
    assert.equal(result.tooltipSafe, true);
    assert.equal(result.paintDefinitions, false);
    assert.equal(result.canvasPointStyle, false);
    assert.equal(result.canvasPointExport, false);
    assert.equal(result.paintExport, false);
    assert.equal(result.paintSafe, true);
    assert.equal(result.paintUpdated, true);

    assert.ok((await stat(screenshot)).size > 1000);
  } finally {
    await new Promise((resolveServer) => server.close(resolveServer));
    await rm(profile, {force: true, recursive: true});
  }
});
