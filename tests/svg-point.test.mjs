import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CategoryScale,
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
} from '../dist/chart.js';

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

function createCanvas() {
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
  return {canvas, parent};
}

function createChart() {
  const {canvas, parent} = createCanvas();
  const styles = ['circle', 'triangle', 'rect', 'rectRounded', 'rectRot', 'cross', 'crossRot', 'star', 'line', 'dash', false];
  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: styles.map((_, index) => index),
      datasets: [{
        backgroundColor: '#ffffff',
        borderColor: '#123456',
        borderWidth: 2,
        data: styles.map((_, index) => index + 1),
        pointBackgroundColor: '#abcdef',
        pointBorderColor: '#123456',
        pointBorderWidth: 3,
        pointHoverBackgroundColor: '#fedcba',
        pointHoverBorderColor: '#654321',
        pointHoverBorderWidth: 4,
        pointHoverRadius: 8,
        pointRadius: 5,
        pointRotation: 25,
        pointStyle: styles,
      }, {
        borderColor: '#ff0000',
        data: styles.map((_, index) => index + 2),
        pointRadius: 4,
      }],
    },
    options: {
      animation: false,
      plugins: {legend: false},
      renderer: 'svg',
      responsive: false,
    },
  });
  return {chart, parent};
}

function pointGroup(chart, datasetIndex) {
  const root = findChild(chart.$chartjsSvgRoot, 'data-svg-layer', 'datasets');
  const dataset = findChild(root, 'data-dataset-index', String(datasetIndex));
  return findChild(dataset, 'data-svg-part', 'points');
}

// eslint-disable-next-line max-statements
test('SVG PointElement reuses standard point geometry, styles and DOM nodes', () => {
  const {chart, parent} = createChart();
  const canvas = chart.canvas;
  const points = pointGroup(chart, 0);
  const line = findChild(findChild(findChild(chart.$chartjsSvgRoot, 'data-svg-layer', 'datasets'), 'data-dataset-index', '0'), 'data-svg-part', 'line');

  assert.ok(line);
  assert.ok(points);
  assert.equal(points.children.length, 10);
  assert.equal(pointGroup(chart, 1).children.length, 11);
  assert.equal(points.children[0].getAttribute('fill'), '#abcdef');
  assert.equal(points.children[0].getAttribute('stroke'), '#123456');
  assert.equal(points.children[0].getAttribute('stroke-width'), '3');
  assert.ok(points.children.every((point) => point.getAttribute('d')));
  assert.equal(line.parentNode.children.indexOf(line) < line.parentNode.children.indexOf(points), true);

  const circle = points.children[0];
  const before = circle.getAttribute('d');
  chart.data.datasets[0].pointRadius = 7;
  chart.update('none');
  assert.equal(pointGroup(chart, 0).children[0], circle);
  assert.notEqual(circle.getAttribute('d'), before);

  const triangle = pointGroup(chart, 0).children[1];
  const triangleBeforeRotation = triangle.getAttribute('d');
  chart.data.datasets[0].pointRotation = 0;
  chart.update('none');
  assert.notEqual(triangle.getAttribute('d'), triangleBeforeRotation);

  const beforeHover = circle.getAttribute('d');
  chart.setActiveElements([{datasetIndex: 0, index: 0}]);
  chart.render();
  assert.equal(circle.getAttribute('fill'), '#fedcba');
  assert.equal(circle.getAttribute('stroke'), '#654321');
  assert.equal(circle.getAttribute('stroke-width'), '4');
  assert.notEqual(circle.getAttribute('d'), beforeHover);
  assert.equal(pointGroup(chart, 0).children.at(-1), circle);

  chart.data.datasets[0].data[1] = null;
  chart.update('none');
  assert.equal(pointGroup(chart, 0).children.length, 9);

  chart.data.labels.push(11);
  chart.data.datasets[0].data.push(12);
  chart.update('none');
  assert.equal(pointGroup(chart, 0).children.length, 10);

  chart.setActiveElements([]);
  chart.data.datasets[0].pointRadius = 0;
  chart.update('none');
  assert.equal(pointGroup(chart, 0).children.length, 0);

  chart.options.renderer = 'canvas';
  chart.update('none');
  assert.equal(chart.$chartjsSvgRoot, undefined);
  assert.deepEqual(parent.children, [canvas]);

  chart.options.renderer = 'svg';
  chart.update('none');
  assert.ok(chart.$chartjsSvgRoot);
  chart.destroy();
  assert.deepEqual(parent.children, [canvas]);
});
