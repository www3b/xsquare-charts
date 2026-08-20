import {clear} from '../dom/clear.js';
import {parseSvg, serialize} from './util/parse.js';

/** Перерисовать содержимое элемента из SVG-строки. */
export function innerSVG(node: SVGElement, content: string): void {
  const parsed = parseSvg(content);
  if (!parsed) {
    return;
  }
  clear(node);
  const imported = node.ownerDocument.importNode(parsed, true);
  node.appendChild(imported);
}

/** Получить содержимое узла как строку. */
export function asString(node: SVGElement): string {
  return serialize(node);
}
