import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import test from 'node:test';
import {
  CategoryScale,
  Chart,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
} from '../dist/chart.js';
import {beginSvgRender, endSvgRender} from '../src/helpers/helpers.svg.js';

Chart.register(CategoryScale, LineController, LineElement, LinearScale, PointElement);

class Node {
  constructor(document) {
    this.ownerDocument = document;
    this.children = [];
    this.attributes = new Map();
    this.style = {};
  }

  appendChild(node) {
    node.remove();
    node.parentNode = this;
    this.children.push(node);
    return node;
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

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }
}

test('Chart core can run with a renderer supplied by an isolated registry', () => {
  const document = {
    createElementNS: () => new Node(document),
    defaultView: {getComputedStyle: () => ({position: 'static'})}
  };
  const host = new Node(document);
  const registry = Chart.createRendererRegistry();
  let measurements = 0;
  let destroyed = false;

  registry.register('svg', ({chart}) => {
    const root = new Node(document);
    root.setAttribute('data-chart-svg', 'true');
    return {
      type: 'svg', root, canvas: null, context: null,
      initialize() { host.appendChild(root); chart.$chartjsSvgRoot = root; return true; },
      resize(width, height) { root.setAttribute('width', width); root.setAttribute('height', height); return true; },
      clear() {},
      beginFrame() { beginSvgRender(chart); },
      endFrame() { endSvgRender(chart); },
      drawScale() {},
      measureText(text) { measurements++; return String(text).length * 8; },
      getEventTarget() { return root; },
      destroy() { destroyed = true; root.remove(); delete chart.$chartjsSvgRoot; }
    };
  });

  const chart = new Chart(host, {
    rendererRegistry: registry,
    type: 'line',
    data: {labels: ['A', 'B'], datasets: [{data: [1, 2]}]},
    options: {animation: false, plugins: {legend: false, tooltip: false}, renderer: 'svg', responsive: false}
  });

  chart.resize(240, 120);
  chart.update('none');
  assert.equal(chart.canvas, null);
  assert.equal(chart.ctx, null);
  assert.equal(host.children.length, 1);
  assert.ok(measurements > 0);
  chart.destroy();
  assert.equal(destroyed, true);
  assert.equal(host.children.length, 0);
});

test('Elements stay renderer-neutral', () => {
  const directory = new URL('../src/elements/', import.meta.url);
  for (const name of readdirSync(directory).filter((name) => /\.(js|ts)$/.test(name))) {
    const source = readFileSync(new URL(name, directory), 'utf8');
    assert.doesNotMatch(source, /helpers\.svg|renderers\/svg|createElementNS|setAttribute\(/);
    assert.doesNotMatch(source, /renderer\s*(?:===|!==)|options\.renderer/);
  }
});

test('Legend stays renderer-neutral', () => {
  const source = readFileSync(new URL('../src/plugins/plugin.legend.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /helpers\.svg|renderers\/(?:canvas|svg)|helpers\.canvas|helpers\.path|helpers\.svg\.text/);
  assert.doesNotMatch(source, /this\.ctx|createElementNS|setAttribute\(/);
  assert.doesNotMatch(source, /renderer\s*(?:===|!==)|options\.renderer/);
});

test('Cartesian Scale stays renderer-neutral', () => {
  const source = readFileSync(new URL('../src/core/core.scale.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /helpers\.svg|renderers\/(?:canvas|svg)|renderSvgText|renderText|clipArea|unclipArea/);
  assert.doesNotMatch(source, /renderer\s*(?:===|!==)|options\.renderer/);
  assert.doesNotMatch(source, /\.fillRect\(|\.beginPath\(|\.stroke\(|\.setAttribute\(/);
});
