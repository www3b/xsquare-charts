/**
 * @typedef { import('../../components/chart.js').default } Chart
 * @typedef { import('../../scales/scale.js').default } Scale
 * @typedef { import('../../geometry/point.js').default } PointElement
 */

import {LineElement} from '../../geometry/geometry.create.js';
import {isArray} from '../../shared/index.js';
import {_pointsFromSegments} from './filler.segment.js';

/**
 * @param {PointElement[] | { x: number; y: number; }} boundary
 * @param {LineElement} line
 * @return {LineElement?}
 */
export function _createBoundaryLine(boundary, line) {
  let points = [];
  let _loop = false;

  if (isArray(boundary)) {
    _loop = true;
    // @ts-ignore
    points = boundary;
  } else {
    points = _pointsFromSegments(boundary, line);
  }

  return points.length ? new LineElement({
    points,
    options: {tension: 0},
    _loop,
    _fullLoop: _loop
  }) : null;
}

export function _shouldApplyFill(source) {
  return source && source.fill !== false;
}
