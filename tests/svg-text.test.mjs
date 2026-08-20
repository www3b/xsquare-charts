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

  removeAttribute(name) {
    this.attributes.delete(name);
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

function findText(root) {
  return findChild(root, 'data-svg-text-role', 'text');
}

function createContext(canvas) {
  const context = {canvas, measureText: (value) => ({width: String(value).length * 8})};
  return new Proxy(context, {
    get(target, property) {
      return property in target ? target[property] : () => {};
    }
  });
}

function createChart() {
  const document = {
    defaultView: {getComputedStyle: () => ({position: 'static'})},
    createElementNS: () => new SvgNode(document)
  };
  const parent = new SvgNode(document);
  const canvas = new SvgNode(document);
  canvas.width = 480;
  canvas.height = 320;
  canvas.offsetLeft = 0;
  canvas.offsetTop = 0;
  canvas.getContext = () => createContext(canvas);
  parent.appendChild(canvas);
  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: [['First', 'line'], 'A considerably longer label', 'Third', 'Fourth', 'Fifth', 'Sixth'],
      datasets: [{data: [10, 20, 15, 30, 26, 40]}],
    },
    options: {
      animation: false,
      plugins: {legend: false},
      renderer: 'svg',
      responsive: false,
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            color: '#1d4ed8',
            font: {family: 'monospace', size: 14, style: 'italic', weight: 'bold'},
            maxRotation: 45,
            minRotation: 45,
            showLabelBackdrop: true,
            backdropColor: '#e0e7ff',
            backdropPadding: 3,
            textStrokeColor: '#312e81',
            textStrokeWidth: 2,
            z: -1,
          },
          title: {color: '#7c3aed', display: true, font: {family: 'serif', size: 16, style: 'italic', weight: 'bold'}, text: ['Horizontal axis title with a long description', 'axis'], strokeColor: '#4c1d95', strokeWidth: 1},
        },
        y: {
          title: {align: 'start', color: '#047857', display: true, text: 'Primary axis'},
        },
        y1: {
          grid: {drawOnChartArea: false},
          position: 'right',
          title: {align: 'end', color: '#b45309', display: true, text: 'Secondary axis'},
        }
      },
    },
  });
  return {canvas, chart, parent};
}

function scalePart(chart, layer, scaleId, part) {
  const root = layer === 'foreground' ? chart.$chartjsSvgRoot : chart.$chartjsSvgBackgroundRoot;
  return findChild(findChild(root, 'data-scale-id', scaleId), 'data-svg-part', part);
}

test('SVG scale labels use resolved LabelItems for x, y and y1', () => {
  const {chart} = createChart();
  const xLabels = scalePart(chart, 'background', 'x', 'labels');
  const xItems = chart.scales.x.getLabelItems();
  const firstLabel = xLabels.children[0];
  const text = findText(firstLabel);
  const backdrop = findChild(firstLabel, 'data-svg-text-role', 'backdrop');

  assert.equal(xLabels.children.length, xItems.length);
  assert.equal(firstLabel.getAttribute('transform'), `translate(${xItems[0].options.translation[0]} ${xItems[0].options.translation[1]}) rotate(${xItems[0].options.rotation * 180 / Math.PI})`);
  assert.equal(text.getAttribute('y'), String(xItems[0].textOffset));
  assert.equal(text.getAttribute('fill'), '#1d4ed8');
  assert.equal(text.getAttribute('stroke'), '#312e81');
  assert.equal(text.getAttribute('stroke-width'), '2');
  assert.equal(text.getAttribute('text-anchor'), 'end');
  assert.equal(text.getAttribute('font-family'), 'monospace');
  assert.equal(text.getAttribute('font-size'), '14');
  assert.equal(text.getAttribute('font-style'), 'italic');
  assert.equal(text.getAttribute('font-weight'), 'bold');
  assert.equal(text.children.length, 2);
  assert.equal(text.children[0].textContent, 'First');
  assert.equal(text.children[1].getAttribute('dy'), String(xItems[0].font.lineHeight));
  assert.ok(backdrop);
  assert.ok(xLabels.getAttribute('clip-path').startsWith('url(#chartjs-'));

  const yLabels = scalePart(chart, 'background', 'y', 'labels');
  const y1Labels = scalePart(chart, 'background', 'y1', 'labels');
  assert.equal(findText(yLabels.children[0]).getAttribute('text-anchor'), 'end');
  assert.equal(findText(y1Labels.children[0]).getAttribute('text-anchor'), 'start');
  chart.destroy();
});

// eslint-disable-next-line max-statements
test('SVG scale titles preserve positioning, multiline text, styles and lifecycle', () => {
  const {canvas, chart, parent} = createChart();
  const xTitle = scalePart(chart, 'background', 'x', 'title');
  const xTitleNode = xTitle.children[0];
  const xText = findText(xTitleNode);
  const yText = findText(scalePart(chart, 'background', 'y', 'title').children[0]);
  const y1Text = findText(scalePart(chart, 'background', 'y1', 'title').children[0]);

  assert.equal(xText.children.length, 2);
  assert.equal(xText.getAttribute('fill'), '#7c3aed');
  assert.equal(xText.getAttribute('stroke'), '#4c1d95');
  assert.equal(xText.getAttribute('font-family'), 'serif');
  assert.ok(yText.parentNode.getAttribute('transform').includes('rotate(-90'));
  assert.ok(y1Text.parentNode.getAttribute('transform').includes('rotate(90'));

  const previousTransform = xTitleNode.getAttribute('transform');
  const labelCount = scalePart(chart, 'background', 'x', 'labels').children.length;
  chart.resize(300, 320);
  assert.equal(scalePart(chart, 'background', 'x', 'title').children[0], xTitleNode);
  assert.notEqual(xTitleNode.getAttribute('transform'), previousTransform);
  chart.resize(160, 320);
  assert.ok(scalePart(chart, 'background', 'x', 'labels').children.length <= labelCount);
  assert.ok(findText(xTitleNode).children[0].getAttribute('textLength'));

  const firstLabel = scalePart(chart, 'background', 'x', 'labels').children[0];
  chart.data.labels[0] = ['Updated', 'label'];
  chart.options.scales.x.ticks.color = '#dc2626';
  chart.options.scales.x.ticks.font.size = 16;
  chart.update('none');
  assert.equal(scalePart(chart, 'background', 'x', 'labels').children[0], firstLabel);
  assert.equal(findText(firstLabel).children[0].textContent, 'Updated');
  assert.equal(findText(firstLabel).getAttribute('fill'), '#dc2626');
  assert.equal(findText(firstLabel).getAttribute('font-size'), '16');

  chart.options.scales.x.title.display = false;
  chart.options.scales.x.ticks.display = false;
  chart.update('none');
  assert.equal(scalePart(chart, 'background', 'x', 'title'), undefined);
  assert.equal(scalePart(chart, 'background', 'x', 'labels'), undefined);

  chart.options.renderer = 'canvas';
  chart.update('none');
  assert.equal(chart.$chartjsSvgRoot, undefined);
  chart.options.renderer = 'svg';
  chart.options.scales.x.ticks.display = true;
  chart.options.scales.x.title.display = true;
  chart.update('none');
  assert.ok(scalePart(chart, 'background', 'x', 'labels'));
  assert.ok(scalePart(chart, 'background', 'x', 'title'));

  chart.options.scales.x.ticks.z = 1;
  chart.update('none');
  assert.equal(scalePart(chart, 'background', 'x', 'labels'), undefined);
  assert.ok(scalePart(chart, 'foreground', 'x', 'labels'));
  chart.destroy();
  assert.deepEqual(parent.children, [canvas]);
});
