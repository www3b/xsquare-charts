import {create} from './append.js';
import {attr as svgAttr} from './attr.js';

/** Полная копия SVG-элемента с атрибутами и стилями. */
export function clone(element: SVGElement): SVGElement {
  const clone = create(element.namespaceURI as string, element.localName, undefined);
  return transferAttributes(element, clone);
}

/** Перенести атрибуты/стили с исходного на новый элемент. */
export function transferAttributes(source: SVGElement, target: SVGElement): SVGElement {
  for (let i = 0; i < source.attributes.length; i++) {
    svgAttr(target, source.attributes[i].name, source.attributes[i].value);
  }
  return target;
}
