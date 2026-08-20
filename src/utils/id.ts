/**
 * IdGenerator — генерация стабильных уникальных идентификаторов
 * для узлов/рёбер/переменных сценария и хуков редактора.
 *
 *   const gen = new IdGenerator('node_');
 *   gen.next(); // node_1, node_2 ...
 *   idGen('edge'); // edge_3
 */
export class IdGenerator {
  private counter = 0;
  private readonly prefix: string;

  constructor(prefix = 'id_', startAt = 0) {
    this.prefix = prefix;
    this.counter = startAt;
  }

  next(): string {
    this.counter += 1;
    return `${this.prefix}${this.counter}`;
  }

  peek(): string {
    return `${this.prefix}${this.counter}`;
  }

  reset(to = 0): void {
    this.counter = to;
  }
}

const DEFAULT = new IdGenerator('id_', 0);
const NODE = new IdGenerator('node_', 0);
const EDGE = new IdGenerator('edge_', 0);
const VAR = new IdGenerator('var_', 0);

/** Короткий uuid без зависимостей (crypto.randomUUID или fallback). */
export function uid(prefix = ''): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}${crypto.randomUUID()}`;
  }
  return `${prefix}${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** Глобальные генераторы по домену. */
export const idGenerator = {
  generic: () => DEFAULT.next(),
  node: () => NODE.next(),
  edge: () => EDGE.next(),
  variable: () => VAR.next(),
};

export function resetAllIds(): void {
  DEFAULT.reset();
  NODE.reset();
  EDGE.reset();
  VAR.reset();
}

export default IdGenerator;
