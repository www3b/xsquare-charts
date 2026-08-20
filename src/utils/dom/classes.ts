/** Применить к элементу список классов. */
export function classes(cls: Element): {
  add(...el: string[]): void
  remove(...el: string[]): void
  toggle(cls: string, force?: boolean): void
  has(cls: string): boolean
} {
  if (typeof cls === 'string') {
    cls = createElement(cls);
  }
  return themedElement(cls as Element);
}

function createElement(tag: string): Element {
  return document.createElement(tag);
}

function themedElement(cls: Element) {
  const classList = cls.classList;
  return {
    add(...el: string[]) {
      classList.add(...el);
    },
    remove(...el: string[]) {
      classList.remove(...el);
    },
    toggle(el: string, force?: boolean) {
      classList.toggle(el, force);
    },
    has(el: string) {
      return classList.contains(el);
    },
  };
}
