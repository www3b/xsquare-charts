/** Замена элемента в родителе на другой. */
export function replace(oldEl: SVGElement, newEl: SVGElement): void {
  const parent = oldEl.parentNode;
  if (parent) {
    parent.replaceChild(newEl, oldEl);
  }
}
