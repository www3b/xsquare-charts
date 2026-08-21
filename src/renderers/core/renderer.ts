/**
 * Minimal visual-backend contract owned by Chart. Drawing migration deliberately
 * stays outside this boundary: existing elements continue to draw through their
 * current Canvas or SVG paths.
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
  measureText(text: string | number, font: string): number;
  getEventTarget(): HTMLElement | SVGSVGElement;
  destroy(removeRoot?: boolean): void;
}

export interface RendererCreateOptions {
  chart: import('../../core/core.controller.js').default;
  host: HTMLElement;
  canvas?: HTMLCanvasElement | OffscreenCanvas | null;
}

export type RendererFactory = (options: RendererCreateOptions) => Renderer;
