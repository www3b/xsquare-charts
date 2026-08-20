import {forEach} from './collection.js';
import {isObject, isUndefined, isDefined, isNil} from './lang.js';

/** Convenience wrapper for `Object.assign`. */
export function assign(target: object, ...others: object[]): object {
  return Object.assign(target, ...others);
}

/** Чтение вложенного свойства по пути. */
export function get(target: any, path: Array<string | number>, defaultValue?: any): any {
  let currentTarget = target;

  forEach<any, boolean | void>(path, (key: any) => {
    if (isNil(currentTarget)) {
      currentTarget = undefined;
      return false;
    }
    currentTarget = currentTarget[key];
  });

  return isUndefined(currentTarget) ? defaultValue : currentTarget;
}

/** Запись вложенного свойства по пути (мутирует target). */
export function set(target: any, path: Array<string | number>, value: any): any {
  let currentTarget = target;

  forEach<any, void>(path, (key: any, idx) => {
    if (typeof key !== 'number' && typeof key !== 'string') {
      throw new Error('illegal key type: ' + typeof key);
    }
    if (key === 'constructor') {
      throw new Error('illegal key: constructor');
    }
    if (key === '__proto__') {
      throw new Error('illegal key: __proto__');
    }

    const nextKey = path[Number(idx) + 1];
    let nextTarget = currentTarget[key];

    if (isDefined(nextKey) && isNil(nextTarget)) {
      nextTarget = currentTarget[key] = isNaN(Number(String(nextKey))) ? {} : [];
    }

    if (isUndefined(nextKey)) {
      if (isUndefined(value)) {
        delete currentTarget[key];
      } else {
        currentTarget[key] = value;
      }
    } else {
      currentTarget = nextTarget;
    }
  });

  return target;
}

/** Собрать объект из выбранных свойств. */
export function pick(target: any, properties: any[]): any {
  const result: Record<string, any> = {};
  const obj = Object(target);

  forEach(properties, (prop: any) => {
    if (prop in obj) {
      result[prop] = target[prop];
    }
  });

  return result;
}

/** Собрать объект из свойств, исключая перечисленные. */
export function omit(target: any, properties: any[]): any {
  const result: Record<string, any> = {};

  forEach(target, function(val: any, key: any) {
    if (properties.indexOf(key) === -1) {
      result[key] = val;
    }
  });

  return result;
}

/** Рекурсивный merge объектов (массивы не мержит — перезаписывает). */
export function merge(target: any, ...sources: any[]): any {
  if (!sources.length) {
    return target;
  }

  forEach(sources, (source: any) => {
    if (!source || !isObject(source)) {
      return;
    }

    forEach(source, (sourceVal: any, key: any) => {
      if (key === '__proto__') {
        return;
      }

      const targetVal = target[key];

      if (isObject(sourceVal)) {
        if (!isObject(targetVal)) {
          target[key] = {};
        }
        target[key] = merge(target[key], sourceVal);
      } else {
        target[key] = sourceVal;
      }
    });
  });

  return target;
}

/** Поверхностная копия объекта (без мутаций исходника). */
export function clone<T>(target: T): T {
  if (isObject(target)) {
    return {...target};
  }
  return target;
}
