import {valueOrDefault} from '../../../helpers/index.js';
import type {RenderContext} from '../../core/renderer.js';

function setStyle(ctx: CanvasRenderingContext2D, options: any, style: any = options): void {
  ctx.lineCap = valueOrDefault(style.borderCapStyle, options.borderCapStyle);
  ctx.setLineDash(valueOrDefault(style.borderDash, options.borderDash));
  ctx.lineDashOffset = valueOrDefault(style.borderDashOffset, options.borderDashOffset);
  ctx.lineJoin = valueOrDefault(style.borderJoinStyle, options.borderJoinStyle);
  ctx.lineWidth = valueOrDefault(style.borderWidth, options.borderWidth);
  ctx.strokeStyle = valueOrDefault(style.borderColor, options.borderColor);
}

function strokePathWithCache(ctx: CanvasRenderingContext2D, line: any, start?: number, count?: number): void {
  let path = line._path;
  if (!path) {
    path = line._path = new Path2D();
    if (line.path(path, start, count)) {
      path.closePath();
    }
  }
  setStyle(ctx, line.options);
  ctx.stroke(path);
}

function strokePathDirect(ctx: CanvasRenderingContext2D, line: any, start: number, count: number): void {
  for (const segment of line.segments) {
    setStyle(ctx, line.options, segment.style);
    ctx.beginPath();
    if (line.pathSegment(ctx, segment, {start, end: start + count - 1})) {
      ctx.closePath();
    }
    ctx.stroke();
  }
}

export function drawCanvasLine(ctx: CanvasRenderingContext2D, line: any, {start = 0, count = line.points.length}: RenderContext): void {
  const options = line.options || {};
  if (line.points && line.points.length && options.borderWidth) {
    ctx.save();
    if (typeof Path2D === 'function' && !options.segment) {
      strokePathWithCache(ctx, line, start, count);
    } else {
      strokePathDirect(ctx, line, start, count);
    }
    ctx.restore();
  }
  if (line.animated) {
    line._pointsUpdated = false;
    line._path = undefined;
  }
}
