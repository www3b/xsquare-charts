import Element from '../core/core.element.js';
import {drawPoint, tracePoint, _isPointInArea} from '../helpers/helpers.canvas.js';
import {Path} from '../helpers/helpers.path.js';
import {
  getOrCreateSvgDatasetPart,
  getOrCreateSvgElementFor,
  getSvgElementContext,
  removeSvgElementFor,
  resolveSvgPaint,
  setSvgImageAttributes
} from '../helpers/helpers.svg.js';
import type {
  CartesianParsedData,
  ChartArea,
  Point,
  PointHoverOptions,
  PointOptions,
} from '../types/index.js';

function inRange(el: PointElement, pos: number, axis: 'x' | 'y', useFinalPosition?: boolean) {
  const options = el.options;
  const {[axis]: value} = el.getProps([axis], useFinalPosition);

  return (Math.abs(pos - value) < options.radius + options.hitRadius);
}

function isObjectPointStyle(pointStyle: PointOptions['pointStyle']) {
  return pointStyle && typeof pointStyle === 'object';
}

function drawSvgPoint(point: PointElement, options: PointOptions & PointHoverOptions) {
  const context = getSvgElementContext(point);
  if (!context) {
    return;
  }

  const {chart, datasetIndex} = context;
  const group = getOrCreateSvgDatasetPart(chart, datasetIndex, 'points');
  const path = new Path();
  tracePoint(path, options, point.x, point.y);

  const element = getOrCreateSvgElementFor(group, point, 'path');
  element.setAttribute('data-dataset-index', datasetIndex.toString());
  element.setAttribute('d', path.toString());
  element.setAttribute('fill', resolveSvgPaint(chart, options.backgroundColor));
  element.setAttribute('stroke', options.borderWidth > 0 ? resolveSvgPaint(chart, options.borderColor) : 'none');
  element.setAttribute('stroke-width', options.borderWidth.toString());
}

function drawSvgImagePoint(point: PointElement, options: PointOptions & PointHoverOptions) {
  const context = getSvgElementContext(point);
  if (!context) {
    return false;
  }

  const group = getOrCreateSvgDatasetPart(context.chart, context.datasetIndex, 'points');
  const element = getOrCreateSvgElementFor(group, point, 'image') as SVGImageElement;
  if (!setSvgImageAttributes(element, options.pointStyle, point.x, point.y, options.rotation)) {
    removeSvgElementFor(point);
    return false;
  }
  element.setAttribute('data-dataset-index', context.datasetIndex.toString());
  return true;
}

export type PointProps = Point

export default class PointElement extends Element<PointProps, PointOptions & PointHoverOptions> {

  static id = 'point';

  parsed: CartesianParsedData;
  skip?: boolean;
  stop?: boolean;

  /**
   * @type {any}
   */
  static defaults = {
    borderWidth: 1,
    hitRadius: 1,
    hoverBorderWidth: 1,
    hoverRadius: 4,
    pointStyle: 'circle',
    radius: 3,
    rotation: 0
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
    this.parsed = undefined;
    this.skip = undefined;
    this.stop = undefined;

    if (cfg) {
      Object.assign(this, cfg);
    }
  }

  inRange(mouseX: number, mouseY: number, useFinalPosition?: boolean) {
    const options = this.options;
    const {x, y} = this.getProps(['x', 'y'], useFinalPosition);
    return ((Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2)) < Math.pow(options.hitRadius + options.radius, 2));
  }

  inXRange(mouseX: number, useFinalPosition?: boolean) {
    return inRange(this, mouseX, 'x', useFinalPosition);
  }

  inYRange(mouseY: number, useFinalPosition?: boolean) {
    return inRange(this, mouseY, 'y', useFinalPosition);
  }

  getCenterPoint(useFinalPosition?: boolean) {
    const {x, y} = this.getProps(['x', 'y'], useFinalPosition);
    return {x, y};
  }

  size(options?: Partial<PointOptions & PointHoverOptions>) {
    options = options || this.options || {};
    let radius = options.radius || 0;
    radius = Math.max(radius, radius && options.hoverRadius || 0);
    const borderWidth = radius && options.borderWidth || 0;
    return (radius + borderWidth) * 2;
  }

  draw(ctx: CanvasRenderingContext2D, area: ChartArea) {
    const options = this.options;
    const svgContext = getSvgElementContext(this);
    const svg = svgContext && svgContext.chart.options.renderer === 'svg';

    if (this.skip || options.radius < 0.1 || !_isPointInArea(this, area, this.size(options) / 2)) {
      if (svg) {
        removeSvgElementFor(this);
      }
      return;
    }

    if (svg) {
      if (!isObjectPointStyle(options.pointStyle) && options.pointStyle !== false) {
        drawSvgPoint(this, options);
        return;
      }
      if (isObjectPointStyle(options.pointStyle) && drawSvgImagePoint(this, options)) {
        return;
      }
      removeSvgElementFor(this);
      return;
    }

    ctx.strokeStyle = options.borderColor;
    ctx.lineWidth = options.borderWidth;
    ctx.fillStyle = options.backgroundColor;
    drawPoint(ctx, options, this.x, this.y);
  }

  getRange() {
    const options = this.options || {};
    // @ts-expect-error Fallbacks should never be hit in practice
    return options.radius + options.hitRadius;
  }
}
