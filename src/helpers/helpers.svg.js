import {isCanvasPaint, isRendererNeutralPaint} from './helpers.paint.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_LAYERS = /** @type {('background'|'datasets'|'foreground')[]} */ (['background', 'datasets', 'foreground']);
const svgElementContexts = new WeakMap();
const svgElements = new WeakMap();
const svgPaints = new WeakMap();
const svgCharts = new WeakMap();
const svgWarnings = new WeakSet();

function createSvgElement(chart, name) {
  const root = chart.$chartjsSvgRoot || (chart.renderer && chart.renderer.root);
  const document = root ? root.ownerDocument : chart.host && chart.host.ownerDocument || chart.canvas && chart.canvas.ownerDocument;
  return document.createElementNS(SVG_NS, name);
}


function getSvgPaintState(chart) {
  let state = svgPaints.get(chart);
  if (!state) {
    state = {nextId: 0, values: new WeakMap()};
    svgPaints.set(chart, state);
  }
  return state;
}

function getSvgPaintDescriptor(chart, value) {
  const state = getSvgPaintState(chart);
  let descriptor = state.values.get(value);
  if (!descriptor) {
    descriptor = {id: `chartjs-${chart.id}-paint-${++state.nextId}`, element: undefined};
    state.values.set(value, descriptor);
  }
  return descriptor;
}

function updateSvgPaint(chart, value) {
  const defs = getOrCreateSvgDefs(chart);
  const renderId = defs.getAttribute('data-render-id');
  const descriptor = getSvgPaintDescriptor(chart, value);
  const name = value.type === 'linear-gradient' ? 'linearGradient' : value.type === 'radial-gradient' ? 'radialGradient' : 'pattern';
  if (!descriptor.element || descriptor.element.nodeName !== name) {
    if (descriptor.element) descriptor.element.remove();
    descriptor.element = createSvgElement(chart, name);
    descriptor.element.setAttribute('id', descriptor.id);
    descriptor.element.setAttribute('data-svg-paint', 'true');
  }
  const element = descriptor.element;
  defs.appendChild(element);
  element.setAttribute('data-render-id', renderId);
  if (value.type === 'linear-gradient') {
    element.setAttribute('gradientUnits', 'userSpaceOnUse');
    element.setAttribute('x1', value.x0); element.setAttribute('y1', value.y0); element.setAttribute('x2', value.x1); element.setAttribute('y2', value.y1);
  } else if (value.type === 'radial-gradient') {
    element.setAttribute('gradientUnits', 'userSpaceOnUse');
    element.setAttribute('cx', value.x1); element.setAttribute('cy', value.y1); element.setAttribute('r', value.r1);
    element.setAttribute('fx', value.x0); element.setAttribute('fy', value.y0); element.setAttribute('fr', value.r0);
  } else {
    const image = value.image;
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    element.setAttribute('patternUnits', 'userSpaceOnUse');
    element.setAttribute('width', width || 1); element.setAttribute('height', height || 1);
    const child = getOrCreateSvgElement(element, 'image');
    child.setAttribute('href', image.currentSrc || image.src || ''); child.setAttribute('width', width || 1); child.setAttribute('height', height || 1);
  }
  if (value.colorStops) {
    value.colorStops.forEach((stop, index) => {
      const child = getOrCreateSvgElement(element, 'stop', index);
      child.setAttribute('offset', String(stop.offset)); child.setAttribute('stop-color', stop.color);
    });
    removeExtraSvgElements(element, value.colorStops.length);
  }
  return descriptor;
}

/**
 * Resolves a Chart.js Color value to an SVG paint.
 *
 * @param {any} chart
 * @param {any} value
 * @returns {string}
 */
export function resolveSvgPaint(chart, value) {
  if (isRendererNeutralPaint(value)) {
    return `url(#${updateSvgPaint(chart, value).id})`;
  }
  if (isCanvasPaint(value)) {
    if (!svgWarnings.has(value)) {
      svgWarnings.add(value);
      console.warn('Chart.js SVG renderer does not support native CanvasGradient or CanvasPattern; use a renderer-neutral paint descriptor.');
    }
    return 'transparent';
  }
  return String(value);
}

/**
 * Resolves paint for an element already attached to a chart SVG root.
 *
 * @param {SVGElement} element
 * @param {any} value
 * @returns {string}
 */
export function resolveSvgElementPaint(element, value) {
  let root = /** @type {any} */ (element);
  while (root && (!root.getAttribute || root.getAttribute('data-chart-svg') !== 'true')) {
    root = root.parentNode;
  }
  const chart = root && svgCharts.get(root);
  return chart ? resolveSvgPaint(chart, value) : String(value);
}

function otherLayer(layer) {
  return layer === 'background' ? 'foreground' : 'background';
}

function findChild(parent, attribute, value) {
  return Array.from(parent.children).find((child) => child.getAttribute(attribute) === value);
}

/**
 * @param {any} chart
 */
function getOrCreateSvgDefs(chart) {
  const root = getOrCreateSvgRoot(chart);
  const renderId = root.getAttribute('data-render-id') || '0';
  let defs = /** @type {SVGDefsElement} */ (findChild(root, 'data-svg-defs', 'true'));
  if (!defs) {
    defs = createSvgElement(chart, 'defs');
    defs.setAttribute('data-svg-defs', 'true');
    root.insertBefore(defs, root.children[0] || null);
  }
  defs.setAttribute('data-render-id', renderId);
  return defs;
}

function syncSvgRoot(chart, root) {
  const {canvas, host, width, height} = chart;
  const parent = host || canvas && canvas.parentNode;

  root.setAttribute('width', width);
  root.setAttribute('height', height);
  root.setAttribute('viewBox', `0 0 ${width} ${height}`);
  root.style.width = `${width}px`;
  root.style.height = `${height}px`;

  // Legacy helper callers can still mount an SVG next to a supplied canvas.
  // Renderer-owned SVG roots are normal host children and do not borrow canvas geometry.
  if (!chart.renderer && canvas) {
    root.style.left = `${canvas.offsetLeft}px`;
    root.style.top = `${canvas.offsetTop}px`;
  }

  if (!chart.renderer && parent && parent.style && !root.hasAttribute('data-positioned-parent')) {
    const position = parent.style.position;
    const view = canvas.ownerDocument.defaultView;
    const computedPosition = view && view.getComputedStyle ? view.getComputedStyle(parent).position : position;
    if (!computedPosition || computedPosition === 'static') {
      parent.style.position = 'relative';
      root.setAttribute('data-positioned-parent', 'true');
      root.setAttribute('data-parent-position', position);
    }
  }
}

/**
 * @param {any} chart
 * @returns {SVGSVGElement}
 */
export function getOrCreateSvgRoot(chart) {
  let root = chart.$chartjsSvgRoot;
  if (!root) {
    if (chart.renderer && chart.renderer.type === 'svg') {
      root = chart.renderer.root;
      chart.$chartjsSvgRoot = root;
    }
  }
  if (!root) {
    root = createSvgElement(chart, 'svg');
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('data-chart-svg', 'true');
    root.style.position = 'absolute';
    root.style.pointerEvents = 'none';
    root.style.overflow = 'visible';

    const host = chart.host || chart.canvas && chart.canvas.parentNode;
    if (host) {
      host.appendChild(root);
    }
    chart.$chartjsSvgRoot = root;
  }
  svgCharts.set(root, chart);
  syncSvgRoot(chart, root);
  return root;
}

/**
 * @param {any} chart
 * @param {'background'|'datasets'|'foreground'} layer
 * @returns {SVGGElement}
 */
function getOrCreateSvgLayer(chart, layer) {
  const root = getOrCreateSvgRoot(chart);
  let group = /** @type {SVGGElement} */ (findChild(root, 'data-svg-layer', layer));
  if (!group) {
    group = createSvgElement(chart, 'g');
    group.setAttribute('data-svg-layer', layer);
    const index = SVG_LAYERS.indexOf(layer);
    const next = SVG_LAYERS.slice(index + 1)
      .map((name) => findChild(root, 'data-svg-layer', name))
      .find(Boolean);
    root.insertBefore(group, next || null);
  }
  group.setAttribute('data-render-id', root.getAttribute('data-render-id') || '0');
  return group;
}

function getSvgLayer(chart, layer) {
  const root = chart.$chartjsSvgRoot;
  return root && findChild(root, 'data-svg-layer', layer);
}

/**
 * Returns a chart-level SVG group. It shares the regular background and
 * layers with all other SVG renderers, while keeping layout-box
 * content outside scale and dataset groups.
 *
 * @param {any} chart
 * @param {string} part
 * @param {'background'|'foreground'} layer
 * @returns {SVGGElement}
 */
export function getOrCreateSvgChartPart(chart, part, layer) {
  const root = getOrCreateSvgLayer(chart, layer);
  const renderId = root.getAttribute('data-render-id') || '0';
  let group = /** @type {SVGGElement} */ (findChild(root, 'data-chart-svg-part', part));
  if (!group) {
    group = createSvgElement(chart, 'g');
    group.setAttribute('data-chart-svg-part', part);
    root.appendChild(group);
  }
  group.setAttribute('data-render-id', renderId);
  return group;
}

/**
 * @param {any} chart
 * @param {string} part
 */
export function removeSvgChartPart(chart, part) {
  for (const layer of ['background', 'foreground']) {
    const root = getSvgLayer(chart, layer);
    const group = root && findChild(root, 'data-chart-svg-part', part);
    if (group) {
      group.remove();
    }
  }
}

/**
 * @param {any} chart
 * @param {string} scaleId
 * @param {'background'|'grid'|'ticks'|'border'|'labels'|'title'|'radial-background'|'radial-grid'|'angle-lines'|'point-labels'|'radial-ticks'} part
 * @param {'background'|'foreground'} layer
 * @returns {SVGGElement}
 */
export function getOrCreateSvgScalePart(chart, scaleId, part, layer) {
  removeSvgScalePart(chart, scaleId, part, otherLayer(layer));

  const root = getOrCreateSvgLayer(chart, layer);
  const renderId = root.getAttribute('data-render-id') || '0';
  let scale = /** @type {SVGGElement} */ (findChild(root, 'data-scale-id', scaleId));
  if (!scale) {
    scale = createSvgElement(chart, 'g');
    scale.setAttribute('data-scale-id', scaleId);
    root.appendChild(scale);
  }
  scale.setAttribute('data-render-id', renderId);

  let group = /** @type {SVGGElement} */ (findChild(scale, 'data-svg-part', part));
  if (!group) {
    group = createSvgElement(chart, 'g');
    group.setAttribute('data-svg-part', part);
    scale.appendChild(group);
  }
  return group;
}

/**
 * @param {SVGElement} group
 * @param {string} name
 * @param {number} [index]
 * @returns {SVGElement}
 */
export function getOrCreateSvgElement(group, name, index = 0) {
  let element = group.children[index];
  if (!element) {
    element = group.ownerDocument.createElementNS(SVG_NS, name);
    group.appendChild(element);
  }
  return /** @type {SVGElement} */ (element);
}

/**
 * @param {SVGElement} group
 * @param {number} count
 */
export function removeExtraSvgElements(group, count) {
  while (group.children.length > count) {
    group.lastElementChild.remove();
  }
}

/**
 * @param {any} chart
 * @param {string} scaleId
 * @param {'background'|'grid'|'ticks'|'border'|'labels'|'title'|'radial-background'|'radial-grid'|'angle-lines'|'point-labels'|'radial-ticks'} part
 * @param {'background'|'foreground'} [layer]
 */
export function removeSvgScalePart(chart, scaleId, part, layer) {
  const layers = layer ? [layer] : ['background', 'foreground'];
  for (const currentLayer of layers) {
    const root = getSvgLayer(chart, currentLayer);
    const scale = root && findChild(root, 'data-scale-id', scaleId);
    const group = scale && findChild(scale, 'data-svg-part', part);
    if (group) {
      group.remove();
      if (!scale.children.length) {
        scale.remove();
      }
    }
  }
}

/**
 * @param {any} chart
 * @param {number} datasetIndex
 * @returns {SVGGElement}
 */
export function getOrCreateSvgDatasetGroup(chart, datasetIndex) {
  const root = getOrCreateSvgLayer(chart, 'datasets');
  const renderId = root.getAttribute('data-render-id') || '0';
  if (!root.hasAttribute('data-render-id')) {
    root.setAttribute('data-render-id', renderId);
  }
  let group = /** @type {SVGGElement} */ (findChild(root, 'data-dataset-index', datasetIndex.toString()));

  if (!group) {
    group = createSvgElement(chart, 'g');
    group.setAttribute('data-dataset-index', datasetIndex.toString());
    root.appendChild(group);
  }

  // Dataset controllers are called in Chart.js draw order. Re-appending an
  // existing node keeps its identity while matching runtime `dataset.order`.
  root.appendChild(group);

  group.setAttribute('data-render-id', renderId);
  return group;
}

/**
 * Returns a stable part of a dataset's foreground group. Parts keep SVG
 * drawing order explicit without coupling this helper to a chart element type.
 *
 * @param {any} chart
 * @param {number} datasetIndex
 * @param {string} part
 * @returns {SVGGElement}
 */
export function getOrCreateSvgDatasetPart(chart, datasetIndex, part) {
  const dataset = getOrCreateSvgDatasetGroup(chart, datasetIndex);
  const renderId = dataset.getAttribute('data-render-id');
  let group = /** @type {SVGGElement} */ (findChild(dataset, 'data-svg-part', part));

  if (!group) {
    group = createSvgElement(chart, 'g');
    group.setAttribute('data-svg-part', part);
    dataset.appendChild(group);
  }

  group.setAttribute('data-render-id', renderId);
  return group;
}

/**
 * Removes a dataset part without affecting other SVG renderers in the same
 * dataset group.
 *
 * @param {any} chart
 * @param {number} datasetIndex
 * @param {string} part
 */
export function removeSvgDatasetPart(chart, datasetIndex, part) {
  const root = getSvgLayer(chart, 'datasets');
  const dataset = root && findChild(root, 'data-dataset-index', datasetIndex.toString());
  const group = dataset && findChild(dataset, 'data-svg-part', part);
  if (group) {
    group.remove();
  }
}

/**
 * Updates a reusable SVG clip path containing a rectangle.
 *
 * @param {any} chart
 * @param {string} key
 * @param {{left: number, top: number, right: number, bottom: number}} bounds
 * @returns {string}
 */
export function getOrCreateSvgClipRect(chart, key, bounds) {
  const defs = getOrCreateSvgDefs(chart);
  const renderId = defs.getAttribute('data-render-id');
  const id = `chartjs-${chart.id}-clip-${key}`;
  let clip = /** @type {SVGClipPathElement} */ (findChild(defs, 'id', id));
  if (!clip) {
    clip = createSvgElement(chart, 'clipPath');
    clip.setAttribute('id', id);
    defs.appendChild(clip);
  }
  clip.setAttribute('data-svg-clip', 'true');
  clip.setAttribute('data-render-id', renderId);
  const rect = getOrCreateSvgElement(clip, 'rect');
  rect.setAttribute('x', bounds.left.toString());
  rect.setAttribute('y', bounds.top.toString());
  rect.setAttribute('width', Math.max(0, bounds.right - bounds.left).toString());
  rect.setAttribute('height', Math.max(0, bounds.bottom - bounds.top).toString());
  removeExtraSvgElements(clip, 1);
  return `url(#${id})`;
}

/**
 * Updates a reusable SVG clip path containing a path string.
 *
 * @param {any} chart
 * @param {string} key
 * @param {string} d
 * @param {'nonzero'|'evenodd'} [fillRule]
 * @returns {string}
 */
export function getOrCreateSvgClipPath(chart, key, d, fillRule = 'nonzero') {
  const defs = getOrCreateSvgDefs(chart);
  const renderId = defs.getAttribute('data-render-id');
  const id = `chartjs-${chart.id}-clip-${key}`;
  let clip = /** @type {SVGClipPathElement} */ (findChild(defs, 'id', id));
  if (!clip) {
    clip = createSvgElement(chart, 'clipPath');
    clip.setAttribute('id', id);
    defs.appendChild(clip);
  }
  clip.setAttribute('data-svg-clip', 'true');
  clip.setAttribute('data-render-id', renderId);
  const path = getOrCreateSvgElement(clip, 'path');
  path.setAttribute('d', d);
  path.setAttribute('clip-rule', fillRule);
  path.setAttribute('fill-rule', fillRule);
  removeExtraSvgElements(clip, 1);
  return `url(#${id})`;
}

/**
 * Associates an element being drawn with its chart and dataset. Element
 * classes can then render SVG without carrying chart-specific fields.
 *
 * @param {object} element
 * @param {any} chart
 * @param {number} datasetIndex
 * @param {number} [dataIndex]
 */
export function setSvgElementContext(element, chart, datasetIndex, dataIndex) {
  svgElementContexts.set(element, {chart, datasetIndex, dataIndex});
}

/**
 * @param {object} element
 * @returns {{chart: any, datasetIndex: number, dataIndex?: number}|undefined}
 */
export function getSvgElementContext(element) {
  return svgElementContexts.get(element);
}

/**
 * Gets an SVG element owned by a chart element. The element is reused across
 * animation frames and moved to the end of `group` to match draw order.
 *
 * @param {SVGGElement} group
 * @param {object} owner
 * @param {string} name
 * @returns {SVGElement}
 */
export function getOrCreateSvgElementFor(group, owner, name) {
  let element = svgElements.get(owner);
  if (!element || element.ownerDocument !== group.ownerDocument || (element.localName && element.localName !== name)) {
    if (element) {
      element.remove();
    }
    element = group.ownerDocument.createElementNS(SVG_NS, name);
    svgElements.set(owner, element);
  }

  group.appendChild(element);
  element.setAttribute('data-svg-element-owner', 'true');
  element.setAttribute('data-render-id', group.getAttribute('data-render-id'));
  return element;
}

/**
 * Returns an SVG-compatible image source.
 *
 * @param {any} chart
 * @param {any} source
 * @returns {string|undefined}
 */
export function getSvgImageHref(chart, source) {
  if (Object.prototype.toString.call(source) === '[object HTMLImageElement]') {
    return source.currentSrc || source.src || undefined;
  }
  if (source && Object.prototype.toString.call(source) === '[object HTMLCanvasElement]' && !svgWarnings.has(source)) {
    svgWarnings.add(source);
    console.warn('Chart.js SVG renderer does not support HTMLCanvasElement pointStyle; use HTMLImageElement instead.');
  }
  return undefined;
}

/**
 * Positions an SVG image using the same centre and rotation semantics as
 * Canvas drawImage() in drawPointLegend().
 *
 * @param {SVGImageElement} element
 * @param {any} chart
 * @param {any} source
 * @param {number} x
 * @param {number} y
 * @param {number} [rotation]
 * @returns {boolean}
 */
export function setSvgImageAttributes(element, chart, source, x, y, rotation = 0) {
  const href = getSvgImageHref(chart, source);
  const width = source && source.width;
  const height = source && source.height;
  if (!href || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return false;
  }

  element.setAttribute('href', href);
  element.setAttribute('x', (x - width / 2).toString());
  element.setAttribute('y', (y - height / 2).toString());
  element.setAttribute('width', width.toString());
  element.setAttribute('height', height.toString());
  element.setAttribute('preserveAspectRatio', 'none');
  element.setAttribute('transform', `rotate(${rotation} ${x} ${y})`);
  return true;
}

/**
 * @param {object} owner
 */
export function removeSvgElementFor(owner) {
  const element = svgElements.get(owner);
  if (element) {
    element.remove();
    svgElements.delete(owner);
  }
}

/**
 * @param {SVGGElement} group
 * @param {number} index
 * @returns {SVGPathElement}
 */
export function getOrCreateSvgPath(group, index) {
  return /** @type {SVGPathElement} */ (getOrCreateSvgElement(group, 'path', index));
}

/**
 * @param {SVGGElement} group
 * @param {number} count
 */
export function removeExtraSvgPaths(group, count) {
  removeExtraSvgElements(group, count);
}

/**
 * @param {any} chart
 * @param {number} datasetIndex
 */
export function removeSvgDataset(chart, datasetIndex) {
  const root = getSvgLayer(chart, 'datasets');
  const group = root && findChild(root, 'data-dataset-index', datasetIndex.toString());
  if (group) {
    group.remove();
  }
}

/**
 * @param {any} chart
 */
export function beginSvgRender(chart) {
  if (chart.options.renderer === 'svg') {
    const root = getOrCreateSvgRoot(chart);
    const renderId = +(root.getAttribute('data-render-id') || 0) + 1;
    root.setAttribute('data-render-id', renderId.toString());
    for (const layer of SVG_LAYERS) {
      getOrCreateSvgLayer(chart, layer).setAttribute('data-render-id', renderId.toString());
    }
  } else {
    removeSvgRoot(chart);
  }
}

/**
 * @param {any} chart
 */
export function endSvgRender(chart) {
  if (chart.options.renderer !== 'svg') {
    return;
  }

  const root = chart.$chartjsSvgRoot;
  if (!root) {
    return;
  }
  const renderId = root.getAttribute('data-render-id');
  for (const layer of SVG_LAYERS) {
    const group = getSvgLayer(chart, layer);
    if (!group) {
      continue;
    }
    for (const child of Array.from(group.children)) {
      if (child.getAttribute('data-render-id') !== renderId) {
        child.remove();
      }
    }
    removeStaleSvgElements(group, renderId);
  }
  removeStaleSvgClipPaths(root, renderId);
  removeStaleSvgPaints(root, renderId);
}

function removeStaleSvgClipPaths(root, renderId) {
  const defs = findChild(root, 'data-svg-defs', 'true');
  if (!defs) {
    return;
  }
  for (const clip of Array.from(defs.children)) {
    if (clip.getAttribute('data-svg-clip') === 'true' && clip.getAttribute('data-render-id') !== renderId) {
      clip.remove();
    }
  }
}

function removeStaleSvgPaints(root, renderId) {
  const defs = findChild(root, 'data-svg-defs', 'true');
  if (!defs) {
    return;
  }
  for (const paint of Array.from(defs.children)) {
    if (paint.getAttribute('data-svg-paint') === 'true' && paint.getAttribute('data-render-id') !== renderId) {
      paint.remove();
    }
  }
}

function removeStaleSvgElements(group, renderId) {
  for (const element of Array.from(group.children)) {
    if (element.getAttribute('data-svg-element-owner') === 'true' && element.getAttribute('data-render-id') !== renderId) {
      element.remove();
    } else {
      removeStaleSvgElements(element, renderId);
    }
  }
}

/**
 * @param {any} chart
 */
export function removeSvgRoot(chart) {
  const root = chart.$chartjsSvgRoot;
  if (!root) {
    return;
  }

  const parent = root.parentNode;
  if (root.getAttribute('data-positioned-parent') === 'true' && parent && parent.style && parent.style.position === 'relative') {
    parent.style.position = root.getAttribute('data-parent-position');
  }
  root.remove();
  delete chart.$chartjsSvgRoot;
}
