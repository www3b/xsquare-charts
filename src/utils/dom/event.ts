import {isFunction} from '../dash/lang.js';
import {findIndex} from '../dash/collection.js';

interface EventEntry {
  target: unknown
  fn: (...args: any[]) => any
  listener: (...args: any[]) => any
}

type ListenerTarget = {
  addEventListener: (event: string, listener: (...args: any[]) => any, useCapture?: boolean) => void
  removeEventListener: (event: string, listener: (...args: any[]) => any) => void
}

const map: Record<string, EventEntry[]> = {};

/** Добавить функцию как обработчик события на объект/элемент. */
export function on(target: ListenerTarget, event: string, fn: (...args: any[]) => any): void {
  const listener = (...args: any[]) => fn(...args);
  target.addEventListener(event, listener)
  ;(map[event] || (map[event] = [])).push({target, fn, listener});
}

export function once(
  target: ListenerTarget,
  event: string,
  fn: (...args: any[]) => any,
  useCapture = false,
): void {
  function handler(this: unknown, ...args: any[]) {
    off(target, event, handler);
    fn.apply(this, args);
  }
  on(target, event, handler);
  if (useCapture) {
    (target as any).addEventListener(event, fn, true);
  }
}

export function off(target: ListenerTarget, event: string, fn: (...args: any[]) => any): void {
  const registry = map[event] || [];
  const idx = findIndex<EventEntry>(registry, (e) => e.target === target && e.fn === fn);

  if (idx !== -1) {
    const entry = registry[idx as number];
    target.removeEventListener(event, entry.listener);
    registry.splice(idx as number, 1);
  }
}

export function bindAll(
  target: Record<string, unknown>,
  fns: Array<string | ((...args: any[]) => any)>,
): void {
  fns.forEach((fn) => {
    if (isFunction(fn)) {
      target[(fn as Function).name] = (fn as (...args: any[]) => any).bind(target);
    }
  });
}
