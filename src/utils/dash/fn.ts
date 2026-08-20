/**
 * Debounce / throttle / bind.
 * Lodash-style: у debounce есть `flush` и `cancel`.
 */

export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void
  flush(): void
  cancel(): void
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  timeout: number,
): DebouncedFunction<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastCall: [unknown, Parameters<T>] | undefined;
  let lastNow: number | undefined;

  function schedule(ms: number): void {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => fire(), ms);
  }

  function fire(force?: boolean): void {
    const now = Date.now();
    const diff = force ? 0 : (lastNow ?? 0) + timeout - now;

    if (diff > 0) {
      schedule(diff);
      return;
    }

    if (lastCall) {
      const [that, args] = lastCall;
      fn.apply(that, args);
    }

    clear();
  }

  function clear(): void {
    if (timer) {
      clearTimeout(timer);
    }
    timer = undefined;
    lastNow = undefined;
    lastCall = undefined;
  }

  function flush(): void {
    if (timer) {
      fire(true);
    }
    clear();
  }

  const callback = function(this: unknown, ...args: Parameters<T>): void {
    lastNow = Date.now();
    lastCall = [this, args];

    if (!timer) {
      schedule(timeout);
    }
  } as unknown as DebouncedFunction<T>;

  callback.flush = flush;
  callback.cancel = clear;

  return callback;
}

/** Throttle: не чаще одного вызова в интервал. */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  interval: number,
): (...args: Parameters<T>) => void {
  let throttling = false;

  return function(this: unknown, ...args: Parameters<T>): void {
    if (throttling) {
      return;
    }
    fn.apply(this, args);
    throttling = true;
    setTimeout(() => {
      throttling = false;
    }, interval);
  };
}

/** Bind function against target <this>. */
export function bind<T extends (...args: any[]) => any>(fn: T, target: object): T {
  return fn.bind(target) as T;
}
