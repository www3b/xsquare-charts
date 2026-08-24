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
  const shapeGroup = getOrCreateSvgElement(arcGroup, 'g');
  const fullCircles = element.fullCircles;
  const remainderEnd = element.startAngle + (circumference % TAU || TAU);
  const fullPath = new Path();
  const remainderPath = new Path();
  pathArc(fullPath, element, radiusOffset, spacing, element.endAngle, circular);
  pathArc(remainderPath, element, radiusOffset, spacing, fullCircles ? remainderEnd : element.endAngle, circular);
  const pathCount = fullCircles ? fullCircles + 1 : 1;
  const arcs = [];
  for (let i = 0; i < pathCount; ++i) {
    arcs.push(getOrCreateSvgElement(shapeGroup, 'path', i));
  }
  removeExtraSvgElements(shapeGroup, pathCount);
  const isFullCircle = Math.abs(element.endAngle - element.startAngle) >= TAU - 1e-4;
  const borderEnd = fullCircles ? remainderEnd : element.endAngle;
  const skipSelfClip = isFullCircle && element.innerRadius > 0;
  const selfClip = borderWidth && !skipSelfClip && selfJoin && borderEnd - element.startAngle >= PI && borderRadius === 0 && borderJoinStyle !== 'miter';
  arcGroup.setAttribute('transform', 'translate(' + translateX + ' ' + translateY + ')');
  for (let i = 0; i < arcs.length; ++i) {
    const arc = arcs[i];
    const isRemainder = fullCircles && i === arcs.length - 1;
    arc.setAttribute('data-role', 'arc');
    arc.setAttribute('d', isRemainder ? remainderPath.toString() : fullPath.toString());
    arc.setAttribute('fill', resolveSvgPaint(chart, backgroundColor));
    arc.setAttribute('stroke', borderWidth && !isRemainder ? resolveSvgPaint(chart, borderColor) : 'none');
    arc.setAttribute('stroke-width', String(borderAlign === 'inner' ? borderWidth * 2 : borderWidth));
    arc.setAttribute('stroke-linejoin', borderAlign === 'inner' ? borderJoinStyle || 'round' : borderJoinStyle || 'bevel');
    arc.setAttribute('stroke-dasharray', borderDash && borderDash.length ? borderDash.toString() : '');
    arc.setAttribute('stroke-dashoffset', String(borderDashOffset));
  }
  if (borderWidth && borderAlign === 'inner') {
    const clip = getOrCreateSvgClipPath(chart, 'arc-' + datasetIndex + '-' + dataIndex, remainderPath.toString());
    for (const arc of arcs) arc.setAttribute('clip-path', clip);
  } else {
    for (const arc of arcs) arc.setAttribute('clip-path', 'none');
  }
  if (selfClip) {
    const selfClipPath = new Path();
    traceSelfClip(selfClipPath, chart as any, element, borderEnd);
    shapeGroup.setAttribute('clip-path', getOrCreateSvgClipPath(chart, 'arc-self-' + datasetIndex + '-' + dataIndex, selfClipPath.toString(), 'evenodd'));
  } else {
    shapeGroup.setAttribute('clip-path', 'none');
  }
  const clip = getDatasetClipArea(chart as any, (chart as any).getDatasetMeta(datasetIndex!));
  arcGroup.setAttribute('clip-path', clip ? getOrCreateSvgClipRect(chart, 'arc-dataset-' + datasetIndex, clip) : 'none');
}
