// @ts-nocheck
import {hideHtmlTooltip, removeHtmlTooltip, renderHtmlTooltip} from '../../components/tooltip.view.js';

export function drawSvgTooltip(tooltip: any): void {
  renderHtmlTooltip(tooltip);
}

export function hideSvgTooltip(chart: any): void {
  hideHtmlTooltip(chart);
}

export function removeSvgTooltip(chart: any): void {
  removeHtmlTooltip(chart);
}
