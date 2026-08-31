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

function inheritedDefaults(Type, Base) {
  const Parent = Object.getPrototypeOf(Type);
  if (!Parent || Parent === Base) {
    return {};
  }
  return merge(Object.create(null), [inheritedDefaults(Parent, Base), Parent.defaults || {}]);
}

function applyDefaults(scope, Type, parentDefaults, applyOverride, Base) {
  const itemDefaults = merge(Object.create(null), [
    parentDefaults,
    // Some built-ins (notably PieSeries) extend another concrete component.
    // Their parent defaults must be registered before the child overrides them.
    Base ? inheritedDefaults(Type, Base) : {},
    defaults.get(scope),
    Type.defaults || {}
  ]);
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

function configureBuiltinDefaults() {
  const seriesTypes = ['bar', 'bubble', 'doughnut', 'histogram', 'line', 'pie', 'polarArea', 'radar', 'scatter'];
  seriesTypes.forEach((type) => applyDefaults(`datasets.${type}`, getSeriesType(type), Series.defaults, true, Series));
  [ArcGeometry, BarGeometry, LineGeometry, PointGeometry].forEach((Type) => applyDefaults(`elements.${Type.id}`, Type, Element.defaults, false, Element));
  ['category', 'linear', 'logarithmic', 'radialLinear', 'time', 'timeseries'].forEach((type) => applyDefaults(`scales.${type}`, getScaleType(type), Scale.defaults, false, Scale));
  [Colors, Decimation, Filler, Legend, SubTitle, Title, Tooltip].forEach((Type) => applyDefaults(`plugins.${Type.id}`, Type));
}

// Built-ins are a fixed module graph. Establish their defaults when that graph
// loads, rather than making the first Chart construction mutate global state.
configureBuiltinDefaults();
