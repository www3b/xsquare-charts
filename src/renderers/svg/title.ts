// @ts-nocheck
import {isArray, toFont} from '../../shared/index.js';
import {_toLeftRightCenter} from '../../shared/extras.js';
import {getOrCreateSvgChartPart, removeExtraSvgElements, removeSvgChartPart} from './svg.js';
import {renderSvgText} from './text.js';

export function drawSvgTitle(chart: any, title: any): void {
  const opts = title.options;
  if (!opts.display) { removeSvgChartPart(chart, title.role); return; }
  const font = toFont(opts.font);
  const offset = font.lineHeight / 2 + title._padding.top;
  const {titleX, titleY, maxWidth, rotation} = title._drawArgs(offset);
  const group = getOrCreateSvgChartPart(chart, title.role, 'background');
  const lines = isArray(opts.text) ? opts.text : [opts.text];
  const widths = lines.map((line) => chart._renderer.measureText(line, font.string));
  renderSvgText(group, 0, opts.text, font, {color: opts.color, maxWidth, rotation, textAlign: _toLeftRightCenter(opts.align), textBaseline: 'middle', translation: [titleX, titleY]}, widths);
  removeExtraSvgElements(group, 1);
}
