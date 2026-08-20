/**
 * DashUtils — манипуляции над коллекциями, объектами и функциями.
 * Типизированные аналоги lodash, заимствованные у bpmn-io/min-dash.
 *
 * Использование: `DashUtils.get(node, ['name'])`, `DashUtils.find(nodes, { type: NodeType.TASK })`.
 */
import * as lang from './lang.js';
import * as array from './array.js';
import * as object from './object.js';
import * as fn from './fn.js';
import * as collection from './collection.js';

export * from './lang.js';
export * from './array.js';
export * from './object.js';
export * from './fn.js';
export * from './collection.js';

export const DashUtils = {
  ...lang,
  ...array,
  ...object,
  ...fn,
  ...collection,
  // алиасы, удобные для читаемости уидалло UX
  /** Ки: имена свойств объекта/коллекции */
  keys: collection.keys,
  /** Размер коллекции */
  size: collection.size,
  /** Значения коллекции */
  values: collection.values,
  /** Группировка */
  groupBy: collection.groupBy,
  /** Сортировка по экстрактору */
  sortBy: collection.sortBy,
  /** Компактная нормализация в строку */
  toKey: (x: unknown): string => (typeof x === 'string' ? x : JSON.stringify(x)),
};
