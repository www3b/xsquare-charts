export interface ColorStop { offset: number; color: string; }
export interface LinearGradientPaint { type: 'linear-gradient'; x0: number; y0: number; x1: number; y1: number; colorStops: readonly ColorStop[]; }
export interface RadialGradientPaint { type: 'radial-gradient'; x0: number; y0: number; r0: number; x1: number; y1: number; r1: number; colorStops: readonly ColorStop[]; }
/** SVG-compatible pattern descriptors repeat in both directions. */
export interface PatternPaint { type: 'pattern'; image: HTMLImageElement; repetition?: 'repeat'; }
export type RendererNeutralPaint = LinearGradientPaint | RadialGradientPaint | PatternPaint;
/** Native Canvas paints are accepted by CanvasRenderer only. */
export type Color = string | RendererNeutralPaint | CanvasGradient | CanvasPattern;
