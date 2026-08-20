import * as attrModule from './attr.js';
import * as clearModule from './clear.js';
import * as classesModule from './classes.js';
import * as appendModule from './append.js';
import * as cloneModule from './clone.js';
import * as eventsModule from './events.js';
import * as innerSVGModule from './innerSVG.js';
import * as prependToModule from './prependTo.js';
import * as replaceModule from './replace.js';
import * as transformModule from './transform.js';
import * as utilModule from './util/index.js';

export * from './attr.js';
export * from './clear.js';
export * from './classes.js';
export * from './append.js';
export * from './clone.js';
export * from './events.js';
export * from './innerSVG.js';
export * from './prependTo.js';
export * from './replace.js';
export * from './transform.js';
export * from './util/index.js';

import type {TransformFn, Point, Dimensions, Bounds, Rect, Positioned} from './transform.js';

/** SvgUtils — фасад для работы с SVG на канвасе. */
export const SvgUtils = {
  ...attrModule,
  ...clearModule,
  ...classesModule,
  ...appendModule,
  ...cloneModule,
  ...eventsModule,
  ...innerSVGModule,
  ...prependToModule,
  ...replaceModule,
  ...transformModule,
  ...utilModule,
};

export type {TransformFn, Point, Dimensions, Bounds, Rect, Positioned};
