export function matches(element: Element, selector: string): boolean {
  return element.matches(selector);
}

/** Компиляция селектора в функцию-предикат. */
export function compileMatcher(selector: string): (el: Element) => boolean {
  return function matcher(node: Element) {
    return matches(node, selector);
  };
}

export function matchFn(el: Element): boolean {
  return !!(el as Element).matches;
}
