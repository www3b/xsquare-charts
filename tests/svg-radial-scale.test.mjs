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

function createCanvasChart(type, data, options = {}) {
  const document = {
    defaultView: {getComputedStyle: () => ({position: 'static'})},
    createElementNS: (_namespace, name) => new SvgNode(document, name),
  };
  const parent = new SvgNode(document);
  const canvas = new SvgNode(document);
  const calls = [];
  const canvasContext = new Proxy({
    canvas,
    measureText: (text) => ({
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: String(text).length * 8,
      width: String(text).length * 8,
    }),
  }, {
    get(target, property) {
      if (property in target) return target[property];
      return (...args) => calls.push([property, ...args]);
    }
  });
  Object.assign(canvas, {width: 400, height: 300, offsetLeft: 0, offsetTop: 0, getContext: () => canvasContext});
  parent.appendChild(canvas);
  const chart = new Chart(canvas, {
    type,
    data,
    options: {animation: false, plugins: {legend: false}, renderer: 'canvas', responsive: false, ...options},
  });
  return {canvas, chart, parent, calls};
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
  const firstAngle = angles.children[0];
  const firstLabel = labels.children[0];
  const firstTick = ticks.children[0];

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
  assert.equal(angles.children[0], firstAngle);
  assert.equal(labels.children[0], firstLabel);
  assert.equal(ticks.children[0], firstTick);
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
  }, {scales: {r: {backgroundColor: '#f8fafc'}}});
  assert.ok(part(chart, 'radial-background'));
  chart.options.scales.r.grid.display = false;
  chart.options.scales.r.angleLines.display = false;
  chart.options.scales.r.pointLabels.display = false;
  chart.options.scales.r.ticks.display = false;
  chart.options.scales.r.backgroundColor = undefined;
  chart.update('none');

  assert.equal(part(chart, 'radial-grid'), undefined);
  assert.equal(part(chart, 'angle-lines'), undefined);
  assert.equal(part(chart, 'point-labels'), undefined);
  assert.equal(part(chart, 'radial-ticks'), undefined);
  assert.equal(part(chart, 'radial-background'), undefined);
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

test('RadialLinearScale exposes resolved shared draw models and remains canvas-free during point-label fit', () => {
  const {chart} = createChart('radar', {
    labels: ['North', [], ['East', 'multiline'], 'West'],
    datasets: [{data: [0, 4, 8, 6]}],
  }, {
    scales: {
      r: {
        min: 0,
        max: 8,
        grid: {circular: false, color: (ctx) => ctx.index ? '#2563eb' : '#dc2626', lineWidth: (ctx) => ctx.index + 1},
        border: {dash: [4, 2], dashOffset: 3},
        angleLines: {color: (ctx) => ctx.index % 2 ? '#16a34a' : '#9333ea', lineWidth: 2, borderDash: [2, 1], borderDashOffset: 4},
        pointLabels: {backdropColor: '#fef3c7', backdropPadding: 3, borderRadius: 5, color: '#111827'},
        ticks: {showLabelBackdrop: true, backdropColor: '#e0f2fe', backdropPadding: 4, color: '#0f766e', textStrokeColor: '#fff', textStrokeWidth: 1},
      }
    }
  });
  const scale = chart.scales.r;
  let measurements = 0;
  const measureText = chart.renderer.measureText.bind(chart.renderer);
  chart.renderer.measureText = (...args) => {
    measurements++;
    return measureText(...args);
  };
  scale.ctx = null;
  chart.update('none');

  const circular = scale.getRadialShape(12, true);
  const polygon = scale.getRadialShape(12, false);
  assert.deepEqual(circular, {circular: true, x: scale.xCenter, y: scale.yCenter, radius: 12});
  assert.equal(polygon.circular, false);
  assert.equal(polygon.points.length, 4);
  assert.ok(polygon.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));
  assert.ok(measurements >= 3);
  assert.ok(scale._pointLabelItems.every((item) => Number.isFinite(item.left) && Number.isFinite(item.right)));

  const grid = scale.getRadialGridDrawItems();
  assert.ok(grid.length > 0);
  assert.equal(grid[0].shape.circular, false);
  assert.equal(grid[0].color, '#2563eb');
  assert.equal(grid[0].lineWidth, 2);
  assert.deepEqual(grid[0].borderDash, [4, 2]);
  assert.equal(grid[0].borderDashOffset, 3);
  scale.options.grid.display = false;
  assert.deepEqual(scale.getRadialGridDrawItems(), []);
  scale.options.grid.display = true;

  const angles = scale.getAngleLineDrawItems();
  assert.equal(angles.length, 4);
  assert.deepEqual(angles[0].borderDash, [2, 1]);
  assert.equal(angles[0].borderDashOffset, 4);
  assert.equal(angles[0].x1, scale.xCenter);
  assert.equal(angles[0].y1, scale.yCenter);
  scale.options.angleLines.display = false;
  assert.deepEqual(scale.getAngleLineDrawItems(), []);
  scale.options.angleLines.display = true;

  const labels = scale.getPointLabelDrawItems();
  assert.equal(labels.length, 4);
  assert.equal(labels[0].textAlign, scale._pointLabelItems[0].textAlign);
  assert.equal(labels[0].backdrop.borderRadius.topLeft, 5);
  assert.ok(Number.isFinite(labels[0].x) && Number.isFinite(labels[0].y));
  scale.options.pointLabels.display = false;
  assert.deepEqual(scale.getPointLabelDrawItems(), []);
  scale.options.pointLabels.display = true;

  const ticks = scale.getRadialTickDrawItems();
  assert.ok(ticks.length > 0);
  assert.equal(ticks[0].centerX, scale.xCenter);
  assert.equal(ticks[0].centerY, scale.yCenter);
  assert.equal(ticks[0].rotation, scale.getIndexAngle(0));
  assert.equal(ticks[0].color, '#0f766e');
  assert.equal(ticks[0].strokeColor, '#fff');
  assert.equal(ticks[0].strokeWidth, 1);
  assert.ok(ticks[0].backdrop.width > 0);
  scale.options.ticks.display = false;
  assert.deepEqual(scale.getRadialTickDrawItems(), []);
  chart.destroy();
});

test('Canvas radial renderer presents shared Radar and PolarArea models and survives renderer switches', () => {
  const {canvas, chart, parent, calls} = createCanvasChart('radar', {
    labels: ['A', 'B', 'C'],
    datasets: [{data: [3, 6, 4], backgroundColor: '#dbeafe', borderColor: '#2563eb'}],
  }, {
    scales: {
      r: {
        backgroundColor: '#f8fafc',
        grid: {circular: false, color: '#0f766e', lineWidth: 2},
        border: {dash: [3, 2], dashOffset: 1},
        angleLines: {color: '#9333ea', lineWidth: 2, borderDash: [2, 1]},
        pointLabels: {backdropColor: '#fef3c7', borderRadius: 3},
        ticks: {showLabelBackdrop: true, backdropColor: '#e0f2fe'},
      }
    }
  });
  assert.ok(calls.some(([name]) => name === 'arc' || name === 'lineTo'));
  assert.ok(calls.some(([name]) => name === 'stroke'));
  assert.ok(calls.some(([name]) => name === 'fill'));
  assert.ok(calls.some(([name]) => name === 'fillText'));
  assert.ok(calls.some(([name]) => name === 'setLineDash'));

  chart.options.renderer = 'svg';
  chart.update('none');
  assert.ok(part(chart, 'radial-grid'));
  assert.equal(parent.children.includes(canvas), false);
  chart.options.renderer = 'canvas';
  chart.update('none');
  assert.equal(chart.$chartjsSvgRoot, undefined);
  assert.ok(parent.children.includes(canvas));
  chart.destroy();

  const polar = createCanvasChart('polarArea', {
    labels: ['A', 'B', 'C'],
    datasets: [{data: [2, 5, 4], backgroundColor: ['#60a5fa', '#34d399', '#fbbf24']}],
  });
  assert.ok(polar.calls.some(([name]) => name === 'arc'));
  polar.chart.destroy();
});
