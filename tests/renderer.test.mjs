import assert from 'node:assert/strict';
import test from 'node:test';
import {Chart} from '../dist/chart.js';
import {chartConfig, createDocument, createHost, Node} from './helpers/public-host.mjs';

test('one container hosts one chart and independent containers remain independent', () => {
  const document = createDocument();
  const firstHost = createHost(document);
  const secondHost = createHost(document);
  const first = new Chart(firstHost, chartConfig());
  const second = new Chart(secondHost, chartConfig());
  assert.throws(() => new Chart(firstHost, chartConfig()), /already in use/);
  assert.equal(firstHost.children.length, 1);
  assert.equal(secondHost.children.length, 1);
  first.destroy(); second.destroy();
});

test('canvas and SVG surfaces are owned by the renderer and replaced on switches', () => {
  const document = createDocument();
  const host = createHost(document);
  const chart = new Chart(host, chartConfig('svg'));
  const svg = chart.root;
  assert.equal(svg.nodeName, 'SVG');
  assert.equal(host.children.length, 1);
  chart.setRenderer('canvas');
  const canvas = chart.root;
  assert.equal(canvas.nodeName, 'CANVAS');
  assert.equal(host.children.length, 1);
  assert.notEqual(canvas, svg);
  chart.setRenderer('svg');
  assert.equal(chart.root.nodeName, 'SVG');
  assert.equal(host.children.length, 1);
  chart.destroy();
  assert.equal(host.children.length, 0);
});

test('clear delegates to each renderer without changing ownership', () => {
  const record = [];
  const document = createDocument(record);
  const host = createHost(document);
  const canvasChart = new Chart(host, chartConfig('canvas'));
  canvasChart.clear();
  assert.ok(record.includes('clearRect'));
  canvasChart.destroy();
  const svgChart = new Chart(host, chartConfig('svg'));
  svgChart.draw();
  assert.ok(svgChart.root.children.length > 0);
  svgChart.clear();
  assert.equal(svgChart.root.children.some((node) => node.getAttribute('data-svg-layer')), false);
  svgChart.destroy();
});

test('renderer initialization failure rejects construction and leaves the host reusable', () => {
  const document = createDocument();
  const host = createHost(document);
  document.createElement = (name) => name === 'canvas' ? Object.assign(new Node(document, name), {getContext: () => null}) : new Node(document, name);
  assert.throws(() => new Chart(host, chartConfig('canvas')), /Failed to initialize the canvas renderer/);
  assert.equal(host.children.length, 0);
  document.createElement = (name) => new Node(document, name);
  const chart = new Chart(host, chartConfig('svg'));
  chart.destroy();
});

test('same-size resize notifies once for both renderer backends', () => {
  for (const renderer of ['svg', 'canvas']) {
    const document = createDocument();
    const host = createHost(document);
    let calls = 0;
    const chart = new Chart(host, chartConfig(renderer, {onResize: () => calls++}));
    calls = 0;
    chart.resize(500, 300);
    chart.resize(500, 300);
    assert.equal(calls, 1, renderer);
    chart.destroy();
  }
});
