/**
 * Делегирование событий: одно событие на контейнер, фильтр по селектору.
 */
export interface DelegateOptions {
  stopPropagation?: boolean
}

export function delegate(
  container: HTMLElement,
  selector: string,
  type: string,
  callback: (event: Event, el: Element) => void,
  options?: DelegateOptions,
): () => void {
  const selectors = selector.split(' ').filter(Boolean);
  const all = selectors.length === 0;
  const matcher = (el: Element | undefined | null): Element | null => {
    if (!el) {
      return null;
    }
    if (!el.matches) {
      return null;
    }
    return el.matches(selectors[0]) ? el : null;
  };

  const listener = (event: Event): void => {
    const start = event.target as Element | null;

    if (all) {
      callback(event, start as Element);
      return;
    }

    const target = matcher(start) ?? (start ? closestUntil(start, selectors) : null);

    if (target) {
      if (options?.stopPropagation !== false) {
        event.preventDefault();
      }
      callback(event, target);
    }
  };

  container.addEventListener(type, listener);
  return () => container.removeEventListener(type, listener);
}

function closestUntil(el: Element | null, selectors: string[]): Element | null {
  let node: Element | null = el;
  while (node) {
    for (const sel of selectors) {
      if (node.matches(sel)) {
        return node;
      }
    }
    node = node.parentElement;
  }
  return null;
}
