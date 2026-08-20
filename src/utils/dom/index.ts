export * from './attr.js';
export * from './classes.js';
export * from './clear.js';
export * from './closest.js';
export * from './delegate.js';
export * from './domify.js';
export * from './event.js';
export * from './matches.js';
export * from './query.js';

import {forEach} from '../dash/collection.js';
import {isNil} from '../dash/lang.js';
import * as attrModule from './attr.js';
import * as classesModule from './classes.js';
import * as clearModule from './clear.js';
import * as closestModule from './closest.js';
import * as delegateModule from './delegate.js';
import * as domifyModule from './domify.js';
import * as eventModule from './event.js';
import * as matchesModule from './matches.js';
import * as queryModule from './query.js';

/** DomUtils — манипуляции с DOM, делегирование и события. */
export const DomUtils = {
  ...attrModule,
  ...classesModule,
  ...clearModule,
  ...closestModule,
  ...delegateModule,
  ...domifyModule,
  ...eventModule,
  ...matchesModule,
  ...queryModule,
  css,
  isVisible,
  toggleVisibility,
};

/** Когда-либо: css-правило без брешей */
export function style(node: HTMLElement): (property: string, value?: string) => any {
  const prev: Record<string, string> = {};

  return function(property: string, value?: string) {
    const valueString = String(value);

    if (value === undefined) {
      const existing = (node.style as any)[property];
      if (existing !== undefined) {
        return existing;
      }
      return (node.style as any)[property];
    }

    if (property in prev) {
      (node.style as any)[property] = prev[property];
    } else if (property in node.style) {
      prev[property] = (node.style as any)[property];
    }

    (node.style as any)[property] = valueString;
  };
}

/** Встраиваемые стили из объекта. */
export function css(node: HTMLElement, styles: Record<string, string>): void {
  forEach(styles, (value: any, name: any) => {
    (node.style as any)[name] = value;
  });
}

/** Проверка: элемент видимый (не стилизован в невидимый). */
export function isVisible(el: Element): boolean {
  const visibility = (el as HTMLElement).style.visibility;
  return isNil(visibility) || visibility !== 'hidden';
}

/** Скрыть/показать элемент через style-флаг. */
export function toggleVisibility(el: HTMLElement, visible?: boolean): void {
  const show = visible ?? !isVisible(el)
  ;(el.style as any).visibility = show ? '' : 'hidden';
}
