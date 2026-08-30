import assert from 'node:assert/strict';
import test from 'node:test';
import {Chart} from '../dist/chart.js';
import {createDocument, createHost} from './helpers/public-host.mjs';

function findChild(node, attribute, value) {
  return node && node.children.find((child) => child.getAttribute(attribute) === value);
}

function pointGroup(chart, datasetIndex) {
  const datasets = findChild(chart.root, 'data-svg-layer', 'datasets');
  const dataset = findChild(datasets, 'data-dataset-index', String(datasetIndex));
  return findChild(dataset, 'data-svg-part', 'points');
}

function pathCommands(path) {
  return [...path.matchAll(/([ML])(-?[\d.]+),(-?[\d.]+)/g)]
    .map(([, command, x, y]) => ({command, x: +x, y: +y}));
}

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: expected ${expected}, got ${actual}`);
}

function assertPathCommands(path, expected, name) {
  const actual = pathCommands(path);
  assert.equal(actual.length, expected.length, `${name} command count`);
  for (let index = 0; index < expected.length; index++) {
    assert.equal(actual[index].command, expected[index].command, `${name} command ${index}`);
    assertClose(actual[index].x, expected[index].x, `${name} x ${index}`);
    assertClose(actual[index].y, expected[index].y, `${name} y ${index}`);
  }
}

function createChart(styles = ['circle', 'triangle', 'rect', 'rectRounded', 'rectRot', 'cross', 'crossRot', 'star', 'line', 'dash', false]) {
  const document = createDocument();
  const host = createHost(document);
  const chart = new Chart(host, {
    type: 'line', renderer: 'svg', animation: false, responsive: false, legend: false, tooltip: false,
    data: {
      labels: styles.map((_, index) => String(index)),
      series: [{
        name: 'Shapes', backgroundColor: '#ffffff', borderColor: '#123456', borderWidth: 2,
        data: styles.map((_, index) => index + 1), pointBackgroundColor: '#abcdef', pointBorderColor: '#123456',
        pointBorderWidth: 3, pointRadius: 5, pointRotation: 25, pointStyle: styles
      }]
    }
  });
  return {chart, host};
}

function primitive(pointStyle, pointRotation = 0) {
  const {chart} = createChart([pointStyle]);
  chart.data.series[0].pointRotation = pointRotation;
  chart.update('none');
  const point = chart.getDatasetMeta(0).data[0];
  return {chart, d: pointGroup(chart, 0).children[0].getAttribute('d'), point};
}

test('SVG points resolve every built-in style, radius, rotation and update nodes in place', () => {
  const {chart} = createChart();
  const points = pointGroup(chart, 0);
  assert.equal(points.children.length, 10, 'false pointStyle is intentionally not rendered');
  assert.deepEqual(points.children.map((node) => node.localName), Array(10).fill('path'));
  assert.equal(points.children[0].getAttribute('fill'), '#abcdef');
  assert.equal(points.children[0].getAttribute('stroke'), '#123456');
  assert.equal(points.children[0].getAttribute('stroke-width'), '3');

  const circle = points.children[0];
  const beforeRadius = circle.getAttribute('d');
  chart.data.series[0].pointRadius = 7;
  chart.update('none');
  assert.equal(pointGroup(chart, 0).children[0], circle);
  assert.notEqual(circle.getAttribute('d'), beforeRadius);

  const triangle = pointGroup(chart, 0).children[1];
  const beforeRotation = triangle.getAttribute('d');
  chart.data.series[0].pointRotation = 0;
  chart.update('none');
  assert.notEqual(triangle.getAttribute('d'), beforeRotation);

  chart.data.series[0].data[1] = null;
  chart.update('none');
  assert.equal(pointGroup(chart, 0).children.length, 9);
  chart.data.series[0].pointRadius = 0;
  chart.update('none');
  assert.equal(pointGroup(chart, 0).children.length, 0);
  chart.destroy();
});

// eslint-disable-next-line max-statements
test('SVG points serialize independently calculated primitive geometry', () => {
  const radius = 5;
  for (const rotation of [0, 25]) {
    const {chart, d, point} = primitive('triangle', rotation);
    const angle = rotation * Math.PI / 180;
    const expected = [0, 1, 2].map((index) => {
      const vertex = angle + index * 2 * Math.PI / 3;
      return {command: index ? 'L' : 'M', x: point.x + Math.sin(vertex) * radius, y: point.y - Math.cos(vertex) * radius};
    });
    assertPathCommands(d, expected, `triangle rotation ${rotation}`);
    assert.equal(d.endsWith('Z'), true);
    chart.destroy();
  }

  {
    const {chart, d, point} = primitive('circle');
    assertPathCommands(d, [{command: 'M', x: point.x + radius, y: point.y}], 'circle start');
    const arcs = [...d.matchAll(/A(-?[\d.]+),(-?[\d.]+),0,1,1,(-?[\d.]+),(-?[\d.]+)/g)];
    assert.equal(arcs.length, 2);
    assert.equal(+arcs[0][1], radius);
    assert.equal(+arcs[1][2], radius);
    chart.destroy();
  }

  {
    const {chart, d, point} = primitive('rect');
    const side = Math.SQRT1_2 * radius;
    const match = (/^M(-?[\d.]+),(-?[\d.]+)h(-?[\d.]+)v(-?[\d.]+)h(-?[\d.]+)Z$/).exec(d);
    assert.ok(match, 'rect uses an unrotated rectangle path');
    assertClose(+match[1], point.x - side, 'rect left');
    assertClose(+match[2], point.y - side, 'rect top');
    chart.destroy();
  }

  {
    const {chart, d, point} = primitive('rectRot', 30);
    const angle = Math.PI / 6;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    assertPathCommands(d, [
      {command: 'M', x: point.x - x, y: point.y - y},
      {command: 'L', x: point.x + y, y: point.y - x},
      {command: 'L', x: point.x + x, y: point.y + y},
      {command: 'L', x: point.x - y, y: point.y + x}
    ], 'rectRot');
    chart.destroy();
  }

  for (const [style, offset] of [['cross', 0], ['crossRot', 45]]) {
    const {chart, d, point} = primitive(style);
    const angle = offset * Math.PI / 180;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    assertPathCommands(d, [
      {command: 'M', x: point.x - x, y: point.y - y}, {command: 'L', x: point.x + x, y: point.y + y},
      {command: 'M', x: point.x + y, y: point.y - x}, {command: 'L', x: point.x - y, y: point.y + x}
    ], style);
    chart.destroy();
  }

  {
    const {chart, d, point} = primitive('star');
    const expected = [];
    for (const angle of [0, Math.PI / 4]) {
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      expected.push({command: 'M', x: point.x - x, y: point.y - y}, {command: 'L', x: point.x + x, y: point.y + y}, {command: 'M', x: point.x + y, y: point.y - x}, {command: 'L', x: point.x - y, y: point.y + x});
    }
    assertPathCommands(d, expected, 'star');
    chart.destroy();
  }

  for (const [style, expected] of [
    ['line', (point) => [{command: 'M', x: point.x - radius, y: point.y}, {command: 'L', x: point.x + radius, y: point.y}]],
    ['dash', (point) => [{command: 'M', x: point.x, y: point.y}, {command: 'L', x: point.x + radius, y: point.y}]]
  ]) {
    const {chart, d, point} = primitive(style);
    assertPathCommands(d, expected(point), style);
    chart.destroy();
  }

  {
    const {chart, d} = primitive('rectRounded');
    assert.equal([...d.matchAll(/A(-?[\d.]+),(-?[\d.]+),/g)].length, 4, 'rectRounded has four rounded corners');
    chart.destroy();
  }
});

test('SVG points support image and canvas point styles with root/frame-scoped snapshots', () => {
  const {chart} = createChart();
  const image = {height: 12, width: 18, src: 'data:image/svg+xml,image', [Symbol.toStringTag]: 'HTMLImageElement'};
  chart.data.series[0].pointStyle = image;
  chart.update('none');
  const imageNode = pointGroup(chart, 0).children[0];
  assert.equal(imageNode.localName, 'image');
  assert.equal(imageNode.getAttribute('href'), image.src);

  chart.destroy();
  const canvasChart = createChart();
  let snapshots = 0;
  const icon = {height: 12, width: 18, toDataURL: () => `data:image/png;base64,${++snapshots}`, [Symbol.toStringTag]: 'HTMLCanvasElement'};
  canvasChart.chart.data.series[0].pointStyle = icon;
  canvasChart.chart.update('none');
  assert.equal(snapshots, 1, 'one source is serialized once per SVG frame');
  assert.equal(pointGroup(canvasChart.chart, 0).children[0].getAttribute('href'), 'data:image/png;base64,1');

  const second = createChart();
  second.chart.data.series[0].pointStyle = icon;
  second.chart.update('none');
  assert.equal(snapshots, 2, 'a different SVG root receives a fresh snapshot');
  assert.equal(pointGroup(second.chart, 0).children[0].getAttribute('href'), 'data:image/png;base64,2');
  canvasChart.chart.destroy();
  second.chart.destroy();
});

test('SVG points skip tainted canvas point styles and warn only once', () => {
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
  console.warn = () => warnings++;
  try {
    chart.data.series[0].pointStyle = icon;
    chart.update('none');
    chart.update('none');
    assert.equal(snapshots, 2);
    assert.equal(warnings, 1);
    assert.equal(pointGroup(chart, 0).children.length, 0);
  } finally {
    console.warn = warn;
    chart.destroy();
  }
});
