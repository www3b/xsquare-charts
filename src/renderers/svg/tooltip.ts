import {hideHtmlTooltip, removeHtmlTooltip, renderHtmlTooltip} from '../../plugins/plugin.tooltip.html.js';

export function drawSvgTooltip(tooltip: any): void {
  renderHtmlTooltip(tooltip);
}

export function hideSvgTooltip(chart: any): void {
  hideHtmlTooltip(chart);
}

export function removeSvgTooltip(chart: any): void {
  removeHtmlTooltip(chart);
}
