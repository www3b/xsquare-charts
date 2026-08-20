import {isUndefined, ensureArray, isArray, isFunction, has} from './lang.js';

/** Матчер: функция-предикат или точное значение (для простых сравнений) */
export type Matcher<T = any> = ((item: T, key: string | number) => boolean) | string | number | T

/** Экстрактор: функция или имя свойства */
export type Extractor<T = any> = ((item: T, key: string | number) => any) | string | number

/**
 * Итерация по коллекции (массив или объект).
 * Возврат не-undefined/не-undefined → остановка.
 */
export function forEach<T = any, R = boolean | void>(
  collection: any,
  iterator: (item: T, key: string | number) => R,
): T | undefined {
  if (isUndefined(collection)) {
    return undefined;
  }

  const convertKey = isArray(collection) ? toNum : identity;
  let val: T;
  let result: R;

  for (const key in collection) {
    if (has(collection, key)) {
      val = collection[key];
      result = iterator(val, convertKey(key));

      if ((result as unknown) === false) {
        return val;
      }
    }
  }
}

export function find<T = any>(collection: any, matcher: Matcher<T>): T | undefined {
  const matchFn = toMatcher(matcher);
  let match: T | undefined;

  forEach<T>(collection, (val, key) => {
    if (matchFn(val, key)) {
      match = val;
      return false;
    }
  });

  return match;
}

export function findIndex<T = any>(
  collection: any,
  matcher: Matcher<T>,
): number | string | undefined {
  const matchFn = toMatcher(matcher);
  let idx: number | string | undefined = isArray(collection) ? -1 : undefined;

  forEach<T>(collection, (val, key) => {
    if (matchFn(val, key)) {
      idx = key;
      return false;
    }
  });

  return idx;
}

export function filter<T = any>(collection: any, matcher: Matcher<T>): T[] {
  const matchFn = toMatcher(matcher);
  const result: T[] = [];

  forEach<T>(collection, (val, key) => {
    if (matchFn(val, key)) {
      result.push(val);
    }
  });

  return result;
}

export function without<T = any>(arr: T[] | undefined, matcher: Matcher<T>): T[] {
  if (isUndefined(arr)) {
    return [];
  }
  ensureArray(arr);

  const matchFn = toMatcher(matcher);

  return (arr as T[]).filter((el, idx) => !matchFn(el, idx));
}

export function reduce<T = any, V = any>(
  collection: any,
  iterator: (result: V, entry: T, index: string | number) => V,
  result: V,
): V {
  forEach<T>(collection, (value, idx) => {
    result = iterator(result, value, idx);
  });

  return result;
}

export function every<T = any>(collection: any, matcher: Matcher<T>): boolean {
  const matchFn = toMatcher(matcher);
  return !!reduce<T, boolean>(collection, (matches, val, key) => matches && matchFn(val, key), true);
}

export function some<T = any>(collection: any, matcher: Matcher<T>): boolean {
  return !!find(collection, matcher);
}

export function map<T = any, U = any>(
  collection: any,
  fn: (item: T, key: string | number) => U,
): U[] {
  const result: U[] = [];

  forEach<T>(collection, (val, key) => {
    result.push(fn(val, key));
  });

  return result;
}

export function keys(collection: any): string[] {
  return (collection && Object.keys(collection)) || [];
}

export function size(collection: any): number {
  return keys(collection).length;
}

export function values<T = any>(collection: any): T[] {
  return map<T>(collection, (val) => val);
}

export function groupBy<T = any>(
  collection: any,
  extractor: Extractor<T>,
  grouped: Record<string, T[]> = {},
): Record<string, T[]> {
  const ex = toExtractor(extractor);

  forEach<T>(collection, (val): void => {
    const discriminator = ex(val, 0) || '_';
    const key = String(discriminator);

    let group = grouped[key];
    if (!group) {
      grouped[key] = [];
      group = grouped[key];
    }
    group.push(val);
  });

  return grouped;
}

export function uniqueBy<T = any>(extractor: Extractor<T>, ...collections: any[]): T[] {
  const ex = toExtractor(extractor);
  const grouped: Record<string, T[]> = {};

  forEach<any>(collections, (collection): void => {
    groupBy(collection, ex, grouped);
  });

  return map<T[], T>(grouped, (group) => group[0]);
}

export const unionBy = uniqueBy;

export function sortBy<T = any>(collection: any, extractor: Extractor<T>): T[] {
  const ex = toExtractor(extractor);
  const sorted: Array<{ d: any; v: T }> = [];

  forEach<T>(collection, (value, key) => {
    const disc = ex(value, key);
    const entry = {d: disc, v: value};

    for (let i = 0; i < sorted.length; i++) {
      if (disc < sorted[i].d) {
        sorted.splice(i, 0, entry);
        return;
      }
    }
    sorted.push(entry);
  });

  return map(sorted, (e) => e.v);
}

/** Матчер по шаблону объекта: find(elements, matchPattern({ id: 1 })) */
export function matchPattern<T extends Record<string, any>>(pattern: T): (el: any) => boolean {
  return (el: any) => every<any>(pattern, (val: any, key: any) => el[key] === val);
}

function toMatcher<T>(matcher: Matcher<T>): (item: any, key?: string | number) => boolean {
  return isFunction(matcher)
    ? (matcher as (item: T, key?: string | number) => boolean)
    : (item: T) => item === matcher;
}

function toExtractor<T>(extractor: Extractor<T>): (item: any, key?: string | number) => any {
  return isFunction(extractor)
    ? (extractor as (item: T, key?: string | number) => any)
    : (item: T) => (item as any)[extractor as any];
}

function identity<T>(arg: T): T {
  return arg;
}

function toNum(arg: string): number {
  return Number(arg);
}
