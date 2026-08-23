import {clipArea, unclipArea} from '../../helpers/helpers.canvas.js';
import {getFillClipBounds, traceFillPart, traceFillSide} from '../../plugins/plugin.filler/filler.model.js';
import type {FillerDrawTime} from '../core/renderer.js';

function clipBounds(ctx: CanvasRenderingContext2D, model: any, bounds: any): void {
  if (!bounds || (bounds.property !== 'x' && bounds.property !== 'y')) return;
  const area = getFillClipBounds(model.chartArea, model.clip, bounds);
  ctx.beginPath();
  ctx.rect(area.left, area.top, area.right - area.left, area.bottom - area.top);
  ctx.clip();
}

function drawPart(ctx: CanvasRenderingContext2D, model: any, side: any, part: any): void {
  ctx.save();
  ctx.fillStyle = part.color;
  clipBounds(ctx, model, part.bounds);
  ctx.beginPath();
  const loop = traceFillPart(ctx, model.line, model.target, part, model.property);
  ctx.fill(loop ? 'evenodd' : 'nonzero');
  ctx.restore();
}

function drawModel(ctx: CanvasRenderingContext2D, model: any): void {
  clipArea(ctx, model.area);
  for (const side of model.sides) {
    if (side.side) {
      ctx.save();
      ctx.beginPath();
      traceFillSide(ctx, model.target, model.property, side.edge);
      ctx.clip();
    }
    for (const part of side.parts) {
      drawPart(ctx, model, side, part);
    }
    if (side.side) ctx.restore();
  }
  unclipArea(ctx);
}

export function drawCanvasFiller(ctx: CanvasRenderingContext2D, models: any[], _drawTime: FillerDrawTime): void {
  for (const model of models) {
    drawModel(ctx, model);
  }
}

export function removeCanvasFiller(_source: any): void {
  return;
}
