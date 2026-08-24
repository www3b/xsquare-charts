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

function createCanvasDocument() {
  const document = {
    defaultView: {getComputedStyle: () => ({position: 'static'})},
    createElement(name) {
      const node = new Node(document);
      if (name === 'canvas') {
        node.width = 400;
        node.height = 300;
        node.getContext = () => createCanvasContext(node);
      }
      return node;
    },
    createElementNS() {
      return new Node(document);
    },
  };
  return document;
}

function createCanvasContext(canvas) {
  const context = {canvas, measureText: (text) => ({width: String(text).length * 8})};
  return new Proxy(context, {get: (target, property) => property in target ? target[property] : () => {}});
}

function createCanvas(document, context = createCanvasContext) {
  const canvas = new Node(document);
  canvas.width = 400;
  canvas.height = 300;
  canvas.offsetLeft = 0;
  canvas.offsetTop = 0;
  canvas.getContext = () => context(canvas);
  return canvas;
}

function chartConfig(renderer, overrides = {}) {
  return {
    type: 'line',
    data: {labels: ['A', 'B'], datasets: [{data: [1, 2]}]},
    options: {animation: false, plugins: {legend: false, tooltip: false}, renderer, responsive: false, ...overrides},
  };
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

test('Chart surface identity distinguishes sibling canvases from a shared container', () => {
  const document = createCanvasDocument();
  const host = new Node(document);
  const firstCanvas = createCanvas(document);
  const secondCanvas = createCanvas(document);
  host.appendChild(firstCanvas);
  host.appendChild(secondCanvas);
  const first = new Chart(firstCanvas, chartConfig('canvas'));
  const second = new Chart(secondCanvas, chartConfig('canvas'));
  assert.throws(() => new Chart(firstCanvas, chartConfig('canvas')), /already in use/);
  first.destroy();
  second.destroy();

  const svgCanvas = createCanvas(document);
  host.appendChild(svgCanvas);
  const svgChart = new Chart(svgCanvas, chartConfig('svg'));
  assert.throws(() => new Chart(svgCanvas, chartConfig('canvas')), /already in use/);
  svgChart.destroy();

  const container = new Node(document);
  const containerChart = new Chart(container, chartConfig('canvas'));
  assert.throws(() => new Chart(container, chartConfig('canvas')), /already in use/);
  containerChart.destroy();

  const mixedHost = new Node(document);
  const userCanvas = createCanvas(document);
  mixedHost.appendChild(userCanvas);
  const userChart = new Chart(userCanvas, chartConfig('canvas'));
  const hostChart = new Chart(mixedHost, chartConfig('canvas'));
  assert.equal(Chart.getChart(userCanvas), userChart);
  assert.equal(Chart.getChart(hostChart.root), hostChart);
  userChart.destroy();
  hostChart.destroy();

  const reverseHost = new Node(document);
  const reverseCanvas = createCanvas(document);
  reverseHost.appendChild(reverseCanvas);
  const reverseHostChart = new Chart(reverseHost, chartConfig('canvas'));
  const reverseUserChart = new Chart(reverseCanvas, chartConfig('canvas'));
  assert.equal(Chart.getChart(reverseCanvas), reverseUserChart);
  reverseUserChart.destroy();
  reverseHostChart.destroy();
});

test('renderer switches preserve user canvas ownership and remove library-created canvases', () => {
  const document = createCanvasDocument();
  const container = new Node(document);
  const chart = new Chart(container, chartConfig('canvas'));
  assert.equal(container.children.length, 1);
  chart.options.renderer = 'svg';
  chart.update('none');
  assert.equal(container.children.length, 1);
  chart.destroy();
  assert.equal(container.children.length, 0);

  const second = new Chart(container, chartConfig('canvas'));
  second.options.renderer = 'svg';
  second.update('none');
  second.options.renderer = 'canvas';
  second.update('none');
  second.destroy();
  assert.equal(container.children.length, 0);

  const userCanvas = createCanvas(document);
  container.appendChild(userCanvas);
  const userChart = new Chart(userCanvas, chartConfig('canvas'));
  userChart.options.renderer = 'svg';
  userChart.update('none');
  assert.equal(userChart.renderer.type, 'svg');
  assert.equal(userChart.root.parentNode, container);
  userChart.options.renderer = 'canvas';
  userChart.update('none');
  userChart.destroy();
  assert.deepEqual(container.children, [userCanvas]);
});

test('detached SVG canvas input and renderer initialization failures remain safe', () => {
  const document = createCanvasDocument();
  const detached = createCanvas(document);
  assert.throws(() => new Chart(detached, chartConfig('svg')), /requires a supplied canvas with a parent container/);
  assert.equal(detached.children.length, 0);

  const detachedCanvasChart = new Chart(detached, chartConfig('canvas'));
  assert.throws(() => {
    detachedCanvasChart.options.renderer = 'svg';
    detachedCanvasChart.update('none');
  }, /requires a supplied canvas with a parent container/);
  assert.equal(detachedCanvasChart.renderer.type, 'canvas');
  assert.equal(detached.children.length, 0);
  assert.doesNotThrow(() => detachedCanvasChart.destroy());

  const attachedLater = createCanvas(document);
  const attachedLaterChart = new Chart(attachedLater, chartConfig('canvas'));
  const container = new Node(document);
  container.appendChild(attachedLater);
  assert.throws(() => {
    attachedLaterChart.options.renderer = 'svg';
    attachedLaterChart.update('none');
  }, /requires a supplied canvas with a parent container/);
  assert.equal(attachedLaterChart.renderer.type, 'canvas');
  assert.deepEqual(container.children, [attachedLater]);
  assert.equal(attachedLater.children.length, 0);
  assert.doesNotThrow(() => attachedLaterChart.destroy());
  assert.deepEqual(container.children, [attachedLater]);

  const host = new Node(document);
  const failedCanvas = createCanvas(document, () => null);
  host.appendChild(failedCanvas);
  const failed = new Chart(failedCanvas, chartConfig('canvas'));
  assert.equal(failed.renderer, null);
  assert.doesNotThrow(() => failed.destroy());
  assert.deepEqual(host.children, [failedCanvas]);

  const svgCanvas = createCanvas(document, () => null);
  host.appendChild(svgCanvas);
  const switched = new Chart(svgCanvas, chartConfig('svg'));
  switched.options.renderer = 'canvas';
  assert.doesNotThrow(() => switched.update('none'));
  assert.equal(switched.renderer, null);
  assert.doesNotThrow(() => switched.destroy());
  assert.ok(host.children.includes(svgCanvas));
});

test('public clear removes SVG presentation without changing internal frame reuse', () => {
  const document = createCanvasDocument();
  const host = new Node(document);
  const canvas = createCanvas(document);
  host.appendChild(canvas);
  const chart = new Chart(canvas, chartConfig('svg'));
  chart.draw();
  assert.ok(chart.$chartjsSvgRoot.children.some((child) => child.getAttribute('data-svg-layer')));
  chart.clear();
  assert.equal(chart.$chartjsSvgRoot.children.some((child) => child.getAttribute('data-svg-layer')), false);
  chart.draw();
  assert.ok(chart.$chartjsSvgRoot.children.some((child) => child.getAttribute('data-svg-layer')));
  chart.destroy();

  const canvasHost = new Node(document);
  let canvasClears = 0;
  const canvasSeed = createCanvas(document, (seed) => {
    const context = createCanvasContext(seed);
    context.clearRect = () => { canvasClears++; };
    return context;
  });
  canvasHost.appendChild(canvasSeed);
  const canvasChart = new Chart(canvasSeed, chartConfig('canvas'));
  canvasClears = 0;
  canvasChart.clear();
  assert.equal(canvasClears, 1);
  canvasChart.draw();
  assert.equal(canvasClears, 2);
  canvasChart.destroy();
});

test('Canvas and SVG report same-size resize only once', () => {
  for (const renderer of ['canvas', 'svg']) {
    const document = createCanvasDocument();
    const host = new Node(document);
    const canvas = createCanvas(document);
    host.appendChild(canvas);
    let resizeCalls = 0;
    const chart = new Chart(canvas, chartConfig(renderer, {onResize: () => { resizeCalls++; }}));
    resizeCalls = 0;
    chart.resize(500, 300);
    chart.resize(500, 300);
    assert.equal(resizeCalls, 1);
    chart.destroy();
  }
});

test('SVG points use the shared chart-area boundary semantics', () => {
  const svg = readFileSync(new URL('../src/renderers/svg/elements/point.ts', import.meta.url), 'utf8');
  const canvas = readFileSync(new URL('../src/renderers/canvas/elements/point.ts', import.meta.url), 'utf8');
  assert.match(svg, /_isPointInArea/);
  assert.match(canvas, /_isPointInArea/);
  assert.doesNotMatch(svg, /function isPointInArea/);
});

test('Title and subtitle retain neutral roles outside renderer presentation', () => {
  const title = readFileSync(new URL('../src/plugins/plugin.title.js', import.meta.url), 'utf8');
  const subtitle = readFileSync(new URL('../src/plugins/plugin.subtitle.js', import.meta.url), 'utf8');
  assert.doesNotMatch(title, /svgPart|_svgPart/);
  assert.doesNotMatch(subtitle, /svgPart|_svgPart/);
  assert.match(title, /role: 'title'/);
  assert.match(subtitle, /role: 'subtitle'/);
});

test('Elements stay renderer-neutral', () => {
  const directory = new URL('../src/elements/', import.meta.url);
  for (const name of readdirSync(directory).filter((name) => /\.(js|ts)$/.test(name))) {
    const source = readFileSync(new URL(name, directory), 'utf8');
    assert.doesNotMatch(source, /helpers\.svg|renderers\/svg|createElementNS|setAttribute\(/);
    assert.doesNotMatch(source, /renderer\s*(?:===|!==)|options\.renderer/);
  }
});

test('Controllers stay renderer-neutral', () => {
  const directory = new URL('../src/controllers/', import.meta.url);
  for (const name of readdirSync(directory).filter((name) => /\.js$/.test(name))) {
    const source = readFileSync(new URL(name, directory), 'utf8');
    assert.doesNotMatch(source, /helpers\.svg|renderers\/(?:canvas|svg)|createElementNS|setAttribute\(/);
    assert.doesNotMatch(source, /renderer\s*(?:===|!==)|options\.renderer|chart\.ctx|this\._ctx/);
  }
  const datasetController = readFileSync(new URL('../src/core/core.datasetController.js', import.meta.url), 'utf8');
  assert.doesNotMatch(datasetController, /chart\.ctx|this\._ctx/);
});

test('Legend stays renderer-neutral', () => {
  const source = readFileSync(new URL('../src/plugins/plugin.legend.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /helpers\.svg|renderers\/(?:canvas|svg)|helpers\.canvas|helpers\.path|helpers\.svg\.text/);
  assert.doesNotMatch(source, /this\.ctx|createElementNS|setAttribute\(/);
  assert.doesNotMatch(source, /renderer\s*(?:===|!==)|options\.renderer/);
});

test('Tooltip stays renderer-neutral', () => {
  const source = readFileSync(new URL('../src/plugins/plugin.tooltip.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /helpers\.canvas|plugin\.tooltip\.html|renderHtmlTooltip|hideHtmlTooltip|removeHtmlTooltip/);
  assert.doesNotMatch(source, /chart\.ctx|renderer\.type|options\.renderer/);
  assert.doesNotMatch(source, /\.fillText\(|\.fillRect\(|\.strokeRect\(|\.beginPath\(|createElement(?:NS)?\(/);
});

test('Cartesian Scale stays renderer-neutral', () => {
  const source = readFileSync(new URL('../src/core/core.scale.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /helpers\.svg|renderers\/(?:canvas|svg)|renderSvgText|renderText|clipArea|unclipArea/);
  assert.doesNotMatch(source, /renderer\s*(?:===|!==)|options\.renderer/);
  assert.doesNotMatch(source, /\.fillRect\(|\.beginPath\(|\.stroke\(|\.setAttribute\(/);
});

test('RadialLinearScale stays renderer-neutral and Scale no longer stores a context', () => {
  const radial = readFileSync(new URL('../src/scales/scale.radialLinear.js', import.meta.url), 'utf8');
  const scale = readFileSync(new URL('../src/core/core.scale.js', import.meta.url), 'utf8');
  assert.doesNotMatch(radial, /helpers\.svg|renderSvgText|renderText|helpers\.path|renderer\s*(?:===|!==)|options\.renderer/);
  assert.doesNotMatch(radial, /\.fill\(|\.stroke\(|\.beginPath\(|\.setAttribute\(|this\.ctx/);
  assert.doesNotMatch(scale, /this\.ctx\s*=\s*cfg\.ctx/);
});

test('Filler lifecycle and shared model stay renderer-neutral', () => {
  const lifecycle = readFileSync(new URL('../src/plugins/plugin.filler/index.js', import.meta.url), 'utf8');
  const model = readFileSync(new URL('../src/plugins/plugin.filler/filler.model.js', import.meta.url), 'utf8');
  assert.doesNotMatch(lifecycle, /helpers\.svg|renderers\/(?:canvas|svg)|chart\.ctx|renderer\s*(?:===|!==)|options\.renderer/);
  assert.doesNotMatch(model, /helpers\.svg|createElementNS|setAttribute\(|\.fill\(|\.stroke\(|\.clip\(|renderer\s*(?:===|!==)/);
});
