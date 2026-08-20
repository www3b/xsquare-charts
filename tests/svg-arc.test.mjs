import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ArcElement,
  Chart,
  DoughnutController,
  PieController,
} from '../dist/chart.js';

Chart.register(ArcElement, DoughnutController, PieController);

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

function createChart(type, datasets, options = {}) {
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
    type,
    data: {labels: ['A', 'B', 'C', 'D'], datasets},
    options: {
      animation: false,
      plugins: {legend: false},
      renderer: 'svg',
      responsive: false,
      ...options,
    },
  });
  return {canvas, chart, parent};
}

function arcs(chart, datasetIndex) {
  const datasetGroup = findChild(chart.$chartjsSvgRoot, 'data-dataset-index', String(datasetIndex));
  const group = datasetGroup && findChild(datasetGroup, 'data-svg-part', 'arcs');
  return group ? group.children.map((arc) => arc.children[0]) : [];
}

function dataset(data, overrides = {}) {
  return {
    backgroundColor: ['#60a5fa', '#34d399', '#fbbf24', '#f472b6'],
    borderColor: '#172554',
    borderWidth: 3,
    data,
    ...overrides,
  };
}

// eslint-disable-next-line max-statements
test('SVG ArcElement renders pie and doughnut paths with reusable styles', () => {
  const {canvas, chart, parent} = createChart('pie', [dataset([10, 20, 30], {
    hoverBackgroundColor: '#c084fc',
    hoverBorderColor: '#4c1d95',
  })]);
  const paths = arcs(chart, 0);
  const first = paths[0];

  assert.equal(paths.length, 3);
  assert.equal(first.getAttribute('data-role'), 'arc');
  assert.equal(first.getAttribute('fill'), '#60a5fa');
  assert.equal(first.getAttribute('stroke'), '#172554');
  assert.equal(first.getAttribute('stroke-width'), '3');
  assert.ok(first.getAttribute('d').includes('A'));

  const before = first.getAttribute('d');
  chart.data.datasets[0].data[0] = 25;
  chart.update('none');
  assert.equal(arcs(chart, 0)[0], first);
  assert.notEqual(first.getAttribute('d'), before);
  chart.render();
  assert.equal(arcs(chart, 0).length, 3);

  const preResize = first.getAttribute('d');
  chart.resize(500, 250);
  assert.notEqual(first.getAttribute('d'), preResize);

  chart.setActiveElements([{datasetIndex: 0, index: 0}]);
  chart.render();
  assert.equal(arcs(chart, 0).at(-1), first);
  assert.equal(first.getAttribute('fill'), '#c084fc');
  assert.equal(first.getAttribute('stroke'), '#4c1d95');

  chart.toggleDataVisibility(1);
  chart.update('none');
  assert.equal(arcs(chart, 0).length, 2);
  chart.toggleDataVisibility(1);
  chart.update('none');
  assert.equal(arcs(chart, 0).length, 3);

  chart.data.datasets[0].data.push(15);
  chart.update('none');
  assert.equal(arcs(chart, 0).length, 4);
  chart.data.datasets[0].data.pop();
  chart.update('none');
  assert.equal(arcs(chart, 0).length, 3);

  chart.options.renderer = 'canvas';
  chart.update('none');
  assert.equal(chart.$chartjsSvgRoot, undefined);
  assert.deepEqual(parent.children, [canvas]);
  chart.options.renderer = 'svg';
  chart.update('none');
  assert.equal(arcs(chart, 0).length, 3);
  chart.destroy();
  assert.deepEqual(parent.children, [canvas]);
});

test('SVG ArcElement handles doughnut borders, transforms and arc variants', () => {
  const inner = createChart('doughnut', [dataset([10, 20], {
    borderAlign: 'inner',
    borderDash: [4, 2],
    borderDashOffset: 3,
    borderRadius: 10,
    offset: 16,
    spacing: 6,
  })]);
  const first = arcs(inner.chart, 0)[0];
  const group = first.parentNode;

  assert.equal(first.getAttribute('stroke-width'), '6');
  assert.equal(first.getAttribute('stroke-dasharray'), '4,2');
  assert.equal(first.getAttribute('stroke-dashoffset'), '3');
  assert.ok(first.getAttribute('clip-path').startsWith('url(#chartjs-'));
  assert.notEqual(group.getAttribute('transform'), 'translate(0 0)');
  assert.ok(first.getAttribute('d').includes('A'));
  assert.ok(findChild(inner.chart.$chartjsSvgRoot, 'data-svg-defs', 'true'));
  inner.chart.destroy();

  const polygon = createChart('doughnut', [dataset([10], {circular: false})], {circumference: 180});
  assert.equal(arcs(polygon.chart, 0)[0].getAttribute('d').includes('A'), false);
  polygon.chart.destroy();

  const full = createChart('doughnut', [dataset([10], {selfJoin: true})]);
  assert.ok(arcs(full.chart, 0)[0].getAttribute('d').match(/A.*A/));
  full.chart.destroy();

  const rings = createChart('doughnut', [dataset([10, 20]), dataset([5, 15])]);
  assert.equal(arcs(rings.chart, 0).length, 2);
  assert.equal(arcs(rings.chart, 1).length, 2);
  rings.chart.hide(1);
  assert.equal(arcs(rings.chart, 1).length, 0);
  rings.chart.destroy();
});
