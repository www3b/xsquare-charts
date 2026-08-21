function getOrCreateChild(parent, name, role) {
  let child = Array.from(parent.children).find((element) => element.getAttribute('data-svg-text-role') === role);
  if (!child) {
    child = parent.ownerDocument.createElementNS('http://www.w3.org/2000/svg', name);
    child.setAttribute('data-svg-text-role', role);
    parent.appendChild(child);
  }
  return child;
}

function removeUnusedChildren(parent, roles) {
  for (const child of Array.from(parent.children)) {
    if (!roles.includes(child.getAttribute('data-svg-text-role'))) {
      child.remove();
    }
  }
}

function setOptionalAttribute(element, name, value) {
  if (value === undefined || value === null || value === '') {
    if (element.removeAttribute) {
      element.removeAttribute(name);
    }
  } else {
    element.setAttribute(name, String(value));
  }
}

function svgTextAnchor(align) {
  if (align === 'center') {
    return 'middle';
  }
  return align === 'right' || align === 'end' ? 'end' : 'start';
}

function svgBaseline(baseline) {
  if (baseline === 'top' || baseline === 'hanging') {
    return 'text-before-edge';
  }
  if (baseline === 'bottom' || baseline === 'ideographic') {
    return 'text-after-edge';
  }
  return baseline === 'middle' ? 'central' : 'alphabetic';
}

function setSvgFont(element, font) {
  element.style.font = font.string;
  element.setAttribute('font-family', font.family);
  element.setAttribute('font-size', String(font.size));
  element.setAttribute('font-style', font.style);
  setOptionalAttribute(element, 'font-weight', font.weight);
}

/**
 * Renders text with the same transform and line progression as renderText().
 * `textWidths` are Canvas measurements supplied by the caller solely to match
 * Canvas maxWidth behaviour; no SVG layout measurements are used.
 *
 * @param {SVGGElement} parent
 * @param {number} index
 * @param {string|string[]} value
 * @param {import('../types/index.js').CanvasFontSpec} font
 * @param {import('../types/index.js').RenderTextOpts} options
 * @param {number[]} [textWidths]
 * @param {number} [x]
 * @param {number} [y]
 * @returns {SVGGElement}
 */
// eslint-disable-next-line complexity, max-statements
export function renderSvgText(parent, index, value, font, options = {}, textWidths, x = 0, y = 0) {
  let group = parent.children[index];
  if (!group) {
    group = parent.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'g');
    parent.appendChild(group);
  }
  group.setAttribute('data-svg-text', 'true');

  const [translateX = 0, translateY = 0] = options.translation || [];
  const rotation = options.rotation ? ` rotate(${options.rotation * 180 / Math.PI})` : '';
  group.setAttribute('transform', `translate(${translateX} ${translateY})${rotation}`);

  const roles = ['text'];
  if (options.backdrop) {
    const backdrop = getOrCreateChild(group, 'rect', 'backdrop');
    const {left, top, width, height, color} = options.backdrop;
    backdrop.setAttribute('x', String(left));
    backdrop.setAttribute('y', String(top));
    backdrop.setAttribute('width', String(width));
    backdrop.setAttribute('height', String(height));
    // eslint-disable-next-line no-use-before-define
    backdrop.setAttribute('fill', resolveSvgElementPaint(backdrop, color));
    roles.unshift('backdrop');
  }

  const text = getOrCreateChild(group, 'text', 'text');
  const lines = Array.isArray(value) ? value : [value];
  const lineHeight = Number(font.lineHeight);
  text.setAttribute('x', String(x));
  text.setAttribute('y', String(y));
  // eslint-disable-next-line no-use-before-define
  text.setAttribute('fill', options.color === undefined ? 'currentColor' : resolveSvgElementPaint(text, options.color));
  text.setAttribute('text-anchor', svgTextAnchor(options.textAlign));
  text.setAttribute('dominant-baseline', svgBaseline(options.textBaseline));
  text.setAttribute('paint-order', 'stroke fill');
  setOptionalAttribute(text, 'text-decoration', options.strikethrough ? 'line-through' : undefined);
  // eslint-disable-next-line no-use-before-define
  text.setAttribute('stroke', options.strokeWidth > 0 && options.strokeColor !== '' ? resolveSvgElementPaint(text, options.strokeColor) : 'none');
  text.setAttribute('stroke-width', options.strokeWidth > 0 ? String(options.strokeWidth) : '0');
  setSvgFont(text, font);

  for (let i = 0; i < lines.length; ++i) {
    const tspan = getOrCreateChild(text, 'tspan', `line-${i}`);
    tspan.textContent = lines[i];
    tspan.setAttribute('x', String(x));
    tspan.setAttribute('dy', i ? String(lineHeight) : '0');
    const constrained = options.maxWidth && textWidths && textWidths[i] > options.maxWidth;
    setOptionalAttribute(tspan, 'textLength', constrained ? options.maxWidth : undefined);
    setOptionalAttribute(tspan, 'lengthAdjust', constrained ? 'spacingAndGlyphs' : undefined);
  }
  removeUnusedChildren(text, lines.map((_, lineIndex) => `line-${lineIndex}`));
  removeUnusedChildren(group, roles);
  return /** @type {SVGGElement} */ (group);
}
import {resolveSvgElementPaint} from './helpers.svg.js';
