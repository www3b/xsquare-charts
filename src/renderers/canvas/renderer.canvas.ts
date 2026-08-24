import type {FillerDrawTime, RadialScaleDrawPart, Renderer, RendererCreateOptions, RenderContext, ScaleDrawPart} from '../core/renderer.js';
import {clipArea, unclipArea} from '../../helpers/helpers.canvas.js';
import {drawCanvasLine} from './elements/line.js';
import {drawCanvasPoint} from './elements/point.js';
import {drawCanvasBar} from './elements/bar.js';
import {drawCanvasArc} from './elements/arc.js';
import {drawCanvasTitle} from './title.js';
import {drawCanvasLegend} from './legend.js';
import {drawCanvasScale} from './scale.js';
import {drawCanvasRadialScale} from './radialScale.js';
import {drawCanvasFiller, removeCanvasFiller} from './filler.js';
import {drawCanvasTooltip} from './tooltip.js';
import {resetCanvasPaintCache} from '../../helpers/helpers.paint.js';

const EXPANDO_KEY = '$chartjs';

function initCanvas(canvas: HTMLCanvasElement, aspectRatio?: number): void {
  const style = canvas.style;
  const renderHeight = canvas.getAttribute('height');
  const renderWidth = canvas.getAttribute('width');
  canvas[EXPANDO_KEY] = {
    initial: {
      height: renderHeight,
      width: renderWidth,
      style: {display: style.display, height: style.height, width: style.width}
    }
  };
  style.display = style.display || 'block';
  style.boxSizing = style.boxSizing || 'border-box';
  if (renderWidth === null || renderWidth === '') {
    const width = Number.parseFloat(canvas.style.width);
    if (Number.isFinite(width)) {
      canvas.width = width;
    }
  }
  if (renderHeight === null || renderHeight === '') {
    const height = Number.parseFloat(canvas.style.height);
    if (Number.isFinite(height)) {
      canvas.height = height;
    } else if (canvas.height === 150 && canvas.width) {
      canvas.height = canvas.width / (aspectRatio || 2);
    }
  }
}

export default class CanvasRenderer implements Renderer {
  readonly type = 'canvas' as const;
  readonly root: HTMLCanvasElement;
  readonly canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D | null = null;
  private readonly created: boolean;

  constructor({host, canvas}: RendererCreateOptions) {
    const supplied = canvas && typeof canvas.getContext === 'function' ? canvas as HTMLCanvasElement : null;
    this.created = !supplied;
    this.canvas = supplied || host.ownerDocument.createElement('canvas');
    this.root = this.canvas;
    if (!this.canvas.parentNode) {
      host.appendChild(this.canvas);
    }
  }

  initialize(aspectRatio?: number): boolean {
    initCanvas(this.canvas, aspectRatio);
    // CanvasRenderer is intentionally the only production owner of 2D context acquisition.
    const context = this.canvas.getContext('2d');
    this.context = context && context.canvas === this.canvas ? context : null;
    return !!this.context;
  }

  resize(width: number, height: number, devicePixelRatio: number): boolean {
    const ratio = devicePixelRatio || 1;
    const canvasWidth = Math.floor(width * ratio);
    const canvasHeight = Math.floor(height * ratio);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    if (this.canvas.width === canvasWidth && this.canvas.height === canvasHeight) {
      return false;
    }
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    if (this.context) {
      this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    return true;
  }

  clear(): void {
    const context = this.context;
    if (context) {
      context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  beginFrame(): void {
    resetCanvasPaintCache();
    return;
  }
  endFrame(): void {
    return;
  }

  drawElement(element: any, context: RenderContext = {}): void {
    const ctx = this.context;
    if (!ctx) {
      return;
    }
    const handler = canvasElementHandlers[element.constructor.id];
    if (handler) {
      handler(ctx, element, context);
    }
  }

  drawTitle(title: any): void {
    if (this.context) drawCanvasTitle(this.context, title);
  }

  drawTooltip(tooltip: any): boolean {
    return this.context ? drawCanvasTooltip(this.context, tooltip) : false;
  }

  hideTooltip(): void {
    return;
  }

  drawLegend(legend: any): void {
    if (this.context) drawCanvasLegend(this.context, legend);
  }

  drawScale(scale: any, part: ScaleDrawPart, chartArea?: any): void {
    if (this.context) drawCanvasScale(this.context, scale, part, chartArea);
  }

  drawRadialScale(scale: any, part: RadialScaleDrawPart): void {
    if (this.context) drawCanvasRadialScale(this.context, scale, part);
  }

  drawFiller(models: any[], drawTime: FillerDrawTime): void {
    if (this.context) drawCanvasFiller(this.context, models, drawTime);
  }

  removeFiller(source: any): void {
    removeCanvasFiller(source);
  }

  removeDatasetPart(_index: number, _part: string): void {
    return;
  }

  beginDataset(_index: number, clip: any): void {
    if (clip && this.context) {
      clipArea(this.context, clip);
    }
  }

  endDataset(clip: any): void {
    if (clip && this.context) {
      unclipArea(this.context);
    }
  }

  measureText(text: string | number, font: string): number {
    const context = this.context;
    if (!context) {
      return 0;
    }
    context.save();
    context.font = font;
    const width = context.measureText(String(text)).width;
    context.restore();
    return width;
  }

  getEventTarget(): HTMLCanvasElement {
    return this.canvas;
  }

  destroy(removeRoot = false): void {
    const state = this.canvas[EXPANDO_KEY];
    const initial = state && state.initial;
    if (initial) {
      for (const prop of ['height', 'width']) {
        const value = initial[prop];
        if (value === null || value === undefined) {
          if (typeof this.canvas.removeAttribute === 'function') {
            this.canvas.removeAttribute(prop);
          }
        } else if (typeof this.canvas.setAttribute === 'function') {
          this.canvas.setAttribute(prop, value);
        }
      }
      Object.assign(this.canvas.style, initial.style);
      delete this.canvas[EXPANDO_KEY];
    }
    this.context = null;
    if (removeRoot || this.created) {
      this.canvas.remove();
    }
  }
}

const canvasElementHandlers: Record<string, (ctx: CanvasRenderingContext2D, element: any, context: RenderContext) => void> = {
  line: drawCanvasLine,
  point: drawCanvasPoint,
  bar: drawCanvasBar,
  arc: drawCanvasArc,
};
