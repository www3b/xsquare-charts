import {addRoundedRectPath, renderText} from '../../helpers/helpers.canvas.js';
import {TAU} from '../../helpers/helpers.math.js';
import type {RadialScaleDrawPart} from '../core/renderer.js';

function traceShape(ctx: CanvasRenderingContext2D, shape: any): void {
  if (shape.circular) {
    ctx.arc(shape.x, shape.y, shape.radius, 0, TAU);
    return;
  }
  const [first, ...rest] = shape.points;
  if (!first) {
    return;
  }
  ctx.moveTo(first.x, first.y);
  for (const point of rest) {
    ctx.lineTo(point.x, point.y);
  }
}

function drawPointLabels(ctx: CanvasRenderingContext2D, scale: any): void {
  const items = scale.getPointLabelDrawItems();
  for (let index = items.length - 1; index >= 0; index--) {
    const item = items[index];
    if (!item.visible) {
      continue;
    }
    const backdrop = item.backdrop;
    if (backdrop) {
      ctx.fillStyle = backdrop.color;
      if (Object.values(backdrop.borderRadius).some((value: any) => value !== 0)) {
        ctx.beginPath();
        addRoundedRectPath(ctx, {
          x: backdrop.x, y: backdrop.y, w: backdrop.width, h: backdrop.height, radius: backdrop.borderRadius,
        });
        ctx.fill();
      } else {
        ctx.fillRect(backdrop.x, backdrop.y, backdrop.width, backdrop.height);
      }
    }
    renderText(ctx, item.text, item.x, item.y, item.font, {
      color: item.color,
      textAlign: item.textAlign,
      textBaseline: 'middle'
    });
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, scale: any): void {
  const item = scale.getBackgroundDrawItem();
  if (!item) {
    return;
  }
  ctx.save();
  ctx.beginPath();
  traceShape(ctx, item.shape);
  ctx.closePath();
  ctx.fillStyle = item.color;
  ctx.fill();
  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, scale: any): void {
  drawPointLabels(ctx, scale);

  for (const item of scale.getRadialGridDrawItems()) {
    ctx.save();
    ctx.strokeStyle = item.color;
    ctx.lineWidth = item.lineWidth;
    ctx.setLineDash(item.borderDash);
    ctx.lineDashOffset = item.borderDashOffset;
    ctx.beginPath();
    traceShape(ctx, item.shape);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  const angleItems = scale.getAngleLineDrawItems();
  if (!angleItems.length) {
    return;
  }
  ctx.save();
  for (const item of angleItems) {
    ctx.lineWidth = item.lineWidth;
    ctx.strokeStyle = item.color;
    ctx.setLineDash(item.borderDash);
    ctx.lineDashOffset = item.borderDashOffset;
    ctx.beginPath();
    ctx.moveTo(item.x1, item.y1);
    ctx.lineTo(item.x2, item.y2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLabels(ctx: CanvasRenderingContext2D, scale: any): void {
  const items = scale.getRadialTickDrawItems();
  if (!items.length) {
    return;
  }
  const {centerX, centerY, rotation} = items[0];
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const item of items) {
    if (item.backdrop) {
      ctx.fillStyle = item.backdrop.color;
      ctx.fillRect(item.backdrop.x, item.backdrop.y, item.backdrop.width, item.backdrop.height);
    }
    renderText(ctx, item.text, item.x, item.y, item.font, {
      color: item.color,
      strokeColor: item.strokeColor,
      strokeWidth: item.strokeWidth
    });
  }
  ctx.restore();
}

export function drawCanvasRadialScale(ctx: CanvasRenderingContext2D, scale: any, part: RadialScaleDrawPart): void {
  if (part === 'background') {
    drawBackground(ctx, scale);
  } else if (part === 'grid') {
    drawGrid(ctx, scale);
  } else if (part === 'labels') {
    drawLabels(ctx, scale);
  }
}
