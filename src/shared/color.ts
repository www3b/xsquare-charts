// @ts-nocheck
import {Color} from '@kurkle/color';
import {isCanvasPaint} from '../renderers/paint.js';

export function isPatternOrGradient(value: unknown): value is CanvasPattern | CanvasGradient {
  return isCanvasPaint(value);
}

export function color(value: CanvasGradient): CanvasGradient;
export function color(value: CanvasPattern): CanvasPattern;
export function color(
  value:
  | string
  | { r: number; g: number; b: number; a: number }
  | [number, number, number]
  | [number, number, number, number]
): Color;
export function color(value) {
  return isPatternOrGradient(value) ? value : new Color(value);
}

export function getHoverColor(value: CanvasGradient): CanvasGradient;
export function getHoverColor(value: CanvasPattern): CanvasPattern;
export function getHoverColor(value: string): string;
export function getHoverColor(value) {
  return isPatternOrGradient(value)
    ? value
    : new Color(value).saturate(0.5).darken(0.1).hexString();
}
