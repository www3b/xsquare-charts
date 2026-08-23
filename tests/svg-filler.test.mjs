import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CategoryScale,
  Chart,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  RadarController,
  RadialLinearScale,
} from '../dist/chart.js';

Chart.register(CategoryScale, Filler, LineController, LineElement, LinearScale, PointElement, RadarController, RadialLinearScale);

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

function createContext(canvas) {
  const context = {canvas, measureText: () => ({width: 10})};
  return new Proxy(context, {
    get(target, property) {
      return property in target ? target[property] : () => {};
    }
  });
}

function createChart(datasets, filler = {}) {
  const document = {
    defaultView: {getComputedStyle: () => ({position: 'static'})},
    createElementNS: () => new SvgNode(document)
  };
  const parent = new SvgNode(document);
  const canvas = new SvgNode(document);
  canvas.width = 400;
  canvas.height = 300;
  canvas.offsetLeft = 0;
  canvas.offsetTop = 0;
  canvas.getContext = () => createContext(canvas);
  parent.appendChild(canvas);
  const chart = new Chart(canvas, {
    type: 'line',
    data: {labels: [0, 1, 2, 3], datasets},
    options: {
      animation: false,
      plugins: {filler, legend: false},
      renderer: 'svg',
      responsive: false,
    },
  });
  return {canvas, chart, parent};
}

function createCanvasChart(datasets, filler = {}) {
  const document = {
    defaultView: {getComputedStyle: () => ({position: 'static'})},
    createElementNS: () => new SvgNode(document)
  };
  const parent = new SvgNode(document);
  const canvas = new SvgNode(document);
  const calls = [];
  const context = new Proxy({
    canvas,
    measureText: () => ({width: 10})
  }, {
    get(target, property) {
      if (property in target) return target[property];
      return (...args) => calls.push([property, ...args]);
    },
    set(target, property, value) {
      calls.push(['set', property, value]);
      target[property] = value;
      return true;
    }
  });
  Object.assign(canvas, {width: 400, height: 300, offsetLeft: 0, offsetTop: 0, getContext: () => context});
  parent.appendChild(canvas);
  const chart = new Chart(canvas, {
    type: 'line', data: {labels: [0, 1, 2, 3], datasets},
    options: {animation: false, plugins: {filler, legend: false}, renderer: 'canvas', responsive: false}
  });
  return {canvas, chart, parent, calls};
}

function fillGroup(chart, datasetIndex) {
  const dataset = findChild(findChild(chart.$chartjsSvgRoot, 'data-svg-layer', 'datasets'), 'data-dataset-index', String(datasetIndex));
  return dataset && findChild(dataset, 'data-svg-part', 'fill');
}

function fillPaths(chart, datasetIndex) {
  const group = fillGroup(chart, datasetIndex);
  return group ? group.children.map((item) => item.children[0]) : [];
}

function areaDataset(fill = true, overrides = {}) {
  return {
    backgroundColor: '#66aaff',
    borderColor: '#2266bb',
    data: [2, 5, 3, 6],
    fill,
    pointRadius: 3,
    tension: 0.35,
    ...overrides,
  };
}

// eslint-disable-next-line max-statements
test('SVG filler reuses the existing line/target geometry and cleans up nodes', () => {
  const {canvas, chart, parent} = createChart([
    areaDataset(true),
    areaDataset(0, {backgroundColor: '#ff99aa', data: [4, 3, 5, 2]}),
    areaDataset(false, {backgroundColor: '#cccccc'}),
  ]);
  const fills = fillPaths(chart, 0);
  const dataset = findChild(findChild(chart.$chartjsSvgRoot, 'data-svg-layer', 'datasets'), 'data-dataset-index', '0');
  const line = findChild(dataset, 'data-svg-part', 'line');
  const points = findChild(dataset, 'data-svg-part', 'points');

  assert.equal(fills.length, 1);
  assert.equal(fills[0].getAttribute('data-role'), 'fill');
  assert.equal(fills[0].getAttribute('fill'), '#66aaff');
  assert.equal(fills[0].getAttribute('stroke'), 'none');
  assert.ok(fills[0].getAttribute('d'));
  assert.ok(fills[0].getAttribute('d').includes('C'));
  assert.equal(dataset.children.indexOf(fillGroup(chart, 0)) < dataset.children.indexOf(line), true);
  assert.equal(dataset.children.indexOf(line) < dataset.children.indexOf(points), true);
  assert.equal(fillPaths(chart, 1).length, 1);
  assert.equal(fillGroup(chart, 2), undefined);

  const first = fills[0];
  const defs = findChild(chart.$chartjsSvgRoot, 'data-svg-defs', 'true');
  const firstClip = defs.children[0];
  const before = first.getAttribute('d');
  chart.render();
  assert.equal(fillPaths(chart, 0)[0], first);
  assert.equal(fillPaths(chart, 0).length, 1);
  chart.data.datasets[0].data[1] = 7;
  chart.update('none');
  assert.equal(fillPaths(chart, 0)[0], first);
  assert.notEqual(first.getAttribute('d'), before);
  assert.equal(fillPaths(chart, 0).length, 1);
  assert.equal(defs.children[0], firstClip);

  chart.hide(0);
  assert.equal(fillGroup(chart, 0), undefined);
  chart.show(0);
  assert.equal(fillPaths(chart, 0).length, 1);

  chart.data.datasets[0].fill = false;
  chart.update('none');
  assert.equal(fillGroup(chart, 0), undefined);
  chart.data.datasets[0].fill = 'end';
  chart.update('none');
  assert.equal(fillPaths(chart, 0).length, 1);

  chart.options.renderer = 'canvas';
  chart.update('none');
  assert.equal(chart.$chartjsSvgRoot, undefined);
  assert.deepEqual(parent.children, [canvas]);
  chart.options.renderer = 'svg';
  chart.update('none');
  assert.equal(fillPaths(chart, 0).length, 1);
  chart.destroy();
  assert.deepEqual(parent.children, [canvas]);
});

test('SVG filler supports boundary targets and above/below clipping', () => {
  const targets = ['origin', 'start', 'end', {value: 4}, 'stack', 'shape'];
  for (const target of targets) {
    const {chart} = createChart([areaDataset(target)]);
    assert.equal(fillPaths(chart, 0).length, 1, `fill ${JSON.stringify(target)}`);
    chart.destroy();
  }

  const {chart} = createChart([areaDataset({target: 'origin', above: '#00aa00', below: '#aa0000'}, {
    data: [-2, 3, -1, 4],
    stepped: true,
  })]);
  const paths = fillPaths(chart, 0);
  assert.equal(paths.length, 2);
  assert.deepEqual(paths.map((path) => path.getAttribute('fill')).sort(), ['#00aa00', '#aa0000']);
  assert.ok(paths.every((path) => path.getAttribute('clip-path').startsWith('url(#chartjs-')));
  assert.ok(findChild(chart.$chartjsSvgRoot, 'data-svg-defs', 'true'));
  chart.destroy();
});

test('SVG filler preserves source segments for gaps and spanGaps', () => {
  const gap = createChart([areaDataset('origin', {data: [2, null, 4, 3]})]);
  assert.equal(fillPaths(gap.chart, 0).length, 2);
  gap.chart.destroy();

  const spanning = createChart([areaDataset('origin', {data: [2, null, 4, 3], spanGaps: true})]);
  assert.equal(fillPaths(spanning.chart, 0).length, 1);
  spanning.chart.destroy();
});

test('SVG filler places global drawTime phases before datasets and cleans up runtime switches', () => {
  const {chart} = createChart([
    areaDataset('origin', {order: 2, backgroundColor: '#f00'}),
    areaDataset('origin', {order: 1, backgroundColor: '#0f0'}),
  ], {drawTime: 'beforeDatasetsDraw'});
  const root = chart.$chartjsSvgRoot;
  const datasets = findChild(root, 'data-svg-layer', 'datasets');
  const phase = findChild(datasets, 'data-filler-phase', 'before-datasets');
  assert.ok(phase);
  assert.equal(datasets.children[0], phase);
  assert.equal(phase.children.length, 2);
  assert.deepEqual(phase.children.map((child) => child.getAttribute('data-filler-index')), ['0', '1']);
  assert.equal(fillGroup(chart, 0), undefined);

  chart.options.plugins.filler.drawTime = 'beforeDraw';
  chart.update('none');
  const background = findChild(root, 'data-svg-layer', 'background');
  const beforeDraw = findChild(background, 'data-chart-svg-part', 'filler-before-draw');
  assert.ok(beforeDraw);
  assert.equal(background.children[0], beforeDraw);
  assert.equal(findChild(datasets, 'data-filler-phase', 'before-datasets'), undefined);

  chart.options.plugins.filler.drawTime = 'beforeDatasetDraw';
  chart.update('none');
  assert.equal(findChild(background, 'data-chart-svg-part', 'filler-before-draw'), undefined);
  const dataset = findChild(datasets, 'data-dataset-index', '0');
  assert.ok(fillGroup(chart, 0));
  assert.equal(dataset.children[0], fillGroup(chart, 0));
  chart.destroy();
});

test('Canvas filler consumes shared models for sides, gaps, segment styles and renderer switching', () => {
  const {canvas, chart, parent, calls} = createCanvasChart([
    areaDataset({target: 'origin', above: '#0a0', below: '#a00'}, {
      data: [-2, null, 4, -1],
      segment: {backgroundColor: '#f0f'},
      stepped: true,
    })
  ], {drawTime: 'beforeDatasetsDraw'});
  assert.ok(calls.some(([name]) => name === 'clip'));
  assert.ok(calls.some(([name]) => name === 'fill'));
  assert.ok(calls.some(([name, property, value]) => name === 'set' && property === 'fillStyle' && value === '#f0f'));
  chart.options.renderer = 'svg';
  chart.update('none');
  assert.ok(chart.$chartjsSvgRoot);
  chart.options.renderer = 'canvas';
  chart.update('none');
  assert.equal(chart.$chartjsSvgRoot, undefined);
  assert.ok(parent.children.includes(canvas));
  assert.ok(calls.filter(([name]) => name === 'fill').length > 1);
  chart.destroy();
});

test('Radar filler preserves loop geometry and fill rule in SVG and Canvas', () => {
  const document = {
    defaultView: {getComputedStyle: () => ({position: 'static'})},
    createElementNS: () => new SvgNode(document)
  };
  const parent = new SvgNode(document);
  const canvas = new SvgNode(document);
  canvas.width = 400;
  canvas.height = 300;
  canvas.offsetLeft = 0;
  canvas.offsetTop = 0;
  canvas.getContext = () => createContext(canvas);
  parent.appendChild(canvas);
  const chart = new Chart(canvas, {
    type: 'radar',
    data: {labels: ['A', 'B', 'C', 'D'], datasets: [{data: [2, 5, 3, 4], fill: 'shape', backgroundColor: '#60a5fa'}]},
    options: {animation: false, plugins: {filler: {}, legend: false}, renderer: 'svg', responsive: false}
  });
  const group = fillGroup(chart, 0);
  const path = fillPaths(chart, 0)[0];
  assert.ok(group);
  assert.match(path.getAttribute('d'), /Z$/);
  assert.equal(path.getAttribute('fill-rule'), 'evenodd');
  chart.options.renderer = 'canvas';
  chart.update('none');
  assert.equal(chart.$chartjsSvgRoot, undefined);
  chart.destroy();
});
