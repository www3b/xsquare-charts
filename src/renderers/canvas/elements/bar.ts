import {addRoundedRectPath} from '../../../helpers/helpers.canvas.js';
import {boundingRects, hasRadius, inflateRect} from '../../../elements/element.bar.js';
import type {RenderContext} from '../../core/renderer.js';

function addNormalRectPath(ctx: any, rect: any): void {
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
}

export function drawCanvasBar(ctx: CanvasRenderingContext2D, bar: any, _context: RenderContext): void {
  const {inflateAmount, options: {borderColor, backgroundColor}} = bar;
  const {inner, outer} = boundingRects(bar);
  const addRectPath = hasRadius(outer.radius) ? addRoundedRectPath : addNormalRectPath;
  ctx.save();
  if (outer.w !== inner.w || outer.h !== inner.h) {
    ctx.beginPath();
    addRectPath(ctx, inflateRect(outer, inflateAmount, inner));
    ctx.clip();
    addRectPath(ctx, inflateRect(inner, -inflateAmount, outer));
    ctx.fillStyle = borderColor;
    ctx.fill('evenodd');
  }
  ctx.beginPath();
  addRectPath(ctx, inflateRect(inner, inflateAmount));
  ctx.fillStyle = backgroundColor;
  ctx.fill();
  ctx.restore();
}
