import {forEach, findIndex} from './dash/collection.js';
import {createLogger} from './logger.js';

type Listener = (...args: any[]) => any
type PriorityListener = { priority: number; listener: Listener }

/**
 * EventBus — шина событий для модулей редактора и исполнителя.
 *
 * - `on(event, fn[, priority])` — подписка с приоритетами (больше = раньше);
 * - `once` — одноразовая подписка;
 * - `emit(event, ...args)` — доставка в порядке приоритета;
 * - `returnValue` — результат последнего слушателя;
 * - `off` / `clear` — отписка.
 */
export class EventBus {
  private listeners: Record<string, Array<Listener | PriorityListener>> = {};

  on(event: string, fn: Listener, priority = 100): void {
    const listeners = (this.listeners[event] ||= []);
    listeners.push({priority, listener: fn});
    listeners.sort((a, b) => (b as PriorityListener).priority - (a as PriorityListener).priority);
  }

  once(event: string, fn: Listener, priority = 100): void {
    const onceWrapper = (...args: unknown[]) => {
      this.off(event, onceWrapper);
      return fn(...args);
    };
    this.on(event, onceWrapper, priority);
  }

  off(event: string, fn?: Listener): void {
    if (!fn) {
      delete this.listeners[event];
      return;
    }
    const listeners = this.listeners[event];
    if (!listeners) {
      return;
    }
    const idx = findIndex<Listener | PriorityListener>(
      listeners,
      (e: Listener | PriorityListener) => (e as PriorityListener).listener === fn,
    );
    if (idx !== -1) {
      listeners.splice(idx as number, 1);
      if (!listeners.length) {
        delete this.listeners[event];
      }
    }
  }

  /** Уведомить слушателей. Возвращает результат последнего вызванного. */
  emit<T = any>(event: string, ...args: unknown[]): T | undefined {
    const listeners = this.listeners[event];
    if (!listeners || !listeners.length) {
      return undefined;
    }

    let result: T | undefined;
    forEach<Listener | PriorityListener>(listeners, (entry) => {
      const fn = (entry as PriorityListener).listener;
      const returned = fn(...args);
      if (returned !== undefined) {
        result = returned as T;
      }
    });
    return result;
  }

  /** Есть ли хоть одна подписка (для оптимизации). */
  hasSubscribers(event: string): boolean {
    return !!this.listeners[event]?.length;
  }

  clear(): void {
    this.listeners = {};
  }

  get size(): number {
    return Object.keys(this.listeners).length;
  }
}

export const eventBusLogger = createLogger('eventbus');

// ---------------------------------------------------------------------------
// Convenience: тихая пустая шина для изоляции
// ---------------------------------------------------------------------------

export const NOOP_BUS = new EventBus();

export function createEventBus(): EventBus {
  return new EventBus();
}

export default EventBus;
