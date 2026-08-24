import {addRoundedRectPath, drawPoint} from '../../helpers/helpers.canvas.js';
import {each, isObject} from '../../helpers/helpers.core.js';
import {resolveCanvasPaint} from '../../helpers/helpers.paint.js';
import {toFont, toPadding, toTRBLCorners} from '../../helpers/helpers.options.js';
import {getRtlAdapter, overrideTextDirection, restoreTextDirection} from '../../helpers/helpers.rtl.js';

function getAlignedX(tooltip: any, align: string, options: any): number {
  const padding = toPadding(options.padding);

  return align === 'center'
    ? tooltip.x + tooltip.width / 2
    : align === 'right'
      ? tooltip.x + tooltip.width - padding.right
      : tooltip.x + padding.left;
}

function drawCaret(tooltip: any, tooltipPoint: any, ctx: CanvasRenderingContext2D, size: any, options: any): void {
  const caretPosition = tooltip.getCaretPosition(tooltipPoint, size, options);

  ctx.lineTo(caretPosition.x1, caretPosition.y1);
  ctx.lineTo(caretPosition.x2, caretPosition.y2);
  ctx.lineTo(caretPosition.x3, caretPosition.y3);
}

function drawTitle(tooltip: any, pt: any, ctx: CanvasRenderingContext2D, options: any): void {
  const title = tooltip.title;
  const length = title.length;
  let titleFont, titleSpacing, i;

  if (length) {
    const rtlHelper = getRtlAdapter(options.rtl, tooltip.x, tooltip.width);

    pt.x = getAlignedX(tooltip, options.titleAlign, options);

    ctx.textAlign = rtlHelper.textAlign(options.titleAlign);
    ctx.textBaseline = 'middle';

    titleFont = toFont(options.titleFont);
    titleSpacing = options.titleSpacing;

    ctx.fillStyle = resolveCanvasPaint(ctx, options.titleColor);
    ctx.font = titleFont.string;

    for (i = 0; i < length; ++i) {
      ctx.fillText(title[i], rtlHelper.x(pt.x), pt.y + titleFont.lineHeight / 2);
      pt.y += titleFont.lineHeight + titleSpacing;

      if (i + 1 === length) {
        pt.y += options.titleMarginBottom - titleSpacing;
      }
    }
  }
}

function drawColorBox(tooltip: any, ctx: CanvasRenderingContext2D, pt: any, i: number, rtlHelper: any, options: any): void {
  const labelColor = tooltip.labelColors[i];
  const labelPointStyle = tooltip.labelPointStyles[i];
  const {boxHeight, boxWidth} = options;
  const bodyFont = toFont(options.bodyFont);
  const colorX = getAlignedX(tooltip, 'left', options);
  const rtlColorX = rtlHelper.x(colorX);
  const yOffSet = boxHeight < bodyFont.lineHeight ? (bodyFont.lineHeight - boxHeight) / 2 : 0;
  const colorY = pt.y + yOffSet;

  if (options.usePointStyle) {
    const drawOptions = {
      radius: Math.min(boxWidth, boxHeight) / 2,
      pointStyle: labelPointStyle.pointStyle,
      rotation: labelPointStyle.rotation,
      borderWidth: 1
    };
    const centerX = rtlHelper.leftForLtr(rtlColorX, boxWidth) + boxWidth / 2;
    const centerY = colorY + boxHeight / 2;

    ctx.strokeStyle = resolveCanvasPaint(ctx, options.multiKeyBackground);
    ctx.fillStyle = resolveCanvasPaint(ctx, options.multiKeyBackground);
    drawPoint(ctx, drawOptions, centerX, centerY);

    ctx.strokeStyle = resolveCanvasPaint(ctx, labelColor.borderColor);
    ctx.fillStyle = resolveCanvasPaint(ctx, labelColor.backgroundColor);
    drawPoint(ctx, drawOptions, centerX, centerY);
  } else {
    ctx.lineWidth = isObject(labelColor.borderWidth) ? Math.max(...Object.values(labelColor.borderWidth) as number[]) : (labelColor.borderWidth || 1);
    ctx.strokeStyle = resolveCanvasPaint(ctx, labelColor.borderColor);
    ctx.setLineDash(labelColor.borderDash || []);
    ctx.lineDashOffset = labelColor.borderDashOffset || 0;

    const outerX = rtlHelper.leftForLtr(rtlColorX, boxWidth);
    const innerX = rtlHelper.leftForLtr(rtlHelper.xPlus(rtlColorX, 1), boxWidth - 2);
    const borderRadius = toTRBLCorners(labelColor.borderRadius);

    if (Object.values(borderRadius).some(v => v !== 0)) {
      ctx.beginPath();
      ctx.fillStyle = resolveCanvasPaint(ctx, options.multiKeyBackground);
      addRoundedRectPath(ctx, {
        x: outerX,
        y: colorY,
        w: boxWidth,
        h: boxHeight,
        radius: borderRadius,
      });
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = resolveCanvasPaint(ctx, labelColor.backgroundColor);
      ctx.beginPath();
      addRoundedRectPath(ctx, {
        x: innerX,
        y: colorY + 1,
        w: boxWidth - 2,
        h: boxHeight - 2,
        radius: borderRadius,
      });
      ctx.fill();
    } else {
      ctx.fillStyle = resolveCanvasPaint(ctx, options.multiKeyBackground);
      ctx.fillRect(outerX, colorY, boxWidth, boxHeight);
      ctx.strokeRect(outerX, colorY, boxWidth, boxHeight);
      ctx.fillStyle = resolveCanvasPaint(ctx, labelColor.backgroundColor);
      ctx.fillRect(innerX, colorY + 1, boxWidth - 2, boxHeight - 2);
    }
  }

  ctx.fillStyle = resolveCanvasPaint(ctx, tooltip.labelTextColors[i]);
}

function drawBody(tooltip: any, pt: any, ctx: CanvasRenderingContext2D, options: any): void {
  const {body} = tooltip;
  const {bodySpacing, bodyAlign, displayColors, boxHeight, boxWidth, boxPadding} = options;
  const bodyFont = toFont(options.bodyFont);
  let bodyLineHeight = bodyFont.lineHeight;
  let xLinePadding = 0;

  const rtlHelper = getRtlAdapter(options.rtl, tooltip.x, tooltip.width);
  const fillLineOfText = function(line: string) {
    ctx.fillText(line, rtlHelper.x(pt.x + xLinePadding), pt.y + bodyLineHeight / 2);
    pt.y += bodyLineHeight + bodySpacing;
  };
  const bodyAlignForCalculation = rtlHelper.textAlign(bodyAlign);
  let bodyItem, textColor, lines, i, j, ilen, jlen;

  ctx.textAlign = bodyAlign;
  ctx.textBaseline = 'middle';
  ctx.font = bodyFont.string;

  pt.x = getAlignedX(tooltip, bodyAlignForCalculation, options);
  ctx.fillStyle = resolveCanvasPaint(ctx, options.bodyColor);
  each(tooltip.beforeBody, fillLineOfText);

  xLinePadding = displayColors && bodyAlignForCalculation !== 'right'
    ? bodyAlign === 'center' ? (boxWidth / 2 + boxPadding) : (boxWidth + 2 + boxPadding)
    : 0;

  for (i = 0, ilen = body.length; i < ilen; ++i) {
    bodyItem = body[i];
    textColor = tooltip.labelTextColors[i];

    ctx.fillStyle = resolveCanvasPaint(ctx, textColor);
    each(bodyItem.before, fillLineOfText);

    lines = bodyItem.lines;
    if (displayColors && lines.length) {
      drawColorBox(tooltip, ctx, pt, i, rtlHelper, options);
      bodyLineHeight = Math.max(bodyFont.lineHeight, boxHeight);
    }

    for (j = 0, jlen = lines.length; j < jlen; ++j) {
      fillLineOfText(lines[j]);
      bodyLineHeight = bodyFont.lineHeight;
    }

    each(bodyItem.after, fillLineOfText);
  }

  xLinePadding = 0;
  bodyLineHeight = bodyFont.lineHeight;
  each(tooltip.afterBody, fillLineOfText);
  pt.y -= bodySpacing;
}

function drawFooter(tooltip: any, pt: any, ctx: CanvasRenderingContext2D, options: any): void {
  const footer = tooltip.footer;
  const length = footer.length;
  let footerFont, i;

  if (length) {
    const rtlHelper = getRtlAdapter(options.rtl, tooltip.x, tooltip.width);

    pt.x = getAlignedX(tooltip, options.footerAlign, options);
    pt.y += options.footerMarginTop;

    ctx.textAlign = rtlHelper.textAlign(options.footerAlign);
    ctx.textBaseline = 'middle';
    footerFont = toFont(options.footerFont);
    ctx.fillStyle = resolveCanvasPaint(ctx, options.footerColor);
    ctx.font = footerFont.string;

    for (i = 0; i < length; ++i) {
      ctx.fillText(footer[i], rtlHelper.x(pt.x), pt.y + footerFont.lineHeight / 2);
      pt.y += footerFont.lineHeight + options.footerSpacing;
    }
  }
}

function drawBackground(tooltip: any, pt: any, ctx: CanvasRenderingContext2D, tooltipSize: any, options: any): void {
  const {xAlign, yAlign} = tooltip;
  const {x, y} = pt;
  const {width, height} = tooltipSize;
  const {topLeft, topRight, bottomLeft, bottomRight} = toTRBLCorners(options.cornerRadius);

  ctx.fillStyle = resolveCanvasPaint(ctx, options.backgroundColor);
  ctx.strokeStyle = resolveCanvasPaint(ctx, options.borderColor);
  ctx.lineWidth = options.borderWidth;

  ctx.beginPath();
  ctx.moveTo(x + topLeft, y);
  if (yAlign === 'top') {
    drawCaret(tooltip, pt, ctx, tooltipSize, options);
  }
  ctx.lineTo(x + width - topRight, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + topRight);
  if (yAlign === 'center' && xAlign === 'right') {
    drawCaret(tooltip, pt, ctx, tooltipSize, options);
  }
  ctx.lineTo(x + width, y + height - bottomRight);
  ctx.quadraticCurveTo(x + width, y + height, x + width - bottomRight, y + height);
  if (yAlign === 'bottom') {
    drawCaret(tooltip, pt, ctx, tooltipSize, options);
  }
  ctx.lineTo(x + bottomLeft, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - bottomLeft);
  if (yAlign === 'center' && xAlign === 'left') {
    drawCaret(tooltip, pt, ctx, tooltipSize, options);
  }
  ctx.lineTo(x, y + topLeft);
  ctx.quadraticCurveTo(x, y, x + topLeft, y);
  ctx.closePath();
  ctx.fill();

  if (options.borderWidth > 0) {
    ctx.stroke();
  }
}

export function drawCanvasTooltip(ctx: CanvasRenderingContext2D, tooltip: any): boolean {
  const options = tooltip.options.setContext(tooltip.getContext());
  let opacity = tooltip.opacity;

  if (!opacity) {
    return false;
  }

  tooltip._updateAnimationTarget(options);
  const tooltipSize = {width: tooltip.width, height: tooltip.height};
  const pt = {x: tooltip.x, y: tooltip.y};
  opacity = Math.abs(opacity) < 1e-3 ? 0 : opacity;
  const padding = toPadding(options.padding);
  const hasTooltipContent = tooltip.title.length || tooltip.beforeBody.length || tooltip.body.length || tooltip.afterBody.length || tooltip.footer.length;

  if (!options.enabled || !hasTooltipContent || !opacity) {
    return false;
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  drawBackground(tooltip, pt, ctx, tooltipSize, options);
  overrideTextDirection(ctx, options.textDirection);
  pt.y += padding.top;
  drawTitle(tooltip, pt, ctx, options);
  drawBody(tooltip, pt, ctx, options);
  drawFooter(tooltip, pt, ctx, options);
  restoreTextDirection(ctx, options.textDirection);
  ctx.restore();
  return true;
}
