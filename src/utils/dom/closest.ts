import {matchFn} from './matches.js';

/**
 * Идти вверх по дереву, пока не встретим элемент, совпадающий с селектором.
 */
export function closest(el: Element | Node | null | undefined, selector: string): Element | null {
  if (el instanceof Element) {
    return el.closest(selector);
  }

  if (el == null) {
    return null;
  }

  let match = el as Element | null;
  while (match) {
    if (matchFn(match)) {
      return match;
    }
    match = match.parentElement;
  }

  return null;
}
