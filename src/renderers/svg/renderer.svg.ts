import type {Renderer, RendererCreateOptions} from '../core/renderer.js';
import {beginSvgRender, endSvgRender} from '../../helpers/helpers.svg.js';

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

  constructor({chart, host, canvas}: RendererCreateOptions) {
    this.chart = chart;
    const seed = canvas as HTMLCanvasElement | null;
    if (seed && seed.parentNode) {
      seed.remove();
    }
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
    this.root.setAttribute('width', String(width));
    this.root.setAttribute('height', String(height));
    this.root.setAttribute('viewBox', `0 0 ${width} ${height}`);
    return true;
  }

  clear(): void {
    return;
  }

  beginFrame(): void {
    beginSvgRender(this.chart);
  }

  endFrame(): void {
    endSvgRender(this.chart);
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
    this.root.remove();
    const chart = this.chart as typeof this.chart & {$chartjsSvgRoot?: SVGSVGElement};
    if (chart.$chartjsSvgRoot === this.root) {
      delete chart.$chartjsSvgRoot;
    }
  }
}
