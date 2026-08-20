/**
 * Утилиты xWorkflow: чистый TypeScript.
 *
 * Контексты:
 * - DashUtils — коллекции, объекты, функции (аналоги lodash);
 * - DomUtils  — DOM, события, делегирование;
 * - SvgUtils  — SVG (канвас);
 *
 * Паттерны/сервисы:
 * - logger        — централизованный логгер (обёртка над console);
 * - EventBus      — шина событий с приоритетами;
 * - DependencyInjector — контейнер зависимостей;
 * - Observer/Subject/BehaviorSubject — паттерн Observer;
 * - CommandStack  — команды + undo/redo (для редактора);
 * - IdGenerator   — стабильные id узлов/рёбер/переменных;
 * - async (Deferred/gate/pMap) — промис-хелперы.
 */

export * from './dash/index.js';
export * from './dom/index.js';

// SvgUtils: экспортируем контекст и только не-конфликтующие имена верхнего
// уровня (attr/query/bindAll/clone уже есть в DomUtils/DashUtils).
export {SvgUtils} from './svg/index.js';
export {
  create,
  append,
  prepend,
  appendTo,
  prependTo,
  toFront,
  replace,
  innerSVG,
  asString,
  transform,
  translate,
  rotate,
  scale,
  cloneBounds,
  asPoint,
  asBounds,
  transferAttributes,
  ensureImported,
  parseSvg,
  serialize,
  ns,
  svgAttr,
  svgClasses,
} from './svg/index.js';

export type {TransformFn, Point, Dimensions, Bounds, Rect, Positioned} from './svg/index.js';

export * from './logger.js';
export * from './eventBus.js';
export * from './dependencyInjector.js';
export * from './observer.js';
export * from './command.js';
export * from './id.js';
export * from './async.js';
