// @ts-nocheck
import type {FillerDrawTime, RadialScaleDrawPart, Renderer, RendererCreateOptions, RenderContext, ScaleDrawPart} from '../renderer.types.js';
import {beginSvgRender, endSvgRender, getOrCreateSvgClipRect, getOrCreateSvgDatasetGroup, removeSvgDatasetPart} from './svg.js';
import {drawSvgLine} from './line.js';
import {drawSvgPoint} from './point.js';
import {drawSvgBar} from './bar.js';
import {drawSvgArc} from './arc.js';
import {drawSvgTitle} from './title.js';
import {drawSvgLegend} from './legend.js';
import {drawSvgScale} from './scale.js';
import {drawSvgRadialScale} from './radial-scale.js';
import {drawSvgFiller, removeSvgFiller} from './filler.js';
import {drawSvgTooltip, hideSvgTooltip, removeSvgTooltip} from './tooltip.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function fallbackTextWidth(text: string | number, font: string): number {
  const size = Number.parseFloat(font) || 12;
  return String(text).length * size * 0.5;
}

export default class SvgRenderer implements Renderer {
  readonly type = 'svg' as const;
  readonly canvas = null;
  readonly context = null;
  readonly root: SVGSVGElement;
  private readonly chart: RendererCreateOptions['chart'];
  private readonly measureNode: SVGTextElement;

  constructor({chart, host}: RendererCreateOptions) {
    this.chart = chart;
    const document = host.ownerDocument;
    this.root = document.createElementNS(SVG_NS, 'svg');
    this.root.setAttribute('data-chart-svg', 'true');
    this.root.setAttribute('role', 'img');
    this.root.style.display = 'block';
    host.appendChild(this.root);
    const defs = document.createElementNS(SVG_NS, 'defs');
    defs.setAttribute('data-svg-defs', 'true');
    this.root.appendChild(defs);
    this.measureNode = document.createElementNS(SVG_NS, 'text');
    this.measureNode.setAttribute('data-svg-measurement', 'true');
    this.measureNode.setAttribute('x', '-10000');
    this.measureNode.setAttribute('y', '-10000');
    this.measureNode.setAttribute('visibility', 'hidden');
    defs.appendChild(this.measureNode);
  }

  initialize(): boolean {
    (this.chart as typeof this.chart & {$chartjsSvgRoot?: SVGSVGElement}).$chartjsSvgRoot = this.root;
    return true;
  }

  resize(width: number, height: number): boolean {
    const viewBox = `0 0 ${width} ${height}`;
    const changed = this.root.getAttribute('width') !== String(width)
      || this.root.getAttribute('height') !== String(height)
      || this.root.getAttribute('viewBox') !== viewBox;
    if (changed) {
      this.root.setAttribute('width', String(width));
      this.root.setAttribute('height', String(height));
      this.root.setAttribute('viewBox', viewBox);
    }
    return changed;
  }

  clear(): void {
    removeSvgTooltip(this.chart);
    for (const child of Array.from(this.root.children)) {
      if (child.getAttribute('data-svg-layer')) {
        child.remove();
      }
    }
    const defs = this.root.children[0];
    if (defs && defs.getAttribute('data-svg-defs') === 'true') {
      for (const child of Array.from(defs.children)) {
        if (child.getAttribute('data-svg-clip') === 'true' || child.getAttribute('data-svg-paint') === 'true') {
          child.remove();
        }
      }
    }
  }

  beginFrame(): void {
    beginSvgRender(this.chart);
  }

  endFrame(): void {
    endSvgRender(this.chart);
  }

  drawElement(element: any, context: RenderContext = {}): void {
    const handler = svgElementHandlers[element.constructor.id];
    if (handler) {
      handler(this.chart, element, context);
    }
  }

  drawTitle(title: any): void {
    drawSvgTitle(this.chart, title);
  }

  drawTooltip(tooltip: any): void {
    drawSvgTooltip(tooltip);
  }

  hideTooltip(): void {
    hideSvgTooltip(this.chart);
  }

  drawLegend(legend: any): void {
    drawSvgLegend(this.chart, legend);
  }

  drawScale(scale: any, part: ScaleDrawPart, chartArea?: any): void {
    drawSvgScale(this.chart, scale, part, chartArea);
  }

  drawRadialScale(scale: any, part: RadialScaleDrawPart): void {
    drawSvgRadialScale(this.chart, scale, part);
  }

  drawFiller(models: any[], drawTime: FillerDrawTime): void {
    drawSvgFiller(this.chart, models, drawTime);
  }

  removeFiller(source: any): void {
    removeSvgFiller(this.chart, source);
  }

  removeDatasetPart(index: number, part: string): void {
    removeSvgDatasetPart(this.chart, index, part);
  }

  beginDataset(index: number, clip: any): void {
    const group = getOrCreateSvgDatasetGroup(this.chart, index);
    group.setAttribute('clip-path', clip ? getOrCreateSvgClipRect(this.chart, `dataset-${index}`, clip) : 'none');
  }

  endDataset(_clip: any): void {
    return;
  }

  measureText(text: string | number, font: string): number {
    this.measureNode.setAttribute('font', font);
    this.measureNode.textContent = String(text);
    if (typeof this.measureNode.getComputedTextLength === 'function') {
      const width = this.measureNode.getComputedTextLength();
      if (Number.isFinite(width) && width >= 0) {
        return width;
      }
    }
    if (typeof this.measureNode.getBBox === 'function') {
      const width = this.measureNode.getBBox().width;
      if (Number.isFinite(width) && width >= 0) {
        return width;
      }
    }
    return fallbackTextWidth(text, font);
  }

  getEventTarget(): SVGSVGElement {
    return this.root;
  }

  destroy(): void {
    removeSvgTooltip(this.chart);
    this.root.remove();
    const chart = this.chart as typeof this.chart & {$chartjsSvgRoot?: SVGSVGElement};
    if (chart.$chartjsSvgRoot === this.root) {
      delete chart.$chartjsSvgRoot;
    }
  }
}

const svgElementHandlers: Record<string, (chart: RendererCreateOptions['chart'], element: any, context: RenderContext) => void> = {
  line: drawSvgLine,
  point: drawSvgPoint,
  bar: drawSvgBar,
  arc: drawSvgArc,
};
