import assert from 'node:assert/strict';
import test from 'node:test';
import {Chart} from '../dist/chart.js';
import {createDocument, createHost} from './helpers/public-host.mjs';

function findChild(node, attribute, value) {
  return node && node.children.find((child) => child.getAttribute(attribute) === value);
}

function scalePart(chart, layer, id, part) {
  const layerNode = findChild(chart.root, 'data-svg-layer', layer);
  const scale = findChild(layerNode, 'data-scale-id', id);
  return findChild(scale, 'data-svg-part', part);
}

function createChart() {
  const document = createDocument();
  const host = createHost(document, 440, 300);
  const chart = new Chart(host, {
    type: 'line', renderer: 'svg', animation: false, responsive: false, legend: false, tooltip: false,
    data: {labels: ['One', 'Two', 'Three'], series: [{name: 'Values', data: [1, 3, 2]}]},
    scales: {
      x: {
        backgroundColor: '#eef',
        border: {color: '#112233', dash: [4, 2], dashOffset: 1, width: 2, z: 1},
        grid: {color: '#123456', lineWidth: 2, tickBorderDash: [2, 1], tickBorderDashOffset: 3, tickColor: '#654321', tickWidth: 1, z: -1},
        title: {display: true, text: 'Months'}
      },
      y: {grid: {color: '#abcdef', lineWidth: 1, z: 1}}
    }
  });
  return {chart, host};
}

test('SVG scale presentation applies physical grid, tick, border and z-layer attributes', () => {
  const {chart} = createChart();
  const grid = scalePart(chart, 'background', 'x', 'grid').children[0];
  const ticks = scalePart(chart, 'background', 'x', 'ticks').children[0];
  const border = scalePart(chart, 'foreground', 'x', 'border').children[0];
  for (const node of [grid, ticks, border]) {
    assert.notEqual(node.getAttribute('x1'), null);
    assert.notEqual(node.getAttribute('y1'), null);
    assert.notEqual(node.getAttribute('x2'), null);
    assert.notEqual(node.getAttribute('y2'), null);
  }
  assert.equal(grid.getAttribute('stroke'), '#123456');
  assert.equal(grid.getAttribute('stroke-width'), '2');
  assert.equal(grid.getAttribute('stroke-dasharray'), '4,2');
  assert.equal(grid.getAttribute('stroke-dashoffset'), '1');
  assert.equal(ticks.getAttribute('stroke'), '#654321');
  assert.equal(ticks.getAttribute('stroke-width'), '1');
  assert.equal(ticks.getAttribute('stroke-dasharray'), '2,1');
  assert.equal(ticks.getAttribute('stroke-dashoffset'), '3');
  assert.equal(border.getAttribute('stroke'), '#112233');
  assert.equal(border.getAttribute('stroke-width'), '2');
  assert.equal(border.getAttribute('stroke-dasharray'), '4,2');
  assert.equal(border.getAttribute('stroke-dashoffset'), '1');
  assert.ok(scalePart(chart, 'foreground', 'y', 'grid'), 'positive grid z is rendered in foreground');
  chart.destroy();
});

// eslint-disable-next-line max-statements
test('SVG scale nodes are reused, then physically cleaned up as display flags change', () => {
  const {chart} = createChart();
  const grid = scalePart(chart, 'background', 'x', 'grid').children[0];
  const ticks = scalePart(chart, 'background', 'x', 'ticks').children[0];
  const border = scalePart(chart, 'foreground', 'x', 'border').children[0];
  const labels = scalePart(chart, 'background', 'x', 'labels');
  chart.update('none');
  assert.equal(scalePart(chart, 'background', 'x', 'grid').children[0], grid);
  assert.equal(scalePart(chart, 'background', 'x', 'ticks').children[0], ticks);
  assert.equal(scalePart(chart, 'foreground', 'x', 'border').children[0], border);
  assert.equal(scalePart(chart, 'background', 'x', 'labels'), labels);

  let x = chart.config._config.options.scales.x;
  x.grid.drawOnChartArea = false;
  x.grid.drawTicks = false;
  x.ticks.display = false;
  x.border.display = false;
  x.title.display = false;
  x.backgroundColor = undefined;
  chart.update('none');
  assert.equal(scalePart(chart, 'background', 'x', 'grid'), undefined);
  assert.equal(scalePart(chart, 'background', 'x', 'ticks'), undefined);
  assert.equal(scalePart(chart, 'background', 'x', 'labels'), undefined);
  assert.equal(scalePart(chart, 'foreground', 'x', 'border'), undefined);
  assert.equal(scalePart(chart, 'background', 'x', 'title'), undefined);
  assert.equal(scalePart(chart, 'background', 'x', 'background'), undefined);

  x = chart.config._config.options.scales.x;
  x.grid.drawOnChartArea = true;
  x.grid.drawTicks = true;
  x.ticks.display = true;
  x.border.display = true;
  x.title.display = true;
  x.backgroundColor = '#eef';
  chart.update('none');
  assert.ok(scalePart(chart, 'background', 'x', 'grid').children.length);
  assert.ok(scalePart(chart, 'background', 'x', 'ticks').children.length);
  assert.ok(scalePart(chart, 'background', 'x', 'labels').children.length);
  assert.ok(scalePart(chart, 'foreground', 'x', 'border').children.length);
  assert.ok(scalePart(chart, 'background', 'x', 'title').children.length);
  assert.ok(scalePart(chart, 'background', 'x', 'background').children.length);
  chart.destroy();
});
