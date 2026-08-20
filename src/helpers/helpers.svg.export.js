const OVERLAY_STYLE_PROPERTIES = [
  'position',
  'inset',
  'top',
  'right',
  'bottom',
  'left',
  'pointer-events',
  'z-index',
  'width',
  'height',
  'overflow',
];

function removeOverlayStyles(svg) {
  for (const property of OVERLAY_STYLE_PROPERTIES) {
    svg.style.removeProperty(property);
  }
  if (!svg.getAttribute('style')) {
    svg.removeAttribute('style');
  }
}

function removeTransientAttributes(svg) {
  svg.removeAttribute('aria-hidden');
  svg.removeAttribute('data-render-id');
  for (const element of svg.querySelectorAll('[data-render-id]')) {
    element.removeAttribute('data-render-id');
  }
}

function getXmlSerializer(svg) {
  const view = svg.ownerDocument && svg.ownerDocument.defaultView;
  const XMLSerializer = view && view.XMLSerializer || (typeof window !== 'undefined' && window.XMLSerializer);
  if (!XMLSerializer) {
    throw new Error('toSVG() requires XMLSerializer support');
  }
  return new XMLSerializer();
}

/**
 * Serializes the already-rendered SVG tree without recalculating chart state.
 *
 * @param {object} chart
 * @returns {string}
 */
export function serializeSvgChart(chart) {
  if (chart.options.renderer !== 'svg') {
    throw new Error("toSVG() is available only when renderer is 'svg'");
  }

  const root = chart.$chartjsSvgRoot;
  if (!root) {
    throw new Error('toSVG() requires an existing SVG render');
  }

  const svg = root.cloneNode(true);
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', String(chart.width));
  svg.setAttribute('height', String(chart.height));
  svg.setAttribute('viewBox', `0 0 ${chart.width} ${chart.height}`);
  removeOverlayStyles(svg);
  removeTransientAttributes(svg);
  return getXmlSerializer(svg).serializeToString(svg);
}
