import {attr as svgAttr} from './attr.js';

/** Функция, возвращающая строку SVG transform. */
export type TransformFn = () => string

/** Применить список transform-функций к элементу. */
export function transform(node: SVGElement, transforms: TransformFn | TransformFn[]): void {
  const list = (Array.isArray(transforms) ? transforms : [transforms]).filter(Boolean);
  const value = list.map((fn) => fn()).join(' ');
  svgAttr(node, 'transform', value);
}

export function translate(x: number, y: number): TransformFn {
  return () => `translate(${x}, ${y})`;
}

export function rotate(angle: number, cx?: number, cy?: number): TransformFn {
  return () =>
    cx !== undefined && cy !== undefined ? `rotate(${angle}, ${cx}, ${cy})` : `rotate(${angle})`;
}

export function scale(s: number): TransformFn {
  return () => `scale(${s})`;
}

// ---------------------------------------------------------------------------
// Геометрия — типы и хелперы для фигур на канвасе
// ---------------------------------------------------------------------------

export interface Point {
  x: number
  y: number
}

export interface Dimensions {
  width: number
  height: number
}

export interface Positioned {
  x: number
  y: number
}

export interface Bounds extends Dimensions, Positioned {}

export type Rect = Bounds

export function asPoint(point: Point): [number, number] {
  return [point.x, point.y];
}

export function asBounds(bounds: Bounds): string {
  return `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`;
}

export function cloneBounds(bounds: Bounds): Bounds {
  return {x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height};
}
