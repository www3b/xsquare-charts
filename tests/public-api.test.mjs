import assert from 'node:assert/strict';
import test from 'node:test';
import * as api from '../dist/chart.js';
import {chartConfig, createDocument, createHost} from './helpers/public-host.mjs';

test('package root exposes only Chart at runtime', () => { assert.deepEqual(Object.keys(api).sort(), ['Chart']); });

test('public host, config and renderer API use container and series only', () => {
  const document = createDocument();
  const host = createHost(document);
  const chart = new api.Chart(host, chartConfig());
  assert.equal(chart.renderer, 'svg');
  assert.equal(chart.data.series[0].name, 'Values');
  chart.setRenderer('canvas');
  assert.equal(chart.renderer, 'canvas');
  chart.setRenderer('svg');
  chart.destroy();
  assert.throws(() => new api.Chart(document.createElement('canvas'), chartConfig()), /host must be an HTMLElement container/);
  assert.throws(() => new api.Chart('chart', chartConfig()), /host must be an HTMLElement container/);
  assert.throws(() => new api.Chart(createHost(document), {...chartConfig(), data: {datasets: []}}), /data\.series/);
  assert.throws(() => new api.Chart(createHost(document), {...chartConfig(), options: {renderer: 'canvas'}}), /top-level chart options/);
  assert.equal(typeof api.Chart.register, 'undefined');
});
