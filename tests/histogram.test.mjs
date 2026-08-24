import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BarElement,
  Chart,
  HistogramController,
  Legend,
  LinearScale,
  Tooltip,
} from '../dist/chart.js';

Chart.register(BarElement, HistogramController, Legend, LinearScale, Tooltip);

class SvgNode {
  constructor(document) {
    this.ownerDocument = document;
    this.children = [];
    this.attributes = new Map();
    this.style = {};
  }

  appendChild(node) {
    return this.insertBefore(node, null);
  }

  insertBefore(node, before) {
    node.remove();
    node.parentNode = this;
    const index = before ? this.children.indexOf(before) : -1;
    this.children.splice(index < 0 ? this.children.length : index, 0, node);
    return node;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1);
      this.parentNode = null;
    }
  }

  get lastElementChild() {
    return this.children[this.children.length - 1];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }
}

function context(canvas) {
  const value = {canvas, measureText: () => ({width: 10})};
  return new Proxy(value, {get: (target, property) => property in target ? target[property] : () => {}});
}

function child(node, attribute, value) {
  return node.children.find((item) => item.getAttribute(attribute) === value);
}

function createChart(data, options = {}) {
  const document = {
    defaultView: {getComputedStyle: () => ({position: 'static'})},
    createElement: () => new SvgNode(document),
    createElementNS: () => new SvgNode(document),
  };
  const parent = new SvgNode(document);
  const canvas = new SvgNode(document);
  Object.assign(canvas, {width: 400, height: 300, offsetLeft: 0, offsetTop: 0, getContext: () => context(canvas)});
  parent.appendChild(canvas);
  const chart = new Chart(canvas, {
    type: 'histogram',
    data: {datasets: [{label: 'Count', backgroundColor: '#60a5fa', data, inflateAmount: 0}]},
    options: {animation: false, plugins: {legend: false}, renderer: 'svg', responsive: false, ...options},
  });
  return {canvas, chart, parent};
}

function bars(chart) {
  const datasets = child(chart.$chartjsSvgRoot, 'data-svg-layer', 'datasets');
  return child(child(datasets, 'data-dataset-index', '0'), 'data-svg-part', 'bars').children;
}

test('Histogram integrates explicit bin boundaries with linear-scale SVG bar geometry', () => {
  const data = [
    {xMin: 0, xMax: 1, y: 2},
    {xMin: 1, xMax: 4, y: 5},
    {xMin: 4, xMax: 10, y: 3},
  ];
  const {canvas, chart, parent} = createChart(data);
  const meta = chart.getDatasetMeta(0);
  const firstGroup = bars(chart)[0];

  assert.equal(chart.scales.x.type, 'linear');
  assert.equal(chart.scales.y.type, 'linear');
  assert.equal(bars(chart).length, 3);
  assert.ok(chart.scales.x.min <= 0);
  assert.ok(chart.scales.x.max >= 10);
  for (let index = 0; index < data.length; ++index) {
    const element = meta.data[index];
    const expected = Math.abs(chart.scales.x.getPixelForValue(data[index].xMax) - chart.scales.x.getPixelForValue(data[index].xMin));
    assert.equal(element.width, expected);
  }
  assert.equal(meta.controller.getLabelAndValue(1).label, '1 – 4');
  assert.equal(meta.controller.getLabelAndValue(1).value, '5');
  chart.tooltip.setActiveElements([{datasetIndex: 0, index: 1}], {x: 200, y: 100});
  assert.equal(chart.tooltip.dataPoints[0].label, '1 – 4');
  assert.equal(chart.tooltip.dataPoints[0].formattedValue, '5');

  data[0].y = 7;
  chart.update('none');
  assert.equal(bars(chart)[0], firstGroup);
  data.push({xMin: 10, xMax: 12, y: 1});
  chart.update('none');
  assert.equal(bars(chart).length, 4);
  data.pop();
  chart.update('none');
  assert.equal(bars(chart).length, 3);

  chart.options.renderer = 'canvas';
  chart.update('none');
  assert.equal(chart.$chartjsSvgRoot, undefined);
  assert.deepEqual(parent.children, [canvas]);
  chart.options.renderer = 'svg';
  chart.update('none');
  assert.equal(bars(chart).length, 3);
  chart.destroy();
});

test('Histogram supports horizontal bins', () => {
  const {chart} = createChart([
    {yMin: 0, yMax: 2, x: 3},
    {yMin: 2, yMax: 7, x: 6},
  ], {indexAxis: 'y'});
  const meta = chart.getDatasetMeta(0);
  const expected = Math.abs(chart.scales.y.getPixelForValue(7) - chart.scales.y.getPixelForValue(2));

  assert.equal(meta.data[1].height, expected);
  assert.equal(meta.controller.getLabelAndValue(1).label, '2 – 7');
  chart.destroy();
});
