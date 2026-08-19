const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_ROOT_KEY = '$chartjsSvgRoot';

function createSvgElement(chart, name) {
  return chart.canvas.ownerDocument.createElementNS(SVG_NS, name);
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
 * @param {import('../core/core.controller.js').default} chart
 * @returns {SVGSVGElement}
 */
export function getOrCreateSvgRoot(chart) {
  let root = chart[SVG_ROOT_KEY];
  if (!root) {
    root = createSvgElement(chart, 'svg');
    root.setAttribute('aria-hidden', 'true');
    root.style.position = 'absolute';
    root.style.pointerEvents = 'none';
    root.style.overflow = 'visible';
    chart.canvas.parentNode.appendChild(root);
    chart[SVG_ROOT_KEY] = root;
  }
  syncSvgRoot(chart, root);
  return root;
}

/**
 * @param {import('../core/core.controller.js').default} chart
 * @param {number} datasetIndex
 * @returns {SVGGElement}
 */
export function getOrCreateSvgDatasetGroup(chart, datasetIndex) {
  const root = getOrCreateSvgRoot(chart);
  const renderId = root.getAttribute('data-render-id') || '0';
  if (!root.hasAttribute('data-render-id')) {
    root.setAttribute('data-render-id', renderId);
  }
  let group = /** @type {SVGGElement} */ (root.querySelector(`g[data-dataset-index="${datasetIndex}"]`));

  if (!group) {
    group = createSvgElement(chart, 'g');
    group.setAttribute('data-dataset-index', datasetIndex.toString());
    root.appendChild(group);
  }

  group.setAttribute('data-render-id', renderId);
  return group;
}

/**
 * @param {SVGGElement} group
 * @param {number} index
 * @returns {SVGPathElement}
 */
export function getOrCreateSvgPath(group, index) {
  let path = /** @type {SVGPathElement} */ (group.children[index]);
  if (!path) {
    path = group.ownerDocument.createElementNS(SVG_NS, 'path');
    group.appendChild(path);
  }
  return path;
}

/**
 * @param {SVGGElement} group
 * @param {number} count
 */
export function removeExtraSvgPaths(group, count) {
  while (group.children.length > count) {
    group.lastElementChild.remove();
  }
}

/**
 * @param {import('../core/core.controller.js').default} chart
 * @param {number} datasetIndex
 */
export function removeSvgDataset(chart, datasetIndex) {
  const root = chart[SVG_ROOT_KEY];
  const group = root && root.querySelector(`g[data-dataset-index="${datasetIndex}"]`);
  if (group) {
    group.remove();
  }
}

/**
 * @param {import('../core/core.controller.js').default} chart
 */
export function beginSvgRender(chart) {
  if (chart.options.renderer === 'svg') {
    const root = getOrCreateSvgRoot(chart);
    const renderId = +(root.getAttribute('data-render-id') || 0) + 1;
    root.setAttribute('data-render-id', renderId.toString());
  } else {
    removeSvgRoot(chart);
  }
}

/**
 * @param {import('../core/core.controller.js').default} chart
 */
export function endSvgRender(chart) {
  const root = chart[SVG_ROOT_KEY];
  if (!root || chart.options.renderer !== 'svg') {
    return;
  }

  for (const group of Array.from(root.children)) {
    if (group.getAttribute('data-render-id') !== root.getAttribute('data-render-id')) {
      group.remove();
    }
  }
}

/**
 * @param {import('../core/core.controller.js').default} chart
 */
export function removeSvgRoot(chart) {
  const root = chart[SVG_ROOT_KEY];
  if (!root) {
    return;
  }

  const parent = root.parentNode;
  if (root.getAttribute('data-positioned-parent') === 'true' && parent && parent.style && parent.style.position === 'relative') {
    parent.style.position = root.getAttribute('data-parent-position');
  }
  root.remove();
  delete chart[SVG_ROOT_KEY];
}
