import {on, once, off} from '../dom/event.js';

/** Делегированные события для SVG (legacy bypass из dom). */
export const svgOn = on;
export const svgOnce = once;
export const svgOff = off;

export function bindAll(target: unknown, fns: Array<string | ((...args: any[]) => any)>): void {
  fns.forEach((fn) => {
    if (typeof fn === 'function') {
      (target as any)[fn.name] = fn.bind(target);
    }
  });
}
