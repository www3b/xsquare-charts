import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CategoryScale,
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from '../dist/chart.js';

Chart.register(CategoryScale, LineController, LineElement, LinearScale, PointElement, Tooltip);
Chart.register({
  id: 'html-tooltip-cancel',
  beforeTooltipDraw(chart) {
    return chart.$cancelHtmlTooltip ? false : undefined;
  },
});
Chart.register({
  id: 'canvas-tooltip-hooks',
  afterTooltipDraw(chart) {
    chart.$afterTooltipDraw = (chart.$afterTooltipDraw || 0) + 1;
  },
});

class Node {
  constructor(document, name = 'div') {
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

  get nextSibling() {
    return this.parentNode && this.parentNode.children[this.parentNode.children.indexOf(this) + 1];
  }

  get lastChild() {
    return this.children[this.children.length - 1];
  }

  get lastElementChild() {
    return this.lastChild;
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
  if (node.getAttribute && node.getAttribute(attribute) === value) {
    return node;
  }
  for (const child of node.children || []) {
    const result = find(child, attribute, value);
    if (result) {
      return result;
    }
  }
}

function allText(node) {
  return [node.textContent, ...(node.children || []).map(allText)].filter(Boolean).join('|');
}

function createContext(canvas, calls = []) {
  const createGradient = (...args) => {
    const gradient = {args, addColorStop: (...stop) => calls.push(['addColorStop', ...stop])};
    calls.push(['createLinearGradient', ...args, gradient]);
    return gradient;
  };
  const context = {
    canvas,
    measureText: (value) => ({width: String(value).length * 8}),
    createLinearGradient: createGradient,
    fill: () => calls.push(['fill']),
    fillText: (...args) => calls.push(['fillText', ...args]),
    stroke: () => calls.push(['stroke']),
  };
  return new Proxy(context, {
    get: (target, property) => property in target ? target[property] : () => {},
    set: (target, property, value) => {
      calls.push(['set', property, value]);
      target[property] = value;
      return true;
    },
  });
}

function createChart(overrides = {}) {
  const document = {
    defaultView: {getComputedStyle: () => ({position: 'static'})},
    createElement: (name) => new Node(document, name),
    createElementNS: (_namespace, name) => new Node(document, name),
  };
  const parent = new Node(document, 'div');
  const canvas = new Node(document, 'canvas');
  canvas.width = 440;
  canvas.height = 300;
  canvas.offsetLeft = 0;
  canvas.offsetTop = 0;
  const calls = [];
  canvas.getContext = () => createContext(canvas, calls);
  parent.appendChild(canvas);
  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: ['One', 'Two', 'Three'],
      datasets: [
        {data: [2, 5, 3], label: 'Revenue', pointStyle: 'circle'},
        {data: [4, 2, 6], label: 'Cost'},
      ],
    },
    options: {
      animation: false,
      plugins: {
        legend: false,
        tooltip: {
          backgroundColor: '#102030',
          borderColor: '#abcdef',
          borderWidth: 2,
          callbacks: {
            afterBody: () => 'After body',
            afterFooter: () => 'After footer',
            afterLabel: () => 'After label',
            afterTitle: () => 'After title',
            beforeBody: () => 'Before body',
            beforeFooter: () => 'Before footer',
            beforeLabel: () => 'Before label',
            beforeTitle: () => 'Before title',
            footer: () => 'Footer',
            label: (item) => `<b>${item.dataset.label}</b>`,
            title: () => 'Title',
          },
          cornerRadius: {bottomLeft: 4, bottomRight: 5, topLeft: 2, topRight: 3},
          footerAlign: 'right',
          padding: {bottom: 8, left: 5, right: 6, top: 7},
          titleAlign: 'center',
          usePointStyle: true,
        },
      },
      renderer: 'svg',
      responsive: false,
      ...overrides,
    },
  });
  return {calls, canvas, chart, parent};
}

function show(chart, active = [{datasetIndex: 0, index: 1}]) {
  chart.tooltip.setActiveElements(active, {x: 150, y: 100});
  chart.draw();
}

test('SVG tooltip uses one persistent HTML root with the resolved Tooltip model', () => {
  const {chart, parent} = createChart();
  show(chart, [{datasetIndex: 0, index: 1}, {datasetIndex: 1, index: 1}]);
  const root = find(parent, 'data-chart-tooltip', '');
  const title = find(root, 'data-chart-tooltip-title', '');
  const body = find(root, 'data-chart-tooltip-body', '');
  const footer = find(root, 'data-chart-tooltip-footer', '');
  const marker = find(root, 'data-chart-tooltip-marker', '');
  const caret = find(root, 'data-chart-tooltip-caret', '');

  assert.equal(root.getAttribute('role'), 'tooltip');
  assert.equal(root.getAttribute('aria-hidden'), 'false');
  assert.equal(root.style.pointerEvents, 'none');
  assert.equal(root.style.left, `${chart.tooltip.x}px`);
  assert.equal(root.style.width, `${chart.tooltip.width}px`);
  assert.equal(root.style.height, `${chart.tooltip.height}px`);
  assert.equal(root.style.backgroundColor, undefined);
  assert.equal(find(root, 'data-chart-tooltip-background', '').style.backgroundColor, '#102030');
  assert.equal(find(root, 'data-chart-tooltip-background', '').style.borderTopLeftRadius, '2px');
  assert.equal(find(root, 'data-chart-tooltip-content', '').style.paddingTop, '7px');
  assert.equal(title.style.textAlign, 'center');
  assert.equal(footer.style.textAlign, 'right');
  assert.equal(body.children.length, 2);
  assert.ok(marker.children[0]);
  assert.ok(caret.style.clipPath.startsWith('polygon('));
  assert.match(allText(root), /Before title\|Title\|After title/);
  assert.match(allText(root), /Before body\|Before label\|<b>Revenue<\/b>\|After label\|Before label\|<b>Cost<\/b>\|After label\|After body/);
  assert.match(allText(root), /Before footer\|Footer\|After footer/);
  assert.equal(find(root, 'b', ''), undefined);

  chart.draw();
  assert.equal(find(parent, 'data-chart-tooltip', ''), root);
  chart.tooltip.setActiveElements([], {x: 0, y: 0});
  chart.draw();
  assert.equal(root.getAttribute('aria-hidden'), 'true');
  assert.equal(root.style.display, 'none');
  chart.destroy();
});

test('SVG tooltip keeps callbacks/external semantics and cleans up renderer switches', () => {
  let externalCalls = 0;
  let titleCalls = 0;
  const {canvas, chart, parent} = createChart({
    plugins: {
      legend: false,
      tooltip: {
        callbacks: {title: () => { titleCalls++; return 'Once'; }},
        external: () => { externalCalls++; },
      },
    },
  });
  show(chart);
  const root = find(parent, 'data-chart-tooltip', '');
  assert.equal(externalCalls, 1);
  assert.equal(titleCalls, 1);
  chart.draw();
  assert.equal(titleCalls, 1);

  chart.options.renderer = 'canvas';
  chart.update('none');
  chart.draw();
  assert.equal(find(parent, 'data-chart-tooltip', ''), undefined);
  chart.options.renderer = 'svg';
  chart.update('none');
  show(chart);
  assert.ok(find(parent, 'data-chart-tooltip', ''));
  chart.destroy();
  assert.deepEqual(parent.children, [canvas]);
});

test('disabled SVG tooltip stays hidden while external callback remains active', () => {
  let externalCalls = 0;
  const {chart, parent} = createChart({
    plugins: {legend: false, tooltip: {enabled: false, external: () => { externalCalls++; }}},
  });
  show(chart);
  assert.equal(externalCalls, 1);
  assert.equal(find(parent, 'data-chart-tooltip', ''), undefined);
  chart.destroy();
});

test('SVG tooltip hides when beforeTooltipDraw cancels and keeps direction local', () => {
  const {chart, parent} = createChart({
    plugins: {
      'html-tooltip-cancel': {},
      legend: false,
      tooltip: {bodyAlign: 'right', rtl: true, textDirection: 'rtl'},
    },
  });
  show(chart);
  const root = find(parent, 'data-chart-tooltip', '');
  assert.equal(find(root, 'data-chart-tooltip-content', '').style.direction, 'rtl');
  assert.equal(find(root, 'data-chart-tooltip-body-item', '').style.direction, 'rtl');
  chart.$cancelHtmlTooltip = true;
  chart.draw();
  assert.equal(root.getAttribute('aria-hidden'), 'true');
  chart.destroy();
});

test('SVG tooltip respects displayColors and regular color box styles', () => {
  const {chart, parent} = createChart({
    plugins: {
      legend: false,
      tooltip: {
        callbacks: {
          labelColor: () => ({
            backgroundColor: '#22c55e',
            borderColor: '#14532d',
            borderDash: [3, 1],
            borderRadius: 4,
            borderWidth: {bottom: 2, left: 3, right: 4, top: 1},
          }),
        },
        displayColors: false,
        usePointStyle: false,
      },
    },
  });
  show(chart);
  let root = find(parent, 'data-chart-tooltip', '');
  assert.equal(find(root, 'data-chart-tooltip-marker', ''), undefined);
  chart.options.plugins.tooltip.displayColors = true;
  chart.update('none');
  show(chart);
  root = find(parent, 'data-chart-tooltip', '');
  const marker = find(root, 'data-chart-tooltip-marker', '');
  assert.equal(marker.style.backgroundColor, '#fff');
  assert.match(marker.style.border, /^4px dashed #14532d$/);
  assert.equal(marker.style.borderTopLeftRadius, '4px');
  chart.destroy();
});

test('Canvas tooltip presentation draws content and resolves renderer-neutral paints', () => {
  const paint = {
    type: 'linear-gradient',
    x0: 0,
    x1: 100,
    y0: 0,
    y1: 0,
    colorStops: [{offset: 0, color: '#0ea5e9'}, {offset: 1, color: '#8b5cf6'}],
  };
  const {calls, chart, parent} = createChart({renderer: 'canvas'});
  const tooltip = chart.options.plugins.tooltip;
  tooltip.backgroundColor = paint;
  tooltip.borderColor = paint;
  tooltip.titleColor = paint;
  tooltip.bodyColor = paint;
  tooltip.footerColor = paint;
  tooltip.multiKeyBackground = paint;
  tooltip.callbacks.labelColor = () => ({backgroundColor: paint, borderColor: paint, borderWidth: 2});
  tooltip.callbacks.labelTextColor = () => paint;

  show(chart, [{datasetIndex: 0, index: 1}, {datasetIndex: 1, index: 1}]);

  assert.equal(find(parent, 'data-chart-tooltip', ''), undefined);
  assert.ok(calls.some(([name]) => name === 'fill'));
  assert.ok(calls.some(([name]) => name === 'stroke'));
  assert.ok(calls.some(([name, value]) => name === 'fillText' && value === 'Title'));
  assert.ok(calls.some(([name, value]) => name === 'fillText' && value === 'Footer'));
  assert.ok(calls.some(([name]) => name === 'createLinearGradient'));
  assert.equal(calls.some(([name, property, value]) => name === 'set' && (property === 'fillStyle' || property === 'strokeStyle') && value === paint), false);
  assert.equal(chart.$afterTooltipDraw, 1);

  const titleDrawsBeforeHide = calls.filter(([name, value]) => name === 'fillText' && value === 'Title').length;
  chart.$cancelHtmlTooltip = true;
  chart.draw();
  assert.equal(chart.$afterTooltipDraw, 1);
  assert.equal(calls.filter(([name, value]) => name === 'fillText' && value === 'Title').length, titleDrawsBeforeHide);
  chart.$cancelHtmlTooltip = false;
  chart.tooltip.setActiveElements([], {x: 0, y: 0});
  chart.draw();
  assert.equal(calls.filter(([name, value]) => name === 'fillText' && value === 'Title').length, titleDrawsBeforeHide);
  chart.destroy();
});
