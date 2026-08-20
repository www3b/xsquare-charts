import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
} from '../dist/chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale);

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

function createChart(datasets, options = {}) {
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
    type: 'bar',
    data: {labels: ['A', 'B', 'C'], datasets},
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

function bars(chart, datasetIndex) {
  const metaDataset = findChild(findChild(chart.$chartjsSvgRoot, 'data-svg-layer', 'datasets'), 'data-dataset-index', String(datasetIndex));
  const group = metaDataset && findChild(metaDataset, 'data-svg-part', 'bars');
  return group ? group.children : [];
}

function barPaths(bar) {
  const [border, background] = bar.children[0].children;
  return {background, border};
}

function dataset(data, overrides = {}) {
  return {
    backgroundColor: '#60a5fa',
    borderColor: '#1d4ed8',
    borderWidth: 2,
    data,
    inflateAmount: 0,
    ...overrides,
  };
}

// eslint-disable-next-line max-statements
test('SVG BarElement uses calculated inner/outer geometry and reuses nodes', () => {
  const {canvas, chart, parent} = createChart([dataset([8, -5, 12], {
    hoverBackgroundColor: '#fbbf24',
    hoverBorderColor: '#b45309',
  })]);
  const elements = bars(chart, 0);
  const firstElement = chart.getDatasetMeta(0).data[0];
  const {background, border} = barPaths(elements[0]);
  const expectedLeft = firstElement.x - firstElement.width / 2 + 2;
  const expectedTop = Math.min(firstElement.y, firstElement.base) + 2;

  assert.equal(elements.length, 3);
  assert.ok(background.getAttribute('d').startsWith(`M${expectedLeft},${expectedTop}`));
  assert.equal(background.getAttribute('fill'), '#60a5fa');
  assert.equal(background.getAttribute('stroke'), 'none');
  assert.equal(border.getAttribute('data-role'), 'border');
  assert.equal(border.getAttribute('fill'), '#1d4ed8');
  assert.equal(border.getAttribute('fill-rule'), 'evenodd');
  assert.equal(border.getAttribute('display'), '');

  const firstGroup = elements[0];
  const before = background.getAttribute('d');
  chart.data.datasets[0].data[0] = 15;
  chart.update('none');
  assert.equal(bars(chart, 0)[0], firstGroup);
  assert.notEqual(barPaths(firstGroup).background.getAttribute('d'), before);

  chart.setActiveElements([{datasetIndex: 0, index: 0}]);
  chart.render();
  assert.equal(barPaths(firstGroup).background.getAttribute('fill'), '#fbbf24');
  assert.equal(barPaths(firstGroup).border.getAttribute('fill'), '#b45309');

  chart.data.datasets[0].data.push(4);
  chart.data.labels.push('D');
  chart.update('none');
  assert.equal(bars(chart, 0).length, 4);
  chart.data.datasets[0].data.pop();
  chart.data.labels.pop();
  chart.update('none');
  assert.equal(bars(chart, 0).length, 3);

  chart.hide(0);
  assert.equal(bars(chart, 0).length, 0);
  chart.show(0);
  assert.equal(bars(chart, 0).length, 3);

  chart.options.renderer = 'canvas';
  chart.update('none');
  assert.equal(chart.$chartjsSvgRoot, undefined);
  assert.deepEqual(parent.children, [canvas]);
  chart.options.renderer = 'svg';
  chart.update('none');
  assert.equal(bars(chart, 0).length, 3);
  chart.destroy();
  assert.deepEqual(parent.children, [canvas]);
});

test('SVG BarElement supports borders, radii, stacks, horizontal and floating bars', () => {
  const rounded = createChart([dataset([8], {
    borderRadius: {bottomLeft: 2, bottomRight: 4, topLeft: 12, topRight: 8},
    borderSkipped: false,
    borderWidth: {bottom: 3, left: 4, right: 2, top: 1},
  })]);
  const roundedPaths = barPaths(bars(rounded.chart, 0)[0]);
  assert.ok(roundedPaths.background.getAttribute('d').includes('A'));
  assert.ok(roundedPaths.border.getAttribute('d').includes('A'));
  rounded.chart.destroy();

  const noBorder = createChart([dataset([8], {borderWidth: 0})]);
  assert.equal(barPaths(bars(noBorder.chart, 0)[0]).border.getAttribute('display'), 'none');
  noBorder.chart.destroy();

  const horizontal = createChart([dataset([8, -5], {borderRadius: 8})], {indexAxis: 'y'});
  assert.equal(bars(horizontal.chart, 0).length, 2);
  assert.ok(barPaths(bars(horizontal.chart, 0)[0]).background.getAttribute('d'));
  horizontal.chart.destroy();

  const floating = createChart([dataset([[2, 8], [-4, 3]])]);
  assert.equal(bars(floating.chart, 0).length, 2);
  floating.chart.destroy();

  const stacked = createChart([
    dataset([3, 4, 2], {borderRadius: 8, borderSkipped: 'middle', stack: 'total'}),
    dataset([5, -2, 4], {borderRadius: 8, borderSkipped: 'middle', stack: 'total'}),
    dataset([2, 1, 3]),
  ], {scales: {x: {stacked: true}, y: {stacked: true}}});
  assert.equal(bars(stacked.chart, 0).length, 3);
  assert.equal(bars(stacked.chart, 1).length, 3);
  assert.equal(bars(stacked.chart, 2).length, 3);
  stacked.chart.destroy();
});
