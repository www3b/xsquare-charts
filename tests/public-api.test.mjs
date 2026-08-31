import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
  assert.equal(typeof api.Chart.getChart, 'undefined');
});

test('public ActiveItem maps seriesIndex at the API boundary only', () => {
  const document = createDocument();
  const chart = new api.Chart(createHost(document), chartConfig());
  chart.setActiveItems([{seriesIndex: 0, index: 1}]);
  assert.deepEqual(chart.getActiveItems(), [{seriesIndex: 0, index: 1}]);
  assert.deepEqual(Object.keys(chart.getActiveItems()[0]).sort(), ['index', 'seriesIndex']);
  chart.destroy();
});

test('series.name is normalized to the internal display name without a label fallback', () => {
  const document = createDocument();
  const chart = new api.Chart(createHost(document), {
    ...chartConfig(),
    data: {labels: ['A'], series: [{label: 'Legacy', data: [1]}]}
  });
  assert.notEqual(chart.getDatasetMeta(0).label, 'Legacy');
  chart.destroy();
});

test('toDataURL is the canonical canvas export and generated declarations match runtime', () => {
  const document = createDocument();
  const chart = new api.Chart(createHost(document), chartConfig('canvas'));
  chart.root.toDataURL = (type, quality) => `${type}:${quality}`;
  assert.equal(chart.toDataURL('image/jpeg', 0.8), 'image/jpeg:0.8');
  assert.equal(typeof chart.toBase64Image, 'undefined');
  chart.destroy();

  const declarations = readFileSync(new URL('../dist/index.d.ts', import.meta.url), 'utf8');
  for (const name of ['PointStyle', 'TimeUnit', 'LogarithmicScaleConfig', 'TimeScaleConfig', 'TimeSeriesScaleConfig']) {
    assert.match(declarations, new RegExp(`export (?:type |interface )?\\{?[^]*${name}`));
  }
  assert.doesNotMatch(declarations, /getChart|toBase64Image|getDatasetMeta|notifyPlugins|buildOrUpdateControllers/);
  assert.match(declarations, /toDataURL\(type\?: string, quality\?: number\): string/);
});
