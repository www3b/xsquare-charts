import Element from './geometry.js';
import {isObject, _isBetween, _limitValue} from '../shared/index.js';
import {toTRBL, toTRBLCorners} from '../shared/options.js';

/** @typedef {{ x: number, y: number, base: number, horizontal: boolean, width: number, height: number }} BarProps */

/**
 * Helper function to get the bounds of the bar regardless of the orientation
 * @param {BarGeometry} bar the bar
 * @param {boolean} [useFinalPosition]
 * @return {object} bounds of the bar
 * @private
 */
export function getBarBounds(bar, useFinalPosition) {
  const {x, y, base, width, height} = /** @type {BarProps} */ (bar.getProps(['x', 'y', 'base', 'width', 'height'], useFinalPosition));

  let left, right, top, bottom, half;

  if (bar.horizontal) {
    half = height / 2;
    left = Math.min(x, base);
    right = Math.max(x, base);
    top = y - half;
    bottom = y + half;
  } else {
    half = width / 2;
    left = x - half;
    right = x + half;
    top = Math.min(y, base);
    bottom = Math.max(y, base);
  }

  return {left, top, right, bottom};
}

function skipOrLimit(skip, value, min, max) {
  return skip ? 0 : _limitValue(value, min, max);
}

function parseBorderWidth(bar, maxW, maxH) {
  const value = bar.options.borderWidth;
  const skip = bar.borderSkipped;
  const o = toTRBL(value);

  return {
    t: skipOrLimit(skip.top, o.top, 0, maxH),
    r: skipOrLimit(skip.right, o.right, 0, maxW),
    b: skipOrLimit(skip.bottom, o.bottom, 0, maxH),
    l: skipOrLimit(skip.left, o.left, 0, maxW)
  };
}

function parseBorderRadius(bar, maxW, maxH) {
  const {enableBorderRadius} = bar.getProps(['enableBorderRadius']);
  const value = bar.options.borderRadius;
  const o = toTRBLCorners(value);
  const maxR = Math.min(maxW, maxH);
  const skip = bar.borderSkipped;

  // If the value is an object, assume the user knows what they are doing
  // and apply as directed.
  const enableBorder = enableBorderRadius || isObject(value);

  return {
    topLeft: skipOrLimit(!enableBorder || skip.top || skip.left, o.topLeft, 0, maxR),
    topRight: skipOrLimit(!enableBorder || skip.top || skip.right, o.topRight, 0, maxR),
    bottomLeft: skipOrLimit(!enableBorder || skip.bottom || skip.left, o.bottomLeft, 0, maxR),
    bottomRight: skipOrLimit(!enableBorder || skip.bottom || skip.right, o.bottomRight, 0, maxR)
  };
}

export function boundingRects(bar) {
  const bounds = getBarBounds(bar);
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const border = parseBorderWidth(bar, width / 2, height / 2);
  const radius = parseBorderRadius(bar, width / 2, height / 2);

  return {
    outer: {
      x: bounds.left,
      y: bounds.top,
      w: width,
      h: height,
      radius
    },
    inner: {
      x: bounds.left + border.l,
      y: bounds.top + border.t,
      w: width - border.l - border.r,
      h: height - border.t - border.b,
      radius: {
        topLeft: Math.max(0, radius.topLeft - Math.max(border.t, border.l)),
        topRight: Math.max(0, radius.topRight - Math.max(border.t, border.r)),
        bottomLeft: Math.max(0, radius.bottomLeft - Math.max(border.b, border.l)),
        bottomRight: Math.max(0, radius.bottomRight - Math.max(border.b, border.r)),
      }
    }
  };
}

function inRange(bar, x, y, useFinalPosition) {
  const skipX = x === null;
  const skipY = y === null;
  const skipBoth = skipX && skipY;
  const bounds = bar && !skipBoth && getBarBounds(bar, useFinalPosition);

  return bounds
		&& (skipX || _isBetween(x, bounds.left, bounds.right))
		&& (skipY || _isBetween(y, bounds.top, bounds.bottom));
}

export function hasRadius(radius) {
  return radius.topLeft || radius.topRight || radius.bottomLeft || radius.bottomRight;
}

export function inflateRect(rect, amount, refRect = {}) {
  const x = rect.x !== refRect.x ? -amount : 0;
  const y = rect.y !== refRect.y ? -amount : 0;
  const w = (rect.x + rect.w !== refRect.x + refRect.w ? amount : 0) - x;
  const h = (rect.y + rect.h !== refRect.y + refRect.h ? amount : 0) - y;
  return {
    x: rect.x + x,
    y: rect.y + y,
    w: rect.w + w,
    h: rect.h + h,
    radius: rect.radius
  };
}

export default class BarGeometry extends Element {

  static id = 'bar';

  /**
   * @type {any}
   */
  static defaults = {
    borderSkipped: 'start',
    borderWidth: 0,
    borderRadius: 0,
    inflateAmount: 'auto',
    pointStyle: undefined
  };

  /**
   * @type {any}
   */
  static defaultRoutes = {
    backgroundColor: 'backgroundColor',
    borderColor: 'borderColor'
  };

  constructor(cfg) {
    super();

    this.options = undefined;
    this.horizontal = undefined;
    this.base = undefined;
    this.width = undefined;
    this.height = undefined;
    this.inflateAmount = undefined;

    if (cfg) {
      Object.assign(this, cfg);
    }
  }

  draw(renderer, context) {
    renderer.drawElement(this, context);
  }

  inRange(mouseX, mouseY, useFinalPosition) {
    return inRange(this, mouseX, mouseY, useFinalPosition);
  }

  inXRange(mouseX, useFinalPosition) {
    return inRange(this, mouseX, null, useFinalPosition);
  }

  inYRange(mouseY, useFinalPosition) {
    return inRange(this, null, mouseY, useFinalPosition);
  }

  getCenterPoint(useFinalPosition) {
    const {x, y, base, horizontal} = /** @type {BarProps} */ (this.getProps(['x', 'y', 'base', 'horizontal'], useFinalPosition));
    return {
      x: horizontal ? (x + base) / 2 : x,
      y: horizontal ? y : (y + base) / 2
    };
  }

  getRange(axis) {
    return axis === 'x' ? this.width / 2 : this.height / 2;
  }
}
