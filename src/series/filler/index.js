/**
 * Plugin based on discussion from the following Chart.js issues:
 * @see https://github.com/chartjs/Chart.js/issues/2380#issuecomment-279961569
 * @see https://github.com/chartjs/Chart.js/issues/2440#issuecomment-256461897
 */

import LineElement from '../../geometry/line.js';
import {_shouldApplyFill} from './filler.helper.js';
import {buildFillDrawModel} from './filler.model.js';
import {_decodeFill, _resolveTarget} from './filler.options.js';

function drawFillers(chart, sources, drawTime) {
  const models = [];
  for (const source of sources) {
    if (_shouldApplyFill(source)) {
      const model = buildFillDrawModel(source, chart.chartArea);
      if (model) {
        models.push(model);
      } else {
        chart._renderer.removeFiller(source);
      }
    } else if (source) {
      chart._renderer.removeFiller(source);
    }
  }
  chart._renderer.drawFiller(models, drawTime);
}

export default {
  id: 'filler',

  afterDatasetsUpdate(chart, _args, options) {
    const count = (chart._data.datasets || []).length;
    const sources = [];
    let meta, i, line, source;

    for (i = 0; i < count; ++i) {
      meta = chart.getDatasetMeta(i);
      line = meta.dataset;
      source = null;

      if (line && line.options && line instanceof LineElement) {
        source = {
          visible: chart.isDatasetVisible(i),
          index: i,
          fill: _decodeFill(line, i, count),
          chart,
          axis: meta.controller.options.indexAxis,
          scale: meta.vScale,
          line,
        };
      }

      meta.$filler = source;
      sources.push(source);
    }

    for (i = 0; i < count; ++i) {
      source = sources[i];
      if (!source || source.fill === false) {
        continue;
      }

      source.fill = _resolveTarget(sources, i, options.propagate);
      if (source.fill === false || !source.visible) {
        chart._renderer.removeFiller(source);
      }
    }
  },

  beforeDraw(chart, _args, options) {
    const draw = options.drawTime === 'beforeDraw';
    const metasets = chart.getSortedVisibleDatasetMetas();
    const area = chart.chartArea;
    const sources = [];
    for (let i = metasets.length - 1; i >= 0; --i) {
      const source = metasets[i].$filler;
      if (!source) {
        continue;
      }

      source.line.updateControlPoints(area, source.axis);
      sources.push(source);
    }
    if (draw) {
      drawFillers(chart, sources, 'beforeDraw');
    } else {
      chart._renderer.drawFiller([], 'beforeDraw');
    }
  },

  beforeDatasetsDraw(chart, _args, options) {
    if (options.drawTime !== 'beforeDatasetsDraw') {
      chart._renderer.drawFiller([], 'beforeDatasetsDraw');
      return;
    }

    const metasets = chart.getSortedVisibleDatasetMetas();
    drawFillers(chart, metasets.slice().reverse().map((meta) => meta.$filler), 'beforeDatasetsDraw');
  },

  beforeDatasetDraw(chart, args, options) {
    const source = args.meta.$filler;

    if (!_shouldApplyFill(source) || options.drawTime !== 'beforeDatasetDraw') {
      if (!_shouldApplyFill(source)) {
        chart._renderer.removeFiller(source);
      }
      return;
    }

    drawFillers(chart, [source], 'beforeDatasetDraw');
  },

  defaults: {
    propagate: true,
    drawTime: 'beforeDatasetDraw'
  }
};
