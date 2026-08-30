import BarSeries from './bar.js';
import BubbleSeries from './bubble.js';
import DoughnutSeries from './doughnut.js';
import HistogramSeries from './histogram.js';
import LineSeries from './line.js';
import PolarAreaSeries from './polar-area.js';
import PieSeries from './pie.js';
import RadarSeries from './radar.js';
import ScatterSeries from './scatter.js';

const seriesTypes = {
  bar: BarSeries,
  bubble: BubbleSeries,
  doughnut: DoughnutSeries,
  histogram: HistogramSeries,
  line: LineSeries,
  pie: PieSeries,
  polarArea: PolarAreaSeries,
  radar: RadarSeries,
  scatter: ScatterSeries
};

export function getSeriesType(type) {
  const SeriesType = seriesTypes[type];
  if (!SeriesType) {
    throw new Error(`Unknown series type '${type}'`);
  }
  return SeriesType;
}
