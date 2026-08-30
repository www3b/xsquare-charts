
/**
 * @typedef { import('../components/chart.js').default } Chart
 */

/**
 * Abstract class that allows abstracting platform dependencies away from the chart.
 */
export default class BasePlatform {
  /**
	 * Registers the specified listener on the given chart.
	 * @param {Chart} chart - Chart from which to listen for event
	 * @param {string} type - The ({@link ChartEvent}) type to listen for
	 * @param {function} listener - Receives a notification (an object that implements
	 * the {@link ChartEvent} interface) when an event of the specified type occurs.
	 */
  addEventListener(chart, type, listener) {} // eslint-disable-line no-unused-vars

  /**
	 * Removes the specified listener previously registered with addEventListener.
	 * @param {Chart} chart - Chart from which to remove the listener
	 * @param {string} type - The ({@link ChartEvent}) type to remove
	 * @param {function} listener - The listener function to remove from the event target.
	 */
  removeEventListener(chart, type, listener) {} // eslint-disable-line no-unused-vars

  /**
	 * @returns {number} the current devicePixelRatio of the device this platform is connected to.
	 */
  getDevicePixelRatio() {
    return 1;
  }

  /**
   * Returns the maximum logical size available to a chart host.
   * @param {HTMLElement} element
	 * @param {number} [width] - content width of parent element
	 * @param {number} [height] - content height of parent element
	 * @param {number} [aspectRatio] - aspect ratio to maintain
	 */
  getMaximumSize(element, width, height, aspectRatio) {
    width = Math.max(0, width || element.clientWidth || 0);
    height = height || element.clientHeight || 0;
    return {
      width,
      height: Math.max(0, aspectRatio ? Math.floor(width / aspectRatio) : height)
    };
  }

  /**
   * @param {HTMLElement} canvas
	 * @returns {boolean} true if the canvas is attached to the platform, false if not.
	 */
  isAttached(canvas) { // eslint-disable-line no-unused-vars
    return true;
  }

  /**
   * Updates config with platform specific requirements
   * @param {import('../components/chart.options.js').default} config
   */
  updateConfig(config) { // eslint-disable-line no-unused-vars
    // no-op
  }
}
