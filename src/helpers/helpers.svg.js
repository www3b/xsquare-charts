const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_LAYERS = /** @type {('background'|'datasets'|'foreground')[]} */ (['background', 'datasets', 'foreground']);
const svgElementContexts = new WeakMap();
const svgElements = new WeakMap();
const svgPaints = new WeakMap();
const svgCharts = new WeakMap();

function createSvgElement(chart, name) {
  return chart.canvas.ownerDocument.createElementNS(SVG_NS, name);
}

function isCanvasPaint(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const type = Object.prototype.toString.call(value);
  return type === '[object CanvasGradient]' || type === '[object CanvasPattern]';
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
    const pattern = createSvgElement(chart, 'pattern');
    const image = createSvgElement(chart, 'image');
    descriptor = {id: `chartjs-${chart.id}-paint-${++state.nextId}`, image, pattern, renderId: undefined, url: undefined, warned: false};
    pattern.setAttribute('id', descriptor.id);
    pattern.setAttribute('data-svg-paint', 'true');
    pattern.setAttribute('patternContentUnits', 'userSpaceOnUse');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    image.setAttribute('preserveAspectRatio', 'none');
    pattern.appendChild(image);
    state.values.set(value, descriptor);
  }
  return descriptor;
}

function rasterizeSvgPaint(chart, value) {
  const {canvas: source, ctx: sourceContext, currentDevicePixelRatio, height, width} = chart;
  const document = source && source.ownerDocument;
  const canvas = document && document.createElement && document.createElement('canvas');
  if (!canvas || !width || !height) {
    return undefined;
  }

  const ratio = currentDevicePixelRatio || 1;
  canvas.width = Math.max(1, Math.ceil(width * ratio));
  canvas.height = Math.max(1, Math.ceil(height * ratio));
  const context = canvas.getContext && canvas.getContext('2d');
  if (!context) {
    return undefined;
  }

  try {
    const transform = sourceContext && sourceContext.getTransform && sourceContext.getTransform();
    if (transform && context.setTransform) {
      context.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
    } else if (context.setTransform) {
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    context.fillStyle = value;
    context.fillRect(0, 0, width, height);
    return canvas.toDataURL('image/png');
  } catch (error) {
    return {error};
  }
}

function updateSvgPaint(chart, value) {
  const defs = getOrCreateSvgDefs(chart);
  const renderId = defs.getAttribute('data-render-id');
  const descriptor = getSvgPaintDescriptor(chart, value);
  if (descriptor.renderId !== renderId) {
    const result = rasterizeSvgPaint(chart, value);
    descriptor.renderId = renderId;
    descriptor.url = typeof result === 'string' ? result : undefined;
    if (!descriptor.url && !descriptor.warned) {
      descriptor.warned = true;
      console.warn('Chart.js SVG renderer could not serialize a CanvasGradient or CanvasPattern; using transparent paint.', result && result.error);
    }
  }
  if (!descriptor.url) {
    return undefined;
  }

  defs.appendChild(descriptor.pattern);
  descriptor.pattern.setAttribute('data-render-id', renderId);
  descriptor.pattern.setAttribute('x', '0');
  descriptor.pattern.setAttribute('y', '0');
  descriptor.pattern.setAttribute('width', chart.width.toString());
  descriptor.pattern.setAttribute('height', chart.height.toString());
  descriptor.image.setAttribute('href', descriptor.url);
  descriptor.image.setAttribute('x', '0');
  descriptor.image.setAttribute('y', '0');
  descriptor.image.setAttribute('width', chart.width.toString());
  descriptor.image.setAttribute('height', chart.height.toString());
  return descriptor;
}

/**
 * Resolves a Chart.js Color value to an SVG paint. Native Canvas paints are
 * rasterized because CanvasGradient and CanvasPattern deliberately expose no
 * public metadata for lossless vector conversion.
 *
 * @param {any} chart
 * @param {any} value
 * @returns {string}
 */
export function resolveSvgPaint(chart, value) {
  if (!isCanvasPaint(value)) {
    return String(value);
  }
  const descriptor = updateSvgPaint(chart, value);
  return descriptor ? `url(#${descriptor.id})` : 'transparent';
}

/**
 * Returns a self-contained raster paint for the HTML SVG-tooltip counterpart.
 *
 * @param {any} chart
 * @param {any} value
 * @returns {string|undefined}
 */
export function resolveSvgPaintDataUrl(chart, value) {
  if (!isCanvasPaint(value)) {
    return undefined;
  }
  const descriptor = updateSvgPaint(chart, value);
  return descriptor && descriptor.url;
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
  const {canvas, width, height} = chart;
  const parent = canvas.parentNode;

  root.setAttribute('width', width);
  root.setAttribute('height', height);
  root.setAttribute('viewBox', `0 0 ${width} ${height}`);
  root.style.left = `${canvas.offsetLeft}px`;
  root.style.top = `${canvas.offsetTop}px`;
  root.style.width = `${width}px`;
  root.style.height = `${height}px`;

  if (parent && parent.style && !root.hasAttribute('data-positioned-parent')) {
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
    root = createSvgElement(chart, 'svg');
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('data-chart-svg', 'true');
    root.style.position = 'absolute';
    root.style.pointerEvents = 'none';
    root.style.overflow = 'visible';

    const parent = chart.canvas.parentNode;
    parent.insertBefore(root, chart.canvas.nextSibling);
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
 * Returns the source of an image point style that SVG can reference directly.
 * Canvas point styles deliberately return nothing: serializing a mutable or
 * tainted canvas is neither lossless nor reliably available.
 *
 * @param {any} source
 * @returns {string|undefined}
 */
export function getSvgImageHref(source) {
  if (Object.prototype.toString.call(source) !== '[object HTMLImageElement]') {
    return undefined;
  }
  return source.currentSrc || source.src || undefined;
}

/**
 * Positions an SVG image using the same centre and rotation semantics as
 * Canvas drawImage() in drawPointLegend().
 *
 * @param {SVGImageElement} element
 * @param {any} source
 * @param {number} x
 * @param {number} y
 * @param {number} [rotation]
 * @returns {boolean}
 */
export function setSvgImageAttributes(element, source, x, y, rotation = 0) {
  const href = getSvgImageHref(source);
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
