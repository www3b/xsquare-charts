let cache = new WeakMap();
const imageIds = new WeakMap();
let nextImageId = 0;

export function resetCanvasPaintCache() {
  cache = new WeakMap();
}

export function isRendererNeutralPaint(value) {
  return !!value && typeof value === 'object' && (value.type === 'linear-gradient' || value.type === 'radial-gradient' || value.type === 'pattern');
}

export function isCanvasPaint(value) {
  const type = value && typeof value === 'object' && Object.prototype.toString.call(value);
  return type === '[object CanvasGradient]' || type === '[object CanvasPattern]';
}

function getPaintKey(value) {
  if (value.type === 'pattern') {
    let imageId = imageIds.get(value.image);
    if (!imageId) {
      imageId = ++nextImageId;
      imageIds.set(value.image, imageId);
    }
    return `pattern:${imageId}:${value.repetition || 'repeat'}`;
  }
  const stops = value.colorStops.map((stop) => `${stop.offset}:${stop.color}`).join(',');
  return value.type === 'linear-gradient'
    ? `linear:${value.x0}:${value.y0}:${value.x1}:${value.y1}:${stops}`
    : `radial:${value.x0}:${value.y0}:${value.r0}:${value.x1}:${value.y1}:${value.r1}:${stops}`;
}

export function resolveCanvasPaint(ctx, value) {
  if (!isRendererNeutralPaint(value) || isCanvasPaint(value)) return value || 'transparent';
  let paints = cache.get(ctx);
  if (!paints) cache.set(ctx, paints = new Map());
  const key = getPaintKey(value);
  const cached = paints.get(key);
  if (cached) return cached;
  let paint = 'transparent';
  if (value.type === 'linear-gradient') {
    const gradient = ctx.createLinearGradient(value.x0, value.y0, value.x1, value.y1);
    value.colorStops.forEach((stop) => gradient.addColorStop(stop.offset, stop.color));
    paint = gradient;
  } else if (value.type === 'radial-gradient') {
    const gradient = ctx.createRadialGradient(value.x0, value.y0, value.r0, value.x1, value.y1, value.r1);
    value.colorStops.forEach((stop) => gradient.addColorStop(stop.offset, stop.color));
    paint = gradient;
  } else {
    paint = ctx.createPattern(value.image, value.repetition || 'repeat') || 'transparent';
  }
  paints.set(key, paint);
  return paint;
}
