/**
 * @typedef { import('../../components/chart.js').default } Chart
 * @typedef { import('../../scales/scale.js').default } Scale
 * @typedef { import('../../geometry/point.js').default } PointGeometry
 */

import LineGeometry from '../../geometry/line.js';
import {_isBetween} from '../../shared/index.js';
import {_createBoundaryLine} from './filler.helper.js';

/**
 * @param {{ chart: Chart; scale: Scale; index: number; line: LineGeometry; }} source
 * @return {LineGeometry}
 */
export function _buildStackLine(source) {
  const {scale, index, line} = source;
  const points = [];
  const segments = line.segments;
  const sourcePoints = line.points;
  const linesBelow = getLinesBelow(scale, index);
  linesBelow.push(_createBoundaryLine({x: null, y: scale.bottom}, line));

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    for (let j = segment.start; j <= segment.end; j++) {
      addPointsBelow(points, sourcePoints[j], linesBelow);
    }
  }
  return new LineGeometry({points, options: {}});
}

/**
 * @param {Scale} scale
 * @param {number} index
 * @return {LineGeometry[]}
 */
function getLinesBelow(scale, index) {
  const below = [];
  const metas = scale.getMatchingVisibleMetas('line');

  for (let i = 0; i < metas.length; i++) {
    const meta = metas[i];
    if (meta.index === index) {
      break;
    }
    if (!meta.hidden) {
      below.unshift(meta.dataset);
    }
  }
  return below;
}

/**
 * @param {PointGeometry[]} points
 * @param {PointGeometry} sourcePoint
 * @param {LineGeometry[]} linesBelow
 */
function addPointsBelow(points, sourcePoint, linesBelow) {
  const postponed = [];
  for (let j = 0; j < linesBelow.length; j++) {
    const line = linesBelow[j];
    const {first, last, point} = findPoint(line, sourcePoint, 'x');

    if (!point || (first && last)) {
      continue;
    }
    if (first) {
      // First point of a segment -> need to add another point before this,
      postponed.unshift(point);
    } else {
      points.push(point);
      if (!last) {
        // In the middle of a segment, no need to add more points.
        break;
      }
    }
  }
  points.push(...postponed);
}

/**
 * @param {LineGeometry} line
 * @param {PointGeometry} sourcePoint
 * @param {string} property
 * @returns {{point?: PointGeometry, first?: boolean, last?: boolean}}
 */
function findPoint(line, sourcePoint, property) {
  const point = line.interpolate(sourcePoint, property);
  if (!point) {
    return {};
  }

  const pointValue = point[property];
  const segments = line.segments;
  const linePoints = line.points;
  let first = false;
  let last = false;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const firstValue = linePoints[segment.start][property];
    const lastValue = linePoints[segment.end][property];
    if (_isBetween(pointValue, firstValue, lastValue)) {
      first = pointValue === firstValue;
      last = pointValue === lastValue;
      break;
    }
  }
  return {first, last, point};
}
