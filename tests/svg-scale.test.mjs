import assert from 'node:assert/strict';
import test from 'node:test';
import {Scale} from '../dist/chart.js';
import {beginSvgRender, endSvgRender, removeSvgRoot} from '../src/helpers/helpers.svg.js';

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
    if (!this.parentNode) {
      return;
    }
    this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1);
    this.parentNode = null;
  }

  get nextSibling() {
    return this.parentNode && this.parentNode.children[this.parentNode.children.indexOf(this) + 1];
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

function findChild(node, attribute, value) {
  return node.children.find((child) => child.getAttribute(attribute) === value);
}

function createChart() {
  const document = {
    defaultView: {getComputedStyle: () => ({position: 'static'})},
    createElementNS: () => new SvgNode(document)
  };
  const parent = new SvgNode(document);
  const canvas = new SvgNode(document);
  canvas.width = canvas.height = 400;
  canvas.offsetLeft = canvas.offsetTop = 0;
  parent.appendChild(canvas);
  return {
    canvas,
    chartArea: {left: 20, top: 20, right: 380, bottom: 380},
    currentDevicePixelRatio: 1,
    getContext: () => ({}),
    height: 400,
    options: {renderer: 'svg'},
    parent,
    width: 400
  };
}

function createScale(chart, id, axis, grid = {}) {
  const gridOptions = {
    color: '#123456',
    lineWidth: 2,
    tickBorderDash: [2, 1],
    tickBorderDashOffset: 3,
    tickColor: '#654321',
    tickWidth: 1,
  };
  const borderOptions = {color: '#112233', dash: [4, 2], dashOffset: 1, display: true, width: 2};
  const scale = new Scale({id, type: 'linear', ctx: {}, chart});
  scale.axis = axis;
  scale.left = scale.top = 20;
  scale.right = scale.bottom = 380;
  scale._borderValue = axis === 'x' ? 380 : 20;
  scale.getContext = () => ({});
  scale.options = {
    border: {display: true, setContext: () => borderOptions, z: 1},
    grid: {display: true, drawOnChartArea: true, drawTicks: true, setContext: () => gridOptions, z: -1, ...grid}
  };
  scale._gridLineItems = [{
    ...gridOptions,
    tx1: 20, tx2: 20, ty1: 380, ty2: 390,
    width: gridOptions.lineWidth,
    x1: 20, x2: 20, y1: 20, y2: 380
  }];
  return scale;
}

test('SVG scale grid, ticks and borders retain computed coordinates and styles', () => {
  const chart = createChart();
  beginSvgRender(chart);
  const scale = createScale(chart, 'x', 'x');
  scale.drawGrid(chart.chartArea);
  scale.drawBorder();
  endSvgRender(chart);

  const [background, canvas, foreground] = chart.parent.children;
  assert.equal(background.getAttribute('data-chart-svg-layer'), 'background');
  assert.equal(canvas, chart.canvas);
  assert.equal(foreground.getAttribute('data-chart-svg-layer'), 'foreground');

  const backgroundScale = findChild(background, 'data-scale-id', 'x');
  const grid = findChild(backgroundScale, 'data-svg-part', 'grid').children[0];
  const ticks = findChild(backgroundScale, 'data-svg-part', 'ticks').children[0];
  assert.deepEqual([grid.getAttribute('x1'), grid.getAttribute('y1'), grid.getAttribute('x2'), grid.getAttribute('y2')], ['20', '20', '20', '380']);
  assert.equal(grid.getAttribute('stroke-dasharray'), '');
  assert.equal(grid.getAttribute('stroke-width'), '2');
  assert.equal(ticks.getAttribute('stroke-dasharray'), '2,1');
  assert.equal(ticks.getAttribute('stroke-dashoffset'), '3');

  const border = findChild(findChild(foreground, 'data-scale-id', 'x'), 'data-svg-part', 'border').children[0];
  assert.equal(border.getAttribute('y1'), '380');
  assert.equal(border.getAttribute('stroke-dasharray'), '4,2');
});

test('SVG scale nodes are reused and move with z, visibility and cleanup', () => {
  const chart = createChart();
  beginSvgRender(chart);
  const x = createScale(chart, 'x', 'x');
  const y = createScale(chart, 'y1', 'y', {z: 1});
  x.drawGrid(chart.chartArea);
  y.drawGrid(chart.chartArea);
  const background = chart.parent.children[0];
  const firstGrid = findChild(findChild(background, 'data-scale-id', 'x'), 'data-svg-part', 'grid').children[0];

  x.drawGrid(chart.chartArea);
  assert.equal(findChild(findChild(background, 'data-scale-id', 'x'), 'data-svg-part', 'grid').children[0], firstGrid);
  assert.ok(findChild(chart.parent.children[2], 'data-scale-id', 'y1'));

  x.options.grid.drawOnChartArea = false;
  x.options.grid.drawTicks = false;
  x.drawGrid(chart.chartArea);
  assert.equal(findChild(background, 'data-scale-id', 'x'), undefined);

  removeSvgRoot(chart);
  assert.deepEqual(chart.parent.children, [chart.canvas]);
});
