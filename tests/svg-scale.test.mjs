import assert from 'node:assert/strict';
import test from 'node:test';
import {CategoryScale, Chart, LineController, LineElement, LinearScale, PointElement, Scale} from '../dist/chart.js';
import {beginSvgRender, endSvgRender, removeSvgRoot} from '../src/helpers/helpers.svg.js';

Chart.register(CategoryScale, LineController, LineElement, LinearScale, PointElement);

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

  get lastElementChild() {
    return this.children[this.children.length - 1];
  }

  removeAttribute(name) {
    this.attributes.delete(name);
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
    axis,
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

function createRenderedScaleChart() {
  const document = {
    defaultView: {getComputedStyle: () => ({position: 'static'})},
    createElementNS: () => new SvgNode(document)
  };
  const parent = new SvgNode(document);
  const canvas = new SvgNode(document);
  canvas.width = 440;
  canvas.height = 300;
  canvas.offsetLeft = 0;
  canvas.offsetTop = 0;
  canvas.getContext = () => ({canvas, measureText: (value) => ({width: String(value).length * 8})});
  parent.appendChild(canvas);
  const chart = new Chart(canvas, {
    type: 'line',
    data: {labels: ['One', 'Two', 'Three'], datasets: [{data: [1, 3, 2]}]},
    options: {
      animation: false,
      plugins: {legend: false, tooltip: false},
      renderer: 'svg',
      responsive: false,
      scales: {
        x: {
          backgroundColor: '#eef',
          border: {color: '#112233', dash: [4, 2], dashOffset: 1, width: 2, z: 1},
          grid: {color: '#123456', lineWidth: 2, tickBorderDash: [2, 1], tickBorderDashOffset: 3, tickColor: '#654321', tickWidth: 1, z: -1},
          title: {display: true, text: 'Months'}
        },
        y: {grid: {color: '#abcdef', lineWidth: 1, z: 1}}
      }
    }
  });
  return {chart, parent};
}

function scalePart(chart, layer, id, part) {
  const root = chart.$chartjsSvgRoot;
  const scale = findChild(findChild(root, 'data-svg-layer', layer), 'data-scale-id', id);
  return scale && findChild(scale, 'data-svg-part', part);
}

test('Scale grid and border geometry remain renderer-neutral', () => {
  const chart = createChart();
  const scale = createScale(chart, 'x', 'x');
  const [grid] = scale.getGridLineItems(chart.chartArea);
  const border = scale.getBorderDrawItem();
  assert.deepEqual([grid.x1, grid.y1, grid.x2, grid.y2], [20, 20, 20, 380]);
  assert.deepEqual([grid.tx1, grid.ty1, grid.tx2, grid.ty2], [20, 380, 20, 390]);
  assert.equal(grid.tickBorderDashOffset, 3);
  assert.equal(border.y1, 380);
  assert.deepEqual(border.borderDash, [4, 2]);
});

test('Scale grid draw model exposes the configured z layers', () => {
  const chart = createChart();
  const x = createScale(chart, 'x', 'x');
  const y = createScale(chart, 'y1', 'y', {z: 1});
  assert.equal(x.options.grid.z, -1);
  assert.equal(y.options.grid.z, 1);
});

test('SvgRenderer renders cartesian scale parts, reuses nodes and cleans up stale parts', () => {
  const {chart} = createRenderedScaleChart();
  const grid = scalePart(chart, 'background', 'x', 'grid').children[0];
  const ticks = scalePart(chart, 'background', 'x', 'ticks').children[0];
  const border = scalePart(chart, 'foreground', 'x', 'border').children[0];
  assert.ok(grid.getAttribute('x1'));
  assert.ok(grid.getAttribute('y1'));
  assert.equal(grid.getAttribute('stroke'), '#123456');
  assert.equal(grid.getAttribute('stroke-width'), '2');
  assert.equal(grid.getAttribute('stroke-dasharray'), '4,2');
  assert.equal(grid.getAttribute('stroke-dashoffset'), '1');
  assert.ok(ticks.getAttribute('x1'));
  assert.equal(ticks.getAttribute('stroke'), '#654321');
  assert.equal(ticks.getAttribute('stroke-width'), '1');
  assert.equal(ticks.getAttribute('stroke-dasharray'), '2,1');
  assert.equal(ticks.getAttribute('stroke-dashoffset'), '3');
  assert.ok(border.getAttribute('x1'));
  assert.equal(border.getAttribute('stroke'), '#112233');
  assert.equal(border.getAttribute('stroke-width'), '2');
  assert.equal(border.getAttribute('stroke-dasharray'), '4,2');
  assert.equal(border.getAttribute('stroke-dashoffset'), '1');
  assert.ok(scalePart(chart, 'foreground', 'y', 'grid'));

  const labels = scalePart(chart, 'background', 'x', 'labels');
  chart.update('none');
  assert.equal(scalePart(chart, 'background', 'x', 'grid').children[0], grid);
  assert.equal(scalePart(chart, 'foreground', 'x', 'border').children[0], border);
  assert.equal(scalePart(chart, 'background', 'x', 'labels'), labels);

  const x = chart.options.scales.x;
  x.grid.drawOnChartArea = false;
  x.grid.drawTicks = false;
  x.ticks.display = false;
  x.border.display = false;
  x.title.display = false;
  x.backgroundColor = undefined;
  chart.update('none');
  assert.equal(scalePart(chart, 'background', 'x', 'grid'), undefined);
  assert.equal(scalePart(chart, 'background', 'x', 'ticks'), undefined);
  assert.equal(scalePart(chart, 'background', 'x', 'labels'), undefined);
  assert.equal(scalePart(chart, 'foreground', 'x', 'border'), undefined);
  assert.equal(scalePart(chart, 'background', 'x', 'title'), undefined);
  assert.equal(scalePart(chart, 'background', 'x', 'background'), undefined);

  x.grid.drawOnChartArea = true;
  x.grid.drawTicks = true;
  x.ticks.display = true;
  x.border.display = true;
  x.title.display = true;
  x.backgroundColor = '#eef';
  chart.update('none');
  assert.ok(scalePart(chart, 'background', 'x', 'grid').children.length > 0);
  assert.ok(scalePart(chart, 'background', 'x', 'ticks').children.length > 0);
  assert.ok(scalePart(chart, 'background', 'x', 'labels').children.length > 0);
  assert.ok(scalePart(chart, 'foreground', 'x', 'border').children.length > 0);
  assert.ok(scalePart(chart, 'background', 'x', 'title').children.length > 0);
  assert.ok(scalePart(chart, 'background', 'x', 'background').children.length > 0);
  chart.destroy();
});

test('SVG root and layers are reused through resize and renderer switches', () => {
  const chart = createChart();
  beginSvgRender(chart);
  const root = chart.$chartjsSvgRoot;
  const layers = root.children.slice();
  endSvgRender(chart);

  chart.width = 600;
  chart.height = 240;
  beginSvgRender(chart);
  endSvgRender(chart);
  assert.equal(chart.$chartjsSvgRoot, root);
  assert.deepEqual(root.children, layers);
  assert.equal(root.getAttribute('width'), '600');
  assert.equal(root.getAttribute('height'), '240');
  assert.equal(root.getAttribute('viewBox'), '0 0 600 240');

  chart.options.renderer = 'canvas';
  beginSvgRender(chart);
  assert.equal(chart.$chartjsSvgRoot, undefined);
  assert.deepEqual(chart.parent.children, [chart.canvas]);
  chart.options.renderer = 'svg';
  beginSvgRender(chart);
  assert.equal(chart.parent.children.filter((node) => node.getAttribute('data-chart-svg') === 'true').length, 1);
  endSvgRender(chart);
  removeSvgRoot(chart);
});

test('Canvas cartesian scale renders background, grid, labels and title through its renderer', () => {
  const document = {
    defaultView: {getComputedStyle: () => ({position: 'static'})},
    createElementNS: () => new SvgNode(document)
  };
  const parent = new SvgNode(document);
  const canvas = new SvgNode(document);
  canvas.width = 400;
  canvas.height = 240;
  canvas.offsetLeft = 0;
  canvas.offsetTop = 0;
  const calls = [];
  const context = new Proxy({
    canvas,
    measureText(value) {
      return {actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2, actualBoundingBoxLeft: 0, actualBoundingBoxRight: String(value).length * 8, width: String(value).length * 8};
    }
  }, {
    get(target, property) {
      if (property in target) return target[property];
      return (...args) => calls.push([property, ...args]);
    }
  });
  canvas.getContext = () => context;
  parent.appendChild(canvas);
  const chart = new Chart(canvas, {
    type: 'line',
    data: {labels: ['One', 'Two', 'Three'], datasets: [{data: [1, 3, 2]}]},
    options: {
      animation: false,
      plugins: {legend: false, tooltip: false},
      renderer: 'canvas',
      responsive: false,
      scales: {
        x: {backgroundColor: '#eef', title: {display: true, text: 'Months'}},
        y: {title: {display: true, text: 'Value'}}
      }
    }
  });
  assert.ok(calls.some(([name]) => name === 'fillRect'));
  assert.ok(calls.some(([name]) => name === 'stroke'));
  assert.ok(calls.some(([name, text]) => name === 'fillText' && (text === 'Months' || text === 'Value')));
  chart.destroy();
});
