import CategoryScale from './category.js';
import LinearScale from './linear.js';
import LogarithmicScale from './logarithmic.js';
import RadialLinearScale from './radial.js';
import TimeScale from './time.js';
import TimeSeriesScale from './timeseries.js';

const scaleTypes = {
  category: CategoryScale,
  linear: LinearScale,
  logarithmic: LogarithmicScale,
  radialLinear: RadialLinearScale,
  time: TimeScale,
  timeseries: TimeSeriesScale
};

export function getScaleType(type) {
  const ScaleType = scaleTypes[type];
  if (!ScaleType) {
    throw new Error(`Unknown scale type '${type}'`);
  }
  return ScaleType;
}
