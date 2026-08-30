/**
 * Aligns a logical chart pixel to a device pixel. This is shared scale geometry,
 * not Canvas presentation: both renderers consume the resulting coordinates.
 */
export function alignScalePixel(chart, pixel, width) {
  const devicePixelRatio = chart.currentDevicePixelRatio;
  const halfWidth = width !== 0 ? Math.max(width / 2, 0.5) : 0;
  return Math.round((pixel - halfWidth) * devicePixelRatio) / devicePixelRatio + halfWidth;
}
