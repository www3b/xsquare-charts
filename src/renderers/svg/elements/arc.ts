import {PI, TAU} from '../../../helpers/index.js';
import {Path} from '../../../helpers/helpers.path.js';
import {getDatasetClipArea} from '../../../helpers/helpers.dataset.js';
import {getOrCreateSvgClipPath, getOrCreateSvgClipRect, getOrCreateSvgDatasetPart, getOrCreateSvgElement, getOrCreateSvgElementFor, removeSvgElementFor, resolveSvgPaint} from '../../../helpers/helpers.svg.js';
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
  const path = new Path();
  const group = getOrCreateSvgDatasetPart(chart, datasetIndex!, 'arcs');
  const arcGroup = getOrCreateSvgElementFor(group, element, 'g');
  const shapeGroup = getOrCreateSvgElement(arcGroup, 'g');
  const arc = getOrCreateSvgElement(shapeGroup, 'path');
  const isFullCircle = Math.abs(element.endAngle - element.startAngle) >= TAU - 1e-4;
  const skipSelfClip = isFullCircle && element.innerRadius > 0;
  const selfClip = borderWidth && !skipSelfClip && selfJoin && element.endAngle - element.startAngle >= PI && borderRadius === 0 && borderJoinStyle !== 'miter';
  pathArc(path, element, radiusOffset, spacing, element.endAngle, circular);
  arcGroup.setAttribute('transform', 'translate(' + translateX + ' ' + translateY + ')');
  arc.setAttribute('data-role', 'arc');
  arc.setAttribute('d', path.toString());
  arc.setAttribute('fill', resolveSvgPaint(chart, backgroundColor));
  arc.setAttribute('stroke', borderWidth ? resolveSvgPaint(chart, borderColor) : 'none');
  arc.setAttribute('stroke-width', String(borderAlign === 'inner' ? borderWidth * 2 : borderWidth));
  arc.setAttribute('stroke-linejoin', borderAlign === 'inner' ? borderJoinStyle || 'round' : borderJoinStyle || 'bevel');
  arc.setAttribute('stroke-dasharray', borderDash && borderDash.length ? borderDash.toString() : '');
  arc.setAttribute('stroke-dashoffset', String(borderDashOffset));
  if (borderWidth && borderAlign === 'inner') {
    arc.setAttribute('clip-path', getOrCreateSvgClipPath(chart, 'arc-' + datasetIndex + '-' + dataIndex, path.toString()));
  } else {
    arc.setAttribute('clip-path', 'none');
  }
  if (selfClip) {
    const selfClipPath = new Path();
    traceSelfClip(selfClipPath, chart as any, element, element.endAngle);
    shapeGroup.setAttribute('clip-path', getOrCreateSvgClipPath(chart, 'arc-self-' + datasetIndex + '-' + dataIndex, selfClipPath.toString(), 'evenodd'));
  } else {
    shapeGroup.setAttribute('clip-path', 'none');
  }
  const clip = getDatasetClipArea(chart as any, (chart as any).getDatasetMeta(datasetIndex!));
  arcGroup.setAttribute('clip-path', clip ? getOrCreateSvgClipRect(chart, 'arc-dataset-' + datasetIndex, clip) : 'none');
}
