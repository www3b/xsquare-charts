import DatasetController from '../series/series.js';
import Element from '../geometry/geometry.js';
import Scale from '../scales/scale.js';
import ComponentStore from './chart.component-store.js';
import {each, callback as call, _capitalize} from '../shared/core.js';

/**
 * Please use the module's default export which provides a singleton instance
 * Note: class is exported for typedoc
 */
export class ComponentCatalog {
  constructor() {
    this.controllers = new ComponentStore(DatasetController, 'datasets', true);
    this.elements = new ComponentStore(Element, 'elements');
    this.plugins = new ComponentStore(Object, 'plugins');
    this.scales = new ComponentStore(Scale, 'scales');
    // Order is important, Scale has Element in prototype chain,
    // so Scales must be before Elements. Plugins are a fallback, so not listed here.
    this._stores = [this.controllers, this.scales, this.elements];
  }

  /**
	 * @param  {...any} args
	 */
  add(...args) {
    this._each('register', args);
  }

  remove(...args) {
    this._each('unregister', args);
  }

  /**
	 * @param  {...typeof DatasetController} args
	 */
  addControllers(...args) {
    this._each('register', args, this.controllers);
  }

  /**
	 * @param  {...typeof Element} args
	 */
  addElements(...args) {
    this._each('register', args, this.elements);
  }

  /**
	 * @param  {...any} args
	 */
  addPlugins(...args) {
    this._each('register', args, this.plugins);
  }

  /**
	 * @param  {...typeof Scale} args
	 */
  addScales(...args) {
    this._each('register', args, this.scales);
  }

  /**
	 * @param {string} id
	 * @returns {typeof DatasetController}
	 */
  getController(id) {
    return this._get(id, this.controllers, 'controller');
  }

  /**
	 * @param {string} id
	 * @returns {typeof Element}
	 */
  getElement(id) {
    return this._get(id, this.elements, 'element');
  }

  /**
	 * @param {string} id
	 * @returns {object}
	 */
  getPlugin(id) {
    return this._get(id, this.plugins, 'plugin');
  }

  /**
	 * @param {string} id
	 * @returns {typeof Scale}
	 */
  getScale(id) {
    return this._get(id, this.scales, 'scale');
  }

  /**
	 * @param  {...typeof DatasetController} args
	 */
  removeControllers(...args) {
    this._each('unregister', args, this.controllers);
  }

  /**
	 * @param  {...typeof Element} args
	 */
  removeElements(...args) {
    this._each('unregister', args, this.elements);
  }

  /**
	 * @param  {...any} args
	 */
  removePlugins(...args) {
    this._each('unregister', args, this.plugins);
  }

  /**
	 * @param  {...typeof Scale} args
	 */
  removeScales(...args) {
    this._each('unregister', args, this.scales);
  }

  /**
	 * @private
	 */
  _each(method, args, typedComponentCatalog) {
    [...args].forEach(arg => {
      const reg = typedComponentCatalog || this._getComponentCatalogForType(arg);
      if (typedComponentCatalog || reg.isForType(arg) || (reg === this.plugins && arg.id)) {
        this._exec(method, reg, arg);
      } else {
        // Handle private built-in groups.
        each(arg, item => {
          // Mixed private groups still use their owning catalog.

          const itemReg = typedComponentCatalog || this._getComponentCatalogForType(item);
          this._exec(method, itemReg, item);
        });
      }
    });
  }

  /**
	 * @private
	 */
  _exec(method, catalog, component) {
    const camelMethod = _capitalize(method);
    call(component['before' + camelMethod], [], component); // beforeRegister / beforeUnregister
    catalog[method](component);
    call(component['after' + camelMethod], [], component); // afterRegister / afterUnregister
  }

  /**
	 * @private
	 */
  _getComponentCatalogForType(type) {
    for (let i = 0; i < this._stores.length; i++) {
      const reg = this._stores[i];
      if (reg.isForType(type)) {
        return reg;
      }
    }
    // plugins is the fallback catalog
    return this.plugins;
  }

  /**
	 * @private
	 */
  _get(id, typedComponentCatalog, type) {
    const item = typedComponentCatalog.get(id);
    if (item === undefined) {
      throw new Error('"' + id + '" is not a registered ' + type + '.');
    }
    return item;
  }

}

// singleton instance
export default /* #__PURE__ */ new ComponentCatalog();
