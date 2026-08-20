export function attr(el: Element, name: string, value?: string | number | boolean | null): any {
  if (value === undefined) {
    return el.getAttribute(name);
  }
  if (value === null) {
    el.removeAttribute(name);
  } else {
    el.setAttribute(name, `${value}`);
  }
  return undefined;
}
