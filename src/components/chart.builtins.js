import {merge} from '../shared/core.js';
import defaults from './chart.defaults.js';
import Series from '../series/series.js';
import {getSeriesType} from '../series/series.create.js';
import Element from '../geometry/geometry.js';
import ArcGeometry from '../geometry/arc.js';
import BarGeometry from '../geometry/bar.js';
import LineGeometry from '../geometry/line.js';
import PointGeometry from '../geometry/point.js';
import Scale from '../scales/scale.js';
import {getScaleType} from '../scales/scale.create.js';
import Colors from '../series/colors.js';
import Decimation from '../series/decimation.js';
import Filler from '../series/filler/index.js';
import Legend from './legend.js';
import SubTitle from './subtitle.js';
import Title from './title.js';
import Tooltip from './tooltip.js';

let initialized = false;

function applyDefaults(scope, Type, parentDefaults, applyOverride) {
  const itemDefaults = merge(Object.create(null), [parentDefaults, defaults.get(scope), Type.defaults || {}]);
  defaults.set(scope, itemDefaults);
  if (applyOverride && Type.overrides) {
    defaults.override(Type.id, Type.overrides);
  }
  if (Type.defaultRoutes) {
    Object.keys(Type.defaultRoutes).forEach((property) => {
      const source = property.split('.');
      const name = source.pop();
      const target = Type.defaultRoutes[property].split('.');
      defaults.route([scope, ...source].join('.'), name, target.slice(0, -1).join('.'), target[target.length - 1]);
    });
  }
  if (Type.descriptors) {
    defaults.describe(scope, Type.descriptors);
  }
}

export function initializeBuiltinDefaults() {
  if (initialized) {
    return;
  }
  initialized = true;
  const seriesTypes = ['bar', 'bubble', 'doughnut', 'histogram', 'line', 'pie', 'polarArea', 'radar', 'scatter'];
  seriesTypes.forEach((type) => applyDefaults(`datasets.${type}`, getSeriesType(type), Series.defaults, true));
  [ArcGeometry, BarGeometry, LineGeometry, PointGeometry].forEach((Type) => applyDefaults(`elements.${Type.id}`, Type, Element.defaults));
  ['category', 'linear', 'logarithmic', 'radialLinear', 'time', 'timeseries'].forEach((type) => applyDefaults(`scales.${type}`, getScaleType(type), Scale.defaults));
  [Colors, Decimation, Filler, Legend, SubTitle, Title, Tooltip].forEach((Type) => applyDefaults(`plugins.${Type.id}`, Type));
}
