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
  return node && node.children.find((child) => child.getAttribute(attribute) === value);
}

function createContext(canvas) {
  const context = {canvas, measureText: (value) => ({width: String(value).length * 8})};
  return new Proxy(context, {
    get(target, property) {
      return property in target ? target[property] : () => {};
    }
  });
}

function createChart(datasets, options = {}) {
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
  canvas.getContext = () => createContext(canvas);
  parent.appendChild(canvas);
  const chart = new Chart(canvas, {
    type: 'line',
    data: {labels: ['One', 'Two', 'Three', 'Four'], datasets},
    options: {
      animation: false,
      plugins: {filler: {}, legend: false},
      renderer: 'svg',
      responsive: false,
      ...options,
    },
  });
  return {canvas, chart, parent};
}

function dataset(chart, index) {
  return findChild(findChild(chart.$chartjsSvgRoot, 'data-svg-layer', 'datasets'), 'data-dataset-index', String(index));
}

function part(chart, index, name) {
  return findChild(dataset(chart, index), 'data-svg-part', name);
}

function linePaths(chart, index) {
  const group = part(chart, index, 'line');
  return group ? group.children : [];
}

function lineDataset(overrides = {}) {
  return {
    borderColor: '#2563eb',
    borderDash: [6, 3],
    borderDashOffset: 2,
    borderWidth: 3,
    data: [2, 5, 3, 6],
    fill: false,
    pointRadius: 3,
    ...overrides,
  };
}

test('SVG LineElement serializes straight, bezier, stepped and gapped lines', () => {
  const cases = [
    {name: 'straight', dataset: lineDataset(), command: 'L', paths: 1},
    {name: 'bezier', dataset: lineDataset({tension: 0.4}), command: 'C', paths: 1},
    {name: 'stepped', dataset: lineDataset({stepped: 'middle'}), command: 'L', paths: 1},
    {name: 'gap', dataset: lineDataset({data: [2, null, 3, 6]}), command: 'M', moves: 2, paths: 1},
    {name: 'spanGaps', dataset: lineDataset({data: [2, null, 3, 6], spanGaps: true}), command: 'L', moves: 1, paths: 1},
  ];

  for (const {name, dataset: source, command, moves, paths} of cases) {
    const {chart} = createChart([source]);
    const rendered = linePaths(chart, 0);
    assert.equal(rendered.length, paths, name);
    assert.ok(rendered.every((path) => path.getAttribute('d').includes(command)), name);
    assert.equal(rendered[0].getAttribute('stroke'), '#2563eb', name);
    assert.equal(rendered[0].getAttribute('stroke-width'), '3', name);
    assert.equal(rendered[0].getAttribute('stroke-dasharray'), '6,3', name);
    assert.equal(rendered[0].getAttribute('stroke-dashoffset'), '2', name);
    if (moves) {
      assert.equal((rendered[0].getAttribute('d').match(/M/g) || []).length, moves, name);
    }
    chart.destroy();
  }
});

test('SVG LineElement preserves parts while borderWidth changes', () => {
  const {chart, canvas, parent} = createChart([lineDataset({borderWidth: 0, fill: true})]);
  const group = dataset(chart, 0);
  const fill = part(chart, 0, 'fill');
  const points = part(chart, 0, 'points');

  assert.ok(group);
  assert.ok(fill);
  assert.ok(points);
  assert.equal(part(chart, 0, 'line'), undefined);

  chart.data.datasets[0].borderWidth = 2;
  chart.update('none');
  const line = part(chart, 0, 'line');
  assert.equal(dataset(chart, 0), group);
  assert.equal(part(chart, 0, 'fill'), fill);
  assert.equal(part(chart, 0, 'points'), points);
  assert.ok(line);

  chart.data.datasets[0].borderWidth = 0;
  chart.update('none');
  assert.equal(dataset(chart, 0), group);
  assert.equal(part(chart, 0, 'fill'), fill);
  assert.equal(part(chart, 0, 'points'), points);
  assert.equal(part(chart, 0, 'line'), undefined);

  chart.options.renderer = 'canvas';
  chart.update('none');
  assert.equal(chart.$chartjsSvgRoot, undefined);
  chart.options.renderer = 'svg';
  chart.update('none');
  assert.ok(part(chart, 0, 'fill'));
  chart.destroy();
  assert.deepEqual(parent.children, [canvas]);
});

test('SVG LineElement applies segment styles and reuses nodes during updates', () => {
  const {chart} = createChart([lineDataset({
    segment: {
      borderColor: (context) => context.p0DataIndex === 1 ? '#dc2626' : '#2563eb',
      borderDash: (context) => context.p0DataIndex === 1 ? [2, 1] : [6, 3],
    },
  })]);
  const group = dataset(chart, 0);
  const paths = linePaths(chart, 0);
  const points = part(chart, 0, 'points');
  const firstPath = paths[0];
  const before = firstPath.getAttribute('d');

  assert.ok(paths.length > 1);
  assert.deepEqual(paths.map((path) => path.getAttribute('stroke')).sort(), ['#2563eb', '#2563eb', '#dc2626']);
  chart.render();
  assert.equal(linePaths(chart, 0)[0], firstPath);
  assert.equal(linePaths(chart, 0).length, paths.length);

  chart.data.datasets[0].data[1] = 7;
  chart.update('none');
  assert.equal(dataset(chart, 0), group);
  assert.equal(part(chart, 0, 'points'), points);
  assert.equal(linePaths(chart, 0)[0], firstPath);
  assert.notEqual(firstPath.getAttribute('d'), before);

  chart.resize(300, 240);
  assert.equal(dataset(chart, 0), group);
  chart.destroy();
});

test('SVG LineElement follows Chart.js draw order without recreating datasets', () => {
  const {chart, canvas, parent} = createChart([
    lineDataset({data: [1, 5, 2, 4], order: 0}),
    lineDataset({borderColor: '#dc2626', data: [5, 1, 4, 2], order: 1}),
  ]);
  const first = dataset(chart, 0);
  const second = dataset(chart, 1);
  const firstLine = linePaths(chart, 0)[0];
  const secondLine = linePaths(chart, 1)[0];
  const expectedDomOrder = () => chart.getSortedVisibleDatasetMetas().slice().reverse().map((meta) => String(meta.index));
  const domOrder = () => findChild(chart.$chartjsSvgRoot, 'data-svg-layer', 'datasets').children.map((node) => node.getAttribute('data-dataset-index'));

  assert.deepEqual(domOrder(), expectedDomOrder());
  chart.data.datasets[0].order = 2;
  chart.data.datasets[1].order = 0;
  chart.update('none');
  assert.deepEqual(domOrder(), expectedDomOrder());
  assert.equal(dataset(chart, 0), first);
  assert.equal(dataset(chart, 1), second);
  assert.equal(linePaths(chart, 0)[0], firstLine);
  assert.equal(linePaths(chart, 1)[0], secondLine);

  chart.data.datasets[0].order = 0;
  chart.data.datasets[1].order = 3;
  chart.update('none');
  assert.deepEqual(domOrder(), expectedDomOrder());
  chart.hide(1);
  assert.equal(dataset(chart, 1), undefined);
  chart.show(1);
  assert.ok(dataset(chart, 1));

  chart.options.renderer = 'canvas';
  chart.update('none');
  assert.equal(chart.$chartjsSvgRoot, undefined);
  chart.destroy();
  assert.deepEqual(parent.children, [canvas]);
});
