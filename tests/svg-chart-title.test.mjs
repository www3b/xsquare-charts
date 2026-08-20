import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CategoryScale,
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  SubTitle,
  Title,
} from '../dist/chart.js';

Chart.register(CategoryScale, LineController, LineElement, LinearScale, PointElement, SubTitle, Title);

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

function textNode(group) {
  return findChild(group.children[0], 'data-svg-text-role', 'text');
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
    data: {labels: ['A', 'B', 'C'], datasets: [{data: [2, 4, 3]}]},
    options: {
      animation: false,
      plugins: {
        legend: false,
        subtitle: {
          align: 'end',
          color: '#0f766e',
          display: true,
          font: {family: 'monospace', size: 12, style: 'italic', weight: 'normal'},
          position: 'bottom',
          text: ['Secondary context', 'multiline'],
        },
        title: {
          align: 'center',
          color: '#7c3aed',
          display: true,
          font: {family: 'serif', size: 18, style: 'italic', weight: 'bold'},
          position: 'top',
          text: ['A deliberately long primary title', 'multiline'],
        },
      },
      renderer: 'svg',
      responsive: false,
    },
  });
  return {canvas, chart, parent};
}

function chartPart(chart, part) {
  return findChild(findChild(chart.$chartjsSvgRoot, 'data-svg-layer', 'background'), 'data-chart-svg-part', part);
}

test('SVG global title and subtitle reuse layout geometry and text styles', () => {
  const {chart} = createChart();
  const title = chartPart(chart, 'title');
  const subtitle = chartPart(chart, 'subtitle');
  const titleText = textNode(title);
  const subtitleText = textNode(subtitle);

  assert.equal(titleText.getAttribute('fill'), '#7c3aed');
  assert.equal(titleText.getAttribute('font-family'), 'serif');
  assert.equal(titleText.getAttribute('font-size'), '18');
  assert.equal(titleText.getAttribute('font-style'), 'italic');
  assert.equal(titleText.getAttribute('font-weight'), 'bold');
  assert.equal(titleText.getAttribute('text-anchor'), 'middle');
  assert.equal(titleText.children.length, 2);
  assert.equal(titleText.children[0].textContent, 'A deliberately long primary title');
  assert.equal(subtitleText.getAttribute('fill'), '#0f766e');
  assert.equal(subtitleText.getAttribute('text-anchor'), 'end');
  assert.equal(subtitleText.getAttribute('font-family'), 'monospace');
  assert.equal(subtitleText.getAttribute('font-style'), 'italic');
  assert.equal(subtitleText.children.length, 2);
  assert.ok(title.children[0].getAttribute('transform').startsWith('translate('));
  chart.destroy();
});

// eslint-disable-next-line max-statements
test('SVG chart titles support position, updates, maxWidth and lifecycle cleanup', () => {
  const {canvas, chart, parent} = createChart();
  const title = chartPart(chart, 'title');
  const titleNode = title.children[0];

  chart.options.plugins.title.position = 'bottom';
  chart.update('none');
  assert.equal(chartPart(chart, 'title').children[0], titleNode);
  assert.equal(titleNode.getAttribute('transform').includes('rotate('), false);

  chart.options.plugins.title.position = 'left';
  chart.options.plugins.title.align = 'start';
  chart.update('none');
  assert.equal(chartPart(chart, 'title').children[0], titleNode);
  assert.ok(titleNode.getAttribute('transform').includes('rotate(-90'));
  assert.equal(textNode(chartPart(chart, 'title')).getAttribute('text-anchor'), 'start');

  chart.options.plugins.title.position = 'right';
  chart.options.plugins.title.align = 'end';
  chart.options.plugins.title.color = '#dc2626';
  chart.options.plugins.title.font.size = 20;
  chart.options.plugins.title.text = 'Updated title';
  chart.update('none');
  assert.ok(titleNode.getAttribute('transform').includes('rotate(90'));
  assert.equal(textNode(chartPart(chart, 'title')).getAttribute('fill'), '#dc2626');
  assert.equal(textNode(chartPart(chart, 'title')).getAttribute('font-size'), '20');
  assert.equal(textNode(chartPart(chart, 'title')).children[0].textContent, 'Updated title');

  chart.options.plugins.title.position = 'top';
  chart.options.plugins.title.text = 'A very long title that needs to fit a narrow chart';
  chart.resize(130, 320);
  assert.ok(textNode(chartPart(chart, 'title')).children[0].getAttribute('textLength'));

  const subtitleNode = chartPart(chart, 'subtitle').children[0];
  chart.options.plugins.subtitle.color = '#be123c';
  chart.options.plugins.subtitle.text = ['Updated subtitle', 'still multiline'];
  chart.update('none');
  assert.equal(chartPart(chart, 'subtitle').children[0], subtitleNode);
  assert.equal(textNode(chartPart(chart, 'subtitle')).getAttribute('fill'), '#be123c');
  assert.equal(textNode(chartPart(chart, 'subtitle')).children.length, 2);

  chart.options.plugins.title.display = false;
  chart.options.plugins.subtitle.display = false;
  chart.update('none');
  assert.equal(chartPart(chart, 'title'), undefined);
  assert.equal(chartPart(chart, 'subtitle'), undefined);

  chart.options.renderer = 'canvas';
  chart.update('none');
  assert.equal(chart.$chartjsSvgRoot, undefined);
  chart.options.renderer = 'svg';
  chart.options.plugins.title.display = true;
  chart.options.plugins.subtitle.display = true;
  chart.update('none');
  assert.ok(chartPart(chart, 'title'));
  assert.ok(chartPart(chart, 'subtitle'));
  chart.destroy();
  assert.deepEqual(parent.children, [canvas]);
});
