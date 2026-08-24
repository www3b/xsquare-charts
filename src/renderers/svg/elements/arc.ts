import {PI, TAU} from '../../../helpers/index.js';
import {Path} from '../../../helpers/helpers.path.js';
import {getDatasetClipArea} from '../../../helpers/helpers.dataset.js';
import {getOrCreateSvgClipPath, getOrCreateSvgClipRect, getOrCreateSvgDatasetPart, getOrCreateSvgElement, getOrCreateSvgElementFor, removeExtraSvgElements, removeSvgElementFor, resolveSvgPaint} from '../../../helpers/helpers.svg.js';
import {pathArc, traceSelfClip} from '../../../elements/element.arc.js';
import type {RenderContext, RendererCreateOptions} from '../../core/renderer.js';

export function drawSvgArc(chart: RendererCreateOptions['chart'], element: any, {datasetIndex, dataIndex}: RenderContext): void {
  const {options, circumference} = element;
  const {borderAlign, borderColor, borderDash, borderDashOffset, borderJoinStyle, borderRadius, borderWidth, backgroundColor, selfJoin} = options;
  const offset = (options.offset || 0) / 4;
  const spacing = (options.spacing || 0) / 2;
  const circular = options.circular;
  element.pixelMargin = borderAlign === 'inner' ? 0.33 : 0;
  element.fullCircles = circumference > TAU ? Math.floor(circumference / TAU) : 0;
  if (circumference === 0 || element.innerRadius < 0 || element.outerRadius < 0) {
    removeSvgElementFor(element);
    return;
  }
  const halfAngle = (element.startAngle + element.endAngle) / 2;
  const translateX = Math.cos(halfAngle) * offset;
  const translateY = Math.sin(halfAngle) * offset;
  const radiusOffset = offset * (1 - Math.sin(Math.min(PI, circumference || 0)));
  const group = getOrCreateSvgDatasetPart(chart, datasetIndex!, 'arcs');
  const arcGroup = getOrCreateSvgElementFor(group, element, 'g');
  const fillGroup = getOrCreateSvgElement(arcGroup, 'g', 0);
  const fullCircles = element.fullCircles;
  const remainderEnd = element.startAngle + (circumference % TAU || TAU);
  const fullPath = new Path();
  const remainderPath = new Path();
  pathArc(fullPath, element, radiusOffset, spacing, element.endAngle, circular);
  pathArc(remainderPath, element, radiusOffset, spacing, fullCircles ? remainderEnd : element.endAngle, circular);
  const fillCount = fullCircles ? fullCircles + 1 : 1;
  const fills = [];
  for (let i = 0; i < fillCount; ++i) {
    fills.push(getOrCreateSvgElement(fillGroup, 'path', i));
  }
  removeExtraSvgElements(fillGroup, fillCount);
  const isFullCircle = Math.abs(element.endAngle - element.startAngle) >= TAU - 1e-4;
  const borderEnd = fullCircles ? remainderEnd : element.endAngle;
  const skipSelfClip = isFullCircle && element.innerRadius > 0;
  const selfClip = borderWidth && !skipSelfClip && selfJoin && borderEnd - element.startAngle >= PI && borderRadius === 0 && borderJoinStyle !== 'miter';
  arcGroup.setAttribute('transform', 'translate(' + translateX + ' ' + translateY + ')');
  for (let i = 0; i < fills.length; ++i) {
    const fill = fills[i];
    const isRemainder = fullCircles && i === fills.length - 1;
    fill.setAttribute('data-role', 'arc');
    fill.setAttribute('d', isRemainder ? remainderPath.toString() : fullPath.toString());
    fill.setAttribute('fill', resolveSvgPaint(chart, backgroundColor));
    fill.setAttribute('stroke', 'none');
    fill.setAttribute('clip-path', 'none');
  }

  if (borderWidth) {
    const borderGroup = getOrCreateSvgElement(arcGroup, 'g', 1);
    const borderCount = fullCircles || 1;
    const borderPath = fullCircles ? fullPath.toString() : remainderPath.toString();
    for (let i = 0; i < borderCount; ++i) {
      const border = getOrCreateSvgElement(borderGroup, 'path', i);
      border.setAttribute('data-role', 'arc-border');
      border.setAttribute('d', borderPath);
      border.setAttribute('fill', 'none');
      border.setAttribute('stroke', resolveSvgPaint(chart, borderColor));
      border.setAttribute('stroke-width', String(borderAlign === 'inner' ? borderWidth * 2 : borderWidth));
      border.setAttribute('stroke-linejoin', borderAlign === 'inner' ? borderJoinStyle || 'round' : borderJoinStyle || 'bevel');
      border.setAttribute('stroke-dasharray', borderDash && borderDash.length ? borderDash.toString() : '');
      border.setAttribute('stroke-dashoffset', String(borderDashOffset));
      border.setAttribute('clip-path', borderAlign === 'inner' && !fullCircles
        ? getOrCreateSvgClipPath(chart, 'arc-' + datasetIndex + '-' + dataIndex, remainderPath.toString())
        : 'none');
    }
    removeExtraSvgElements(borderGroup, borderCount);
    if (selfClip && !fullCircles) {
      const selfClipPath = new Path();
      traceSelfClip(selfClipPath, chart as any, element, borderEnd);
      borderGroup.setAttribute('clip-path', getOrCreateSvgClipPath(chart, 'arc-self-' + datasetIndex + '-' + dataIndex, selfClipPath.toString(), 'evenodd'));
    } else {
      borderGroup.setAttribute('clip-path', 'none');
    }
  }
  removeExtraSvgElements(arcGroup, borderWidth ? 2 : 1);
  const clip = getDatasetClipArea(chart as any, (chart as any).getDatasetMeta(datasetIndex!));
  arcGroup.setAttribute('clip-path', clip ? getOrCreateSvgClipRect(chart, 'arc-dataset-' + datasetIndex, clip) : 'none');
}
