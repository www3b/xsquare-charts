// @ts-nocheck
import {addRoundedRectPath} from '../canvas/text.js';
import {Path} from '../../geometry/path.js';
import {getDatasetClipArea} from '../../shared/index.js';
import {getOrCreateSvgClipPath, getOrCreateSvgClipRect, getOrCreateSvgDatasetPart, getOrCreateSvgElement, getOrCreateSvgElementFor, resolveSvgPaint} from './svg.js';
import {boundingRects, hasRadius, inflateRect} from '../../geometry/bar.js';
import type {RenderContext, RendererCreateOptions} from '../renderer.types.js';

function addNormalRectPath(ctx: any, rect: any): void {
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
}

export function drawSvgBar(chart: RendererCreateOptions['chart'], bar: any, {datasetIndex, dataIndex}: RenderContext): void {
  const {inflateAmount, options: {borderColor, backgroundColor}} = bar;
  const {inner, outer} = boundingRects(bar);
  const addRectPath = hasRadius(outer.radius) ? addRoundedRectPath : addNormalRectPath;
  const hasBorder = outer.w !== inner.w || outer.h !== inner.h;
  const group = getOrCreateSvgDatasetPart(chart, datasetIndex!, 'bars');
  const barGroup = getOrCreateSvgElementFor(group, bar, 'g');
  const shapeGroup = getOrCreateSvgElement(barGroup, 'g');
  const border = getOrCreateSvgElement(shapeGroup, 'path', 0);
  const background = getOrCreateSvgElement(shapeGroup, 'path', 1);
  const outerRect = inflateRect(outer, inflateAmount, inner);
  const innerRect = inflateRect(inner, -inflateAmount, outer);
  const backgroundPath = new Path();
  addRectPath(backgroundPath, inflateRect(inner, inflateAmount));
  background.setAttribute('data-role', 'background');
  background.setAttribute('d', backgroundPath.toString());
  background.setAttribute('fill', resolveSvgPaint(chart, backgroundColor));
  background.setAttribute('stroke', 'none');
  if (hasBorder) {
    const borderPath = new Path();
    const clipPath = new Path();
    addRectPath(clipPath, outerRect);
    addRectPath(borderPath, outerRect);
    addRectPath(borderPath, innerRect);
    border.setAttribute('data-role', 'border');
    border.setAttribute('d', borderPath.toString());
    border.setAttribute('display', '');
    border.setAttribute('fill', resolveSvgPaint(chart, borderColor));
    border.setAttribute('fill-rule', 'evenodd');
    border.setAttribute('stroke', 'none');
    shapeGroup.setAttribute('clip-path', getOrCreateSvgClipPath(chart, 'bar-' + datasetIndex + '-' + dataIndex, clipPath.toString()));
  } else {
    border.setAttribute('display', 'none');
    shapeGroup.setAttribute('clip-path', 'none');
  }
  const clip = getDatasetClipArea(chart as any, (chart as any).getDatasetMeta(datasetIndex!));
  barGroup.setAttribute('clip-path', clip ? getOrCreateSvgClipRect(chart, 'bar-dataset-' + datasetIndex, clip) : 'none');
}
