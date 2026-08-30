import assert from 'node:assert/strict';
import test from 'node:test';
import {Chart} from '../dist/chart.js';
import {createDocument, createHost} from './helpers/public-host.mjs';

function findChild(node, attribute, value) { return node && node.children.find((child) => child.getAttribute(attribute) === value); }
function createChart(series, filler = {}, options = {}) {
  const document = createDocument();
  const parent = createHost(document);
  const chart = new Chart(parent, {type: 'line', renderer: 'svg', data: {labels: [0, 1, 2, 3], series}, animation: false, responsive: false, legend: false, filler, ...options});
  return {canvas: chart.root, chart, parent};
}
function createCanvasChart(series, filler = {}) {
  const calls = [];
  const document = createDocument(calls);
  const parent = createHost(document);
  const chart = new Chart(parent, {type: 'line', renderer: 'canvas', data: {labels: [0, 1, 2, 3], series}, animation: false, responsive: false, legend: false, filler});
  return {canvas: chart.root, chart, parent, calls};
}
function fillGroup(chart, datasetIndex) {
  const dataset = findChild(findChild(chart.$chartjsSvgRoot, 'data-svg-layer', 'datasets'), 'data-dataset-index', String(datasetIndex));
  return dataset && findChild(dataset, 'data-svg-part', 'fill');
}

function fillPaths(chart, datasetIndex) {
  const group = fillGroup(chart, datasetIndex);
  return group ? group.children.map((item) => item.children[0]) : [];
}

function fillClipRect(chart, path) {
  const clip = path.parentNode.getAttribute('clip-path');
  const id = clip.slice(5, -1);
  const defs = findChild(chart.$chartjsSvgRoot, 'data-svg-defs', 'true');
  return findChild(defs, 'id', id).children[0];
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

function pathLinePoints(path) {
  return [...path.matchAll(/([ML])(-?[\d.]+),(-?[\d.]+)/g)]
    .map(([, command, x, y]) => ({command, x: +x, y: +y}));
}

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: expected ${expected}, got ${actual}`);
}

function assertPoint(actual, expected, message) {
  assertClose(actual.x, expected.x, `${message} x`);
  assertClose(actual.y, expected.y, `${message} y`);
}

function samePoint(first, second) {
  return Math.abs(first.x - second.x) < 1e-6 && Math.abs(first.y - second.y) < 1e-6;
}

function withoutConsecutiveDuplicates(points) {
  return points.filter((point, index) => !index || !samePoint(point, points[index - 1]));
}

function geometryDataset(fill, data = [2, 5, 3, 6]) {
  return areaDataset(fill, {
    data,
    pointRadius: 0,
    stepped: false,
    tension: 0,
  });
}

function createGeometryChart(datasets, y = {max: 10, min: 0}) {
  return createChart(datasets, {}, {
    scales: {
      y,
    },
  });
}

function assertHorizontalBoundary(path, sourcePoints, y, name) {
  const points = pathLinePoints(path).filter((point) => Math.abs(point.y - y) < 1e-6);
  // Linear boundary targets are a two-point line spanning the source segment,
  // rather than a copy of every source point.
  assert.equal(points.length >= 2, true, `${name} has both boundary endpoints`);
  for (const source of [sourcePoints[0], sourcePoints.at(-1)]) {
    assert.equal(points.some((point) => Math.abs(point.x - source.x) < 1e-6), true, `${name} boundary reaches x=${source.x}`);
  }
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
  chart.render();
  assert.equal(fillPaths(chart, 0)[0], first);
  assert.equal(first.getAttribute('d'), before);
  assert.equal(fillPaths(chart, 0).length, 1);
  assert.equal(defs.children[0], firstClip);

  chart.hide(0);
  assert.equal(fillGroup(chart, 0), undefined);
  chart.show(0);
  assert.equal(fillPaths(chart, 0).length, 1);

  chart.data.series[0].fill = false;
  chart.update('none');
  assert.equal(fillGroup(chart, 0), undefined);
  chart.data.series[0].fill = 'end';
  chart.update('none');
  assert.equal(fillPaths(chart, 0).length, 1);

  chart.setRenderer('canvas');
  chart.update('none');
  assert.equal(chart.$chartjsSvgRoot, undefined);
  assert.equal(parent.children.length, 1);
  chart.setRenderer('svg');
  chart.update('none');
  assert.equal(fillPaths(chart, 0).length, 1);
  chart.destroy();
  assert.equal(parent.children.length, 0);
});

test('SVG filler uses the independently resolved origin, start, end and value boundaries', () => {
  const cases = [
    {name: 'start', fill: 'start', boundary: ({chart}) => chart.chartArea.bottom},
    {name: 'end', fill: 'end', boundary: ({chart}) => chart.chartArea.top},
    // With min=0 and max=10, value 4 is exactly 40% of the chart area above its bottom.
    {name: 'value', fill: {value: 4}, boundary: ({chart}) => chart.chartArea.bottom - (chart.chartArea.bottom - chart.chartArea.top) * 0.4},
  ];
  for (const {name, fill, boundary} of cases) {
    const {chart} = createGeometryChart([geometryDataset(fill)]);
    const sourcePoints = chart.getDatasetMeta(0).data;
    const expected = boundary({chart});
    const path = fillPaths(chart, 0)[0];
    assert.ok(path, name);
    assertHorizontalBoundary(path.getAttribute('d'), sourcePoints, expected, name);
    chart.destroy();
  }
});

test('SVG filler resolves origin to the mathematical zero baseline', () => {
  const min = -5;
  const max = 10;
  const {chart} = createGeometryChart([geometryDataset('origin')], {max, min});
  const {bottom, top} = chart.chartArea;
  // A normal vertical linear scale maps zero by its ratio within [-5, 10].
  const expectedY = bottom - (0 - min) / (max - min) * (bottom - top);
  assert.notEqual(expectedY, bottom, 'origin is not start in this fixture');
  assert.notEqual(expectedY, top, 'origin is not end in this fixture');
  assertHorizontalBoundary(fillPaths(chart, 0)[0].getAttribute('d'), chart.getDatasetMeta(0).data, expectedY, 'origin below zero');
  chart.destroy();
});

test('SVG filler keeps start distinct from origin below zero', () => {
  const {chart} = createGeometryChart([geometryDataset('start')], {max: 10, min: -5});
  const sourcePoints = chart.getDatasetMeta(0).data;
  const path = fillPaths(chart, 0)[0];
  assert.notEqual(chart.scales.y.getBasePixel(), chart.chartArea.bottom, 'zero-origin and start are distinct in this scale');
  assertHorizontalBoundary(path.getAttribute('d'), sourcePoints, chart.chartArea.bottom, 'start below zero');
  chart.destroy();
});

test('SVG filler stack target follows the lower dataset coordinates', () => {
  const {chart} = createGeometryChart([
    geometryDataset(false, [1, 2, 3, 4]),
    geometryDataset('stack', [4, 6, 5, 7]),
  ]);
  const lower = chart.getDatasetMeta(0).data;
  const path = fillPaths(chart, 1)[0];
  const actual = pathLinePoints(path.getAttribute('d'));
  for (const point of lower) {
    assert.equal(actual.some((candidate) => Math.abs(candidate.x - point.x) < 1e-6 && Math.abs(candidate.y - point.y) < 1e-6), true,
      `stack boundary includes lower dataset point (${point.x}, ${point.y})`);
  }
  chart.destroy();
});

test('SVG filler shape target closes only the source line topology', () => {
  const {chart} = createGeometryChart([geometryDataset('shape')]);
  const source = chart.getDatasetMeta(0).data;
  const path = fillPaths(chart, 0)[0].getAttribute('d');
  const commands = pathLinePoints(path);
  const normalized = withoutConsecutiveDuplicates(commands);
  assert.equal(path.endsWith('Z'), true);
  assert.equal(commands[0].command, 'M');
  assertPoint(commands[0], source[0], 'shape starts at the source line start');
  for (const point of commands) {
    assert.equal(source.some((sourcePoint) => samePoint(point, sourcePoint)), true, 'shape contains no artificial target boundary point');
  }
  assert.equal(normalized.length, source.length);
  for (let index = 0; index < source.length; index++) {
    assert.equal(normalized[index].command, index ? 'L' : 'M');
    assertPoint(normalized[index], source[index], `shape source point ${index}`);
  }
  chart.destroy();
});

test('SVG filler supports above/below clipping', () => {

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
  chart.setRenderer('svg');
  chart.update('none');
  assert.ok(chart.$chartjsSvgRoot);
  chart.setRenderer('canvas');
  chart.update('none');
  assert.equal(chart.$chartjsSvgRoot, undefined);
  assert.equal(chart.root.parentNode, parent);
  assert.ok(calls.filter(([name]) => name === 'fill').length > 1);
  chart.destroy();
});

test('SVG Radar filler preserves loop geometry and fill rule through a renderer switch', () => {
  const {chart} = createChart([{data: [2, 5, 3, 4], fill: 'shape', backgroundColor: '#60a5fa'}], {}, {type: 'radar'});
  const path = fillPaths(chart, 0)[0];
  assert.match(path.getAttribute('d'), /Z$/);
  assert.equal(path.getAttribute('fill-rule'), 'evenodd');
  chart.setRenderer('canvas');
  assert.equal(chart.$chartjsSvgRoot, undefined);
  chart.destroy();
});

test('Shape fill ignores dataset clip while bounded fills retain it', () => {
  const clip = {left: -40, right: -40, top: -30, bottom: -30};
  const shape = createChart([{data: [2, 4, 3], fill: 'shape', backgroundColor: '#60a5fa', clip}], {}, {type: 'radar'}).chart;
  const shapeRect = fillClipRect(shape, fillPaths(shape, 0)[0]);
  assert.equal(shapeRect.getAttribute('x'), String(shape.chartArea.left));
  const bounded = createChart([areaDataset('origin', {clip})]).chart;
  const boundedRect = fillClipRect(bounded, fillPaths(bounded, 0)[0]);
  assert.notEqual(boundedRect.getAttribute('x'), String(bounded.chartArea.left));
  shape.destroy(); bounded.destroy();
});
