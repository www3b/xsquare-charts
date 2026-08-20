import {forEach} from '../dash/collection.js';
import {attr as domAttr} from '../dom/attr.js';

export const svgAttr = domAttr;

/** Применить группу атрибутов к SVG-элементу. */
export function attr(
  node: Element,
  name: string | Record<string, string | number | boolean | null>,
  value?: string | number | boolean | null,
): any {
  if (typeof name === 'object') {
    forEach(name, (v: any, k: any) => attr(node, k, v));
    return;
  }

  domAttr(node, name, value);
}

/** Найти элемент внутри канваса по селектору. */
export function query(...args: [ParentNode, string] | [string]): Element | null {
  const node = args.length === 2 ? args[0] : document;
  const selector = args.length === 2 ? args[1] : (args[0] as string);
  return node.querySelector(selector);
}
