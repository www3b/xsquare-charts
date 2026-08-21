import {valueOrDefault} from '../../../helpers/index.js';
import {Path} from '../../../helpers/helpers.path.js';
import {getOrCreateSvgDatasetPart, getOrCreateSvgPath, removeExtraSvgPaths, removeSvgDatasetPart, resolveSvgPaint} from '../../../helpers/helpers.svg.js';
import type {RenderContext, RendererCreateOptions} from '../../core/renderer.js';

function setSvgStyle(chart: any, path: SVGPathElement, options: any, style: any = options): void {
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', resolveSvgPaint(chart, valueOrDefault(style.borderColor, options.borderColor)));
  path.setAttribute('stroke-width', valueOrDefault(style.borderWidth, options.borderWidth));
  path.setAttribute('stroke-linecap', valueOrDefault(style.borderCapStyle, options.borderCapStyle));
  path.setAttribute('stroke-linejoin', valueOrDefault(style.borderJoinStyle, options.borderJoinStyle));
  path.setAttribute('stroke-dasharray', valueOrDefault(style.borderDash, options.borderDash));
  path.setAttribute('stroke-dashoffset', valueOrDefault(style.borderDashOffset, options.borderDashOffset));
}

export function drawSvgLine(chart: RendererCreateOptions['chart'], line: any, {datasetIndex, start = 0, count = line.points.length}: RenderContext): void {
  const options = line.options || {};
  if (!line.points || !line.points.length || !options.borderWidth) {
    removeSvgDatasetPart(chart, datasetIndex!, 'line');
    return;
  }
  const group = getOrCreateSvgDatasetPart(chart, datasetIndex!, 'line');
  const params = {start, end: start + count - 1};
  const paths = options.segment ? line.segments : [undefined];
  for (let i = 0; i < paths.length; ++i) {
    const segment = paths[i];
    const path = new Path();
    const loop = segment ? line.pathSegment(path, segment, params) : line.path(path, start, count);
    if (loop) {
      path.closePath();
    }
    const element = getOrCreateSvgPath(group, i);
    element.setAttribute('data-dataset-index', String(datasetIndex));
    element.setAttribute('d', path.toString());
    setSvgStyle(chart, element, options, segment && segment.style);
  }
  removeExtraSvgPaths(group, paths.length);
  if (line.animated) {
    line._pointsUpdated = false;
    line._path = undefined;
  }
}
