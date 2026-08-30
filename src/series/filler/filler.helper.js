/**
 * @typedef { import('../../components/chart.js').default } Chart
 * @typedef { import('../../scales/scale.js').default } Scale
 * @typedef { import('../../geometry/point.js').default } PointGeometry
 */

import LineGeometry from '../../geometry/line.js';
import {isArray} from '../../shared/index.js';
import {_pointsFromSegments} from './filler.segment.js';

/**
 * @param {PointGeometry[] | { x: number; y: number; }} boundary
 * @param {LineGeometry} line
 * @return {LineGeometry?}
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

  return points.length ? new LineGeometry({
    points,
    options: {tension: 0},
    _loop,
    _fullLoop: _loop
  }) : null;
}

export function _shouldApplyFill(source) {
  return source && source.fill !== false;
}
