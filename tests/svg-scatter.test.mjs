import assert from 'node:assert/strict';
import test from 'node:test';
import {Chart, Filler, Legend, LineElement, LinearScale, PointElement, ScatterController} from '../dist/chart.js';

Chart.register(Filler, Legend, LineElement, LinearScale, PointElement, ScatterController);

class SvgNode {
  constructor(document) { this.ownerDocument = document; this.children = []; this.attributes = new Map(); this.style = {}; }
  appendChild(node) { return this.insertBefore(node, null); }
  insertBefore(node, before) { node.remove(); node.parentNode = this; const index = before ? this.children.indexOf(before) : -1; this.children.splice(index < 0 ? this.children.length : index, 0, node); return node; }
  remove() { if (this.parentNode) { this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1); this.parentNode = null; } }
  get lastElementChild() { return this.children[this.children.length - 1]; }
  get nextSibling() { return this.parentNode && this.parentNode.children[this.parentNode.children.indexOf(this) + 1]; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  hasAttribute(name) { return this.attributes.has(name); }
}

function find(node, attribute, value) {
  if (node.getAttribute(attribute) === value) return node;
  for (const child of node.children) { const result = find(child, attribute, value); if (result) return result; }
}

function createChart(datasets, options = {}) {
  const document = {defaultView: {getComputedStyle: () => ({position: 'static'})}, createElementNS: () => new SvgNode(document)};
  const parent = new SvgNode(document); const canvas = new SvgNode(document); const context = {canvas, measureText: () => ({width: 10})};
  Object.assign(canvas, {width: 400, height: 300, offsetLeft: 0, offsetTop: 0, getContext: () => new Proxy(context, {get: (target, key) => key in target ? target[key] : () => {}})});
  parent.appendChild(canvas);
  const chart = new Chart(canvas, {type: 'scatter', data: {datasets}, options: {animation: false, plugins: {legend: false}, renderer: 'svg', responsive: false, ...options}});
  return {canvas, chart, parent};
}

function part(chart, dataset, name) {
  const layer = find(chart.$chartjsSvgRoot, 'data-svg-layer', 'datasets');
  return find(find(layer, 'data-dataset-index', String(dataset)), 'data-svg-part', name);
}

test('Scatter uses existing Point, Line and Filler SVG elements through runtime showLine changes', () => {
  const data = [{x: 1, y: 2}, {x: 3, y: 5}, {x: 7, y: -2}];
  const {canvas, chart, parent} = createChart([{label: 'Observed', data, pointBackgroundColor: ['#2563eb', '#16a34a', '#dc2626'], pointRadius: [3, 5, 7], pointStyle: ['circle', 'triangle', 'star'], pointRotation: [0, 15, 30]}]);
  const points = part(chart, 0, 'points');

  assert.equal(points.children.length, 3);
  assert.equal(part(chart, 0, 'line'), undefined);
  assert.equal(chart.getDatasetMeta(0).controller.getLabelAndValue(1).value, '(3, 5)');
  chart.data.datasets[0].showLine = true; chart.data.datasets[0].fill = true; chart.data.datasets[0].borderColor = '#0f172a'; chart.update('none');
  assert.ok(part(chart, 0, 'line')); assert.ok(part(chart, 0, 'fill')); assert.equal(part(chart, 0, 'points'), points);
  chart.data.datasets[0].showLine = false; chart.update('none');
  assert.equal(part(chart, 0, 'line'), undefined); assert.equal(part(chart, 0, 'fill'), undefined); assert.equal(part(chart, 0, 'points'), points);
  data[1] = {x: null, y: 5}; chart.update('none'); assert.equal(points.children.length, 2);
  chart.options.renderer = 'canvas'; chart.update('none'); assert.equal(chart.$chartjsSvgRoot, undefined); assert.deepEqual(parent.children, [canvas]);
  chart.destroy();
});

test('Scatter keeps parsing, dataset ordering and hidden state renderer-agnostic', () => {
  const {chart} = createChart([
    {label: 'line', order: 2, showLine: true, borderColor: '#dc2626', data: [{foo: 1, bar: 2}, {foo: 3, bar: 4}]},
    {label: 'points', order: 1, pointRadius: 5, data: [{foo: 2, bar: 3}, {foo: 4, bar: 6}]},
  ], {parsing: {xAxisKey: 'foo', yAxisKey: 'bar'}});
  const datasets = find(chart.$chartjsSvgRoot, 'data-svg-layer', 'datasets');
  const expectedOrder = chart.getSortedVisibleDatasetMetas().slice().reverse().map((meta) => String(meta.index));
  assert.deepEqual(datasets.children.map((node) => node.getAttribute('data-dataset-index')), expectedOrder);
  chart.hide(1); assert.equal(find(datasets, 'data-dataset-index', '1'), undefined);
  chart.destroy();
});
