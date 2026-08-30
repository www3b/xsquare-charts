/**
 * Platform fallback implementation (minimal).
 * @see https://github.com/chartjs/Chart.js/pull/4591#issuecomment-319575939
 */

import BasePlatform from './platform.js';

/**
 * Platform class for charts without access to the DOM or to many element properties
 * This platform is used by default for any chart passed an OffscreenCanvas.
 * @extends BasePlatform
 */
export default class BasicPlatform extends BasePlatform {
  updateConfig(config) {
    config.options.animation = false;
  }
}
