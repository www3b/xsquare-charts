import {drawPoint} from './text.js';
import {_isPointInArea} from '../../shared/core.js';
import type {RenderContext} from '../renderer.types.js';
import {resolveCanvasPaint} from '../paint.js';

export function drawCanvasPoint(ctx: CanvasRenderingContext2D, point: any, {area}: RenderContext): void {
  const options = point.options;
  if (point.skip || options.radius < 0.1 || !_isPointInArea(point, area, point.size(options) / 2)) {
    return;
  }
  ctx.strokeStyle = resolveCanvasPaint(ctx, options.borderColor);
  ctx.lineWidth = options.borderWidth;
  ctx.fillStyle = resolveCanvasPaint(ctx, options.backgroundColor);
  drawPoint(ctx, options, point.x, point.y);
}
