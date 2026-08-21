import Element from '../core/core.element.js';
import layouts from '../core/core.layouts.js';
import {
  _isBetween,
  callback as call,
  getRtlAdapter,
  toFont,
  toPadding,
} from '../helpers/index.js';
import {_alignStartEnd, _textX, _toLeftRightCenter} from '../helpers/helpers.extras.js';

/**
 * @typedef { import('../types/index.js').ChartEvent } ChartEvent
 */

const getBoxSize = (labelOpts, fontSize) => {
  let {boxHeight = fontSize, boxWidth = fontSize} = labelOpts;

  if (labelOpts.usePointStyle) {
    boxHeight = Math.min(boxHeight, fontSize);
    boxWidth = labelOpts.pointStyleWidth || Math.min(boxWidth, fontSize);
  }

  return {
    boxWidth,
    boxHeight,
    itemHeight: Math.max(fontSize, boxHeight)
  };
};

const itemsEqual = (a, b) => a !== null && b !== null && a.datasetIndex === b.datasetIndex && a.index === b.index;

export class Legend extends Element {

  /**
	 * @param {{ options: any; chart: any; }} config
	 */
  constructor(config) {
    super();

    this._added = false;

    // Contains hit boxes for each dataset (in dataset order)
    this.legendHitBoxes = [];

    /**
 		 * @private
 		 */
    this._hoveredItem = null;
    this._drawItems = undefined;

    // Are we in doughnut mode which has a different data type
    this.doughnutMode = false;

    this.chart = config.chart;
    this.options = config.options;
    this.legendItems = undefined;
    this.columnSizes = undefined;
    this.lineWidths = undefined;
    this.maxHeight = undefined;
    this.maxWidth = undefined;
    this.top = undefined;
    this.bottom = undefined;
    this.left = undefined;
    this.right = undefined;
    this.height = undefined;
    this.width = undefined;
    this._margins = undefined;
    this.position = undefined;
    this.weight = undefined;
    this.fullSize = undefined;
  }

  update(maxWidth, maxHeight, margins) {
    this._drawItems = undefined;
    this.maxWidth = maxWidth;
    this.maxHeight = maxHeight;
    this._margins = margins;

    this.setDimensions();
    this.buildLabels();
    this.fit();
  }

  setDimensions() {
    if (this.isHorizontal()) {
      this.width = this.maxWidth;
      this.left = this._margins.left;
      this.right = this.width;
    } else {
      this.height = this.maxHeight;
      this.top = this._margins.top;
      this.bottom = this.height;
    }
  }

  buildLabels() {
    this._drawItems = undefined;
    const labelOpts = this.options.labels || {};
    let legendItems = call(labelOpts.generateLabels, [this.chart], this) || [];

    if (labelOpts.filter) {
      legendItems = legendItems.filter((item) => labelOpts.filter(item, this.chart.data));
    }

    if (labelOpts.sort) {
      legendItems = legendItems.sort((a, b) => labelOpts.sort(a, b, this.chart.data));
    }

    if (this.options.reverse) {
      legendItems.reverse();
    }

    this.legendItems = legendItems;
  }

  fit() {
    this._drawItems = undefined;
    const {options} = this;

    // The legend may not be displayed for a variety of reasons including
    // the fact that the defaults got set to `false`.
    // When the legend is not displayed, there are no guarantees that the options
    // are correctly formatted so we need to bail out as early as possible.
    if (!options.display) {
      this.width = this.height = 0;
      return;
    }

    const labelOpts = options.labels;
    const labelFont = toFont(labelOpts.font);
    const fontSize = labelFont.size;
    const titleHeight = this._computeTitleHeight();
    const {boxWidth, itemHeight} = getBoxSize(labelOpts, fontSize);

    let width, height;

    if (this.isHorizontal()) {
      width = this.maxWidth; // fill all the width
      height = this._fitRows(titleHeight, fontSize, boxWidth, itemHeight) + 10;
    } else {
      height = this.maxHeight; // fill all the height
      width = this._fitCols(titleHeight, labelFont, boxWidth, itemHeight) + 10;
    }

    this.width = Math.min(width, options.maxWidth || this.maxWidth);
    this.height = Math.min(height, options.maxHeight || this.maxHeight);
  }

  /**
	 * @private
	 */
  _fitRows(titleHeight, fontSize, boxWidth, itemHeight) {
    const {maxWidth, options: {labels: {padding}}} = this;
    const hitboxes = this.legendHitBoxes = [];
    // Width of each line of legend boxes. Labels wrap onto multiple lines when there are too many to fit on one
    const lineWidths = this.lineWidths = [0];
    const lineHeight = itemHeight + padding;
    let totalHeight = titleHeight;

    let row = -1;
    let top = -lineHeight;
    this.legendItems.forEach((legendItem, i) => {
      const itemWidth = boxWidth + (fontSize / 2) + this.chart.renderer.measureText(legendItem.text, toFont(this.options.labels.font).string);

      if (i === 0 || lineWidths[lineWidths.length - 1] + itemWidth + 2 * padding > maxWidth) {
        totalHeight += lineHeight;
        lineWidths[lineWidths.length - (i > 0 ? 0 : 1)] = 0;
        top += lineHeight;
        row++;
      }

      hitboxes[i] = {left: 0, top, row, width: itemWidth, height: itemHeight};

      lineWidths[lineWidths.length - 1] += itemWidth + padding;
    });

    return totalHeight;
  }

  _fitCols(titleHeight, labelFont, boxWidth, _itemHeight) {
    const {maxHeight, options: {labels: {padding}}} = this;
    const hitboxes = this.legendHitBoxes = [];
    const columnSizes = this.columnSizes = [];
    const heightLimit = maxHeight - titleHeight;

    let totalWidth = padding;
    let currentColWidth = 0;
    let currentColHeight = 0;

    let left = 0;
    let col = 0;

    this.legendItems.forEach((legendItem, i) => {
      const {itemWidth, itemHeight} = calculateItemSize(boxWidth, labelFont, this.chart.renderer.measureText.bind(this.chart.renderer), legendItem, _itemHeight);

      // If too tall, go to new column
      if (i > 0 && currentColHeight + itemHeight + 2 * padding > heightLimit) {
        totalWidth += currentColWidth + padding;
        columnSizes.push({width: currentColWidth, height: currentColHeight}); // previous column size
        left += currentColWidth + padding;
        col++;
        currentColWidth = currentColHeight = 0;
      }

      // Store the hitbox width and height here. Final position will be updated in `draw`
      hitboxes[i] = {left, top: currentColHeight, col, width: itemWidth, height: itemHeight};

      // Get max width
      currentColWidth = Math.max(currentColWidth, itemWidth);
      currentColHeight += itemHeight + padding;
    });

    totalWidth += currentColWidth;
    columnSizes.push({width: currentColWidth, height: currentColHeight}); // previous column size

    return totalWidth;
  }

  adjustHitBoxes() {
    if (!this.options.display) {
      return;
    }
    const {items} = this.buildLegendDrawItems();
    for (const {index, hitbox} of items) {
      this.legendHitBoxes[index] = hitbox;
    }
  }

  isHorizontal() {
    return this.options.position === 'top' || this.options.position === 'bottom';
  }

  buildLegendDrawItems() {
    if (this._drawItems) {
      return this._drawItems;
    }
    const {options: opts, columnSizes, lineWidths} = this;
    const {align, labels: labelOpts} = opts;
    const rtlHelper = getRtlAdapter(opts.rtl, this.left, this.width);
    const labelFont = toFont(labelOpts.font);
    const {padding} = labelOpts;
    const fontSize = labelFont.size;
    const halfFontSize = fontSize / 2;
    const {boxWidth, boxHeight, itemHeight} = getBoxSize(labelOpts, fontSize);
    const isHorizontal = this.isHorizontal();
    const titleHeight = this._computeTitleHeight();
    let row = -1;
    let col = -1;
    let cursorX;
    let cursorY;
    const items = [];

    this.legendItems.forEach((legendItem, index) => {
      const layoutHitbox = this.legendHitBoxes[index];
      if (!layoutHitbox) return;
      const textAlign = rtlHelper.textAlign(legendItem.textAlign || (legendItem.textAlign = labelOpts.textAlign));
      const width = layoutHitbox.width;
      const height = layoutHitbox.height;
      let x;
      let y;
      rtlHelper.setWidth(this.width);

      if (isHorizontal) {
        if (layoutHitbox.row !== row) {
          row = layoutHitbox.row;
          cursorX = _alignStartEnd(align, this.left + padding, this.right - lineWidths[row]);
        }
        x = cursorX;
        y = this.top + titleHeight + padding + layoutHitbox.top;
        cursorX += width + padding;
      } else {
        if (layoutHitbox.col !== col) {
          col = layoutHitbox.col;
          cursorY = _alignStartEnd(align, this.top + titleHeight + padding, this.bottom - columnSizes[col].height);
        }
        x = this.left + padding + layoutHitbox.left;
        y = cursorY + layoutHitbox.top;
      }

      const anchorX = rtlHelper.x(x);
      const symbol = labelOpts.usePointStyle ? {
        centerX: rtlHelper.xPlus(anchorX, boxWidth / 2),
        centerY: y + halfFontSize,
        height: boxHeight,
        width: boxWidth,
      } : {
        x: rtlHelper.leftForLtr(anchorX, boxWidth),
        y: y + Math.max((fontSize - boxHeight) / 2, 0),
        height: boxHeight,
        width: boxWidth,
      };
      const textX = rtlHelper.x(_textX(textAlign, x + boxWidth + halfFontSize, isHorizontal ? x + width : this.right, opts.rtl));
      const hitbox = {left: rtlHelper.leftForLtr(anchorX, width), top: y, width, height, row: layoutHitbox.row, col: layoutHitbox.col};
      items.push({legendItem, index, symbol, text: {x: textX, y: y + itemHeight / 2, align: textAlign}, hitbox, width, itemHeight});
    });

    return this._drawItems = {items, labelFont, fontSize, halfFontSize, boxWidth, boxHeight, itemHeight, title: this._buildTitleDrawItem(rtlHelper)};
  }

  _buildTitleDrawItem(rtlHelper = getRtlAdapter(this.options.rtl, this.left, this.width)) {
    const opts = this.options;
    const titleOpts = opts.title;
    if (!titleOpts.display) return null;
    const font = toFont(titleOpts.font);
    const padding = toPadding(titleOpts.padding);
    const halfFontSize = font.size / 2;
    let left = this.left;
    let maxWidth = this.width;
    let y;
    if (this.isHorizontal()) {
      maxWidth = Math.max(...this.lineWidths);
      y = this.top + padding.top + halfFontSize;
      left = _alignStartEnd(opts.align, left, this.right - maxWidth);
    } else {
      const maxHeight = this.columnSizes.reduce((acc, size) => Math.max(acc, size.height), 0);
      y = padding.top + halfFontSize + _alignStartEnd(opts.align, this.top, this.bottom - maxHeight - opts.labels.padding - this._computeTitleHeight());
    }
    const align = rtlHelper.textAlign(_toLeftRightCenter(titleOpts.position));
    return {text: titleOpts.text, font, color: titleOpts.color, maxWidth, x: _alignStartEnd(titleOpts.position, left, left + maxWidth), y, textAlign: align};
  }

  draw() {
    this.chart.renderer.drawLegend(this);
  }

  /**
	 * @private
	 */
  _computeTitleHeight() {
    const titleOpts = this.options.title;
    const titleFont = toFont(titleOpts.font);
    const titlePadding = toPadding(titleOpts.padding);
    return titleOpts.display ? titleFont.lineHeight + titlePadding.height : 0;
  }

  /**
	 * @private
	 */
  _getLegendItemAt(x, y) {
    let i, hitBox, lh;

    if (_isBetween(x, this.left, this.right)
      && _isBetween(y, this.top, this.bottom)) {
      // See if we are touching one of the dataset boxes
      lh = this.legendHitBoxes;
      for (i = 0; i < lh.length; ++i) {
        hitBox = lh[i];

        if (_isBetween(x, hitBox.left, hitBox.left + hitBox.width)
          && _isBetween(y, hitBox.top, hitBox.top + hitBox.height)) {
          // Touching an element
          return this.legendItems[i];
        }
      }
    }

    return null;
  }

  /**
	 * Handle an event
	 * @param {ChartEvent} e - The event to handle
	 */
  handleEvent(e) {
    const opts = this.options;
    if (!isListened(e.type, opts)) {
      return;
    }

    // Chart event already has relative position in it
    const hoveredItem = this._getLegendItemAt(e.x, e.y);

    if (e.type === 'mousemove' || e.type === 'mouseout') {
      const previous = this._hoveredItem;
      const sameItem = itemsEqual(previous, hoveredItem);
      if (previous && !sameItem) {
        call(opts.onLeave, [e, previous, this], this);
      }

      this._hoveredItem = hoveredItem;

      if (hoveredItem && !sameItem) {
        call(opts.onHover, [e, hoveredItem, this], this);
      }
    } else if (hoveredItem) {
      call(opts.onClick, [e, hoveredItem, this], this);
    }
  }
}

function calculateItemSize(boxWidth, labelFont, measureText, legendItem, _itemHeight) {
  const itemWidth = calculateItemWidth(legendItem, boxWidth, labelFont, measureText);
  const itemHeight = calculateItemHeight(_itemHeight, legendItem, labelFont.lineHeight);
  return {itemWidth, itemHeight};
}

function calculateItemWidth(legendItem, boxWidth, labelFont, measureText) {
  let legendItemText = legendItem.text;
  if (legendItemText && typeof legendItemText !== 'string') {
    legendItemText = legendItemText.reduce((a, b) => a.length > b.length ? a : b);
  }
  return boxWidth + (labelFont.size / 2) + measureText(legendItemText, labelFont.string);
}

function calculateItemHeight(_itemHeight, legendItem, fontLineHeight) {
  let itemHeight = _itemHeight;
  if (typeof legendItem.text !== 'string') {
    itemHeight = calculateLegendItemHeight(legendItem, fontLineHeight);
  }
  return itemHeight;
}

function calculateLegendItemHeight(legendItem, fontLineHeight) {
  const labelHeight = legendItem.text ? legendItem.text.length : 0;
  return fontLineHeight * labelHeight;
}

function isListened(type, opts) {
  if ((type === 'mousemove' || type === 'mouseout') && (opts.onHover || opts.onLeave)) {
    return true;
  }
  if (opts.onClick && (type === 'click' || type === 'mouseup')) {
    return true;
  }
  return false;
}

export default {
  id: 'legend',

  /**
	 * For tests
	 * @private
	 */
  _element: Legend,

  start(chart, _args, options) {
    const legend = chart.legend = new Legend({options, chart});
    layouts.configure(chart, legend, options);
    layouts.addBox(chart, legend);
  },

  stop(chart) {
    layouts.removeBox(chart, chart.legend);
    delete chart.legend;
  },

  // During the beforeUpdate step, the layout configuration needs to run
  // This ensures that if the legend position changes (via an option update)
  // the layout system respects the change. See https://github.com/chartjs/Chart.js/issues/7527
  beforeUpdate(chart, _args, options) {
    const legend = chart.legend;
    layouts.configure(chart, legend, options);
    legend.options = options;
  },

  // The labels need to be built after datasets are updated to ensure that colors
  // and other styling are correct. See https://github.com/chartjs/Chart.js/issues/6968
  afterUpdate(chart) {
    const legend = chart.legend;
    legend.buildLabels();
    legend.adjustHitBoxes();
  },


  afterEvent(chart, args) {
    if (!args.replay) {
      chart.legend.handleEvent(args.event);
    }
  },

  defaults: {
    display: true,
    position: 'top',
    align: 'center',
    fullSize: true,
    reverse: false,
    weight: 1000,

    // a callback that will handle
    onClick(e, legendItem, legend) {
      const index = legendItem.datasetIndex;
      const ci = legend.chart;
      if (ci.isDatasetVisible(index)) {
        ci.hide(index);
        legendItem.hidden = true;
      } else {
        ci.show(index);
        legendItem.hidden = false;
      }
    },

    onHover: null,
    onLeave: null,

    labels: {
      color: (ctx) => ctx.chart.options.color,
      boxWidth: 40,
      padding: 10,
      // Generates labels shown in the legend
      // Valid properties to return:
      // text : text to display
      // fillStyle : fill of coloured box
      // strokeStyle: stroke of coloured box
      // hidden : if this legend item refers to a hidden item
      // lineCap : cap style for line
      // lineDash
      // lineDashOffset :
      // lineJoin :
      // lineWidth :
      generateLabels(chart) {
        const datasets = chart.data.datasets;
        const {labels: {usePointStyle, pointStyle, textAlign, color, useBorderRadius, borderRadius}} = chart.legend.options;

        return chart._getSortedDatasetMetas().map((meta) => {
          const style = meta.controller.getStyle(usePointStyle ? 0 : undefined);
          const borderWidth = toPadding(style.borderWidth);

          return {
            text: datasets[meta.index].label,
            fillStyle: style.backgroundColor,
            fontColor: color,
            hidden: !meta.visible,
            lineCap: style.borderCapStyle,
            lineDash: style.borderDash,
            lineDashOffset: style.borderDashOffset,
            lineJoin: style.borderJoinStyle,
            lineWidth: (borderWidth.width + borderWidth.height) / 4,
            strokeStyle: style.borderColor,
            pointStyle: pointStyle || style.pointStyle,
            rotation: style.rotation,
            textAlign: textAlign || style.textAlign,
            borderRadius: useBorderRadius && (borderRadius || style.borderRadius),

            // Below is extra data used for toggling the datasets
            datasetIndex: meta.index
          };
        }, this);
      }
    },

    title: {
      color: (ctx) => ctx.chart.options.color,
      display: false,
      position: 'center',
      text: '',
    }
  },

  descriptors: {
    _scriptable: (name) => !name.startsWith('on'),
    labels: {
      _scriptable: (name) => !['generateLabels', 'filter', 'sort'].includes(name),
    }
  },
};
