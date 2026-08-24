import assert from 'node:assert/strict';
import test from 'node:test';
import {BubbleController, Chart, Legend, LinearScale, PointElement} from '../dist/chart.js';

Chart.register(BubbleController, Legend, LinearScale, PointElement);

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

function createChart(data) {
  const document = {defaultView: {getComputedStyle: () => ({position: 'static'})}, createElementNS: () => new SvgNode(document)};
  const canvas = new SvgNode(document); const parent = new SvgNode(document); const context = {canvas, measureText: () => ({width: 10})};
  Object.assign(canvas, {width: 400, height: 300, offsetLeft: 0, offsetTop: 0, getContext: () => new Proxy(context, {get: (target, key) => key in target ? target[key] : () => {}})});
  parent.appendChild(canvas);
  const chart = new Chart(canvas, {type: 'bubble', data: {datasets: [{label: 'Bubbles', backgroundColor: '#60a5fa', borderColor: '#1d4ed8', data}]}, options: {animation: false, plugins: {legend: false}, renderer: 'svg', responsive: false}});
  return {canvas, chart, parent};
}

function points(chart) {
  const layer = find(chart.$chartjsSvgRoot, 'data-svg-layer', 'datasets');
  return find(find(layer, 'data-dataset-index', '0'), 'data-svg-part', 'points');
}

test('Bubble presents public radii as reusable SVG point geometry', () => {
  const data = [{x: 1, y: 2, r: 5}, {x: 3, y: 4, r: 15}, {x: 5, y: 1, r: 25}];
  const {canvas, chart, parent} = createChart(data); const group = points(chart); const first = group.children[0];
  assert.equal(group.children.length, 3);
  assert.match(group.children[0].getAttribute('d'), /A5,5,/);
  assert.match(group.children[1].getAttribute('d'), /A15,15,/);
  assert.match(group.children[2].getAttribute('d'), /A25,25,/);
  assert.equal(chart.getDatasetMeta(0).controller.getLabelAndValue(1).value, '(3, 4, 15)');
  data[0].r = 12; chart.update('none'); assert.equal(points(chart).children[0], first); assert.match(first.getAttribute('d'), /A12,12,/);
  data[1].r = 0; chart.update('none'); assert.equal(points(chart).children.length, 2);
  chart.options.renderer = 'canvas'; chart.update('none'); assert.equal(chart.$chartjsSvgRoot, undefined); assert.deepEqual(parent.children, [canvas]);
  chart.destroy();
});
