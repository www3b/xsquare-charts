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
} from '../dist/chart.js';

Chart.register(CategoryScale, Filler, LineController, LineElement, LinearScale, PointElement);

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

function fillGroup(chart, datasetIndex) {
  const dataset = findChild(chart.$chartjsSvgRoot, 'data-dataset-index', String(datasetIndex));
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
  const dataset = findChild(chart.$chartjsSvgRoot, 'data-dataset-index', '0');
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
