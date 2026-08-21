import {HALF_PI, TAU} from '../../../helpers/index.js';
import {PI, _normalizeAngle} from '../../../helpers/helpers.math.js';
import {pathArc} from '../../../elements/element.arc.js';
import type {RenderContext} from '../../core/renderer.js';

function clipSelf(ctx: CanvasRenderingContext2D, element: any, endAngle: number): void {
  const {startAngle, x, y, outerRadius, innerRadius, options} = element;
  const {borderWidth, borderJoinStyle} = options;
  const outerAngleClip = Math.min(borderWidth / outerRadius, _normalizeAngle(startAngle - endAngle));
  ctx.beginPath();
  ctx.arc(x, y, outerRadius - borderWidth / 2, startAngle + outerAngleClip / 2, endAngle - outerAngleClip / 2);
  if (innerRadius > 0) {
    const innerAngleClip = Math.min(borderWidth / innerRadius, _normalizeAngle(startAngle - endAngle));
    ctx.arc(x, y, innerRadius + borderWidth / 2, endAngle - innerAngleClip / 2, startAngle + innerAngleClip / 2, true);
  } else {
    const clipWidth = Math.min(borderWidth / 2, outerRadius * _normalizeAngle(startAngle - endAngle));
    if (borderJoinStyle === 'round') {
      ctx.arc(x, y, clipWidth, endAngle - PI / 2, startAngle + PI / 2, true);
    } else if (borderJoinStyle === 'bevel') {
      const r = 2 * clipWidth * clipWidth;
      ctx.lineTo(-r * Math.cos(endAngle + PI / 2) + x, -r * Math.sin(endAngle + PI / 2) + y);
      ctx.lineTo(r * Math.cos(startAngle + PI / 2) + x, r * Math.sin(startAngle + PI / 2) + y);
    }
  }
  ctx.closePath();
  ctx.moveTo(0, 0);
  ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.clip('evenodd');
}

function clipArc(ctx: CanvasRenderingContext2D, element: any, endAngle: number): void {
  const {startAngle, pixelMargin, x, y, outerRadius, innerRadius} = element;
  let angleMargin = pixelMargin / outerRadius;
  ctx.beginPath();
  ctx.arc(x, y, outerRadius, startAngle - angleMargin, endAngle + angleMargin);
  if (innerRadius > pixelMargin) {
    angleMargin = pixelMargin / innerRadius;
    ctx.arc(x, y, innerRadius, endAngle + angleMargin, startAngle - angleMargin, true);
  } else {
    ctx.arc(x, y, pixelMargin, endAngle + HALF_PI, startAngle - HALF_PI);
  }
  ctx.closePath();
  ctx.clip();
}

function drawArc(ctx: CanvasRenderingContext2D, element: any, offset: number, spacing: number, circular: boolean): void {
  const {fullCircles, startAngle, circumference} = element;
  let endAngle = element.endAngle;
  if (fullCircles) {
    ctx.beginPath();
    pathArc(ctx, element, offset, spacing, endAngle, circular);
    for (let i = 0; i < fullCircles; ++i) ctx.fill();
    if (!isNaN(circumference)) endAngle = startAngle + (circumference % TAU || TAU);
  }
  ctx.beginPath();
  pathArc(ctx, element, offset, spacing, endAngle, circular);
  ctx.fill();
}

function drawBorder(ctx: CanvasRenderingContext2D, element: any, offset: number, spacing: number, circular: boolean): void {
  const {fullCircles, startAngle, circumference, options} = element;
  const {borderWidth, borderJoinStyle, borderDash, borderDashOffset, borderRadius} = options;
  const inner = options.borderAlign === 'inner';
  if (!borderWidth) return;
  ctx.setLineDash(borderDash || []);
  ctx.lineDashOffset = borderDashOffset;
  ctx.lineWidth = inner ? borderWidth * 2 : borderWidth;
  ctx.lineJoin = inner ? borderJoinStyle || 'round' : borderJoinStyle || 'bevel';
  let endAngle = element.endAngle;
  const isFullCircle = Math.abs(endAngle - startAngle) >= TAU - 1e-4;
  if (fullCircles) {
    ctx.beginPath();
    pathArc(ctx, element, offset, spacing, endAngle, circular);
    for (let i = 0; i < fullCircles; ++i) ctx.stroke();
    if (!isNaN(circumference)) endAngle = startAngle + (circumference % TAU || TAU);
  }
  if (inner) clipArc(ctx, element, endAngle);
  const skipSelfClip = isFullCircle && element.innerRadius > 0;
  if (!skipSelfClip && options.selfJoin && endAngle - startAngle >= PI && borderRadius === 0 && borderJoinStyle !== 'miter') {
    clipSelf(ctx, element, endAngle);
  }
  if (!fullCircles) {
    ctx.beginPath();
    pathArc(ctx, element, offset, spacing, endAngle, circular);
    ctx.stroke();
  }
}

export function drawCanvasArc(ctx: CanvasRenderingContext2D, element: any, _context: RenderContext): void {
  const {options, circumference} = element;
  const offset = (options.offset || 0) / 4;
  const spacing = (options.spacing || 0) / 2;
  const circular = options.circular;
  element.pixelMargin = options.borderAlign === 'inner' ? 0.33 : 0;
  element.fullCircles = circumference > TAU ? Math.floor(circumference / TAU) : 0;
  if (circumference === 0 || element.innerRadius < 0 || element.outerRadius < 0) return;
  ctx.save();
  const halfAngle = (element.startAngle + element.endAngle) / 2;
  ctx.translate(Math.cos(halfAngle) * offset, Math.sin(halfAngle) * offset);
  const radiusOffset = offset * (1 - Math.sin(Math.min(PI, circumference || 0)));
  ctx.fillStyle = options.backgroundColor;
  ctx.strokeStyle = options.borderColor;
  drawArc(ctx, element, radiusOffset, spacing, circular);
  drawBorder(ctx, element, radiusOffset, spacing, circular);
  ctx.restore();
}
