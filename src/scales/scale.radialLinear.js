import defaults from '../core/core.defaults.js';
import {addRoundedRectPath, renderText, _isPointInArea} from '../helpers/helpers.canvas.js';
import {HALF_PI, TAU, toDegrees, toRadians, _normalizeAngle, PI} from '../helpers/helpers.math.js';
import LinearScaleBase from './scale.linearbase.js';
import Ticks from '../core/core.ticks.js';
import {valueOrDefault, isArray, isFinite, callback as callCallback, isNullOrUndef} from '../helpers/helpers.core.js';
import {createContext, toFont, toPadding, toTRBLCorners} from '../helpers/helpers.options.js';
import {Path} from '../helpers/helpers.path.js';
import {getOrCreateSvgElement, getOrCreateSvgScalePart, removeExtraSvgElements, removeSvgScalePart, resolveSvgPaint} from '../helpers/helpers.svg.js';
import {renderSvgText} from '../helpers/helpers.svg.text.js';

function svgLayerForZ(z) {
  return z > 0 ? 'foreground' : 'background';
}

function setSvgStroke(chart, element, color, lineWidth, dash = [], dashOffset = 0) {
  element.setAttribute('fill', 'none');
  element.setAttribute('stroke', resolveSvgPaint(chart, color));
  element.setAttribute('stroke-width', String(lineWidth));
  element.setAttribute('stroke-dasharray', String(dash || []));
  element.setAttribute('stroke-dashoffset', String(dashOffset || 0));
}

function getTickBackdropHeight(opts) {
  const tickOpts = opts.ticks;

  if (tickOpts.display && opts.display) {
    const padding = toPadding(tickOpts.backdropPadding);
    return valueOrDefault(tickOpts.font && tickOpts.font.size, defaults.font.size) + padding.height;
  }
  return 0;
}

function measureLabelSize(scale, font, label) {
  label = isArray(label) ? label : [label];
  let width = 0;
  for (const line of label) {
    if (!isNullOrUndef(line)) width = Math.max(width, scale.chart.renderer.measureText(line, font.string));
  }
  return {
    w: width,
    h: label.length * font.lineHeight
  };
}

function determineLimits(angle, pos, size, min, max) {
  if (angle === min || angle === max) {
    return {
      start: pos - (size / 2),
      end: pos + (size / 2)
    };
  } else if (angle < min || angle > max) {
    return {
      start: pos - size,
      end: pos
    };
  }

  return {
    start: pos,
    end: pos + size
  };
}

/**
 * Helper function to fit a radial linear scale with point labels
 */
function fitWithPointLabels(scale) {

  // Right, this is really confusing and there is a lot of maths going on here
  // The gist of the problem is here: https://gist.github.com/nnnick/696cc9c55f4b0beb8fe9
  //
  // Reaction: https://dl.dropboxusercontent.com/u/34601363/toomuchscience.gif
  //
  // Solution:
  //
  // We assume the radius of the polygon is half the size of the canvas at first
  // at each index we check if the text overlaps.
  //
  // Where it does, we store that angle and that index.
  //
  // After finding the largest index and angle we calculate how much we need to remove
  // from the shape radius to move the point inwards by that x.
  //
  // We average the left and right distances to get the maximum shape radius that can fit in the box
  // along with labels.
  //
  // Once we have that, we can find the centre point for the chart, by taking the x text protrusion
  // on each side, removing that from the size, halving it and adding the left x protrusion width.
  //
  // This will mean we have a shape fitted to the canvas, as large as it can be with the labels
  // and position it in the most space efficient manner
  //
  // https://dl.dropboxusercontent.com/u/34601363/yeahscience.gif

  // Get maximum radius of the polygon. Either half the height (minus the text width) or half the width.
  // Use this to calculate the offset + change. - Make sure L/R protrusion is at least 0 to stop issues with centre points
  const orig = {
    l: scale.left + scale._padding.left,
    r: scale.right - scale._padding.right,
    t: scale.top + scale._padding.top,
    b: scale.bottom - scale._padding.bottom
  };
  const limits = Object.assign({}, orig);
  const labelSizes = [];
  const padding = [];
  const valueCount = scale._pointLabels.length;
  const pointLabelOpts = scale.options.pointLabels;
  const additionalAngle = pointLabelOpts.centerPointLabels ? PI / valueCount : 0;

  for (let i = 0; i < valueCount; i++) {
    const opts = pointLabelOpts.setContext(scale.getPointLabelContext(i));
    padding[i] = opts.padding;
    const pointPosition = scale.getPointPosition(i, scale.drawingArea + padding[i], additionalAngle);
    const plFont = toFont(opts.font);
    const textSize = measureLabelSize(scale, plFont, scale._pointLabels[i]);
    labelSizes[i] = textSize;

    const angleRadians = _normalizeAngle(scale.getIndexAngle(i) + additionalAngle);
    const angle = Math.round(toDegrees(angleRadians));
    const hLimits = determineLimits(angle, pointPosition.x, textSize.w, 0, 180);
    const vLimits = determineLimits(angle, pointPosition.y, textSize.h, 90, 270);
    updateLimits(limits, orig, angleRadians, hLimits, vLimits);
  }

  scale.setCenterPoint(
    orig.l - limits.l,
    limits.r - orig.r,
    orig.t - limits.t,
    limits.b - orig.b
  );

  // Now that text size is determined, compute the full positions
  scale._pointLabelItems = buildPointLabelItems(scale, labelSizes, padding);
}

function updateLimits(limits, orig, angle, hLimits, vLimits) {
  const sin = Math.abs(Math.sin(angle));
  const cos = Math.abs(Math.cos(angle));
  let x = 0;
  let y = 0;
  if (hLimits.start < orig.l) {
    x = (orig.l - hLimits.start) / sin;
    limits.l = Math.min(limits.l, orig.l - x);
  } else if (hLimits.end > orig.r) {
    x = (hLimits.end - orig.r) / sin;
    limits.r = Math.max(limits.r, orig.r + x);
  }
  if (vLimits.start < orig.t) {
    y = (orig.t - vLimits.start) / cos;
    limits.t = Math.min(limits.t, orig.t - y);
  } else if (vLimits.end > orig.b) {
    y = (vLimits.end - orig.b) / cos;
    limits.b = Math.max(limits.b, orig.b + y);
  }
}

function createPointLabelItem(scale, index, itemOpts) {
  const outerDistance = scale.drawingArea;
  const {extra, additionalAngle, padding, size} = itemOpts;
  const pointLabelPosition = scale.getPointPosition(index, outerDistance + extra + padding, additionalAngle);
  const angle = Math.round(toDegrees(_normalizeAngle(pointLabelPosition.angle + HALF_PI)));
  const y = yForAngle(pointLabelPosition.y, size.h, angle);
  const textAlign = getTextAlignForAngle(angle);
  const left = leftForTextAlign(pointLabelPosition.x, size.w, textAlign);
  return {
    // if to draw or overlapped
    visible: true,

    // Text position
    x: pointLabelPosition.x,
    y,

    // Text rendering data
    textAlign,

    // Bounding box
    left,
    top: y,
    right: left + size.w,
    bottom: y + size.h
  };
}

function isNotOverlapped(item, area) {
  if (!area) {
    return true;
  }
  const {left, top, right, bottom} = item;
  const apexesInArea = _isPointInArea({x: left, y: top}, area) || _isPointInArea({x: left, y: bottom}, area) ||
    _isPointInArea({x: right, y: top}, area) || _isPointInArea({x: right, y: bottom}, area);
  return !apexesInArea;
}

function buildPointLabelItems(scale, labelSizes, padding) {
  const items = [];
  const valueCount = scale._pointLabels.length;
  const opts = scale.options;
  const {centerPointLabels, display} = opts.pointLabels;
  const itemOpts = {
    extra: getTickBackdropHeight(opts) / 2,
    additionalAngle: centerPointLabels ? PI / valueCount : 0
  };
  let area;

  for (let i = 0; i < valueCount; i++) {
    itemOpts.padding = padding[i];
    itemOpts.size = labelSizes[i];

    const item = createPointLabelItem(scale, i, itemOpts);
    items.push(item);
    if (display === 'auto') {
      item.visible = isNotOverlapped(item, area);
      if (item.visible) {
        area = item;
      }
    }
  }
  return items;
}

function getTextAlignForAngle(angle) {
  if (angle === 0 || angle === 180) {
    return 'center';
  } else if (angle < 180) {
    return 'left';
  }

  return 'right';
}

function leftForTextAlign(x, w, align) {
  if (align === 'right') {
    x -= w;
  } else if (align === 'center') {
    x -= (w / 2);
  }
  return x;
}

function yForAngle(y, h, angle) {
  if (angle === 90 || angle === 270) {
    y -= (h / 2);
  } else if (angle > 270 || angle < 90) {
    y -= h;
  }
  return y;
}

function drawPointLabelBox(ctx, backdrop) {
  if (backdrop) {
    ctx.fillStyle = backdrop.color;
    if (Object.values(backdrop.borderRadius).some(v => v !== 0)) {
      ctx.beginPath();
      addRoundedRectPath(ctx, {
        x: backdrop.x, y: backdrop.y, w: backdrop.width, h: backdrop.height, radius: backdrop.borderRadius,
      });
      ctx.fill();
    } else {
      ctx.fillRect(backdrop.x, backdrop.y, backdrop.width, backdrop.height);
    }
  }
}

function drawPointLabels(scale) {
  const {ctx} = scale;
  const items = scale.getPointLabelDrawItems();
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (!item.visible) {
      // overlapping
      continue;
    }
    drawPointLabelBox(ctx, item.backdrop);
    renderText(ctx, item.text, item.x, item.y, item.font, {color: item.color, textAlign: item.textAlign, textBaseline: 'middle'});
  }
}

function pathRadiusLine(path, scale, radius, circular, labelCount) {
  if (circular) {
    // Draw circular arcs between the points
    path.arc(scale.xCenter, scale.yCenter, radius, 0, TAU);
  } else {
    // Draw straight lines connecting each index
    let pointPosition = scale.getPointPosition(0, radius);
    path.moveTo(pointPosition.x, pointPosition.y);

    for (let i = 1; i < labelCount; i++) {
      pointPosition = scale.getPointPosition(i, radius);
      path.lineTo(pointPosition.x, pointPosition.y);
    }
  }
}

function pathRadialShape(path, shape) {
  if (shape.circular) {
    path.arc(shape.x, shape.y, shape.radius, 0, TAU);
    return;
  }
  const [first, ...rest] = shape.points;
  if (!first) return;
  path.moveTo(first.x, first.y);
  for (const point of rest) path.lineTo(point.x, point.y);
}

function drawRadiusLine(scale, gridLineOpts, radius, labelCount, borderOpts) {
  const ctx = scale.ctx;
  const circular = gridLineOpts.circular;

  const {color, lineWidth} = gridLineOpts;

  if ((!circular && !labelCount) || !color || !lineWidth || radius < 0) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(borderOpts.dash || []);
  ctx.lineDashOffset = borderOpts.dashOffset;

  ctx.beginPath();
  pathRadiusLine(ctx, scale, radius, circular, labelCount);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function createPointLabelContext(parent, index, label) {
  return createContext(parent, {
    label,
    index,
    type: 'pointLabel'
  });
}

export default class RadialLinearScale extends LinearScaleBase {

  static id = 'radialLinear';

  /**
   * @type {any}
   */
  static defaults = {
    display: true,

    // Boolean - Whether to animate scaling the chart from the centre
    animate: true,
    position: 'chartArea',

    angleLines: {
      display: true,
      lineWidth: 1,
      borderDash: [],
      borderDashOffset: 0.0
    },

    grid: {
      circular: false
    },

    startAngle: 0,

    // label settings
    ticks: {
      // Boolean - Show a backdrop to the scale label
      showLabelBackdrop: true,

      callback: Ticks.formatters.numeric
    },

    pointLabels: {
      backdropColor: undefined,

      // Number - The backdrop padding above & below the label in pixels
      backdropPadding: 2,

      // Boolean - if true, show point labels
      display: true,

      // Number - Point label font size in pixels
      font: {
        size: 10
      },

      // Function - Used to convert point labels
      callback(label) {
        return label;
      },

      // Number - Additionl padding between scale and pointLabel
      padding: 5,

      // Boolean - if true, center point labels to slices in polar chart
      centerPointLabels: false
    }
  };

  static defaultRoutes = {
    'angleLines.color': 'borderColor',
    'pointLabels.color': 'color',
    'ticks.color': 'color'
  };

  static descriptors = {
    angleLines: {
      _fallback: 'grid'
    }
  };

  constructor(cfg) {
    super(cfg);

    /** @type {number} */
    this.xCenter = undefined;
    /** @type {number} */
    this.yCenter = undefined;
    /** @type {number} */
    this.drawingArea = undefined;
    /** @type {string[]} */
    this._pointLabels = [];
    this._pointLabelItems = [];
  }

  setDimensions() {
    // Set the unconstrained dimension before label rotation
    const padding = this._padding = toPadding(getTickBackdropHeight(this.options) / 2);
    const w = this.width = this.maxWidth - padding.width;
    const h = this.height = this.maxHeight - padding.height;
    this.xCenter = Math.floor(this.left + w / 2 + padding.left);
    this.yCenter = Math.floor(this.top + h / 2 + padding.top);
    this.drawingArea = Math.floor(Math.min(w, h) / 2);
  }

  determineDataLimits() {
    const {min, max} = this.getMinMax(false);

    this.min = isFinite(min) && !isNaN(min) ? min : 0;
    this.max = isFinite(max) && !isNaN(max) ? max : 0;

    // Common base implementation to handle min, max, beginAtZero
    this.handleTickRangeOptions();
  }

  /**
	 * Returns the maximum number of ticks based on the scale dimension
	 * @protected
	 */
  computeTickLimit() {
    return Math.ceil(this.drawingArea / getTickBackdropHeight(this.options));
  }

  generateTickLabels(ticks) {
    LinearScaleBase.prototype.generateTickLabels.call(this, ticks);

    // Point labels
    this._pointLabels = this.getLabels()
      .map((value, index) => {
        const label = callCallback(this.options.pointLabels.callback, [value, index], this);
        return label || label === 0 ? label : '';
      })
      .filter((v, i) => this.chart.getDataVisibility(i));
  }

  fit() {
    const opts = this.options;

    if (opts.display && opts.pointLabels.display) {
      fitWithPointLabels(this);
    } else {
      this.setCenterPoint(0, 0, 0, 0);
    }
  }

  setCenterPoint(leftMovement, rightMovement, topMovement, bottomMovement) {
    this.xCenter += Math.floor((leftMovement - rightMovement) / 2);
    this.yCenter += Math.floor((topMovement - bottomMovement) / 2);
    this.drawingArea -= Math.min(this.drawingArea / 2, Math.max(leftMovement, rightMovement, topMovement, bottomMovement));
  }

  getIndexAngle(index) {
    const angleMultiplier = TAU / (this._pointLabels.length || 1);
    const startAngle = this.options.startAngle || 0;

    return _normalizeAngle(index * angleMultiplier + toRadians(startAngle));
  }

  getDistanceFromCenterForValue(value) {
    if (isNullOrUndef(value)) {
      return NaN;
    }

    // Take into account half font size + the yPadding of the top value
    const scalingFactor = this.drawingArea / (this.max - this.min);
    if (this.options.reverse) {
      return (this.max - value) * scalingFactor;
    }
    return (value - this.min) * scalingFactor;
  }

  getValueForDistanceFromCenter(distance) {
    if (isNullOrUndef(distance)) {
      return NaN;
    }

    const scaledDistance = distance / (this.drawingArea / (this.max - this.min));
    return this.options.reverse ? this.max - scaledDistance : this.min + scaledDistance;
  }

  getPointLabelContext(index) {
    const pointLabels = this._pointLabels || [];

    if (index >= 0 && index < pointLabels.length) {
      const pointLabel = pointLabels[index];
      return createPointLabelContext(this.getContext(), index, pointLabel);
    }
  }

  getPointPosition(index, distanceFromCenter, additionalAngle = 0) {
    const angle = this.getIndexAngle(index) - HALF_PI + additionalAngle;
    return {
      x: Math.cos(angle) * distanceFromCenter + this.xCenter,
      y: Math.sin(angle) * distanceFromCenter + this.yCenter,
      angle
    };
  }

  getPointPositionForValue(index, value) {
    return this.getPointPosition(index, this.getDistanceFromCenterForValue(value));
  }

  getBasePosition(index) {
    return this.getPointPositionForValue(index || 0, this.getBaseValue());
  }

  getPointLabelPosition(index) {
    const {left, top, right, bottom} = this._pointLabelItems[index];
    return {
      left,
      top,
      right,
      bottom,
    };
  }

  getRadialShape(radius, circular) {
    if (circular) {
      return {circular: true, x: this.xCenter, y: this.yCenter, radius};
    }
    const points = [];
    for (let index = 0; index < this._pointLabels.length; index++) {
      const point = this.getPointPosition(index, radius);
      points.push({x: point.x, y: point.y});
    }
    return {circular: false, points};
  }

  getBackgroundDrawItem() {
    const {backgroundColor, grid: {circular}} = this.options;
    if (!backgroundColor) return null;
    return {color: backgroundColor, shape: this.getRadialShape(this.getDistanceFromCenterForValue(this._endValue), circular)};
  }

  getRadialGridDrawItems() {
    const {grid, border} = this.options;
    if (!grid.display) return [];
    const items = [];
    this.ticks.forEach((tick, index) => {
      if (index === 0 && this.min >= 0) return;
      const gridOpts = grid.setContext(this.getContext(index));
      const borderOpts = border.setContext(this.getContext(index));
      const radius = this.getDistanceFromCenterForValue(tick.value);
      if ((!gridOpts.circular && !this._pointLabels.length) || !gridOpts.color || !gridOpts.lineWidth || radius < 0) return;
      items.push({shape: this.getRadialShape(radius, gridOpts.circular), color: gridOpts.color, lineWidth: gridOpts.lineWidth, borderDash: borderOpts.dash || [], borderDashOffset: borderOpts.dashOffset});
    });
    return items;
  }

  getAngleLineDrawItems() {
    const {angleLines, reverse} = this.options;
    if (!angleLines.display) return [];
    const distance = this.getDistanceFromCenterForValue(reverse ? this.min : this.max);
    const items = [];
    for (let index = this._pointLabels.length - 1; index >= 0; index--) {
      const opts = angleLines.setContext(this.getPointLabelContext(index));
      if (!opts.lineWidth || !opts.color) continue;
      const point = this.getPointPosition(index, distance);
      items.push({x1: this.xCenter, y1: this.yCenter, x2: point.x, y2: point.y, color: opts.color, lineWidth: opts.lineWidth, borderDash: opts.borderDash, borderDashOffset: opts.borderDashOffset});
    }
    return items;
  }

  getPointLabelDrawItems() {
    const {pointLabels} = this.options;
    if (!pointLabels.display) return [];
    return this._pointLabelItems.map((layout, index) => {
      const opts = pointLabels.setContext(this.getPointLabelContext(index));
      const font = toFont(opts.font);
      const padding = toPadding(opts.backdropPadding);
      const backdrop = isNullOrUndef(opts.backdropColor) ? null : {
        x: layout.left - padding.left, y: layout.top - padding.top,
        width: layout.right - layout.left + padding.width, height: layout.bottom - layout.top + padding.height,
        color: opts.backdropColor, borderRadius: toTRBLCorners(opts.borderRadius)
      };
      return {index, text: this._pointLabels[index], visible: layout.visible, x: layout.x, y: layout.y + font.lineHeight / 2, textAlign: layout.textAlign, font, color: opts.color, backdrop};
    });
  }

  getRadialTickDrawItems() {
    const {ticks: tickOpts, reverse} = this.options;
    if (!tickOpts.display) return [];
    const rotation = this.getIndexAngle(0);
    const items = [];
    this.ticks.forEach((tick, index) => {
      if (index === 0 && this.min >= 0 && !reverse) return;
      const opts = tickOpts.setContext(this.getContext(index));
      const font = toFont(opts.font);
      const offset = this.getDistanceFromCenterForValue(tick.value);
      const padding = toPadding(opts.backdropPadding);
      const width = opts.showLabelBackdrop ? this.chart.renderer.measureText(tick.label, font.string) : 0;
      items.push({index, text: tick.label, font, color: opts.color, strokeColor: opts.textStrokeColor, strokeWidth: opts.textStrokeWidth, centerX: this.xCenter, centerY: this.yCenter, rotation, x: 0, y: -offset, backdrop: opts.showLabelBackdrop ? {x: -width / 2 - padding.left, y: -offset - font.size / 2 - padding.top, width: width + padding.width, height: font.size + padding.height, color: opts.backdropColor} : null});
    });
    return items;
  }

  /**
	 * @protected
	 */
  drawBackground() {
    const item = this.getBackgroundDrawItem();
    const backgroundColor = item && item.color;
    if (this.chart.options.renderer === 'svg') {
      if (!backgroundColor) {
        removeSvgScalePart(this.chart, this.id, 'radial-background');
        return;
      }
      const group = getOrCreateSvgScalePart(this.chart, this.id, 'radial-background', svgLayerForZ(valueOrDefault(this.options.grid.z, -1)));
      const path = new Path();
      pathRadialShape(path, item.shape);
      path.closePath();
      const element = getOrCreateSvgElement(group, 'path');
      element.setAttribute('d', path.toString());
      element.setAttribute('fill', resolveSvgPaint(this.chart, backgroundColor));
      element.setAttribute('stroke', 'none');
      removeExtraSvgElements(group, 1);
      return;
    }
    if (backgroundColor) {
      const ctx = this.ctx;
      ctx.save();
      ctx.beginPath();
      pathRadialShape(ctx, item.shape);
      ctx.closePath();
      ctx.fillStyle = backgroundColor;
      ctx.fill();
      ctx.restore();
    }
  }

  /**
	 * @protected
	 */
  drawGrid() {
    const ctx = this.ctx;
    const opts = this.options;
    const {angleLines, grid, border} = opts;
    const labelCount = this._pointLabels.length;

    if (this.chart.options.renderer === 'svg') {
      this._drawSvgPointLabels(labelCount);
      const layer = svgLayerForZ(valueOrDefault(grid.z, -1));

      if (!grid.display) {
        removeSvgScalePart(this.chart, this.id, 'radial-grid');
      } else {
        const group = getOrCreateSvgScalePart(this.chart, this.id, 'radial-grid', layer);
        let count = 0;
        this.ticks.forEach((tick, index) => {
          if (index === 0 && this.min >= 0) {
            return;
          }
          const context = this.getContext(index);
          const gridOpts = grid.setContext(context);
          const borderOpts = border.setContext(context);
          const radius = this.getDistanceFromCenterForValue(tick.value);
          if ((!gridOpts.circular && !labelCount) || !gridOpts.color || !gridOpts.lineWidth || radius < 0) {
            return;
          }
          const path = new Path();
          pathRadiusLine(path, this, radius, gridOpts.circular, labelCount);
          path.closePath();
          const element = getOrCreateSvgElement(group, 'path', count++);
          element.setAttribute('d', path.toString());
          setSvgStroke(this.chart, element, gridOpts.color, gridOpts.lineWidth, borderOpts.dash, borderOpts.dashOffset);
        });
        removeExtraSvgElements(group, count);
      }

      if (!angleLines.display) {
        removeSvgScalePart(this.chart, this.id, 'angle-lines');
        return;
      }
      const group = getOrCreateSvgScalePart(this.chart, this.id, 'angle-lines', layer);
      let count = 0;
      for (let i = labelCount - 1; i >= 0; i--) {
        const angleOpts = angleLines.setContext(this.getPointLabelContext(i));
        if (!angleOpts.lineWidth || !angleOpts.color) {
          continue;
        }
        const offset = this.getDistanceFromCenterForValue(opts.reverse ? this.min : this.max);
        const position = this.getPointPosition(i, offset);
        const line = getOrCreateSvgElement(group, 'line', count++);
        line.setAttribute('x1', String(this.xCenter));
        line.setAttribute('y1', String(this.yCenter));
        line.setAttribute('x2', String(position.x));
        line.setAttribute('y2', String(position.y));
        setSvgStroke(this.chart, line, angleOpts.color, angleOpts.lineWidth, angleOpts.borderDash, angleOpts.borderDashOffset);
      }
      removeExtraSvgElements(group, count);
      return;
    }

    let i, offset, position;

    if (opts.pointLabels.display) {
      drawPointLabels(this);
    }

    if (grid.display) {
      this.ticks.forEach((tick, index) => {
        if (index !== 0 || (index === 0 && this.min < 0)) {
          offset = this.getDistanceFromCenterForValue(tick.value);
          const context = this.getContext(index);
          const optsAtIndex = grid.setContext(context);
          const optsAtIndexBorder = border.setContext(context);

          drawRadiusLine(this, optsAtIndex, offset, labelCount, optsAtIndexBorder);
        }
      });
    }

    if (angleLines.display) {
      ctx.save();

      for (i = labelCount - 1; i >= 0; i--) {
        const optsAtIndex = angleLines.setContext(this.getPointLabelContext(i));
        const {color, lineWidth} = optsAtIndex;

        if (!lineWidth || !color) {
          continue;
        }

        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = color;

        ctx.setLineDash(optsAtIndex.borderDash);
        ctx.lineDashOffset = optsAtIndex.borderDashOffset;

        offset = this.getDistanceFromCenterForValue(opts.reverse ? this.min : this.max);
        position = this.getPointPosition(i, offset);
        ctx.beginPath();
        ctx.moveTo(this.xCenter, this.yCenter);
        ctx.lineTo(position.x, position.y);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  /**
	 * @protected
	 */
  drawBorder() {}

  /**
	 * @protected
	 */
  drawLabels() {
    const ctx = this.ctx;
    const opts = this.options;
    const tickOpts = opts.ticks;

    if (!tickOpts.display) {
      if (this.chart.options.renderer === 'svg') {
        removeSvgScalePart(this.chart, this.id, 'radial-ticks');
      }
      return;
    }

    const startAngle = this.getIndexAngle(0);
    let offset, width;

    if (this.chart.options.renderer === 'svg') {
      this._drawSvgTickLabels(startAngle, tickOpts);
      return;
    }

    ctx.save();
    ctx.translate(this.xCenter, this.yCenter);
    ctx.rotate(startAngle);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    this.getRadialTickDrawItems().forEach((item) => {
      if (item.backdrop) {
        ctx.fillStyle = item.backdrop.color;
        ctx.fillRect(item.backdrop.x, item.backdrop.y, item.backdrop.width, item.backdrop.height);
      }
      renderText(ctx, item.text, item.x, item.y, item.font, {color: item.color, strokeColor: item.strokeColor, strokeWidth: item.strokeWidth});
    });

    ctx.restore();
  }

  /**
	 * @protected
	 */
  drawTitle() {}

  _drawSvgPointLabels(labelCount) {
    const pointLabels = this.options.pointLabels;
    if (!pointLabels.display) {
      removeSvgScalePart(this.chart, this.id, 'point-labels');
      return;
    }
    const group = getOrCreateSvgScalePart(this.chart, this.id, 'point-labels', svgLayerForZ(valueOrDefault(this.options.grid.z, -1)));
    for (let i = 0; i < labelCount; ++i) {
      const item = this._pointLabelItems[i];
      const label = /** @type {SVGGElement} */ (getOrCreateSvgElement(group, 'g', i));
      const backdrop = getOrCreateSvgElement(label, 'path', 0);
      const opts = pointLabels.setContext(this.getPointLabelContext(i));
      const font = toFont(opts.font);
      if (!item.visible || isNullOrUndef(opts.backdropColor)) {
        backdrop.setAttribute('display', 'none');
      } else {
        const padding = toPadding(opts.backdropPadding);
        const path = new Path();
        addRoundedRectPath(path, {
          x: item.left - padding.left,
          y: item.top - padding.top,
          w: item.right - item.left + padding.width,
          h: item.bottom - item.top + padding.height,
          radius: toTRBLCorners(opts.borderRadius),
        });
        backdrop.setAttribute('d', path.toString());
        backdrop.setAttribute('fill', resolveSvgPaint(this.chart, opts.backdropColor));
        backdrop.setAttribute('stroke', 'none');
        backdrop.setAttribute('display', '');
      }
      label.setAttribute('display', item.visible ? '' : 'none');
      renderSvgText(label, 1, this._pointLabels[i], font, {
        color: opts.color,
        textAlign: item.textAlign,
        textBaseline: 'middle',
      }, undefined, item.x, item.y + font.lineHeight / 2);
    }
    removeExtraSvgElements(group, labelCount);
  }

  _drawSvgTickLabels(startAngle, tickOpts) {
    const group = getOrCreateSvgScalePart(this.chart, this.id, 'radial-ticks', svgLayerForZ(valueOrDefault(tickOpts.z, 0)));
    let count = 0;
    for (let index = 0; index < this.ticks.length; ++index) {
      if (index === 0 && this.min >= 0 && !this.options.reverse) {
        continue;
      }
      const tick = this.ticks[index];
      const opts = tickOpts.setContext(this.getContext(index));
      const font = toFont(opts.font);
      const offset = this.getDistanceFromCenterForValue(tick.value);
      const label = /** @type {SVGGElement} */ (getOrCreateSvgElement(group, 'g', count++));
      label.setAttribute('transform', `translate(${this.xCenter} ${this.yCenter}) rotate(${toDegrees(startAngle)})`);
      const backdrop = getOrCreateSvgElement(label, 'rect', 0);
      if (opts.showLabelBackdrop) {
        const width = this.chart.renderer.measureText(tick.label, font.string);
        const padding = toPadding(opts.backdropPadding);
        backdrop.setAttribute('x', String(-width / 2 - padding.left));
        backdrop.setAttribute('y', String(-offset - font.size / 2 - padding.top));
        backdrop.setAttribute('width', String(width + padding.width));
        backdrop.setAttribute('height', String(font.size + padding.height));
        backdrop.setAttribute('fill', resolveSvgPaint(this.chart, opts.backdropColor));
        backdrop.setAttribute('display', '');
      } else {
        backdrop.setAttribute('display', 'none');
      }
      renderSvgText(label, 1, tick.label, font, {
        color: opts.color,
        strokeColor: opts.textStrokeColor,
        strokeWidth: opts.textStrokeWidth,
        textAlign: 'center',
        textBaseline: 'middle',
      }, undefined, 0, -offset);
    }
    removeExtraSvgElements(group, count);
  }
}
