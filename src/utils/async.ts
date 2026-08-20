/**
 * async — маленькие помощники промисов.
 */

export type DeferredState = 'pending' | 'resolved' | 'rejected'

/** Deferred — промис с внешним управлением resolve/reject. */
export class Deferred<T = void> {
  readonly promise: Promise<T>;
  private _resolve!: (value: T | PromiseLike<T>) => void;
  private _reject!: (reason?: unknown) => void;
  private _state: DeferredState = 'pending';

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  get state(): DeferredState {
    return this._state;
  }

  get isPending(): boolean {
    return this._state === 'pending';
  }

  get isSettled(): boolean {
    return this._state !== 'pending';
  }

  resolve(value: T): void {
    if (this.isSettled) {
      return;
    }
    this._state = 'resolved';
    this._resolve(value);
  }

  reject(reason?: unknown): void {
    if (this.isSettled) {
      return;
    }
    this._state = 'rejected';
    this._reject(reason);
  }
}

/** Создать уже-resolved промис (типизированный). */
export function resolve<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

/** Создать rejected промис. */
export function reject(reason?: unknown): Promise<never> {
  return Promise.reject(reason);
}

/** Wait: сон на ms (с таймаутом можно прервать). */
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    function abort() {
      clearTimeout(timer);
      reject(new DOMException('aborted', 'AbortError'));
    }
    signal?.addEventListener('abort', abort, {once: true});
  });
}

/** Gate: ожидание условия с интервалом опроса. */
export function gate(
  predicate: () => boolean,
  options?: { timeout?: number; interval?: number },
): Promise<void> {
  const {timeout = 5000, interval = 10} = options ?? {};
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - start > timeout) {
        reject(new Error(`[gate] timeout after ${timeout}ms`));
        return;
      }
      setTimeout(tick, interval);
    };
    tick();
  });
}

/** Параллельный map с ограничением конкурентности. */
export async function pMap<T, U>(
  items: T[],
  mapper: (item: T, index: number) => Promise<U> | U,
  concurrency = items.length,
): Promise<U[]> {
  const results: U[] = new Array(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await mapper(items[idx], idx);
    }
  }

  const workers = Array.from({length: Math.min(concurrency, items.length)}, () => worker());
  await Promise.all(workers);
  return results;
}

/** Пустая async fn — заглушка. */
export const noop = async(): Promise<void> => {};

export default Deferred;
