import {getOrCreateSvgClipRect, getOrCreateSvgElement, getOrCreateSvgScalePart, removeExtraSvgElements, removeSvgScalePart, resolveSvgPaint} from '../../helpers/helpers.svg.js';
import {renderSvgText} from '../../helpers/helpers.svg.text.js';
import type {ScaleDrawPart} from '../core/renderer.js';

const layerForZ = (z: number) => z > 0 ? 'foreground' : 'background';

function setLineStyle(chart: any, line: SVGElement, style: any): void {
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', resolveSvgPaint(chart, style.color));
  line.setAttribute('stroke-width', String(style.width));
  line.setAttribute('stroke-dasharray', String(style.borderDash || []));
  line.setAttribute('stroke-dashoffset', String(style.borderDashOffset || 0));
}

function drawLines(chart: any, scale: any, part: 'grid' | 'ticks' | 'border', enabled: boolean, z: number, items: any[], point1: (item: any) => any, point2: (item: any) => any, style: (item: any) => any): void {
  if (!enabled) {
    removeSvgScalePart(chart, scale.id, part);
    return;
  }
  const group = getOrCreateSvgScalePart(chart, scale.id, part, layerForZ(z));
  let count = 0;
  for (const item of items) {
    const lineStyle = style(item);
    if (!lineStyle.width || !lineStyle.color) continue;
    const line = getOrCreateSvgElement(group, 'line', count++);
    const p1 = point1(item);
    const p2 = point2(item);
    line.setAttribute('x1', String(p1.x));
    line.setAttribute('y1', String(p1.y));
    line.setAttribute('x2', String(p2.x));
    line.setAttribute('y2', String(p2.y));
    setLineStyle(chart, line, lineStyle);
  }
  removeExtraSvgElements(group, count);
}

function drawBackground(chart: any, scale: any): void {
  const {backgroundColor, grid} = scale.options;
  if (!backgroundColor) {
    removeSvgScalePart(chart, scale.id, 'background');
    return;
  }
  const group = getOrCreateSvgScalePart(chart, scale.id, 'background', layerForZ(grid.z ?? -1));
  const rect = getOrCreateSvgElement(group, 'rect');
  rect.setAttribute('x', String(scale.left));
  rect.setAttribute('y', String(scale.top));
  rect.setAttribute('width', String(scale.width));
  rect.setAttribute('height', String(scale.height));
  rect.setAttribute('fill', resolveSvgPaint(chart, backgroundColor));
  removeExtraSvgElements(group, 1);
}

function drawGrid(chart: any, scale: any, chartArea: any): void {
  const grid = scale.options.grid;
  if (!grid.display) {
    removeSvgScalePart(chart, scale.id, 'grid');
    removeSvgScalePart(chart, scale.id, 'ticks');
    return;
  }
  const items = scale.getGridLineItems(chartArea);
  const z = grid.z ?? -1;
  drawLines(chart, scale, 'grid', grid.drawOnChartArea, z, items, (item) => ({x: item.x1, y: item.y1}), (item) => ({x: item.x2, y: item.y2}), (item) => item);
  drawLines(chart, scale, 'ticks', grid.drawTicks, z, items, (item) => ({x: item.tx1, y: item.ty1}), (item) => ({x: item.tx2, y: item.ty2}), (item) => ({color: item.tickColor, width: item.tickWidth, borderDash: item.tickBorderDash, borderDashOffset: item.tickBorderDashOffset}));
}

function drawBorder(chart: any, scale: any): void {
  const item = scale.getBorderDrawItem();
  if (!item) {
    removeSvgScalePart(chart, scale.id, 'border');
    return;
  }
  drawLines(chart, scale, 'border', true, scale.options.border.z ?? 0, [item], (line) => ({x: line.x1, y: line.y1}), (line) => ({x: line.x2, y: line.y2}), (line) => line);
}

function drawLabels(chart: any, scale: any, chartArea: any): void {
  if (!scale.options.ticks.display) {
    removeSvgScalePart(chart, scale.id, 'labels');
    return;
  }
  const group = getOrCreateSvgScalePart(chart, scale.id, 'labels', layerForZ(scale.options.ticks.z ?? 0));
  const area = scale.getLabelArea();
  group.setAttribute('clip-path', area ? getOrCreateSvgClipRect(chart, `scale-${scale.id}-labels`, area) : 'none');
  const items = scale.getLabelItems(chartArea);
  items.forEach((item: any, index: number) => renderSvgText(group, index, item.label, item.font, item.options, undefined, 0, item.textOffset));
  removeExtraSvgElements(group, items.length);
}

function drawTitle(chart: any, scale: any): void {
  const item = scale.getTitleDrawItem();
  if (!item) {
    removeSvgScalePart(chart, scale.id, 'title');
    return;
  }
  const group = getOrCreateSvgScalePart(chart, scale.id, 'title', layerForZ(scale.options.grid.z ?? -1));
  const lines = Array.isArray(item.text) ? item.text : [item.text];
  const widths = lines.map((line) => chart.renderer.measureText(line, item.font.string));
  renderSvgText(group, 0, item.text, item.font, item.options, widths);
  removeExtraSvgElements(group, 1);
}

export function drawSvgScale(chart: any, scale: any, part: ScaleDrawPart, chartArea?: any): void {
  if (!scale._isVisible()) return;
  if (part === 'background') drawBackground(chart, scale);
  else if (part === 'grid') drawGrid(chart, scale, chartArea);
  else if (part === 'border') drawBorder(chart, scale);
  else if (part === 'labels') drawLabels(chart, scale, chartArea);
  else if (part === 'title') drawTitle(chart, scale);
}
