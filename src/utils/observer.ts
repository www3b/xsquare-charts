import {forEach} from './dash/collection.js';

/**
 * Observer — паттерн Observer (наблюдатель).
 *
 * Subject: состояние + уведомление подписчиков при изменении.
 * Отличается от EventBus тем, что хранит *состояние* и рассылает его,
 * а не просто события.
 *
 *   const store = new Subject<Rule>(initialRule);
 *   const unsub = store.subscribe((rule) => render(rule));
 *   store.set(newRule);          // сработают подписчики
 *   unsub();                     // отписка
 */
export type Observer<T> = (value: T, prev: T | undefined) => void

export interface Observable<T> {
  subscribe(obs: Observer<T>): () => void
  get(): T | undefined
}

export class Subject<T> implements Observable<T> {
  private value: T | undefined;
  private observers: Observer<T>[] = [];
  private notifyDepth = 0;

  constructor(initial?: T) {
    this.value = initial;
  }

  /** Подписка; вернёт функцию отписки. */
  subscribe(obs: Observer<T>): () => void {
    this.observers.push(obs);
    let active = true;
    return () => {
      if (!active) {
        return;
      }
      active = false;
      const idx = this.observers.indexOf(obs);
      if (idx !== -1) {
        this.observers.splice(idx, 1);
      }
    };
  }

  /** Текущее значение. */
  get(): T | undefined {
    return this.value;
  }

  /** Установить значение и уведомить подписчиков. */
  set(next: T): void {
    if (next === this.value) {
      return;
    }
    const prev = this.value;
    this.value = next;

    if (this.notifyDepth > 0) {
      // защита от повторной входимости → отложенное уведомление
      queueMicrotask(() => this.notify(prev));
      return;
    }
    this.notify(prev);
  }

  /** Мутировать и уведомить (для массива/объекта по ссылке). */
  update(updater: (current: T | undefined) => T): void {
    this.set(updater(this.value));
  }

  clear(): void {
    this.observers = [];
  }

  get observerCount(): number {
    return this.observers.length;
  }

  private notify(prev: T | undefined): void {
    this.notifyDepth++;
    try {
      forEach<Observer<T>>(this.observers.slice(), (obs) => obs(this.value!, prev));
    } finally {
      this.notifyDepth--;
    }
  }
}

/** Subject с единственным физическим подписчиком (машина состояния). */
export class StateMachine<T> {
  private readonly state: Subject<T>;

  constructor(initial: T) {
    this.state = new Subject<T>(initial);
  }

  get current(): T {
    return this.state.get() as T;
  }

  onChange(obs: Observer<T>): () => void {
    return this.state.subscribe(obs);
  }

  set(next: T): void {
    this.state.set(next);
  }
}

/** BehaviorSubject-like удобство: подписка сразу получает текущее значение. */
export class BehaviorSubject<T> extends Subject<T> {
  subscribe(obs: Observer<T>): () => void {
    const unsub = super.subscribe(obs);
    if (this.get() !== undefined) {
      obs(this.get() as T, undefined);
    }
    return unsub;
  }
}

export default Subject;
