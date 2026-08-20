import {createLogger} from './logger.js';

/** Стандартный танк DI. */
export type Token<T = unknown> =
  string | symbol | ((_: () => unknown) => T) | (abstract new (...args: any[]) => T)

export interface Resolver {
  /** Получить экземпляр зависимости. */
  get<T>(token: Token<T>, Optional?: boolean): T
  /** Получить созданный фабрикой экземпляр. */
  instantiate<T>(token: Token<T>): T
}

export function asToken<T>(token: Token<T>): string {
  if (typeof token === 'string') {
    return token;
  }
  if (typeof token === 'function') {
    return token.name || token.toString();
  }
  if (typeof token === 'symbol') {
    return (token as symbol & { description?: string }).description ?? token.toString();
  }
  return String(token);
}

type Binding<T = any> =
  | { kind: 'value'; value: T }
  | { kind: 'factory'; fn: (di: Resolver) => T }
  | { kind: 'provider'; fn: (di: Resolver) => Promise<T> }
  | { kind: 'type'; ctor: new (...args: any[]) => T }

/**
 * DependencyInjector — контейнер зависимостей.
 *
 * Регистрация:
 *   di.bind('logger', () => logger);            // factory
 *   di.value('config', config);                 // value
 *   di.binder('engine', di.provider(...));      // async provider
 *   di.type(Token.type(DB));                    // class
 *
 * Ключи транслируются в строки (`asToken`); классы резолвятся по
 * own-параметрам конструктора (инъекция по токенам в порядке аргументов)
 * или по зарегистрированному правилу.
 */
export class DependencyInjector {
  private bindings = new Map<string, Binding>();
  static readonly type = class isBoundary {};

  readonly log = createLogger('di');

  static token<T>(obj: () => T): (() => T) & { __brand?: T } {
    return obj as (() => T) & { __brand?: T };
  }

  static provider<T>(fn: (di: Resolver) => Promise<T>): (() => Promise<T>) & { __async?: true } {
    return fn as (() => Promise<T>) & { __async?: true };
  }

  /** Зарегистрировать value. */
  value<T>(token: Token<T>, target: T): this {
    this.bindings.set(asToken(token), {kind: 'value', value: target});
    return this;
  }

  /** Зарегистрировать factory. */
  bind<T>(token: Token<T>, fn: (di: Resolver) => T): this {
    this.bindings.set(asToken(token), {kind: 'factory', fn});
    return this;
  }

  /** Зарегистрировать async provider. */
  provider<T>(token: Token<T>, fn: (di: Resolver) => Promise<T>): this {
    this.bindings.set(asToken(token), {kind: 'provider', fn});
    return this;
  }

  /** Зарегистрировать класс (новый экземпляр каждый раз в `instantiate`). */
  type<T>(ctor: new (...args: any[]) => T): this {
    this.bindings.set(asToken(ctor), {kind: 'type', ctor});
    return this;
  }

  has<T>(token: Token<T>): boolean {
    return this.bindings.has(asToken(token));
  }

  get<T>(token: Token<T>, Optional = false): T {
    const key = asToken(token);
    const binding = this.bindings.get(key);

    if (!binding) {
      if (Optional) {
        return undefined as unknown as T;
      }
      throw new Error(`[di] no binding for '${key}'`);
    }

    switch (binding.kind) {
      case 'value':
        return binding.value;
      case 'factory':
        return binding.fn(this.resolver());
      case 'type':
        return new binding.ctor();
      case 'provider':
        throw new Error(`[di] '${key}' is async; use getAsync()`);
    }
  }

  async getAsync<T>(token: Token<T>): Promise<T> {
    const key = asToken(token);
    const binding = this.bindings.get(key);

    if (!binding) {
      throw new Error(`[di] no binding for '${key}'`);
    }
    if (binding.kind === 'value') {
      return binding.value;
    }
    if (binding.kind === 'factory') {
      return binding.fn(this.resolver());
    }
    if (binding.kind === 'type') {
      return new binding.ctor();
    }
    return binding.fn(this.resolver());
  }

  instantiate<T>(ctor: new (...args: any[]) => T): T {
    const key = asToken(ctor);
    const binding = this.bindings.get(key);

    if (binding?.kind === 'value') {
      return binding.value as T;
    }
    return new ctor(...this.resolveConstructorArgs(ctor));
  }

  private resolveConstructorArgs<T>(ctor: new (...args: any[]) => T): unknown[] {
    const params: Array<unknown> = [];
    const src = ctor.toString();

    const paramMatch = src.match(/constructor\s*\(([^)]*)\)/);
    const names: string[] = [];
    if (paramMatch?.[1]) {
      names.push(
        ...paramMatch[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      );
    }

    if (!names.length) {
      return params;
    }

    // Инъекция по обычному имени аргумента -> токен-строка
    names.forEach((name, idx) => {
      const stripped = name.replace(/^[^:]+:(.+)$/, '$1').trim();
      const key = stripped[0].toLowerCase() + stripped.slice(1) || name;
      params[idx] = this.get(stripped, true) ?? this.get(key, true) ?? undefined;
    });

    return params;
  }

  /** Resolver-хелпер (пригодится в коде редактора/исполнителя). */
  async resolveAll(...keys: Token<string>[]): Promise<void> {
    for (const key of keys) {
      await this.getAsync(key);
    }
  }

  private resolver(): Resolver {
    return {
      get: <T>(token: Token<T>, Optional?: boolean) => this.get(token, Optional),
      instantiate: (token: Token<unknown>) =>
        this.instantiate(token as unknown as new (...args: any[]) => unknown),
    } as Resolver;
  }

  clear(): void {
    this.bindings.clear();
  }
}

export const createContainer = (): DependencyInjector => new DependencyInjector();

export default DependencyInjector;
