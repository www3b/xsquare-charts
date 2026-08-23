import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  RadarController,
  RadialLinearScale,
} from '../dist/chart.js';
import {resetCanvasPaintCache, resolveCanvasPaint} from '../src/helpers/helpers.paint.js';

Chart.register(CategoryScale, Filler, Legend, LineController, LineElement, LinearScale, PointElement, RadarController, RadialLinearScale);

class CanvasNode {
  constructor(document) {
    this.ownerDocument = document;
    this.attributes = new Map();
    this.children = [];
    this.style = {};
  }

  appendChild(node) {
    node.parentNode = this;
    this.children.push(node);
    return node;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1);
      this.parentNode = null;
    }
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }
}

function createRecordingCanvas() {
  const document = {
    defaultView: {getComputedStyle: () => ({position: 'static'})},
    createElement: () => new CanvasNode(document),
    createElementNS: () => new CanvasNode(document),
  };
  const parent = new CanvasNode(document);
  const canvas = new CanvasNode(document);
  const calls = [];
  const gradients = [];
  const value = {
    canvas,
    measureText(text) {
      return {
        actualBoundingBoxAscent: 8,
        actualBoundingBoxDescent: 2,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: String(text).length * 8,
        width: String(text).length * 8,
      };
    },
    createLinearGradient(...args) {
      const gradient = {args, stops: [], addColorStop(offset, color) { this.stops.push({offset, color}); }};
      gradients.push(gradient);
      return gradient;
    },
    createRadialGradient(...args) {
      const gradient = {args, stops: [], addColorStop(offset, color) { this.stops.push({offset, color}); }};
      gradients.push(gradient);
      return gradient;
    },
    createPattern(image, repetition) {
      const pattern = {image, repetition};
      gradients.push(pattern);
      return pattern;
    },
  };
  const context = new Proxy(value, {
    get(target, property) {
      return property in target ? target[property] : (...args) => calls.push([property, ...args]);
    },
    set(target, property, item) {
      calls.push(['set', property, item]);
      target[property] = item;
      return true;
    }
  });
  Object.assign(canvas, {width: 400, height: 300, offsetLeft: 0, offsetTop: 0, getContext: () => context});
  parent.appendChild(canvas);
  return {canvas, calls, context, gradients};
}

function gradient(x1 = 100) {
  return {
    type: 'linear-gradient', x0: 0, y0: 0, x1, y1: 20,
    colorStops: [{offset: 0, color: '#123456'}, {offset: 1, color: '#abcdef'}]
  };
}

function assignedPaints(calls, paint) {
  return calls.filter(([kind, property, value]) => kind === 'set'
    && (property === 'fillStyle' || property === 'strokeStyle') && value === paint);
}

function createContext() {
  const calls = [];
  return {
    calls,
    createLinearGradient(...args) {
      const gradient = {args, stops: [], addColorStop(offset, color) { this.stops.push({offset, color}); }};
      calls.push({type: 'linear', args, gradient});
      return gradient;
    },
    createRadialGradient(...args) {
      const gradient = {args, stops: [], addColorStop(offset, color) { this.stops.push({offset, color}); }};
      calls.push({type: 'radial', args, gradient});
      return gradient;
    },
    createPattern(image, repetition) {
      const pattern = {image, repetition};
      calls.push({type: 'pattern', image, repetition, pattern});
      return pattern;
    }
  };
}

test('Canvas paint descriptors are cached per frame and rebuilt after update', () => {
  const context = createContext();
  const linear = {
    type: 'linear-gradient', x0: 0, y0: 0, x1: 20, y1: 10,
    colorStops: [{offset: 0, color: '#000'}, {offset: 1, color: '#fff'}]
  };

  const first = resolveCanvasPaint(context, linear);
  assert.equal(resolveCanvasPaint(context, linear), first);
  assert.equal(context.calls.length, 1);
  assert.deepEqual(first.stops, linear.colorStops);

  linear.x1 = 40;
  resetCanvasPaintCache();
  const updated = resolveCanvasPaint(context, linear);
  assert.notEqual(updated, first);
  assert.deepEqual(updated.args, [0, 0, 40, 10]);
});

test('Canvas radial gradients and repeating patterns preserve their descriptors', () => {
  const context = createContext();
  const radial = {
    type: 'radial-gradient', x0: 3, y0: 4, r0: 2, x1: 10, y1: 12, r1: 14,
    colorStops: [{offset: 0, color: '#f00'}, {offset: 1, color: '#00f'}]
  };
  const image = {width: 8, height: 6};
  const pattern = {type: 'pattern', image, repetition: 'repeat'};

  assert.deepEqual(resolveCanvasPaint(context, radial).args, [3, 4, 2, 10, 12, 14]);
  assert.equal(resolveCanvasPaint(context, pattern).repetition, 'repeat');
});

test('Canvas built-ins resolve a shared descriptor in dataset, filler, legend and cartesian scale paths', () => {
  const paint = gradient();
  const {canvas, calls, gradients} = createRecordingCanvas();
  const chart = new Chart(canvas, {
    type: 'line',
    data: {labels: ['A', 'B', 'C'], datasets: [{label: 'Paint', data: [2, 6, 4], backgroundColor: paint, borderColor: paint, fill: true}]},
    options: {
      animation: false,
      renderer: 'canvas',
      responsive: false,
      plugins: {legend: {labels: {color: paint}, title: {display: true, text: 'Paint', color: paint}}},
      scales: {
        x: {backgroundColor: paint, grid: {color: paint}, ticks: {color: paint}},
        y: {backgroundColor: paint, grid: {color: paint}, ticks: {color: paint}},
      }
    }
  });

  calls.length = 0;
  gradients.length = 0;
  chart.render();
  assert.equal(assignedPaints(calls, paint).length, 0);
  assert.equal(gradients.length, 1);
  assert.deepEqual(gradients[0].args, [0, 0, 100, 20]);
  assert.deepEqual(gradients[0].stops, paint.colorStops);

  paint.x1 = 200;
  gradients.length = 0;
  chart.update('none');
  assert.ok(gradients.length > 0);
  assert.deepEqual(gradients.at(-1).args, [0, 0, 200, 20]);
  chart.destroy();
});

test('Canvas radial scale color paths receive native paints rather than descriptors', () => {
  const paint = gradient();
  const {canvas, calls, gradients} = createRecordingCanvas();
  const chart = new Chart(canvas, {
    type: 'radar',
    data: {labels: ['N', 'E', 'S', 'W'], datasets: [{data: [2, 4, 3, 5], backgroundColor: paint, borderColor: paint, fill: true}]},
    options: {
      animation: false,
      renderer: 'canvas',
      responsive: false,
      plugins: {legend: false},
      scales: {
        r: {
          backgroundColor: paint,
          grid: {color: paint},
          angleLines: {color: paint},
          pointLabels: {backdropColor: paint, color: paint},
          ticks: {backdropColor: paint, color: paint},
        }
      }
    }
  });

  calls.length = 0;
  gradients.length = 0;
  chart.render();
  assert.equal(assignedPaints(calls, paint).length, 0);
  assert.equal(gradients.length, 1);
  chart.destroy();
});
