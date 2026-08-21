import {clipArea, unclipArea, getDatasetClipArea} from '../../helpers/index.js';
import {Path} from '../../helpers/helpers.path.js';
import {
  getOrCreateSvgClipPath,
  getOrCreateSvgClipRect,
  getOrCreateSvgDatasetPart,
  getOrCreateSvgElement,
  removeExtraSvgElements,
  removeSvgDatasetPart,
  resolveSvgPaint
} from '../../helpers/helpers.svg.js';
import {_findSegmentEnd, _getBounds, _segments} from './filler.segment.js';
import {_getTarget} from './filler.target.js';

export function _drawfill(ctx, source, area) {
  const target = _getTarget(source);
  if (source.chart.options.renderer === 'svg') {
    drawSvgFill(source, target, area);
    return;
  }
  const {chart, index, line, scale, axis} = source;
  const lineOpts = line.options;
  const fillOption = lineOpts.fill;
  const color = lineOpts.backgroundColor;
  const {above = color, below = color} = fillOption || {};
  const meta = chart.getDatasetMeta(index);
  const clip = getDatasetClipArea(chart, meta);
  if (target && line.points.length) {
    clipArea(ctx, area);
    doFill(ctx, {line, target, above, below, area, scale, axis, clip});
    unclipArea(ctx);
  }
}

function getSvgFillGroup(chart, datasetIndex) {
  const group = getOrCreateSvgDatasetPart(chart, datasetIndex, 'fill');
  const dataset = group.parentNode;
  const first = dataset.children[0];
  if (first !== group) {
    dataset.insertBefore(group, first);
  }
  return group;
}

function getSvgClipBounds(scale, clip, bounds) {
  const chartArea = scale.chart.chartArea;
  const {property, start, end} = bounds || {};
  let {left, top, right, bottom} = chartArea;

  if (property === 'x') {
    left = start;
    right = end;
  } else if (property === 'y') {
    top = start;
    bottom = end;
  }

  if (clip) {
    left = Math.max(left, clip.left);
    right = Math.min(right, clip.right);
    top = Math.max(top, clip.top);
    bottom = Math.min(bottom, clip.bottom);
  }
  return {left, top, right, bottom};
}

function traceVerticalClip(ctx, target, clipY) {
  const {segments, points} = target;
  let first = true;
  let lineLoop = false;

  for (const segment of segments) {
    const {start, end} = segment;
    const firstPoint = points[start];
    const lastPoint = points[_findSegmentEnd(start, end, points)];
    if (first) {
      ctx.moveTo(firstPoint.x, firstPoint.y);
      first = false;
    } else {
      ctx.lineTo(firstPoint.x, clipY);
      ctx.lineTo(firstPoint.x, firstPoint.y);
    }
    lineLoop = !!target.pathSegment(ctx, segment, {move: lineLoop});
    if (lineLoop) {
      ctx.closePath();
    } else {
      ctx.lineTo(lastPoint.x, clipY);
    }
  }

  ctx.lineTo(target.first().x, clipY);
  ctx.closePath();
}

function traceHorizontalClip(ctx, target, clipX) {
  const {segments, points} = target;
  let first = true;
  let lineLoop = false;

  for (const segment of segments) {
    const {start, end} = segment;
    const firstPoint = points[start];
    const lastPoint = points[_findSegmentEnd(start, end, points)];
    if (first) {
      ctx.moveTo(firstPoint.x, firstPoint.y);
      first = false;
    } else {
      ctx.lineTo(clipX, firstPoint.y);
      ctx.lineTo(firstPoint.x, firstPoint.y);
    }
    lineLoop = !!target.pathSegment(ctx, segment, {move: lineLoop});
    if (lineLoop) {
      ctx.closePath();
    } else {
      ctx.lineTo(clipX, lastPoint.y);
    }
  }

  ctx.lineTo(clipX, target.first().y);
  ctx.closePath();
}

function getSvgSideClip(chart, source, target, area, property, side) {
  const path = new Path();
  if (property === 'x') {
    traceVerticalClip(path, target, side === 'above' ? area.top : area.bottom);
  } else {
    traceHorizontalClip(path, target, side === 'above' ? area.right : area.left);
  }
  return getOrCreateSvgClipPath(chart, `filler-${source.index}-${side}`, path.toString());
}

function buildSvgFillPath(line, target, part, property) {
  const path = new Path();
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
  return {d: path.toString(), loop};
}

function appendSvgFillPaths(entries, cfg, color, side) {
  const {line, target, property, scale, clip} = cfg;
  const segments = _segments(line, target, property);
  for (const part of segments) {
    const {style: {backgroundColor = color} = {}} = part.source;
    const path = buildSvgFillPath(line, target, part, property);
    entries.push({
      color: backgroundColor,
      d: path.d,
      fillRule: path.loop ? 'evenodd' : 'nonzero',
      bounds: getSvgClipBounds(scale, clip, target !== true && _getBounds(property, part.start, part.end)),
      side
    });
  }
}

// eslint-disable-next-line max-statements, complexity
function drawSvgFill(source, target, area) {
  const {chart, index, line, scale, axis} = source;
  if (!target || !line.points.length) {
    removeSvgDatasetPart(chart, index, 'fill');
    return;
  }

  const fillOption = line.options.fill;
  const color = line.options.backgroundColor;
  const {above = color, below = color} = fillOption || {};
  const clip = getDatasetClipArea(chart, chart.getDatasetMeta(index));
  const property = line._loop ? 'angle' : axis;
  const entries = [];
  let side;

  if (above !== below && (property === 'x' || property === 'y')) {
    appendSvgFillPaths(entries, {line, target, color: above, scale, property, clip}, above, 'above');
    appendSvgFillPaths(entries, {line, target, color: below, scale, property, clip}, below, 'below');
  } else {
    appendSvgFillPaths(entries, {line, target, color: below, scale, property, clip}, below);
  }

  const group = getSvgFillGroup(chart, index);
  for (let i = 0; i < entries.length; ++i) {
    const entry = entries[i];
    const item = getOrCreateSvgElement(group, 'g', i);
    const path = getOrCreateSvgElement(item, 'path');
    const clipPath = getOrCreateSvgClipRect(chart, `filler-${index}-${i}`, entry.bounds);
    side = entry.side && getSvgSideClip(chart, source, target, area, property, entry.side);
    item.setAttribute('clip-path', clipPath);
    path.setAttribute('data-role', 'fill');
    path.setAttribute('d', entry.d);
    path.setAttribute('fill', resolveSvgPaint(chart, entry.color));
    path.setAttribute('fill-rule', entry.fillRule);
    path.setAttribute('stroke', 'none');
    path.setAttribute('clip-path', side || 'none');
    removeExtraSvgElements(item, 1);
  }
  removeExtraSvgElements(group, entries.length);
}

function doFill(ctx, cfg) {
  const {line, target, above, below, area, scale, clip} = cfg;
  const property = line._loop ? 'angle' : cfg.axis;

  ctx.save();

  let fillColor = below;
  if (below !== above) {
    if (property === 'x') {
      clipVertical(ctx, target, area.top);
      fill(ctx, {line, target, color: above, scale, property, clip});
      ctx.restore();
      ctx.save();
      clipVertical(ctx, target, area.bottom);
    } else if (property === 'y') {
      clipHorizontal(ctx, target, area.left);
      fill(ctx, {line, target, color: below, scale, property, clip});
      ctx.restore();
      ctx.save();
      clipHorizontal(ctx, target, area.right);
      fillColor = above;
    }
  }
  fill(ctx, {line, target, color: fillColor, scale, property, clip});

  ctx.restore();
}

function clipVertical(ctx, target, clipY) {
  const {segments, points} = target;
  let first = true;
  let lineLoop = false;

  ctx.beginPath();
  for (const segment of segments) {
    const {start, end} = segment;
    const firstPoint = points[start];
    const lastPoint = points[_findSegmentEnd(start, end, points)];
    if (first) {
      ctx.moveTo(firstPoint.x, firstPoint.y);
      first = false;
    } else {
      ctx.lineTo(firstPoint.x, clipY);
      ctx.lineTo(firstPoint.x, firstPoint.y);
    }
    lineLoop = !!target.pathSegment(ctx, segment, {move: lineLoop});
    if (lineLoop) {
      ctx.closePath();
    } else {
      ctx.lineTo(lastPoint.x, clipY);
    }
  }

  ctx.lineTo(target.first().x, clipY);
  ctx.closePath();
  ctx.clip();
}

function clipHorizontal(ctx, target, clipX) {
  const {segments, points} = target;
  let first = true;
  let lineLoop = false;

  ctx.beginPath();
  for (const segment of segments) {
    const {start, end} = segment;
    const firstPoint = points[start];
    const lastPoint = points[_findSegmentEnd(start, end, points)];
    if (first) {
      ctx.moveTo(firstPoint.x, firstPoint.y);
      first = false;
    } else {
      ctx.lineTo(clipX, firstPoint.y);
      ctx.lineTo(firstPoint.x, firstPoint.y);
    }
    lineLoop = !!target.pathSegment(ctx, segment, {move: lineLoop});
    if (lineLoop) {
      ctx.closePath();
    } else {
      ctx.lineTo(clipX, lastPoint.y);
    }
  }

  ctx.lineTo(clipX, target.first().y);
  ctx.closePath();
  ctx.clip();
}

function fill(ctx, cfg) {
  const {line, target, property, color, scale, clip} = cfg;
  const segments = _segments(line, target, property);

  for (const {source: src, target: tgt, start, end} of segments) {
    const {style: {backgroundColor = color} = {}} = src;
    const notShape = target !== true;

    ctx.save();
    ctx.fillStyle = backgroundColor;

    clipBounds(ctx, scale, clip, notShape && _getBounds(property, start, end));

    ctx.beginPath();

    const lineLoop = !!line.pathSegment(ctx, src);

    let loop;
    if (notShape) {
      if (lineLoop) {
        ctx.closePath();
      } else {
        interpolatedLineTo(ctx, target, end, property);
      }

      const targetLoop = !!target.pathSegment(ctx, tgt, {move: lineLoop, reverse: true});
      loop = lineLoop && targetLoop;
      if (!loop) {
        interpolatedLineTo(ctx, target, start, property);
      }
    }

    ctx.closePath();
    ctx.fill(loop ? 'evenodd' : 'nonzero');

    ctx.restore();
  }
}

function clipBounds(ctx, scale, clip, bounds) {
  const chartArea = scale.chart.chartArea;
  const {property, start, end} = bounds || {};

  if (property === 'x' || property === 'y') {
    let left, top, right, bottom;

    if (property === 'x') {
      left = start;
      top = chartArea.top;
      right = end;
      bottom = chartArea.bottom;
    } else {
      left = chartArea.left;
      top = start;
      right = chartArea.right;
      bottom = end;
    }

    ctx.beginPath();

    if (clip) {
      left = Math.max(left, clip.left);
      right = Math.min(right, clip.right);
      top = Math.max(top, clip.top);
      bottom = Math.min(bottom, clip.bottom);
    }

    ctx.rect(left, top, right - left, bottom - top);
    ctx.clip();
  }
}

function interpolatedLineTo(ctx, target, point, property) {
  const interpolatedPoint = target.interpolate(point, property);
  if (interpolatedPoint) {
    ctx.lineTo(interpolatedPoint.x, interpolatedPoint.y);
  }
}
