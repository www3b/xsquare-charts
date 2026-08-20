import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ArcElement,
  Chart,
  Filler,
  Legend,
  LineElement,
  PointElement,
  PolarAreaController,
  RadialLinearScale,
  RadarController,
} from '../dist/chart.js';

Chart.register(ArcElement, Filler, Legend, LineElement, PointElement, PolarAreaController, RadialLinearScale, RadarController);

class SvgNode {
  constructor(document, name = 'svg') {
    this.ownerDocument = document;
    this.nodeName = name;
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

function find(node, attribute, value) {
  if (node.getAttribute(attribute) === value) {
    return node;
  }
  for (const child of node.children) {
    const found = find(child, attribute, value);
    if (found) {
      return found;
    }
  }
}

function context(canvas) {
  const value = {canvas, measureText: (text) => ({width: String(text).length * 8})};
  return new Proxy(value, {get: (target, property) => property in target ? target[property] : () => {}});
}

function createChart(type, data, options = {}) {
  const document = {
    defaultView: {getComputedStyle: () => ({position: 'static'})},
    createElementNS: (_namespace, name) => new SvgNode(document, name),
  };
  const parent = new SvgNode(document);
  const canvas = new SvgNode(document);
  Object.assign(canvas, {width: 400, height: 300, offsetLeft: 0, offsetTop: 0, getContext: () => context(canvas)});
  parent.appendChild(canvas);
  const chart = new Chart(canvas, {
    type,
    data,
    options: {animation: false, plugins: {legend: false}, renderer: 'svg', responsive: false, ...options},
  });
  return {canvas, chart, parent};
}

function part(chart, name) {
  return find(chart.$chartjsSvgRoot, 'data-svg-part', name);
}

test('RadialLinearScale renders reusable polygon geometry, labels and per-index styles in SVG', () => {
  const {canvas, chart, parent} = createChart('radar', {
    labels: ['North', ['East', 'multiline'], 'South', 'West'],
    datasets: [{label: 'First', data: [4, 7, 5, 8], backgroundColor: 'rgba(96, 165, 250, .3)', borderColor: '#2563eb', fill: true}],
  }, {
    scales: {
      r: {
        angleLines: {
          color: (ctx) => ctx.index % 2 ? '#dc2626' : '#16a34a',
          lineWidth: (ctx) => ctx.index + 1,
          borderDash: [3, 2],
          borderDashOffset: 1,
        },
        backgroundColor: '#f8fafc',
        grid: {
          circular: false,
          color: (ctx) => ctx.index % 2 ? '#9333ea' : '#0891b2',
          lineWidth: (ctx) => ctx.index + 1,
        },
        pointLabels: {
          backdropColor: '#fef3c7',
          borderRadius: 4,
          color: (ctx) => ctx.index % 2 ? '#b91c1c' : '#166534',
          font: (ctx) => ({size: 10 + ctx.index}),
        },
        ticks: {color: (ctx) => ctx.index % 2 ? '#7c3aed' : '#0f766e'},
      },
    },
  });
  const background = part(chart, 'radial-background');
  const grid = part(chart, 'radial-grid');
  const angles = part(chart, 'angle-lines');
  const labels = part(chart, 'point-labels');
  const ticks = part(chart, 'radial-ticks');
  const firstGrid = grid.children[0];

  assert.ok(part(chart, 'line'));
  assert.ok(part(chart, 'points'));
  assert.ok(part(chart, 'fill'));
  assert.ok(background.children[0].getAttribute('d').endsWith('Z'));
  assert.ok(grid.children.length > 1);
  assert.match(firstGrid.getAttribute('d'), /L/);
  assert.notEqual(grid.children[0].getAttribute('stroke'), grid.children[1].getAttribute('stroke'));
  assert.equal(angles.children[0].getAttribute('stroke-dasharray'), '3,2');
  assert.equal(labels.children.length, 4);
  assert.equal(labels.children[1].children[0].nodeName, 'path');
  assert.equal(labels.children[1].children[1].children[0].nodeName, 'text');
  assert.ok(ticks.children.length > 0);
  assert.match(ticks.children[0].getAttribute('transform'), /rotate\(0\)/);

  const polygonPath = firstGrid.getAttribute('d');
  chart.options.scales.r.startAngle = 45;
  chart.update('none');
  assert.equal(part(chart, 'radial-grid'), grid);
  assert.notEqual(firstGrid.getAttribute('d'), polygonPath);
  assert.match(ticks.children[0].getAttribute('transform'), /rotate\(45\)/);

  chart.options.scales.r.grid.circular = true;
  chart.update('none');
  assert.equal(part(chart, 'radial-grid'), grid);
  assert.equal(grid.children[0], firstGrid);
  assert.match(firstGrid.getAttribute('d'), /A/);
  chart.resize(500, 260);
  assert.equal(part(chart, 'radial-grid'), grid);

  chart.options.renderer = 'canvas';
  chart.update('none');
  assert.equal(chart.$chartjsSvgRoot, undefined);
  assert.deepEqual(parent.children, [canvas]);
  chart.options.renderer = 'svg';
  chart.update('none');
  assert.ok(part(chart, 'radial-grid'));
  chart.destroy();
});

test('RadialLinearScale removes independently hidden SVG parts', () => {
  const {chart} = createChart('radar', {
    labels: ['A', 'B', 'C'],
    datasets: [{data: [2, 4, 6], borderColor: '#2563eb'}],
  });
  chart.options.scales.r.grid.display = false;
  chart.options.scales.r.angleLines.display = false;
  chart.options.scales.r.pointLabels.display = false;
  chart.options.scales.r.ticks.display = false;
  chart.update('none');

  assert.equal(part(chart, 'radial-grid'), undefined);
  assert.equal(part(chart, 'angle-lines'), undefined);
  assert.equal(part(chart, 'point-labels'), undefined);
  assert.equal(part(chart, 'radial-ticks'), undefined);
  chart.destroy();
});

test('PolarArea receives circular radial SVG scale without controller-specific rendering', () => {
  const {chart} = createChart('polarArea', {
    labels: ['A', 'B', 'C'],
    datasets: [{data: [4, 7, 3], backgroundColor: ['#60a5fa', '#34d399', '#fbbf24']}],
  });
  const grid = part(chart, 'radial-grid');

  assert.match(grid.children[0].getAttribute('d'), /A/);
  assert.equal(part(chart, 'point-labels'), undefined);
  assert.ok(find(chart.$chartjsSvgRoot, 'data-svg-part', 'arcs'));
  chart.options.scales.r.pointLabels = {display: true, centerPointLabels: true};
  chart.update('none');
  assert.equal(part(chart, 'point-labels').children.length, 3);
  chart.toggleDataVisibility(1);
  chart.update('none');
  assert.equal(part(chart, 'point-labels').children.length, 2);
  chart.destroy();
});
