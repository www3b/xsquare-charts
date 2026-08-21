import {renderText} from '../../helpers/helpers.canvas.js';
import {_toLeftRightCenter} from '../../helpers/helpers.extras.js';
import {toFont} from '../../helpers/index.js';

export function drawCanvasTitle(ctx: CanvasRenderingContext2D, title: any): void {
  const opts = title.options;
  if (!opts.display) return;
  const font = toFont(opts.font);
  const offset = font.lineHeight / 2 + title._padding.top;
  const {titleX, titleY, maxWidth, rotation} = title._drawArgs(offset);
  renderText(ctx, opts.text, 0, 0, font, {color: opts.color, maxWidth, rotation, textAlign: _toLeftRightCenter(opts.align), textBaseline: 'middle', translation: [titleX, titleY]});
}
