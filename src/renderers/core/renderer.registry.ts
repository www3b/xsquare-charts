import type {Renderer, RendererCreateOptions, RendererFactory} from './renderer.js';

/** Small explicit factory registry; no service locator or reflection involved. */
export default class RendererRegistry {
  private readonly factories = new Map<'canvas' | 'svg', RendererFactory>();

  register(type: 'canvas' | 'svg', factory: RendererFactory): void {
    this.factories.set(type, factory);
  }

  unregister(type: 'canvas' | 'svg'): void {
    this.factories.delete(type);
  }

  get(type: 'canvas' | 'svg'): RendererFactory | undefined {
    return this.factories.get(type);
  }

  clone(): RendererRegistry {
    const registry = new RendererRegistry();
    for (const [type, factory] of this.factories) {
      registry.register(type, factory);
    }
    return registry;
  }

  create(type: 'canvas' | 'svg', options: RendererCreateOptions): Renderer {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`Unknown renderer '${type}'`);
    }
    return factory(options);
  }
}
