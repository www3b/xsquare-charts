import BarController from './bar.js';
import {resolveObjectKey} from '../shared/index.js';

export default class HistogramController extends BarController {

  static id = 'histogram';

  static defaults = {
    ...BarController.defaults,
    categoryPercentage: 1,
    barPercentage: 1,
    grouped: false,
  };

  static overrides = {
    scales: {
      _index_: {
        type: 'linear',
        offset: false,
        grid: {
          offset: false
        }
      },
      _value_: {
        type: 'linear',
        beginAtZero: true,
      }
    }
  };

  /**
   * Histogram bins use explicit index-axis boundaries rather than Bar's
   * category geometry. For indexAxis: 'y', use `{yMin, yMax, x}` bins.
   * @protected
   */
  parseObjectData(meta, data, start, count) {
    const {iScale, vScale} = meta;
    const axis = iScale.axis;
    const minKey = `${axis}Min`;
    const maxKey = `${axis}Max`;
    const valueKey = vScale.axis;
    const parsed = [];

    for (let i = start; i < start + count; ++i) {
      const bin = data[i];
      const min = iScale.parse(resolveObjectKey(bin, minKey), i);
      const max = iScale.parse(resolveObjectKey(bin, maxKey), i);
      const item = {};
      item[axis] = (min + max) / 2;
      item[valueKey] = vScale.parse(resolveObjectKey(bin, valueKey), i);
      item._histogram = {min, max};
      parsed.push(item);
    }
    return parsed;
  }

  updateRangeFromParsed(range, scale, parsed, stack) {
    super.updateRangeFromParsed(range, scale, parsed, stack);
    const bin = parsed._histogram;
    if (bin && scale === this._cachedMeta.iScale) {
      range.min = Math.min(range.min, bin.min);
      range.max = Math.max(range.max, bin.max);
    }
  }

  getLabelAndValue(index) {
    const {iScale, vScale} = this._cachedMeta;
    const parsed = this.getParsed(index);
    const bin = parsed._histogram;
    return {
      label: bin ? `${iScale.getLabelForValue(bin.min)} – ${iScale.getLabelForValue(bin.max)}` : '',
      value: '' + vScale.getLabelForValue(parsed[vScale.axis])
    };
  }

  _calculateBarIndexPixels(index) {
    const {iScale} = this._cachedMeta;
    const bin = this.getParsed(index)._histogram;
    const base = iScale.getPixelForValue(bin.min);
    const head = iScale.getPixelForValue(bin.max);
    const size = Math.abs(head - base);
    return {
      base,
      head,
      center: (base + head) / 2,
      size
    };
  }
}
