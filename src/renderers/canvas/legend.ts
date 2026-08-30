import defaults from '../../components/chart.defaults.js';
import {addRoundedRectPath, drawPointLegend, renderText} from './text.js';
import {resolveCanvasPaint} from '../paint.js';
import {clipArea, getRtlAdapter, overrideTextDirection, restoreTextDirection, unclipArea, valueOrDefault} from '../../shared/index.js';
import {toTRBLCorners} from '../../shared/options.js';

function drawLegendTitle(ctx: CanvasRenderingContext2D, title: any): void {
  if (!title) return;
  ctx.textAlign = title.textAlign;
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = resolveCanvasPaint(ctx, title.color);
  ctx.fillStyle = resolveCanvasPaint(ctx, title.color);
  renderText(ctx, title.text, title.x, title.y, title.font);
}

function drawLegendBox(ctx: CanvasRenderingContext2D, drawItem: any, labelOpts: any, model: any): void {
  const {legendItem, symbol} = drawItem;
  const {boxWidth, boxHeight} = model;
  if (isNaN(boxWidth) || boxWidth <= 0 || isNaN(boxHeight) || boxHeight < 0) return;

  ctx.save();
  const lineWidth = valueOrDefault(legendItem.lineWidth, 1);
  ctx.fillStyle = resolveCanvasPaint(ctx, valueOrDefault(legendItem.fillStyle, defaults.color));
  ctx.lineCap = valueOrDefault(legendItem.lineCap, 'butt');
  ctx.lineDashOffset = valueOrDefault(legendItem.lineDashOffset, 0);
  ctx.lineJoin = valueOrDefault(legendItem.lineJoin, 'miter');
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = resolveCanvasPaint(ctx, valueOrDefault(legendItem.strokeStyle, defaults.color));
  ctx.setLineDash(valueOrDefault(legendItem.lineDash, []));

  if (labelOpts.usePointStyle) {
    drawPointLegend(ctx, {
      radius: boxHeight * Math.SQRT2 / 2,
      pointStyle: legendItem.pointStyle,
      rotation: legendItem.rotation,
      borderWidth: lineWidth
    }, symbol.centerX, symbol.centerY, labelOpts.pointStyleWidth && boxWidth);
  } else {
    const borderRadius = toTRBLCorners(legendItem.borderRadius);
    ctx.beginPath();
    if (Object.values(borderRadius).some((value) => value !== 0)) {
      addRoundedRectPath(ctx, {x: symbol.x, y: symbol.y, w: boxWidth, h: boxHeight, radius: borderRadius});
    } else {
      ctx.rect(symbol.x, symbol.y, boxWidth, boxHeight);
    }
    ctx.fill();
    if (lineWidth !== 0) ctx.stroke();
  }
  ctx.restore();
}

export function drawCanvasLegend(ctx: CanvasRenderingContext2D, legend: any): void {
  if (!legend.options.display) return;

  clipArea(ctx, legend);
  const {options: opts} = legend;
  const {labels: labelOpts} = opts;
  const model = legend.buildLegendDrawItems();
  drawLegendTitle(ctx, model.title);

  ctx.textAlign = getRtlAdapter(opts.rtl, legend.left, legend.width).textAlign('left');
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 0.5;
  ctx.font = model.labelFont.string;
  overrideTextDirection(ctx, opts.textDirection);

  model.items.forEach((drawItem: any) => {
    const {legendItem, text} = drawItem;
    ctx.strokeStyle = resolveCanvasPaint(ctx, legendItem.fontColor);
    ctx.fillStyle = resolveCanvasPaint(ctx, legendItem.fontColor);
    drawLegendBox(ctx, drawItem, labelOpts, model);
    renderText(ctx, legendItem.text, text.x, text.y, model.labelFont, {
      strikethrough: legendItem.hidden,
      textAlign: text.align
    });
  });

  restoreTextDirection(ctx, opts.textDirection);
  unclipArea(ctx);
}
