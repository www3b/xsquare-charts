// @ts-nocheck
import defaults from '../../components/chart.defaults.js';
import {addRoundedRectPath, tracePoint} from '../canvas/text.js';
import {Path} from '../../geometry/path.js';
import {getOrCreateSvgChartPart, getOrCreateSvgClipRect, removeSvgChartPart, resolveSvgPaint, setSvgImageAttributes} from './svg.js';
import {renderSvgText} from './text.js';
import {valueOrDefault} from '../../shared/index.js';
import {toTRBLCorners} from '../../shared/options.js';

function getLegendChild(parent: SVGElement, role: string): SVGElement | undefined {
  return Array.from(parent.children).find((element) => element.getAttribute('data-legend-role') === role) as SVGElement | undefined;
}

function getOrCreateLegendChild(parent: SVGElement, name: string, role: string): SVGElement {
  let child = getLegendChild(parent, role);
  if (!child) {
    child = parent.ownerDocument.createElementNS('http://www.w3.org/2000/svg', name);
    child.setAttribute('data-legend-role', role);
    parent.appendChild(child);
  }
  return child;
}

function legendItemKey(item: any, index: number): string {
  const datasetIndex = item.datasetIndex === undefined ? 'none' : item.datasetIndex;
  const itemIndex = item.index === undefined ? index : item.index;
  return `dataset-${datasetIndex}-index-${itemIndex}`;
}

function getOrCreateLegendItem(parent: SVGElement, item: any, index: number): SVGElement {
  const key = legendItemKey(item, index);
  let group = Array.from(parent.children).find((element) => element.getAttribute('data-legend-item') === key) as SVGElement | undefined;
  if (!group) {
    group = parent.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('data-legend-item', key);
    parent.appendChild(group);
  }
  parent.appendChild(group);
  return group;
}

function removeStaleLegendItems(parent: SVGElement, keys: Set<string>): void {
  for (const group of Array.from(parent.children)) {
    if (!keys.has(group.getAttribute('data-legend-item') || '')) group.remove();
  }
}

function setSvgLegendSymbolStyle(chart: any, element: SVGElement, item: any): void {
  const lineWidth = valueOrDefault(item.lineWidth, 1);
  element.setAttribute('fill', resolveSvgPaint(chart, valueOrDefault(item.fillStyle, defaults.color)));
  element.setAttribute('stroke', lineWidth ? resolveSvgPaint(chart, valueOrDefault(item.strokeStyle, defaults.color)) : 'none');
  element.setAttribute('stroke-width', String(lineWidth));
  element.setAttribute('stroke-dasharray', String(valueOrDefault(item.lineDash, [])));
  element.setAttribute('stroke-dashoffset', String(valueOrDefault(item.lineDashOffset, 0)));
  element.setAttribute('stroke-linecap', String(valueOrDefault(item.lineCap, 'butt')));
  element.setAttribute('stroke-linejoin', String(valueOrDefault(item.lineJoin, 'miter')));
}

function drawLegendTitle(chart: any, group: SVGGElement, title: any): void {
  if (!title) {
    group.remove();
    return;
  }
  const lines = Array.isArray(title.text) ? title.text : [title.text];
  const widths = lines.map((line) => chart._renderer.measureText(line, title.font.string));
  renderSvgText(group, 0, title.text, title.font, {
    color: title.color,
    maxWidth: title.maxWidth,
    textAlign: title.textAlign,
    textBaseline: 'middle',
    translation: [title.x, title.y],
  }, widths);
}

function drawLegendSymbol(chart: any, itemGroup: SVGElement, drawItem: any, labelOpts: any, model: any): void {
  const {legendItem, symbol} = drawItem;
  const {boxWidth, boxHeight} = model;
  if (isNaN(boxWidth) || boxWidth <= 0 || isNaN(boxHeight) || boxHeight < 0) return;
  const lineWidth = valueOrDefault(legendItem.lineWidth, 1);
  const path = new Path();
  let drawOptions: any;

  if (labelOpts.usePointStyle) {
    drawOptions = {
      radius: boxHeight * Math.SQRT2 / 2,
      pointStyle: legendItem.pointStyle,
      rotation: legendItem.rotation,
      borderWidth: lineWidth
    };
    if (drawOptions.pointStyle && typeof drawOptions.pointStyle === 'object') {
      const image = getOrCreateLegendChild(itemGroup, 'image', 'symbol-image') as SVGImageElement;
      if (setSvgImageAttributes(image, chart, drawOptions.pointStyle, symbol.centerX, symbol.centerY, drawOptions.rotation)) {
        getLegendChild(itemGroup, 'symbol')?.remove();
        return;
      }
      image.remove();
    }
  }

  getLegendChild(itemGroup, 'symbol-image')?.remove();
  const element = getOrCreateLegendChild(itemGroup, 'path', 'symbol');
  if (labelOpts.usePointStyle) {
    tracePoint(path, drawOptions, symbol.centerX, symbol.centerY, labelOpts.pointStyleWidth && boxWidth);
  } else {
    const borderRadius = toTRBLCorners(legendItem.borderRadius);
    if (Object.values(borderRadius).some((value) => value !== 0)) {
      addRoundedRectPath(path, {x: symbol.x, y: symbol.y, w: boxWidth, h: boxHeight, radius: borderRadius});
    } else {
      path.rect(symbol.x, symbol.y, boxWidth, boxHeight);
    }
  }
  element.setAttribute('d', path.toString());
  setSvgLegendSymbolStyle(chart, element, legendItem);
}

export function drawSvgLegend(chart: any, legend: any): void {
  if (!legend.options.display) {
    removeSvgChartPart(chart, 'legend');
    return;
  }

  const group = getOrCreateSvgChartPart(chart, 'legend', 'background');
  const {left, top, width, height} = legend;
  group.setAttribute('clip-path', getOrCreateSvgClipRect(chart, 'legend', {left, top, right: left + width, bottom: top + height}));
  group.setAttribute('direction', legend.options.textDirection || (legend.options.rtl ? 'rtl' : 'ltr'));

  const model = legend.buildLegendDrawItems();
  const title = getOrCreateLegendChild(group, 'g', 'title') as SVGGElement;
  const items = getOrCreateLegendChild(group, 'g', 'items');
  drawLegendTitle(chart, title, model.title);

  const keys = new Set<string>();
  model.items.forEach((drawItem: any) => {
    const {legendItem, index, text} = drawItem;
    const item = getOrCreateLegendItem(items, legendItem, index);
    drawLegendSymbol(chart, item, drawItem, legend.options.labels, model);
    const label = getOrCreateLegendChild(item, 'g', 'label') as SVGGElement;
    renderSvgText(label, 0, legendItem.text, model.labelFont, {
      color: legendItem.fontColor || defaults.color,
      strikethrough: legendItem.hidden,
      textAlign: text.align,
      textBaseline: 'middle',
      translation: [text.x, text.y]
    });
    keys.add(legendItemKey(legendItem, index));
  });
  removeStaleLegendItems(items, keys);
}
