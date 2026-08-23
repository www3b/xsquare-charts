import RendererRegistry from './core/renderer.registry.js';
import CanvasRenderer from './canvas/renderer.canvas.js';
import SvgRenderer from './svg/renderer.svg.js';

const renderers = new RendererRegistry();
renderers.register('canvas', options => new CanvasRenderer(options));
renderers.register('svg', options => new SvgRenderer(options));

export default renderers;
export type {RadialScaleDrawPart, Renderer, RendererCreateOptions, RendererFactory, ScaleDrawPart} from './core/renderer.js';
