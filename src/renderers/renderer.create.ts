import CanvasRenderer from './canvas/renderer.js';
import SvgRenderer from './svg/renderer.js';
import type {Renderer, RendererCreateOptions} from './renderer.types.js';

/** Creates one of the built-in physical surfaces. Extension registration is not public API. */
export function createRenderer(type: 'canvas' | 'svg', options: RendererCreateOptions): Renderer {
  switch (type) {
    case 'canvas':
      return new CanvasRenderer(options);
    case 'svg':
      return new SvgRenderer(options);
    default:
      throw new Error(`Unknown renderer '${type}'`);
  }
}
