import {Chart} from '/dist/chart.js';
import {createHistogramBins} from '/dist/utils.js';

const palette = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa'];
const charts = new Map();
const base = {animation: true, responsive: true, maintainAspectRatio: false, legend: {display: true}, tooltip: {enabled: true}};
let renderer = new URLSearchParams(window.location.search).get('renderer') === 'svg' ? 'svg' : 'canvas';

function mount(id, type, series, options = {}) {
  const host = document.getElementById(id);
  const {labels = ['Q1', 'Q2', 'Q3', 'Q4'], ...settings} = options;
  const chart = new Chart(host, {...base, ...settings, type, renderer, data: {labels, series}});
  charts.set(id, chart);
}

function renderCharts() {
  charts.forEach((chart) => chart.destroy());
  charts.clear();

  mount('area-chart', 'line', [
    {name: 'Actual', data: [12, 19, 8, 28], borderColor: palette[0], backgroundColor: 'rgba(96,165,250,.22)', fill: true, tension: .35, pointRadius: 4},
    {name: 'Plan', data: [10, 15, 16, 24], borderColor: palette[2], backgroundColor: 'rgba(251,191,36,.12)', fill: true, tension: .35, pointRadius: 4}
  ], {title: {display: true, text: 'Revenue'}, subtitle: {display: true, text: 'Shared chart configuration in Canvas and SVG'}});
  mount('chart', 'scatter', [{name: 'Points', data: [{x: 1, y: 4}, {x: 2, y: 7}, {x: 3, y: 3}], pointStyle: ['circle', 'triangle', 'star'], pointRadius: 7, backgroundColor: palette[1]}], {labels: []});
  mount('bar-chart', 'bar', [{name: 'Actual', data: [18, -12, 14, 31], backgroundColor: palette[0], borderRadius: 8}, {name: 'Plan', data: [13, -8, 19, 24], backgroundColor: palette[4], borderRadius: 8}]);
  mount('bar-svg-chart', 'bar', [{name: 'Actual', data: [18, 12, 14, 31], backgroundColor: palette[0], borderRadius: 8}, {name: 'Plan', data: [13, 8, 19, 24], backgroundColor: palette[4], borderRadius: 8}]);
  mount('bar-stack-svg-chart', 'bar', [{name: 'Product', data: [10, 15, 12, 8], backgroundColor: palette[0], stack: 'total'}, {name: 'Services', data: [8, 6, 11, 14], backgroundColor: palette[1], stack: 'total'}], {scales: {x: {stacked: true}, y: {stacked: true}}});
  mount('bar-horizontal-svg-chart', 'bar', [{name: 'Range', data: [[2, 9], [3, 7], [1, 6], [4, 11]], backgroundColor: palette[2], borderRadius: 7}], {indexAxis: 'y'});

  const bins = createHistogramBins([12, 16, 18, 19, 22, 24, 25, 27, 28, 31, 34, 37, 41, 43, 48, 54, 57, 63]);
  mount('histogram-raw-chart', 'histogram', [{name: 'Latency', data: bins, backgroundColor: palette[1]}]);
  mount('histogram-bins-chart', 'histogram', [{name: 'Backend bins', data: [{xMin: 0, xMax: 10, y: 4}, {xMin: 10, xMax: 25, y: 13}, {xMin: 25, xMax: 50, y: 9}, {xMin: 50, xMax: 90, y: 3}], backgroundColor: palette[2]}]);

  const shares = [{name: 'Share', data: [11, 16, 8, 13, 6], backgroundColor: palette}];
  const shareLabels = {labels: ['North', 'East', 'South', 'West', 'Central']};
  mount('pie-chart', 'pie', shares, shareLabels);
  mount('doughnut-chart', 'doughnut', shares, shareLabels);
  mount('doughnut-style-chart', 'doughnut', [{name: 'Styled', data: [10, 20, 30, 15], backgroundColor: palette, spacing: 4, offset: 4, borderRadius: 5}]);
  mount('doughnut-rings-chart', 'doughnut', [{name: 'Current', data: [8, 12, 7], backgroundColor: palette.slice(0, 3)}, {name: 'Target', data: [6, 9, 11], backgroundColor: palette.slice(2)}]);
  mount('bubble-chart', 'bubble', [{name: 'Pipeline', data: [{x: 1, y: 7, r: 7}, {x: 3, y: 4, r: 16}, {x: 5, y: 8, r: 11}, {x: 7, y: 3, r: 24}], backgroundColor: 'rgba(52,211,153,.55)', borderColor: palette[1]}], {labels: []});
  mount('radar-chart', 'radar', [{name: 'Current', data: [7, 9, 5, 8, 6], backgroundColor: 'rgba(96,165,250,.25)', borderColor: palette[0], fill: true}, {name: 'Target', data: [8, 7, 7, 9, 8], borderColor: palette[2], borderDash: [5, 4]}], {labels: ['Speed', 'Quality', 'Cost', 'Reach', 'Support']});
  mount('polar-chart', 'polarArea', shares, shareLabels);
  mount('log-chart', 'line', [{name: 'Orders', data: [{x: 1, y: 1}, {x: 2, y: 8}, {x: 10, y: 90}, {x: 50, y: 850}, {x: 100, y: 9000}], borderColor: palette[3], pointRadius: 4}], {labels: [], scales: {x: {type: 'logarithmic'}, y: {type: 'logarithmic'}}});
  mount('time-chart', 'line', [{name: 'Signups', data: [{x: '2026-01-01', y: 12}, {x: '2026-01-04', y: 28}, {x: '2026-01-10', y: 19}, {x: '2026-01-20', y: 36}], borderColor: '#22d3ee', fill: true}], {labels: [], scales: {x: {type: 'time'}}});
  mount('timeseries-chart', 'line', [{name: 'Release health', data: [{x: '2026-01-01', y: 42}, {x: '2026-01-02', y: 57}, {x: '2026-01-16', y: 48}, {x: '2026-03-30', y: 73}], borderColor: palette[4], pointRadius: 5}], {labels: [], scales: {x: {type: 'timeseries'}}});
  document.body.dataset.demoReady = renderer;
}

function updateRendererControls() {
  document.querySelectorAll('[data-renderer]').forEach((item) => item.classList.toggle('active', item.dataset.renderer === renderer));
}

document.querySelectorAll('[data-renderer]').forEach((button) => {
  button.addEventListener('click', () => {
    renderer = button.dataset.renderer;
    renderCharts();
    updateRendererControls();
  });
});

renderCharts();
updateRendererControls();
