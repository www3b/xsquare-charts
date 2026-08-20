export interface HistogramBin {
  xMin: number;
  xMax: number;
  y: number;
}

export interface HistogramBinOptions {
  /** Explicit bin boundaries. Takes precedence over every other strategy. */
  thresholds?: number[];
  /** Fixed bin width. Takes precedence over `bins`. */
  binWidth?: number;
  /** Number of equal-width bins. */
  bins?: number;
}

function validateThresholds(thresholds: number[]) {
  if (!Array.isArray(thresholds) || thresholds.length < 2 || thresholds.some((value) => !Number.isFinite(value))) {
    throw new Error('Histogram thresholds must contain at least two finite numbers');
  }
  for (let i = 1; i < thresholds.length; ++i) {
    if (thresholds[i] <= thresholds[i - 1]) {
      throw new Error('Histogram thresholds must be strictly ascending');
    }
  }
}

function createBins(thresholds: number[]): HistogramBin[] {
  const bins = [];
  for (let i = 0; i < thresholds.length - 1; ++i) {
    bins.push({xMin: thresholds[i], xMax: thresholds[i + 1], y: 0});
  }
  return bins;
}

function countValues(values: number[], bins: HistogramBin[]) {
  for (const value of values) {
    for (let i = 0; i < bins.length; ++i) {
      const bin = bins[i];
      if (value >= bin.xMin && (value < bin.xMax || (i === bins.length - 1 && value <= bin.xMax))) {
        ++bin.y;
        break;
      }
    }
  }
  return bins;
}

function createEqualThresholds(min: number, max: number, count: number) {
  const width = (max - min) / count;
  return Array.from({length: count + 1}, (_value, index) => index === count ? max : min + width * index);
}

/**
 * Converts raw numeric values into `[xMin, xMax)` bins. The final bin also
 * includes its upper boundary so the largest value is retained.
 */
export function createHistogramBins(values: number[], options: HistogramBinOptions = {}): HistogramBin[] {
  const validValues = Array.from(values || []).filter((value): value is number => Number.isFinite(value));
  if (!validValues.length) {
    return [];
  }

  let thresholds: number[];
  if (options.thresholds !== undefined) {
    validateThresholds(options.thresholds);
    thresholds = options.thresholds.slice();
  } else {
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    if (options.binWidth !== undefined) {
      const width = options.binWidth;
      if (!Number.isFinite(width) || width <= 0) {
        throw new Error('Histogram binWidth must be a finite number greater than zero');
      }
      const start = Math.floor(min / width) * width;
      const end = Math.max(start + width, Math.ceil(max / width) * width);
      const count = Math.max(1, Math.round((end - start) / width));
      thresholds = Array.from({length: count + 1}, (_value, index) => index === count ? end : start + width * index);
    } else {
      const count = options.bins === undefined ? Math.ceil(Math.log2(validValues.length) + 1) : options.bins;
      if (!Number.isInteger(count) || count <= 0) {
        throw new Error('Histogram bins must be a positive integer');
      }
      const padding = min === max ? 0.5 : 0;
      thresholds = createEqualThresholds(min - padding, max + padding, count);
    }
  }
  return countValues(validValues, createBins(thresholds));
}
