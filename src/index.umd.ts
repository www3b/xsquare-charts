// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

/**
 * @namespace Chart
 */
import {Chart} from './index.js';

if (typeof window !== 'undefined') {
  window.Chart = Chart;
}

export default Chart;
