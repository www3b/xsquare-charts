import assert from 'node:assert/strict';
import test from 'node:test';
import {Chart} from '../dist/chart.js';
import {createDocument, createHost} from './helpers/public-host.mjs';

function findChild(node, attribute, value) {
  return node && node.children.find((child) => child.getAttribute(attribute) === value);
}

function dataset(chart, index) {
  return findChild(findChild(chart.root, 'data-svg-layer', 'datasets'), 'data-dataset-index', String(index));
}

function part(chart, index, name) {
  return findChild(dataset(chart, index), 'data-svg-part', name);
}

function linePaths(chart, index) {
  const group = part(chart, index, 'line');
  return group ? group.children : [];
}

function lineSeries(overrides = {}) {
  return {name: 'Series', borderColor: '#2563eb', borderDash: [6, 3], borderDashOffset: 2, borderWidth: 3, data: [2, 5, 3, 6], fill: false, pointRadius: 3, ...overrides};
}

function createChart(series, options = {}) {
  const document = createDocument();
  const host = createHost(document, 440, 300);
  const chart = new Chart(host, {
    type: 'line', renderer: 'svg', animation: false, responsive: false, legend: false, tooltip: false,
    data: {labels: ['One', 'Two', 'Three', 'Four'], series}, ...options
  });
  return {chart, host};
}

function lineCommands(path) {
  return [...path.matchAll(/([ML])(-?[\d.]+),(-?[\d.]+)/g)].map(([, command, x, y]) => [command, +x, +y]);
}

test('SVG lines serialize straight, bezier, gaps and spanGaps through real path data', () => {
  const cases = [
    {name: 'straight', source: lineSeries(), command: 'L', moves: 1},
    {name: 'bezier', source: lineSeries({tension: 0.4}), command: 'C', moves: 1},
    {name: 'gap', source: lineSeries({data: [2, null, 3, 6]}), command: 'M', moves: 2},
    {name: 'spanGaps', source: lineSeries({data: [2, null, 3, 6], spanGaps: true}), command: 'L', moves: 1}
  ];
  for (const {name, source, command, moves} of cases) {
    const {chart} = createChart([source]);
    const [path] = linePaths(chart, 0);
    const d = path.getAttribute('d');
    assert.ok(d.includes(command), name);
    assert.equal((d.match(/M/g) || []).length, moves, name);
    assert.equal(path.getAttribute('stroke'), '#2563eb', name);
    assert.equal(path.getAttribute('stroke-width'), '3', name);
    assert.equal(path.getAttribute('stroke-dasharray'), '6,3', name);
    assert.equal(path.getAttribute('stroke-dashoffset'), '2', name);
    chart.destroy();
  }
});

test('SVG stepped lines use independently calculated before, after and middle coordinates', () => {
  for (const [stepped, expected] of [
    ['before', (p0, p1) => [['M', p0.x, p0.y], ['L', p1.x, p0.y], ['L', p1.x, p1.y]]],
    ['after', (p0, p1) => [['M', p0.x, p0.y], ['L', p0.x, p1.y], ['L', p1.x, p1.y]]],
    ['middle', (p0, p1) => [['M', p0.x, p0.y], ['L', (p0.x + p1.x) / 2, p0.y], ['L', (p0.x + p1.x) / 2, p1.y], ['L', p1.x, p1.y]]]
  ]) {
    const {chart} = createChart([lineSeries({data: [2, 6], stepped})]);
    const [p0, p1] = chart.getDatasetMeta(0).data;
    assert.deepEqual(lineCommands(linePaths(chart, 0)[0].getAttribute('d')), expected(p0, p1), stepped);
    chart.destroy();
  }
  const {chart} = createChart([lineSeries({data: [2, 6]})]);
  const [p0, p1] = chart.getDatasetMeta(0).data;
  assert.deepEqual(lineCommands(linePaths(chart, 0)[0].getAttribute('d')), [['M', p0.x, p0.y], ['L', p1.x, p1.y]]);
  chart.destroy();
});

test('SVG line parts preserve identities through style, data, order and visibility changes', () => {
  const {chart} = createChart([
    lineSeries({borderWidth: 0, fill: true}),
    lineSeries({name: 'Styled', borderColor: '#dc2626', data: [5, 1, 4, 2], segment: {borderColor: (context) => context.p0DataIndex === 1 ? '#0f766e' : '#dc2626'}})
  ]);
  const group = dataset(chart, 0);
  const fill = part(chart, 0, 'fill');
  const points = part(chart, 0, 'points');
  assert.ok(fill);
  assert.ok(points);
  assert.equal(part(chart, 0, 'line'), undefined);

  chart.data.series[0].borderWidth = 2;
  chart.update('none');
  const firstLine = linePaths(chart, 0)[0];
  assert.equal(dataset(chart, 0), group);
  assert.equal(part(chart, 0, 'fill'), fill);
  assert.equal(part(chart, 0, 'points'), points);

  const styled = linePaths(chart, 1);
  assert.ok(styled.length > 1, 'segment styling creates independent path segments');
  assert.deepEqual(styled.map((path) => path.getAttribute('stroke')).sort(), ['#0f766e', '#dc2626', '#dc2626']);
  const before = firstLine.getAttribute('d');
  chart.data.series[0].data[1] = 7;
  chart.update('none');
  assert.equal(linePaths(chart, 0)[0], firstLine);
  assert.notEqual(firstLine.getAttribute('d'), before);

  chart.hideSeries(1);
  assert.equal(dataset(chart, 1), undefined);
  chart.showSeries(1);
  assert.ok(dataset(chart, 1));
  chart.data.series[0].borderWidth = 0;
  chart.update('none');
  assert.equal(part(chart, 0, 'line'), undefined, 'stale line part is removed');
  chart.destroy();
});
