import catalog from './chart.catalog.js';
import {BarController, BubbleController, DoughnutController, HistogramController, LineController, PolarAreaController, PieController, RadarController, ScatterController} from '../series/series.create.js';
import {ArcElement, BarElement, LineElement, PointElement} from '../geometry/geometry.create.js';
import {CategoryScale, LinearScale, LogarithmicScale, RadialLinearScale, TimeScale, TimeSeriesScale} from '../scales/scale.create.js';
import {Colors, Decimation, Filler, Legend, SubTitle, Title, Tooltip} from './components.create.js';

catalog.add(
  BarController, BubbleController, DoughnutController, HistogramController, LineController, PolarAreaController, PieController, RadarController, ScatterController,
  ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, LogarithmicScale, RadialLinearScale, TimeScale, TimeSeriesScale,
  Colors, Decimation, Filler, Legend, SubTitle, Title, Tooltip
);
