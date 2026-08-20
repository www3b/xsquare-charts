import {create} from './append.js';

/** Вставить SVG-элемент в начало контейнера (или создать g). */
export function prependTo(
  container: SVGElement | SVGSVGElement,
  el: SVGElement | string,
): SVGElement {
  const node =
    typeof el === 'string' ? create('http://www.w3.org/2000/svg', 'g', {class: el}) : el;
  container.insertBefore(node, container.firstChild);
  return node;
}

/** Вставить SVG-элемент в конец контейнера. */
export function appendTo(
  container: SVGElement | SVGSVGElement,
  el: SVGElement | string,
): SVGElement {
  const node =
    typeof el === 'string' ? create('http://www.w3.org/2000/svg', 'g', {class: el}) : el;
  container.appendChild(node);
  return node;
}
