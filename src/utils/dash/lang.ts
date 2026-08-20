const nativeToString = Object.prototype.toString;
const nativeHasOwnProperty = Object.prototype.hasOwnProperty;

export function isUndefined(obj: unknown): obj is undefined {
  return obj === undefined;
}

export function isDefined<T>(obj: T): obj is Exclude<T, undefined> {
  return obj !== undefined;
}

export function isNil(obj: unknown): obj is null | undefined {
  return obj == null;
}

export function isArray(obj: unknown): obj is unknown[] {
  return nativeToString.call(obj) === '[object Array]';
}

export function isObject(obj: unknown): obj is Record<string, unknown> {
  return nativeToString.call(obj) === '[object Object]';
}

export function isPlainObject(obj: unknown): obj is Record<string, unknown> {
  return isObject(obj);
}

export function isNumber(obj: unknown): obj is number {
  return nativeToString.call(obj) === '[object Number]';
}

export function isFunction(obj: unknown): obj is (...args: never[]) => unknown {
  const tag = nativeToString.call(obj);
  return (
    tag === '[object Function]' ||
    tag === '[object AsyncFunction]' ||
    tag === '[object GeneratorFunction]' ||
    tag === '[object AsyncGeneratorFunction]' ||
    tag === '[object Proxy]'
  );
}

export function isString(obj: unknown): obj is string {
  return nativeToString.call(obj) === '[object String]';
}

export function isBoolean(obj: unknown): obj is boolean {
  return nativeToString.call(obj) === '[object Boolean]';
}

/** Гарантированно массив: иначе бросок */
export function ensureArray(obj: unknown): asserts obj is unknown[] {
  if (isArray(obj)) {
    return;
  }
  throw new Error('must supply array');
}

/** true, если target владеет собственным свойством key */
export function has(target: unknown, key: string): boolean {
  return !isNil(target) && nativeHasOwnProperty.call(target, key);
}
