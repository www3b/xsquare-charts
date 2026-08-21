import {tracePoint} from '../../../helpers/helpers.canvas.js';
import {Path} from '../../../helpers/helpers.path.js';
import {getOrCreateSvgDatasetPart, getOrCreateSvgElementFor, removeSvgElementFor, resolveSvgPaint, setSvgImageAttributes} from '../../../helpers/helpers.svg.js';
import type {RenderContext, RendererCreateOptions} from '../../core/renderer.js';

function isObjectPointStyle(pointStyle: any): boolean {
  return !!pointStyle && typeof pointStyle === 'object';
}

export function drawSvgPoint(chart: RendererCreateOptions['chart'], point: any, {area, datasetIndex}: RenderContext): void {
  const options = point.options;
  if (point.skip || options.radius < 0.1 || !isPointInArea(point, area, point.size(options) / 2)) {
    removeSvgElementFor(point);
    return;
  }
  const group = getOrCreateSvgDatasetPart(chart, datasetIndex!, 'points');
  if (!isObjectPointStyle(options.pointStyle) && options.pointStyle !== false) {
    const path = new Path();
    tracePoint(path, options, point.x, point.y);
    const element = getOrCreateSvgElementFor(group, point, 'path');
    element.setAttribute('data-dataset-index', String(datasetIndex));
    element.setAttribute('d', path.toString());
    element.setAttribute('fill', resolveSvgPaint(chart, options.backgroundColor));
    element.setAttribute('stroke', options.borderWidth > 0 ? resolveSvgPaint(chart, options.borderColor) : 'none');
    element.setAttribute('stroke-width', String(options.borderWidth));
    return;
  }
  if (isObjectPointStyle(options.pointStyle)) {
    const element = getOrCreateSvgElementFor(group, point, 'image') as SVGImageElement;
    if (setSvgImageAttributes(element, chart, options.pointStyle, point.x, point.y, options.rotation)) {
      element.setAttribute('data-dataset-index', String(datasetIndex));
      return;
    }
  }
  removeSvgElementFor(point);
}

function isPointInArea(point: any, area: any, margin: number): boolean {
  return point.x >= area.left - margin && point.x <= area.right + margin && point.y >= area.top - margin && point.y <= area.bottom + margin;
}
