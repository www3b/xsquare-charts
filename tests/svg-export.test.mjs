import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  HistogramController,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PieController,
  PointElement,
  Title,
} from '../dist/chart.js';

Chart.register(
  ArcElement, BarController, BarElement, CategoryScale, DoughnutController, Filler,
  HistogramController, Legend, LineController, LineElement, LinearScale, PieController,
  PointElement, Title,
);

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'}[character]));
}

class Style {
  removeProperty(property) {
    delete this[property.replace(/-([a-z])/g, (_match, character) => character.toUpperCase())];
  }

  clone() {
    return Object.assign(new Style(), this);
  }
}

class SvgNode {
  constructor(document, name = 'svg') {
    this.ownerDocument = document;
    this.nodeName = name;
    this.children = [];
    this.attributes = new Map();
    this.style = new Style();
    this.textContent = '';
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

  cloneNode(deep) {
    const clone = new SvgNode(this.ownerDocument, this.nodeName);
    clone.attributes = new Map(this.attributes);
    clone.style = this.style.clone();
    clone.textContent = this.textContent;
    if (deep) {
      for (const child of this.children) {
        clone.appendChild(child.cloneNode(true));
      }
    }
    return clone;
  }

  querySelectorAll(selector) {
    const match = selector.match(/^\[([^\]]+)\]$/);
    const attribute = match && match[1];
    const result = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (attribute && child.hasAttribute(attribute)) {
          result.push(child);
        }
        visit(child);
      }
    };
    visit(this);
    return result;
  }

  get lastElementChild() {
    return this.children[this.children.length - 1];
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

  removeAttribute(name) {
    this.attributes.delete(name);
  }
}

class XmlSerializer {
  serializeToString(root) {
    const serialize = (node) => {
      const attributes = [...node.attributes].map(([name, value]) => ` ${name}="${escapeXml(value)}"`).join('');
      const content = `${escapeXml(node.textContent)}${node.children.map(serialize).join('')}`;
      return `<${node.nodeName}${attributes}>${content}</${node.nodeName}>`;
    };
    return serialize(root);
  }
}

function createContext(canvas) {
  const context = {canvas, measureText: (value) => ({width: String(value).length * 8})};
  return new Proxy(context, {get: (target, property) => property in target ? target[property] : () => {}});
}

function createChart(type, data, options = {}) {
  const document = {
    defaultView: {getComputedStyle: () => ({position: 'static'}), XMLSerializer: XmlSerializer},
    createElementNS: (_namespace, name) => new SvgNode(document, name),
  };
  const parent = new SvgNode(document, 'div');
  const canvas = new SvgNode(document, 'canvas');
  Object.assign(canvas, {width: 400, height: 300, offsetLeft: 0, offsetTop: 0, getContext: () => createContext(canvas)});
  parent.appendChild(canvas);
  const chart = new Chart(canvas, {
    type,
    data,
    options: {animation: false, renderer: 'svg', responsive: false, ...options},
  });
  return {canvas, chart, parent};
}

test('toSVG serializes a cloned standalone line/area chart', () => {
  const {chart} = createChart('line', {
    labels: ['Январь', 'Февраль', 'Март'],
    datasets: [{label: 'Revenue & Profit <2026> 🚀', data: [2, 5, 3], backgroundColor: 'rgba(37, 99, 235, .25)', borderColor: '#2563eb', fill: true}],
  }, {
    plugins: {legend: {display: true}, title: {display: true, text: 'Доход & рост <2026> 🚀'}},
  });
  const root = chart.$chartjsSvgRoot;
  const before = {ariaHidden: root.getAttribute('aria-hidden'), renderId: root.getAttribute('data-render-id'), position: root.style.position};
  const exported = chart.toSVG();

  assert.equal(typeof exported, 'string');
  assert.ok(exported.startsWith('<svg'));
  assert.match(exported, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(exported, /width="400"/);
  assert.match(exported, /height="300"/);
  assert.match(exported, /viewBox="0 0 400 300"/);
  assert.match(exported, /data-svg-layer="background"/);
  assert.match(exported, /data-svg-layer="datasets"/);
  assert.match(exported, /data-svg-layer="foreground"/);
  assert.match(exported, /data-svg-part="line"/);
  assert.match(exported, /data-svg-part="fill"/);
  assert.match(exported, /clipPath/);
  assert.match(exported, /clip-path="url\(#chartjs-/);
  assert.match(exported, /Доход &amp; рост &lt;2026&gt; 🚀/);
  assert.equal(exported.includes('data-chart-tooltip'), false);
  assert.equal(exported.includes('data-render-id'), false);
  assert.equal(exported.includes('aria-hidden'), false);
  assert.equal(chart.$chartjsSvgRoot, root);
  assert.deepEqual({ariaHidden: root.getAttribute('aria-hidden'), renderId: root.getAttribute('data-render-id'), position: root.style.position}, before);
  assert.equal(chart.toSVG(), exported);
  chart.destroy();
  assert.throws(() => chart.toSVG(), /existing SVG render/);
});

test('toSVG exports Bar, Arc and Histogram through the shared SVG root', () => {
  const bar = createChart('bar', {labels: ['A', 'B'], datasets: [{label: 'Bars', data: [2, 5], backgroundColor: '#60a5fa'}]});
  const pie = createChart('pie', {labels: ['A', 'B'], datasets: [{data: [2, 5], backgroundColor: ['#60a5fa', '#34d399']}]});
  const histogram = createChart('histogram', {datasets: [{label: 'Bins', data: [{xMin: 0, xMax: 1, y: 2}, {xMin: 1, xMax: 4, y: 5}], backgroundColor: '#fbbf24'}]});

  assert.match(bar.chart.toSVG(), /data-svg-part="bars"/);
  assert.match(pie.chart.toSVG(), /data-svg-part="arcs"/);
  assert.match(histogram.chart.toSVG(), /data-svg-part="bars"/);
  bar.chart.destroy();
  pie.chart.destroy();
  histogram.chart.destroy();
});

test('toSVG keeps chart instances independent and rejects Canvas charts', () => {
  const first = createChart('line', {labels: ['A', 'B'], datasets: [{label: 'First only', data: [1, 2], borderColor: '#2563eb'}]});
  const second = createChart('line', {labels: ['A', 'B'], datasets: [{label: 'Second only', data: [3, 4], borderColor: '#dc2626'}]});
  const firstSvg = first.chart.toSVG();
  const secondSvg = second.chart.toSVG();

  assert.match(firstSvg, /First only/);
  assert.equal(firstSvg.includes('Second only'), false);
  assert.match(secondSvg, /Second only/);
  assert.equal(secondSvg.includes('First only'), false);
  const firstClip = firstSvg.match(/clipPath id="([^"]+)/);
  const secondClip = secondSvg.match(/clipPath id="([^"]+)/);
  assert.notEqual(firstClip && firstClip[1], secondClip && secondClip[1]);

  first.chart.options.renderer = 'canvas';
  assert.throws(() => first.chart.toSVG(), /only when renderer is 'svg'/);
  first.chart.destroy();
  second.chart.destroy();
});
