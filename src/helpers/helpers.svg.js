const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_ROOT_KEYS = {
  background: '$chartjsSvgBackgroundRoot',
  foreground: '$chartjsSvgRoot'
};
const svgElementContexts = new WeakMap();
const svgElements = new WeakMap();

function createSvgElement(chart, name) {
  return chart.canvas.ownerDocument.createElementNS(SVG_NS, name);
}

function rootKey(layer) {
  return SVG_ROOT_KEYS[layer];
}

function otherLayer(layer) {
  return layer === 'background' ? 'foreground' : 'background';
}

function findChild(parent, attribute, value) {
  return Array.from(parent.children).find((child) => child.getAttribute(attribute) === value);
}

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
 * @param {'background'|'foreground'} [layer]
 * @returns {SVGSVGElement}
 */
export function getOrCreateSvgRoot(chart, layer = 'foreground') {
  const key = rootKey(layer);
  let root = chart[key];
  if (!root) {
    root = createSvgElement(chart, 'svg');
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('data-chart-svg-layer', layer);
    root.style.position = 'absolute';
    root.style.pointerEvents = 'none';
    root.style.overflow = 'visible';

    const parent = chart.canvas.parentNode;
    if (layer === 'background') {
      parent.insertBefore(root, chart.canvas);
    } else {
      parent.insertBefore(root, chart.canvas.nextSibling);
    }
    chart[key] = root;
  }
  syncSvgRoot(chart, root);
  return root;
}

/**
 * Returns a chart-level SVG group. It shares the regular background and
 * foreground roots with all other SVG renderers, while keeping layout-box
 * content outside scale and dataset groups.
 *
 * @param {any} chart
 * @param {string} part
 * @param {'background'|'foreground'} layer
 * @returns {SVGGElement}
 */
export function getOrCreateSvgChartPart(chart, part, layer) {
  const root = getOrCreateSvgRoot(chart, layer);
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
    const root = chart[rootKey(layer)];
    const group = root && findChild(root, 'data-chart-svg-part', part);
    if (group) {
      group.remove();
    }
  }
}

/**
 * @param {any} chart
 * @param {string} scaleId
 * @param {'background'|'grid'|'ticks'|'border'|'labels'|'title'} part
 * @param {'background'|'foreground'} layer
 * @returns {SVGGElement}
 */
export function getOrCreateSvgScalePart(chart, scaleId, part, layer) {
  removeSvgScalePart(chart, scaleId, part, otherLayer(layer));

  const root = getOrCreateSvgRoot(chart, layer);
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
 * @param {'background'|'grid'|'ticks'|'border'|'labels'|'title'} part
 * @param {'background'|'foreground'} [layer]
 */
export function removeSvgScalePart(chart, scaleId, part, layer) {
  const layers = layer ? [layer] : ['background', 'foreground'];
  for (const currentLayer of layers) {
    const root = chart[rootKey(currentLayer)];
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
  const root = getOrCreateSvgRoot(chart);
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
  const root = chart[rootKey('foreground')];
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
 * @returns {string}
 */
export function getOrCreateSvgClipPath(chart, key, d) {
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
  if (!element || element.ownerDocument !== group.ownerDocument) {
    element = group.ownerDocument.createElementNS(SVG_NS, name);
    svgElements.set(owner, element);
  }

  group.appendChild(element);
  element.setAttribute('data-svg-element-owner', 'true');
  element.setAttribute('data-render-id', group.getAttribute('data-render-id'));
  return element;
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
  const root = chart[rootKey('foreground')];
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
    const layers = /** @type {('background'|'foreground')[]} */ (['background', 'foreground']);
    for (const layer of layers) {
      const root = getOrCreateSvgRoot(chart, layer);
      const renderId = +(root.getAttribute('data-render-id') || 0) + 1;
      root.setAttribute('data-render-id', renderId.toString());
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

  const layers = /** @type {('background'|'foreground')[]} */ (['background', 'foreground']);
  for (const layer of layers) {
    const root = chart[rootKey(layer)];
    if (!root) {
      continue;
    }
    for (const group of Array.from(root.children)) {
      if (group.getAttribute('data-render-id') !== root.getAttribute('data-render-id')) {
        group.remove();
      }
    }
    removeStaleSvgClipPaths(root, root.getAttribute('data-render-id'));
    removeStaleSvgElements(root, root.getAttribute('data-render-id'));
  }
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
 * @param {'background'|'foreground'} [layer]
 */
export function removeSvgRoot(chart, layer) {
  const layers = layer ? [layer] : ['background', 'foreground'];
  for (const currentLayer of layers) {
    const key = rootKey(currentLayer);
    const root = chart[key];
    if (!root) {
      continue;
    }

    const parent = root.parentNode;
    if (root.getAttribute('data-positioned-parent') === 'true' && parent && parent.style && parent.style.position === 'relative') {
      parent.style.position = root.getAttribute('data-parent-position');
    }
    root.remove();
    delete chart[key];
  }
}
