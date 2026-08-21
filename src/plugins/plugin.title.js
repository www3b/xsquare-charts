import Element from '../core/core.element.js';
import layouts from '../core/core.layouts.js';
import {PI, isArray, toPadding, toFont} from '../helpers/index.js';
import {_toLeftRightCenter, _alignStartEnd} from '../helpers/helpers.extras.js';
import {renderText} from '../helpers/helpers.canvas.js';
import {getOrCreateSvgChartPart, removeExtraSvgElements, removeSvgChartPart} from '../helpers/helpers.svg.js';
import {renderSvgText} from '../helpers/helpers.svg.text.js';

export class Title extends Element {
  /**
   * @param {{ ctx: any; options: any; chart: any; svgPart?: string; }} config
	 */
  constructor(config) {
    super();

    this.chart = config.chart;
    this.options = config.options;
    this.ctx = config.ctx;
    this._svgPart = config.svgPart || 'title';
    this._padding = undefined;
    this.top = undefined;
    this.bottom = undefined;
    this.left = undefined;
    this.right = undefined;
    this.width = undefined;
    this.height = undefined;
    this.position = undefined;
    this.weight = undefined;
    this.fullSize = undefined;
  }

  update(maxWidth, maxHeight) {
    const opts = this.options;

    this.left = 0;
    this.top = 0;

    if (!opts.display) {
      this.width = this.height = this.right = this.bottom = 0;
      return;
    }

    this.width = this.right = maxWidth;
    this.height = this.bottom = maxHeight;

    const lineCount = isArray(opts.text) ? opts.text.length : 1;
    this._padding = toPadding(opts.padding);
    const textSize = lineCount * toFont(opts.font).lineHeight + this._padding.height;

    if (this.isHorizontal()) {
      this.height = textSize;
    } else {
      this.width = textSize;
    }
  }

  isHorizontal() {
    const pos = this.options.position;
    return pos === 'top' || pos === 'bottom';
  }

  _drawArgs(offset) {
    const {top, left, bottom, right, options} = this;
    const align = options.align;
    let rotation = 0;
    let maxWidth, titleX, titleY;

    if (this.isHorizontal()) {
      titleX = _alignStartEnd(align, left, right);
      titleY = top + offset;
      maxWidth = right - left;
    } else {
      if (options.position === 'left') {
        titleX = left + offset;
        titleY = _alignStartEnd(align, bottom, top);
        rotation = PI * -0.5;
      } else {
        titleX = right - offset;
        titleY = _alignStartEnd(align, top, bottom);
        rotation = PI * 0.5;
      }
      maxWidth = bottom - top;
    }
    return {titleX, titleY, maxWidth, rotation};
  }

  draw() {
    const ctx = this.ctx;
    const opts = this.options;

    if (!opts.display) {
      if (this.chart.options.renderer === 'svg') {
        removeSvgChartPart(this.chart, this._svgPart);
      }
      return;
    }

    const fontOpts = toFont(opts.font);
    const lineHeight = fontOpts.lineHeight;
    const offset = lineHeight / 2 + this._padding.top;
    const {titleX, titleY, maxWidth, rotation} = this._drawArgs(offset);

    if (this.chart.options.renderer === 'svg') {
      const group = getOrCreateSvgChartPart(this.chart, this._svgPart, 'background');
      const lines = isArray(opts.text) ? opts.text : [opts.text];
      const textWidths = lines.map((line) => this.chart.renderer.measureText(line, fontOpts.string));
      renderSvgText(group, 0, opts.text, fontOpts, {
        color: opts.color,
        maxWidth,
        rotation,
        textAlign: _toLeftRightCenter(opts.align),
        textBaseline: 'middle',
        translation: [titleX, titleY],
      }, textWidths);
      removeExtraSvgElements(group, 1);
      return;
    }

    renderText(ctx, opts.text, 0, 0, fontOpts, {
      color: opts.color,
      maxWidth,
      rotation,
      textAlign: _toLeftRightCenter(opts.align),
      textBaseline: 'middle',
      translation: [titleX, titleY],
    });
  }
}

function createTitle(chart, titleOpts) {
  const title = new Title({
    ctx: chart.ctx,
    options: titleOpts,
    chart,
    svgPart: 'title'
  });

  layouts.configure(chart, title, titleOpts);
  layouts.addBox(chart, title);
  chart.titleBlock = title;
}

export default {
  id: 'title',

  /**
	 * For tests
	 * @private
	 */
  _element: Title,

  start(chart, _args, options) {
    createTitle(chart, options);
  },

  stop(chart) {
    const titleBlock = chart.titleBlock;
    layouts.removeBox(chart, titleBlock);
    delete chart.titleBlock;
  },

  beforeUpdate(chart, _args, options) {
    const title = chart.titleBlock;
    layouts.configure(chart, title, options);
    title.options = options;
  },

  defaults: {
    align: 'center',
    display: false,
    font: {
      weight: 'bold',
    },
    fullSize: true,
    padding: 10,
    position: 'top',
    text: '',
    weight: 2000         // by default greater than legend (1000) to be above
  },

  defaultRoutes: {
    color: 'color'
  },

  descriptors: {
    _scriptable: true,
    _indexable: false,
  },
};
