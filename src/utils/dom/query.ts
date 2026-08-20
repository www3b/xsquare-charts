import {matchFn} from './matches.js';

export function queryAll(selector: string, context?: ParentNode): Element[] {
  return Array.prototype.slice.call(
    (context || document.body).querySelectorAll(selector),
  ) as Element[];
}

export function query(selector: string, context?: ParentNode): Element | null {
  return (context || document.body).querySelector(selector);
}

/** Ближайший предок/сам элемент по предикату. */
export function queryParentByPredicate(
  el: Element,
  predicate: (el: Element) => boolean,
): Element | null {
  let parent = el;
  while (matchFn(parent)) {
    if (predicate(parent)) {
      return parent;
    }
    parent = parent.parentElement ?? (document.body as Element);
    if (parent === document.body) {
      parent = document.documentElement;
      if (predicate(parent)) {
        return parent;
      }
      return null;
    }
  }
  return null;
}
