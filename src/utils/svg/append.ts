import {attr as svgAttr} from './attr.js';

export type SvgDocumentReference = Document | Node | null | undefined

/** Вставить svg элемент в родителя (append в конец). */
export function append(parent: Node, child: Node): void {
  parent.appendChild(child);
}

/** Вставить svg элемент в родителя (prepend в начало). */
export function prepend(parent: Node, child: Node): void {
  parent.insertBefore(child, parent.firstChild);
}

function getOwnerDocument(reference: SvgDocumentReference): Document | undefined {
  if (!reference) {
    return undefined;
  }
  if (reference.nodeType === 9) {
    return reference as Document;
  }
  return reference.ownerDocument || undefined;
}

function globalDocument(): Document | undefined {
  return typeof document === 'undefined' ? undefined : document;
}

/** Создать дочерний SVG-элемент с атрибутами. */
export function create(
  ns: string,
  name: string,
  attrs?: Record<string, string | number | boolean | null>,
  parent?: Node,
  owner?: SvgDocumentReference,
): SVGElement {
  const document = getOwnerDocument(owner) || getOwnerDocument(parent) || globalDocument();
  if (!document) {
    throw new Error('An ownerDocument is required to create an SVG element');
  }
  const node = document.createElementNS(ns, name) as unknown as SVGElement;
  if (attrs) {
    svgAttr(node, attrs);
  }
  if (parent) {
    append(parent, node);
  }
  return node;
}

/** Извлечь содержимое дочернего контейнера с сохранением иерархии. */
export function toFront(el: SVGElement): void {
  if (el.parentNode) {
    (el.parentNode as SVGElement).appendChild(el);
  }
}
