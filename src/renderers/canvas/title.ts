import {renderText} from './text.js';
import {_toLeftRightCenter} from '../../shared/extras.js';
import {toFont} from '../../shared/index.js';

export function drawCanvasTitle(ctx: CanvasRenderingContext2D, title: any): void {
  const opts = title.options;
  if (!opts.display) return;
  const font = toFont(opts.font);
  const offset = font.lineHeight / 2 + title._padding.top;
  const {titleX, titleY, maxWidth, rotation} = title._drawArgs(offset);
  renderText(ctx, opts.text, 0, 0, font, {color: opts.color, maxWidth, rotation, textAlign: _toLeftRightCenter(opts.align), textBaseline: 'middle', translation: [titleX, titleY]});
}
