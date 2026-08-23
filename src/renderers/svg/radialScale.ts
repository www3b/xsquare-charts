import {addRoundedRectPath} from '../../helpers/helpers.canvas.js';
import {TAU, toDegrees} from '../../helpers/helpers.math.js';
import {Path} from '../../helpers/helpers.path.js';
import {getOrCreateSvgElement, getOrCreateSvgScalePart, removeExtraSvgElements, removeSvgScalePart, resolveSvgPaint} from '../../helpers/helpers.svg.js';
import {renderSvgText} from '../../helpers/helpers.svg.text.js';
import type {RadialScaleDrawPart} from '../core/renderer.js';

const layerForZ = (z: number) => z > 0 ? 'foreground' : 'background';

function traceShape(path: Path, shape: any): void {
  if (shape.circular) {
    path.arc(shape.x, shape.y, shape.radius, 0, TAU);
    return;
  }
  const [first, ...rest] = shape.points;
  if (!first) {
    return;
  }
  path.moveTo(first.x, first.y);
  for (const point of rest) {
    path.lineTo(point.x, point.y);
  }
}

function setStroke(chart: any, element: SVGElement, color: any, lineWidth: number, dash: number[] = [], dashOffset = 0): void {
  element.setAttribute('fill', 'none');
  element.setAttribute('stroke', resolveSvgPaint(chart, color));
  element.setAttribute('stroke-width', String(lineWidth));
  element.setAttribute('stroke-dasharray', String(dash || []));
  element.setAttribute('stroke-dashoffset', String(dashOffset || 0));
}

function drawBackground(chart: any, scale: any): void {
  const item = scale.getBackgroundDrawItem();
  if (!item) {
    removeSvgScalePart(chart, scale.id, 'radial-background');
    return;
  }
  const group = getOrCreateSvgScalePart(chart, scale.id, 'radial-background', layerForZ(scale.options.grid.z ?? -1));
  const path = new Path();
  traceShape(path, item.shape);
  path.closePath();
  const element = getOrCreateSvgElement(group, 'path');
  element.setAttribute('d', path.toString());
  element.setAttribute('fill', resolveSvgPaint(chart, item.color));
  element.setAttribute('stroke', 'none');
  removeExtraSvgElements(group, 1);
}

function drawPointLabels(chart: any, scale: any): void {
  const items = scale.getPointLabelDrawItems();
  if (!items.length) {
    removeSvgScalePart(chart, scale.id, 'point-labels');
    return;
  }
  const group = getOrCreateSvgScalePart(chart, scale.id, 'point-labels', layerForZ(scale.options.grid.z ?? -1));
  for (const item of items) {
    const label = getOrCreateSvgElement(group, 'g', item.index) as SVGGElement;
    const backdrop = getOrCreateSvgElement(label, 'path', 0);
    if (!item.visible || !item.backdrop) {
      backdrop.setAttribute('display', 'none');
    } else {
      const path = new Path();
      addRoundedRectPath(path, {
        x: item.backdrop.x, y: item.backdrop.y, w: item.backdrop.width, h: item.backdrop.height, radius: item.backdrop.borderRadius,
      });
      backdrop.setAttribute('d', path.toString());
      backdrop.setAttribute('fill', resolveSvgPaint(chart, item.backdrop.color));
      backdrop.setAttribute('stroke', 'none');
      backdrop.setAttribute('display', '');
    }
    label.setAttribute('display', item.visible ? '' : 'none');
    renderSvgText(label, 1, item.text, item.font, {
      color: item.color,
      textAlign: item.textAlign,
      textBaseline: 'middle',
    }, undefined, item.x, item.y);
  }
  removeExtraSvgElements(group, items.length);
}

function drawGrid(chart: any, scale: any): void {
  drawPointLabels(chart, scale);
  const layer = layerForZ(scale.options.grid.z ?? -1);
  if (!scale.options.grid.display) {
    removeSvgScalePart(chart, scale.id, 'radial-grid');
  } else {
    const group = getOrCreateSvgScalePart(chart, scale.id, 'radial-grid', layer);
    const items = scale.getRadialGridDrawItems();
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const path = new Path();
      traceShape(path, item.shape);
      path.closePath();
      const element = getOrCreateSvgElement(group, 'path', index);
      element.setAttribute('d', path.toString());
      setStroke(chart, element, item.color, item.lineWidth, item.borderDash, item.borderDashOffset);
    }
    removeExtraSvgElements(group, items.length);
  }

  if (!scale.options.angleLines.display) {
    removeSvgScalePart(chart, scale.id, 'angle-lines');
    return;
  }
  const group = getOrCreateSvgScalePart(chart, scale.id, 'angle-lines', layer);
  const items = scale.getAngleLineDrawItems();
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const line = getOrCreateSvgElement(group, 'line', index);
    line.setAttribute('x1', String(item.x1));
    line.setAttribute('y1', String(item.y1));
    line.setAttribute('x2', String(item.x2));
    line.setAttribute('y2', String(item.y2));
    setStroke(chart, line, item.color, item.lineWidth, item.borderDash, item.borderDashOffset);
  }
  removeExtraSvgElements(group, items.length);
}

function drawLabels(chart: any, scale: any): void {
  const items = scale.getRadialTickDrawItems();
  if (!scale.options.ticks.display) {
    removeSvgScalePart(chart, scale.id, 'radial-ticks');
    return;
  }
  const group = getOrCreateSvgScalePart(chart, scale.id, 'radial-ticks', layerForZ(scale.options.ticks.z ?? 0));
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const label = getOrCreateSvgElement(group, 'g', index) as SVGGElement;
    label.setAttribute('transform', `translate(${item.centerX} ${item.centerY}) rotate(${toDegrees(item.rotation)})`);
    const backdrop = getOrCreateSvgElement(label, 'rect', 0);
    if (item.backdrop) {
      backdrop.setAttribute('x', String(item.backdrop.x));
      backdrop.setAttribute('y', String(item.backdrop.y));
      backdrop.setAttribute('width', String(item.backdrop.width));
      backdrop.setAttribute('height', String(item.backdrop.height));
      backdrop.setAttribute('fill', resolveSvgPaint(chart, item.backdrop.color));
      backdrop.setAttribute('display', '');
    } else {
      backdrop.setAttribute('display', 'none');
    }
    renderSvgText(label, 1, item.text, item.font, {
      color: item.color,
      strokeColor: item.strokeColor,
      strokeWidth: item.strokeWidth,
      textAlign: 'center',
      textBaseline: 'middle',
    }, undefined, item.x, item.y);
  }
  removeExtraSvgElements(group, items.length);
}

export function drawSvgRadialScale(chart: any, scale: any, part: RadialScaleDrawPart): void {
  if (part === 'background') {
    drawBackground(chart, scale);
  } else if (part === 'grid') {
    drawGrid(chart, scale);
  } else if (part === 'labels') {
    drawLabels(chart, scale);
  }
}
