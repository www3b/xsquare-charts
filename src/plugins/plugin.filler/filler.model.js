import {getDatasetClipArea} from '../../helpers/helpers.dataset.js';
import {_findSegmentEnd, _getBounds, _segments} from './filler.segment.js';
import {_getTarget} from './filler.target.js';

export function getFillClipBounds(chartArea, clip, bounds) {
  const {property, start, end} = bounds || {};
  let {left, top, right, bottom} = chartArea;
  if (property === 'x') {
    left = start;
    right = end;
  } else if (property === 'y') {
    top = start;
    bottom = end;
  }
  if (clip && (property === 'x' || property === 'y')) {
    left = Math.max(left, clip.left);
    right = Math.min(right, clip.right);
    top = Math.max(top, clip.top);
    bottom = Math.min(bottom, clip.bottom);
  }
  return {left, top, right, bottom};
}

export function traceFillPart(path, line, target, part, property) {
  const lineLoop = !!line.pathSegment(path, part.source);
  let loop = lineLoop;
  if (target !== true) {
    if (lineLoop) {
      path.closePath();
    } else {
      interpolatedLineTo(path, target, part.end, property);
    }
    const targetLoop = !!target.pathSegment(path, part.target, {move: lineLoop, reverse: true});
    loop = lineLoop && targetLoop;
    if (!loop) {
      interpolatedLineTo(path, target, part.start, property);
    }
  }
  path.closePath();
  return loop;
}

export function traceFillSide(path, target, property, edge) {
  const {segments, points} = target;
  let first = true;
  let lineLoop = false;
  for (const segment of segments) {
    const {start, end} = segment;
    const firstPoint = points[start];
    const lastPoint = points[_findSegmentEnd(start, end, points)];
    if (first) {
      path.moveTo(firstPoint.x, firstPoint.y);
      first = false;
    } else if (property === 'x') {
      path.lineTo(firstPoint.x, edge);
      path.lineTo(firstPoint.x, firstPoint.y);
    } else {
      path.lineTo(edge, firstPoint.y);
      path.lineTo(firstPoint.x, firstPoint.y);
    }
    lineLoop = !!target.pathSegment(path, segment, {move: lineLoop});
    if (lineLoop) {
      path.closePath();
    } else if (property === 'x') {
      path.lineTo(lastPoint.x, edge);
    } else {
      path.lineTo(edge, lastPoint.y);
    }
  }
  const point = target.first();
  if (property === 'x') {
    path.lineTo(point.x, edge);
  } else {
    path.lineTo(edge, point.y);
  }
  path.closePath();
}

function interpolatedLineTo(path, target, point, property) {
  const interpolated = target.interpolate(point, property);
  if (interpolated) {
    path.lineTo(interpolated.x, interpolated.y);
  }
}

function buildParts(line, target, property, color) {
  return _segments(line, target, property).map((part) => {
    const {style: {backgroundColor = color} = {}} = part.source;
    return {
      ...part,
      color: backgroundColor,
      bounds: target === true ? undefined : _getBounds(property, part.start, part.end)
    };
  });
}

export function buildFillDrawModel(source, area) {
  const target = _getTarget(source);
  const {chart, index, line, scale, axis} = source;
  if (!target || !line.points.length) {
    return null;
  }
  const color = line.options.backgroundColor;
  const {above = color, below = color} = line.options.fill || {};
  const property = line._loop ? 'angle' : axis;
  const clip = getDatasetClipArea(chart, chart.getDatasetMeta(index));
  const split = above !== below && (property === 'x' || property === 'y');
  const createSide = (side, sideColor) => ({
    side,
    edge: side === 'above' ? (property === 'x' ? area.top : area.right) : (property === 'x' ? area.bottom : area.left),
    parts: buildParts(line, target, property, sideColor)
  });
  return {
    source,
    chart,
    index,
    line,
    target,
    area,
    chartArea: scale.chart.chartArea,
    clip,
    property,
    sides: split ? [createSide('above', above), createSide('below', below)] : [createSide(null, below)]
  };
}
