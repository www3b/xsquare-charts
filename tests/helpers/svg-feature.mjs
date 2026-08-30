import {Chart} from '../../dist/chart.js';
import {createDocument, createHost} from './public-host.mjs';

export function createSvgChart(type = 'line', series = [{name: 'Values', data: [2, 5, 3]}], options = {}) {
  const document = createDocument();
  const host = createHost(document);
  const chart = new Chart(host, {type, renderer: 'svg', data: {labels: ['A', 'B', 'C'], series}, animation: false, responsive: false, legend: false, tooltip: false, ...options});
  return {chart, host};
}

export function descendants(node, predicate, output = []) {
  if (predicate(node)) output.push(node);
  for (const child of node.children || []) descendants(child, predicate, output);
  return output;
}

export function svgParts(chart, part) {
  return descendants(chart.root, (node) => node.getAttribute && node.getAttribute('data-svg-part') === part);
}

export function svgDatasetLayer(chart) {
  return descendants(chart.root, (node) => node.getAttribute && node.getAttribute('data-svg-layer') === 'datasets');
}
