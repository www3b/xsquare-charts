import {clipArea, renderText, unclipArea} from '../../helpers/helpers.canvas.js';
import type {ScaleDrawPart} from '../core/renderer.js';
import {resolveCanvasPaint} from '../../helpers/helpers.paint.js';

function drawLine(ctx: CanvasRenderingContext2D, p1: any, p2: any, style: any): void {
  if (!style.width || !style.color) return;
  ctx.save();
  ctx.lineWidth = style.width;
  ctx.strokeStyle = resolveCanvasPaint(ctx, style.color);
  ctx.setLineDash(style.borderDash || []);
  ctx.lineDashOffset = style.borderDashOffset;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, scale: any): void {
  const {backgroundColor} = scale.options;
  if (!backgroundColor) return;
  ctx.save();
  ctx.fillStyle = resolveCanvasPaint(ctx, backgroundColor);
  ctx.fillRect(scale.left, scale.top, scale.width, scale.height);
  ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, scale: any, chartArea: any): void {
  const grid = scale.options.grid;
  if (!grid.display) return;
  for (const item of scale.getGridLineItems(chartArea)) {
    if (grid.drawOnChartArea) {
      drawLine(ctx, {x: item.x1, y: item.y1}, {x: item.x2, y: item.y2}, item);
    }
    if (grid.drawTicks) {
      drawLine(ctx, {x: item.tx1, y: item.ty1}, {x: item.tx2, y: item.ty2}, {
        color: item.tickColor,
        width: item.tickWidth,
        borderDash: item.tickBorderDash,
        borderDashOffset: item.tickBorderDashOffset
      });
    }
  }
}

function drawBorder(ctx: CanvasRenderingContext2D, scale: any): void {
  const item = scale.getBorderDrawItem();
  if (!item) return;
  drawLine(ctx, {x: item.x1, y: item.y1}, {x: item.x2, y: item.y2}, item);
}

function drawLabels(ctx: CanvasRenderingContext2D, scale: any, chartArea: any): void {
  if (!scale.options.ticks.display) return;
  const area = scale.getLabelArea();
  if (area) clipArea(ctx, area);
  for (const item of scale.getLabelItems(chartArea)) {
    renderText(ctx, item.label, 0, item.textOffset, item.font, item.options);
  }
  if (area) unclipArea(ctx);
}

function drawTitle(ctx: CanvasRenderingContext2D, scale: any): void {
  const item = scale.getTitleDrawItem();
  if (!item) return;
  renderText(ctx, item.text, 0, 0, item.font, item.options);
}

export function drawCanvasScale(ctx: CanvasRenderingContext2D, scale: any, part: ScaleDrawPart, chartArea?: any): void {
  if (!scale._isVisible()) return;
  if (part === 'background') drawBackground(ctx, scale);
  else if (part === 'grid') drawGrid(ctx, scale, chartArea);
  else if (part === 'border') drawBorder(ctx, scale);
  else if (part === 'labels') drawLabels(ctx, scale, chartArea);
  else if (part === 'title') drawTitle(ctx, scale);
}
