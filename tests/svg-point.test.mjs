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
  constructor(document, localName) {
    this.ownerDocument = document;
    this.localName = localName;
    this.nodeName = localName;
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
    createElementNS: (_, name) => new SvgNode(document, name)
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
  return {canvas, chart, parent};
}

function pointGroup(chart, datasetIndex) {
  const root = findChild(chart.$chartjsSvgRoot, 'data-svg-layer', 'datasets');
  const dataset = findChild(root, 'data-dataset-index', String(datasetIndex));
  return findChild(dataset, 'data-svg-part', 'points');
}

// eslint-disable-next-line max-statements
test('SVG PointElement reuses standard point geometry, styles and DOM nodes', () => {
  const {canvas, chart, parent} = createChart();
  assert.equal(chart.canvas, null);
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

test('SVG surface uses the shared interaction geometry for point, nearest, index and dataset modes', () => {
  const {chart} = createChart();
  const point = chart.getDatasetMeta(0).data[2];
  const event = {type: 'mousemove', x: point.x, y: point.y, native: null};

  const pointItems = chart.getElementsAtEventForMode(event, 'point', {intersect: true}, false);
  const nearestItems = chart.getElementsAtEventForMode(event, 'nearest', {axis: 'xy', intersect: true}, false);
  const indexItems = chart.getElementsAtEventForMode(event, 'index', {axis: 'x', intersect: false}, false);
  const datasetItems = chart.getElementsAtEventForMode(event, 'dataset', {intersect: true}, false);

  assert.deepEqual(pointItems.map(({datasetIndex, index}) => [datasetIndex, index]), [[0, 2]]);
  assert.deepEqual(nearestItems.map(({datasetIndex, index}) => [datasetIndex, index]), [[0, 2]]);
  assert.deepEqual(indexItems.map(({index}) => index), [2, 2]);
  assert.equal(datasetItems.length, chart.getDatasetMeta(0).data.length);
  assert.throws(() => chart.toBase64Image(), /available only when renderer is 'canvas'/);
  chart.destroy();
});

test('SVG PointElement renders HTMLImageElement point styles without Canvas drawing', () => {
  const {chart} = createChart();
  const image = {
    height: 12,
    src: 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E',
    width: 18,
    [Symbol.toStringTag]: 'HTMLImageElement'
  };

  chart.data.datasets[0].pointStyle = image;
  chart.data.datasets[0].pointRotation = 30;
  chart.update('none');

  const points = pointGroup(chart, 0);
  const first = points.children[0];
  assert.equal(first.localName, 'image');
  assert.equal(first.getAttribute('href'), image.src);
  assert.equal(first.getAttribute('width'), '18');
  assert.equal(first.getAttribute('height'), '12');
  assert.match(first.getAttribute('transform'), /^rotate\(30 /);

  image.src = 'data:image/svg+xml,%3Csvg%20id%3D%22updated%22%2F%3E';
  chart.update('none');
  assert.equal(pointGroup(chart, 0).children[0], first);
  assert.equal(first.getAttribute('href'), image.src);

  chart.destroy();
});

test('SVG PointElement serializes a supplied Canvas pointStyle once per render', () => {
  const {chart} = createChart();
  let snapshots = 0;
  let href = 'data:image/png;base64,one';
  const icon = {
    height: 12,
    width: 18,
    toDataURL() {
      snapshots++;
      return href;
    },
    [Symbol.toStringTag]: 'HTMLCanvasElement'
  };

  chart.data.datasets[0].pointStyle = icon;
  chart.update('none');
  const first = pointGroup(chart, 0).children[0];
  assert.equal(snapshots, 1);
  assert.equal(pointGroup(chart, 0).children.length, 11);
  assert.equal(first.localName, 'image');
  assert.equal(first.getAttribute('href'), href);
  assert.equal(first.getAttribute('width'), '18');
  assert.equal(first.getAttribute('height'), '12');

  href = 'data:image/png;base64,two';
  chart.update('none');
  assert.equal(snapshots, 2);
  assert.equal(pointGroup(chart, 0).children[0], first);
  assert.equal(first.getAttribute('href'), href);
  chart.destroy();
});

test('SVG point paints preserve radial inner radius and reuse definitions on update', () => {
  const {chart} = createChart();
  const linear = {
    type: 'linear-gradient', x0: 1, y0: 2, x1: 30, y1: 40,
    colorStops: [{offset: 0, color: '#f00'}, {offset: 1, color: '#00f'}]
  };
  const radial = {
    type: 'radial-gradient', x0: 4, y0: 5, r0: 3, x1: 20, y1: 25, r1: 30,
    colorStops: [{offset: 0, color: '#fff'}, {offset: 1, color: '#000'}]
  };
  const pattern = {
    type: 'pattern', image: {width: 8, height: 6, src: 'data:image/svg+xml,pattern'}, repetition: 'repeat'
  };

  chart.data.datasets[0].pointBackgroundColor = () => linear;
  chart.data.datasets[0].pointBorderColor = () => radial;
  chart.update('none');

  const defs = findChild(chart.$chartjsSvgRoot, 'data-svg-defs', 'true');
  const gradients = defs.children.filter((child) => child.localName === 'linearGradient' || child.localName === 'radialGradient');
  const linearElement = gradients.find((child) => child.localName === 'linearGradient');
  const radialElement = gradients.find((child) => child.localName === 'radialGradient');
  assert.equal(gradients.filter((child) => child.localName === 'linearGradient').length, 1);
  assert.equal(linearElement.getAttribute('gradientUnits'), 'userSpaceOnUse');
  assert.equal(linearElement.getAttribute('x1'), '1');
  assert.equal(linearElement.getAttribute('y1'), '2');
  assert.equal(linearElement.getAttribute('x2'), '30');
  assert.equal(linearElement.getAttribute('y2'), '40');
  assert.equal(linearElement.children.length, 2);
  assert.equal(radialElement.getAttribute('fx'), '4');
  assert.equal(radialElement.getAttribute('fy'), '5');
  assert.equal(radialElement.getAttribute('fr'), '3');
  assert.equal(radialElement.getAttribute('cx'), '20');
  assert.equal(radialElement.getAttribute('cy'), '25');
  assert.equal(radialElement.getAttribute('r'), '30');

  radial.r0 = 7;
  chart.update('none');
  assert.equal(defs.children.find((child) => child.localName === 'radialGradient'), radialElement);
  assert.equal(radialElement.getAttribute('fr'), '7');

  linear.x1 = 60;
  chart.update('none');
  assert.equal(defs.children.find((child) => child.localName === 'linearGradient'), linearElement);
  assert.equal(linearElement.getAttribute('x2'), '60');

  chart.data.datasets[0].pointBackgroundColor = pattern;
  chart.update('none');
  const patternElement = defs.children.find((child) => child.localName === 'pattern');
  assert.equal(patternElement.children[0].getAttribute('href'), pattern.image.src);
  assert.equal(patternElement.getAttribute('width'), '8');
  assert.equal(patternElement.getAttribute('height'), '6');

  chart.data.datasets[0].pointBorderColor = '#000';
  chart.update('none');
  assert.equal(defs.children.some((child) => child.localName === 'radialGradient'), false);
  chart.data.datasets[0].pointBackgroundColor = '#fff';
  chart.update('none');
  assert.equal(defs.children.some((child) => child.localName === 'pattern'), false);
  chart.destroy();
});

test('SVG PointElement safely skips a tainted Canvas pointStyle', () => {
  const {chart} = createChart();
  let snapshots = 0;
  let warnings = 0;
  const icon = {
    height: 12,
    width: 18,
    toDataURL() {
      snapshots++;
      throw new Error('SecurityError');
    },
    [Symbol.toStringTag]: 'HTMLCanvasElement'
  };
  const warn = console.warn;
  console.warn = () => {
    warnings++;
  };
  try {
    chart.data.datasets[0].pointStyle = icon;
    chart.update('none');
    assert.equal(snapshots, 1);
    assert.equal(warnings, 1);
    assert.equal(pointGroup(chart, 0).children.length, 0);
    chart.update('none');
    assert.equal(snapshots, 2);
    assert.equal(warnings, 1);
  } finally {
    console.warn = warn;
    chart.destroy();
  }
});
