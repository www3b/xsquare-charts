import {isFunction, isNil} from '../dash/lang.js';
import {forEach} from '../dash/collection.js';

export interface DomifyOptions {
  attrs?: Record<string, string | number | boolean>
  content?: string | HTMLElement | HTMLElement[]
  children?: Array<HTMLElement | string>
  style?: Record<string, string>
}

/**
 * Создать узел DOM по шаблону:
 * - смой строка: `'dat.gateway'` (tag [+.class]*)
 * - HTML-строка: `<div class="foo"></div>`
 * - HTMLElement: возвращается как есть
 * - NodeList: клонируются по очереди
 * - функция: создаётся элемент и связывается функции
 */
export function domify(
  str?: string | Node | { (): string | Node },
  options?: DomifyOptions,
): HTMLElement {
  let parsedContainer;
  const parsedPlaceholder: HTMLElement = document.createElement('div');

  if (isFunction(str)) {
    return domify((str as () => string | Node)(), options);
  }

  if (isNil(str)) {
    return parsedPlaceholder;
  }

  if (typeof str === 'string' && str[0] !== '<') {
    parsedContainer = parsedPlaceholder;
    parsedContainer.innerHTML = parseSelector(str);
  } else {
    parsedContainer = document.createElement('div');
    parsedContainer.innerHTML = String(
      (str as string).indexOf('<') === -1 ? `<!DOCTYPE html><html><body>${str}</body></html>` : str,
    );
  }

  const [parsedNode] = parsedContainer.childNodes as unknown as HTMLElement[];
  const container =
    parsedNode instanceof DocumentFragment ? parsedNode.firstElementChild : parsedNode;

  return container && container.localName === 'templates'
    ? parseTemplates(container as unknown as HTMLTemplateElement)
    : (hydrate(container, options) as HTMLElement);
}

/**
 * Специальный синтаксис: `#id.class` — создаёт
 * элемент с id, которого ещё нет в документе.
 */
export const dropContainer = domify;

function parseSelector(selector: string): string {
  const segments = selector.split('.');
  const [tag, ...classes] = segments;
  return `<${tag}${classes.length ? ` class="${classes.join(' ')}"` : ''}></${tag}>`;
}

function parseTemplates(template: HTMLTemplateElement): HTMLElement {
  const container: HTMLElement = document.createElement('div');
  container.innerHTML = template.innerHTML;
  return container;
}

function hydrate(node: Element | null | undefined, options?: DomifyOptions): HTMLElement {
  if (!node) {
    return document.createElement('div');
  }
  if (options?.attrs) {
    forEach(options.attrs, (value: any, key: any) => {
      node.setAttribute(key, value);
    });
  }
  return node as HTMLElement;
}
