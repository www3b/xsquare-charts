export type ScaleDrawPart = 'background' | 'grid' | 'border' | 'labels' | 'title';

/**
 * Visual-backend contract owned by Chart. Elements provide resolved geometry and
 * state; the renderer owns every backend-specific drawing operation.
 */
export interface Renderer {
  readonly type: 'canvas' | 'svg';
  readonly root: HTMLElement | SVGSVGElement;
  readonly canvas: HTMLCanvasElement | null;
  readonly context: CanvasRenderingContext2D | null;
  initialize(aspectRatio?: number): boolean;
  resize(width: number, height: number, devicePixelRatio: number): boolean;
  clear(): void;
  beginFrame(): void;
  endFrame(): void;
  drawElement(element: any, context?: RenderContext): void;
  drawLegend(legend: any): void;
  drawScale(scale: any, part: ScaleDrawPart, chartArea?: any): void;
  drawTitle(title: any): void;
  beginDataset(index: number, clip: any): void;
  endDataset(clip: any): void;
  measureText(text: string | number, font: string): number;
  getEventTarget(): HTMLElement | SVGSVGElement;
  destroy(removeRoot?: boolean): void;
}

export interface RenderContext {
  area?: any;
  datasetIndex?: number;
  dataIndex?: number;
  start?: number;
  count?: number;
}

export interface RendererCreateOptions {
  chart: import('../../core/core.controller.js').default;
  host: HTMLElement;
  canvas?: HTMLCanvasElement | OffscreenCanvas | null;
}

export type RendererFactory = (options: RendererCreateOptions) => Renderer;
