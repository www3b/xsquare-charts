import {tracePoint} from '../helpers/helpers.canvas.js';
import {toFont, toPadding, toTRBLCorners} from '../helpers/helpers.options.js';
import {Path} from '../helpers/helpers.path.js';
import {resolveSvgPaint, resolveSvgPaintDataUrl, setSvgImageAttributes} from '../helpers/helpers.svg.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const htmlTooltips = new WeakMap();

function createElement(document, name, attribute) {
  const element = document.createElement(name);
  if (attribute) {
    element.setAttribute(attribute, '');
  }
  return element;
}

function setFont(style, font) {
  style.fontFamily = font.family;
  style.fontSize = `${font.size}px`;
  style.fontStyle = font.style;
  style.fontWeight = font.weight;
  style.lineHeight = `${font.lineHeight}px`;
}

function setCorners(style, corners) {
  style.borderTopLeftRadius = `${corners.topLeft}px`;
  style.borderTopRightRadius = `${corners.topRight}px`;
  style.borderBottomRightRadius = `${corners.bottomRight}px`;
  style.borderBottomLeftRadius = `${corners.bottomLeft}px`;
}

function removeChildren(element) {
  while (element.lastChild) {
    element.lastChild.remove();
  }
}

function addLines(document, parent, lines, attribute) {
  const elements = [];
  for (const line of lines) {
    const element = createElement(document, 'div', attribute);
    element.textContent = line;
    parent.appendChild(element);
    elements.push(element);
  }
  return elements;
}

function borderWidth(value) {
  return value && typeof value === 'object' ? Math.max(...Object.values(value)) : (value || 1);
}

function setHtmlPaint(style, property, chart, value) {
  const url = resolveSvgPaintDataUrl(chart, value);
  if (!url) {
    style[property] = value;
    style.backgroundImage = '';
    return;
  }
  style[property] = 'transparent';
  style.backgroundImage = `url("${url}")`;
  style.backgroundRepeat = 'no-repeat';
  style.backgroundSize = `${chart.width}px ${chart.height}px`;
  if (property === 'color') {
    style.backgroundClip = 'text';
    style.webkitBackgroundClip = 'text';
  }
}

function markerPath(width, height, pointStyle) {
  const path = new Path();
  tracePoint(path, {
    borderWidth: 1,
    pointStyle: pointStyle.pointStyle,
    radius: Math.min(width, height) / 2,
    rotation: pointStyle.rotation,
  }, width / 2, height / 2, width);
  return path.toString();
}

function createPointMarker(document, chart, options, labelColor, pointStyle) {
  const marker = createElement(document, 'span', 'data-chart-tooltip-marker');
  const svg = document.createElementNS(SVG_NS, 'svg');
  const background = document.createElementNS(SVG_NS, 'path');
  const foreground = document.createElementNS(SVG_NS, 'path');
  const {boxWidth, boxHeight} = options;
  const d = markerPath(boxWidth, boxHeight, pointStyle);

  marker.style.display = 'inline-block';
  marker.style.flex = `0 0 ${boxWidth}px`;
  marker.style.height = `${boxHeight}px`;
  marker.style.marginInlineEnd = `${options.boxPadding + 2}px`;
  svg.setAttribute('width', boxWidth);
  svg.setAttribute('height', boxHeight);
  svg.setAttribute('viewBox', `0 0 ${boxWidth} ${boxHeight}`);
  svg.setAttribute('aria-hidden', 'true');
  if (pointStyle.pointStyle && typeof pointStyle.pointStyle === 'object') {
    const image = document.createElementNS(SVG_NS, 'image');
    if (setSvgImageAttributes(image, chart, pointStyle.pointStyle, boxWidth / 2, boxHeight / 2, pointStyle.rotation)) {
      svg.appendChild(image);
      marker.appendChild(svg);
      return marker;
    }
  }
  background.setAttribute('d', d);
  background.setAttribute('fill', resolveSvgPaint(chart, options.multiKeyBackground));
  background.setAttribute('stroke', resolveSvgPaint(chart, options.multiKeyBackground));
  foreground.setAttribute('d', d);
  foreground.setAttribute('fill', resolveSvgPaint(chart, labelColor.backgroundColor));
  foreground.setAttribute('stroke', resolveSvgPaint(chart, labelColor.borderColor));
  foreground.setAttribute('stroke-width', '1');
  svg.appendChild(background);
  svg.appendChild(foreground);
  marker.appendChild(svg);
  return marker;
}

function createColorMarker(document, chart, options, labelColor) {
  const marker = createElement(document, 'span', 'data-chart-tooltip-marker');
  const fill = createElement(document, 'span');
  const corners = toTRBLCorners(labelColor.borderRadius);

  marker.style.position = 'relative';
  marker.style.boxSizing = 'border-box';
  marker.style.display = 'inline-block';
  marker.style.flex = `0 0 ${options.boxWidth}px`;
  marker.style.width = `${options.boxWidth}px`;
  marker.style.height = `${options.boxHeight}px`;
  marker.style.marginInlineEnd = `${options.boxPadding + 2}px`;
  setHtmlPaint(marker.style, 'backgroundColor', chart, options.multiKeyBackground);
  setHtmlPaint(marker.style, 'borderColor', chart, labelColor.borderColor);
  marker.style.borderWidth = `${borderWidth(labelColor.borderWidth)}px`;
  marker.style.borderStyle = labelColor.borderDash && labelColor.borderDash.length ? 'dashed' : 'solid';
  if (!resolveSvgPaintDataUrl(chart, labelColor.borderColor)) {
    marker.style.border = `${borderWidth(labelColor.borderWidth)}px ${labelColor.borderDash && labelColor.borderDash.length ? 'dashed' : 'solid'} ${labelColor.borderColor}`;
  }
  setCorners(marker.style, corners);
  fill.style.position = 'absolute';
  fill.style.inset = '1px';
  setHtmlPaint(fill.style, 'backgroundColor', chart, labelColor.backgroundColor);
  setCorners(fill.style, corners);
  marker.appendChild(fill);
  return marker;
}

function createBodyItem(document, tooltip, options, item, index) {
  const bodyItem = createElement(document, 'div', 'data-chart-tooltip-body-item');
  const lines = createElement(document, 'div', 'data-chart-tooltip-lines');
  const lineElements = [];
  const bodyFont = toFont(options.bodyFont);
  const direction = options.textDirection || (options.rtl ? 'rtl' : 'ltr');

  setHtmlPaint(bodyItem.style, 'color', tooltip.chart, tooltip.labelTextColors[index]);
  bodyItem.style.direction = direction;
  bodyItem.style.textAlign = options.bodyAlign;
  setFont(bodyItem.style, bodyFont);
  lineElements.push(...addLines(document, bodyItem, item.before, 'data-chart-tooltip-body-before'));

  if (item.lines.length) {
    const first = createElement(document, 'div', 'data-chart-tooltip-body-line');
    first.style.display = 'flex';
    first.style.alignItems = 'center';
    first.style.minHeight = `${Math.max(bodyFont.lineHeight, options.displayColors ? options.boxHeight : 0)}px`;
    first.style.justifyContent = options.bodyAlign === 'right' ? 'flex-end' : options.bodyAlign === 'center' ? 'center' : 'flex-start';
    first.style.flexDirection = options.rtl ? 'row-reverse' : 'row';
    if (options.displayColors) {
      first.appendChild(options.usePointStyle
        ? createPointMarker(document, tooltip.chart, options, tooltip.labelColors[index], tooltip.labelPointStyles[index])
        : createColorMarker(document, tooltip.chart, options, tooltip.labelColors[index]));
    }
    const firstLine = createElement(document, 'span');
    firstLine.textContent = item.lines[0];
    first.appendChild(firstLine);
    lines.appendChild(first);
    lineElements.push(first, ...addLines(document, lines, item.lines.slice(1), 'data-chart-tooltip-body-line'));
  }
  bodyItem.appendChild(lines);
  lineElements.push(...addLines(document, bodyItem, item.after, 'data-chart-tooltip-body-after'));
  return {element: bodyItem, lineElements};
}

function contentSignature(tooltip, options) {
  return JSON.stringify({
    afterBody: tooltip.afterBody,
    beforeBody: tooltip.beforeBody,
    body: tooltip.body,
    colors: tooltip.labelColors,
    pointStyles: tooltip.labelPointStyles,
    textColors: tooltip.labelTextColors,
    footer: tooltip.footer,
    title: tooltip.title,
    options: [options.backgroundColor, options.bodyAlign, options.bodyColor, options.bodyFont, options.boxHeight, options.boxPadding, options.boxWidth, options.cornerRadius, options.displayColors, options.footerAlign, options.footerColor, options.footerFont, options.footerMarginTop, options.footerSpacing, options.multiKeyBackground, options.padding, options.rtl, options.textDirection, options.titleAlign, options.titleColor, options.titleFont, options.titleMarginBottom, options.titleSpacing, options.usePointStyle],
  });
}

// eslint-disable-next-line max-statements, complexity
function updateContent(state, tooltip, options) {
  const signature = contentSignature(tooltip, options);
  if (signature === state.signature) {
    return;
  }
  state.signature = signature;
  const {document, content} = state;
  const padding = toPadding(options.padding);
  const titleFont = toFont(options.titleFont);
  const bodyFont = toFont(options.bodyFont);
  const footerFont = toFont(options.footerFont);
  const direction = options.textDirection || (options.rtl ? 'rtl' : 'ltr');
  const title = createElement(document, 'div', 'data-chart-tooltip-title');
  const beforeBody = createElement(document, 'div', 'data-chart-tooltip-before-body');
  const body = createElement(document, 'div', 'data-chart-tooltip-body');
  const afterBody = createElement(document, 'div', 'data-chart-tooltip-after-body');
  const footer = createElement(document, 'div', 'data-chart-tooltip-footer');

  removeChildren(content);
  content.style.boxSizing = 'border-box';
  content.style.direction = direction;
  content.style.height = '100%';
  content.style.paddingTop = `${padding.top}px`;
  content.style.paddingRight = `${padding.right}px`;
  content.style.paddingBottom = `${padding.bottom}px`;
  content.style.paddingLeft = `${padding.left}px`;
  setHtmlPaint(title.style, 'color', tooltip.chart, options.titleColor);
  title.style.textAlign = options.titleAlign;
  title.style.marginBottom = tooltip.title.length ? `${options.titleMarginBottom}px` : '0';
  setFont(title.style, titleFont);
  addLines(document, title, tooltip.title, 'data-chart-tooltip-title-line');
  for (const line of Array.from(title.children)) {
    line.style.marginBottom = `${options.titleSpacing}px`;
  }
  if (title.lastChild) {
    title.lastChild.style.marginBottom = '0';
  }
  setHtmlPaint(beforeBody.style, 'color', tooltip.chart, options.bodyColor);
  beforeBody.style.textAlign = options.bodyAlign;
  setFont(beforeBody.style, bodyFont);
  const bodyLineElements = addLines(document, beforeBody, tooltip.beforeBody, 'data-chart-tooltip-before-body-line');
  setHtmlPaint(body.style, 'color', tooltip.chart, options.bodyColor);
  body.style.textAlign = options.bodyAlign;
  setFont(body.style, bodyFont);
  for (let i = 0; i < tooltip.body.length; ++i) {
    const item = createBodyItem(document, tooltip, options, tooltip.body[i], i);
    body.appendChild(item.element);
    bodyLineElements.push(...item.lineElements);
  }
  setHtmlPaint(afterBody.style, 'color', tooltip.chart, options.bodyColor);
  afterBody.style.textAlign = options.bodyAlign;
  setFont(afterBody.style, bodyFont);
  bodyLineElements.push(...addLines(document, afterBody, tooltip.afterBody, 'data-chart-tooltip-after-body-line'));
  for (const line of bodyLineElements) {
    line.style.marginBottom = `${options.bodySpacing}px`;
  }
  if (bodyLineElements.length) {
    bodyLineElements[bodyLineElements.length - 1].style.marginBottom = '0';
  }
  setHtmlPaint(footer.style, 'color', tooltip.chart, options.footerColor);
  footer.style.textAlign = options.footerAlign;
  footer.style.marginTop = tooltip.footer.length ? `${options.footerMarginTop}px` : '0';
  setFont(footer.style, footerFont);
  addLines(document, footer, tooltip.footer, 'data-chart-tooltip-footer-line');
  for (const line of Array.from(footer.children)) {
    line.style.marginBottom = `${options.footerSpacing}px`;
  }
  if (footer.lastChild) {
    footer.lastChild.style.marginBottom = '0';
  }
  content.appendChild(title);
  content.appendChild(beforeBody);
  content.appendChild(body);
  content.appendChild(afterBody);
  content.appendChild(footer);
}

function createState(chart) {
  const document = chart.host.ownerDocument;
  const root = createElement(document, 'div', 'data-chart-tooltip');
  const caret = createElement(document, 'div', 'data-chart-tooltip-caret');
  const background = createElement(document, 'div', 'data-chart-tooltip-background');
  const content = createElement(document, 'div', 'data-chart-tooltip-content');

  root.setAttribute('role', 'tooltip');
  root.setAttribute('aria-hidden', 'true');
  root.style.position = 'absolute';
  root.style.pointerEvents = 'none';
  root.style.boxSizing = 'border-box';
  root.style.display = 'none';
  root.style.zIndex = '1';
  background.style.position = 'absolute';
  background.style.inset = '0';
  background.style.boxSizing = 'border-box';
  background.style.zIndex = '0';
  caret.style.position = 'absolute';
  caret.style.zIndex = '0';
  content.style.position = 'relative';
  content.style.zIndex = '1';
  root.appendChild(caret);
  root.appendChild(background);
  root.appendChild(content);
  chart.host.appendChild(root);
  const state = {background, caret, content, document, root, signature: undefined};
  htmlTooltips.set(chart, state);
  return state;
}

function setCaret(state, tooltip, options) {
  const caret = tooltip.getCaretPosition({x: tooltip.x, y: tooltip.y}, {width: tooltip.width, height: tooltip.height}, options);
  const points = [
    [caret.x1 - tooltip.x, caret.y1 - tooltip.y],
    [caret.x2 - tooltip.x, caret.y2 - tooltip.y],
    [caret.x3 - tooltip.x, caret.y3 - tooltip.y],
  ];
  const left = Math.min(...points.map(([x]) => x));
  const top = Math.min(...points.map(([, y]) => y));
  state.caret.style.left = `${left}px`;
  state.caret.style.top = `${top}px`;
  state.caret.style.width = `${Math.max(...points.map(([x]) => x)) - left}px`;
  state.caret.style.height = `${Math.max(...points.map(([, y]) => y)) - top}px`;
  setHtmlPaint(state.caret.style, 'backgroundColor', tooltip.chart, options.backgroundColor);
  state.caret.style.clipPath = `polygon(${points.map(([x, y]) => `${x - left}px ${y - top}px`).join(', ')})`;
}

function hasContent(tooltip) {
  return tooltip.title.length || tooltip.beforeBody.length || tooltip.body.length || tooltip.afterBody.length || tooltip.footer.length;
}

export function hideHtmlTooltip(chart) {
  const state = htmlTooltips.get(chart);
  if (!state) {
    return;
  }
  state.root.style.display = 'none';
  state.root.style.opacity = '0';
  state.root.setAttribute('aria-hidden', 'true');
}

export function removeHtmlTooltip(chart) {
  const state = htmlTooltips.get(chart);
  if (state) {
    state.root.remove();
    htmlTooltips.delete(chart);
  }
}

export function renderHtmlTooltip(tooltip) {
  const options = tooltip.options.setContext(tooltip.getContext());
  tooltip._updateAnimationTarget(options);
  const opacity = Math.abs(tooltip.opacity) < 1e-3 ? 0 : tooltip.opacity;
  if (!opacity || !options.enabled || !hasContent(tooltip)) {
    hideHtmlTooltip(tooltip.chart);
    return false;
  }

  const state = htmlTooltips.get(tooltip.chart) || createState(tooltip.chart);
  const corners = toTRBLCorners(options.cornerRadius);
  for (const color of [options.backgroundColor, options.borderColor, options.bodyColor, options.footerColor, options.titleColor, options.multiKeyBackground, ...tooltip.labelTextColors]) {
    resolveSvgPaint(tooltip.chart, color);
  }
  for (const color of tooltip.labelColors) {
    resolveSvgPaint(tooltip.chart, color.backgroundColor);
    resolveSvgPaint(tooltip.chart, color.borderColor);
  }
  updateContent(state, tooltip, options);
  state.root.style.display = 'block';
  state.root.style.left = `${tooltip.x}px`;
  state.root.style.top = `${tooltip.y}px`;
  state.root.style.width = `${tooltip.width}px`;
  state.root.style.height = `${tooltip.height}px`;
  state.root.style.opacity = `${opacity}`;
  state.root.setAttribute('aria-hidden', 'false');
  setHtmlPaint(state.background.style, 'backgroundColor', tooltip.chart, options.backgroundColor);
  setHtmlPaint(state.background.style, 'borderColor', tooltip.chart, options.borderColor);
  state.background.style.borderWidth = `${options.borderWidth}px`;
  state.background.style.borderStyle = 'solid';
  setCorners(state.background.style, corners);
  setCaret(state, tooltip, options);
  return true;
}
