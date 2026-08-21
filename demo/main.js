import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  HistogramController,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  LogarithmicScale,
  PointElement,
  PolarAreaController,
  RadarController,
  RadialLinearScale,
  ScatterController,
  SubTitle,
  Title,
  Tooltip,
  PieController,
  BubbleController,
  TimeScale,
  TimeSeriesScale,
  _adapters,
} from '/dist/chart.js';
import {createHistogramBins} from '/helpers/helpers.js';

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  BubbleController,
  CategoryScale,
  DoughnutController,
  Filler,
  HistogramController,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  LogarithmicScale,
  PointElement,
  PolarAreaController,
  RadarController,
  RadialLinearScale,
  ScatterController,
  SubTitle,
  Title,
  Tooltip,
  PieController,
  TimeScale,
  TimeSeriesScale,
);

_adapters._date.override({
  formats: () => ({datetime: 'x', day: 'x', month: 'x', year: 'x'}),
  parse: (value) => value instanceof Date ? +value : typeof value === 'number' ? value : Date.parse(value),
  format: (value) => new Date(value).toISOString().slice(0, 10),
  add: (value, amount, unit) => value + amount * (unit === 'day' ? 864e5 : unit === 'month' ? 2592e6 : 1),
  diff: (a, b, unit) => (a - b) / (unit === 'day' ? 864e5 : unit === 'month' ? 2592e6 : 1),
  startOf: (value) => value,
  endOf: (value) => value,
});

const axisOptions = {
  backgroundColor: 'rgba(15, 23, 42, 0.25)',
  border: {color: '#667085', width: 2},
  grid: {color: '#344054', tickColor: '#667085', tickWidth: 1},
  ticks: {color: '#b6c2d3'},
};

function barOptions(scales = {}) {
  return {
    maintainAspectRatio: false,
    plugins: {legend: {labels: {color: '#f8fafc'}}},
    renderer: 'canvas',
    responsive: true,
    scales: {x: axisOptions, y: axisOptions, ...scales},
  };
}

function groupedBarData() {
  return {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [{
      label: 'Actual',
      backgroundColor: '#60a5fa',
      borderColor: '#1d4ed8',
      borderRadius: 8,
      borderSkipped: 'start',
      borderWidth: {top: 2, right: 3, bottom: 1, left: 3},
      data: [18, -12, 14, 31, 22],
    }, {
      label: 'Plan',
      backgroundColor: '#a78bfa',
      borderColor: '#7c3aed',
      borderRadius: 8,
      borderWidth: 2,
      data: [13, -8, 19, 24, 27],
    }],
  };
}

const rawLatencySamples = [12, 16, 18, 19, 22, 24, 25, 27, 28, 29, 31, 34, 35, 37, 41, 43, 48, 54, 57, 63];
const backendHistogramBins = [
  {xMin: 0, xMax: 10, y: 4},
  {xMin: 10, xMax: 25, y: 13},
  {xMin: 25, xMax: 50, y: 9},
  {xMin: 50, xMax: 90, y: 3},
];

const svgCharts = [
  new Chart(document.getElementById('area-chart'), {
    type: 'line',
    data: {
      labels: [
        ['Monday', 'launch'],
        'Tuesday planning session',
        'Wednesday customer review',
        'Thursday implementation',
        'Friday release candidate',
        'Saturday monitoring',
        'Sunday retrospective',
      ],
      datasets: [{
        label: 'Revenue (bezier)',
        data: [12, 19, null, 28, -4, 35, 31],
        backgroundColor: 'rgba(96, 165, 250, 0.22)',
        borderColor: '#60a5fa',
        borderDash: [8, 5],
        borderWidth: 3,
        cubicInterpolationMode: 'monotone',
        fill: {
          target: 'origin',
          above: 'rgba(96, 165, 250, 0.24)',
          below: 'rgba(248, 113, 113, 0.24)',
        },
        pointBackgroundColor: '#f8fafc',
        pointBorderColor: '#60a5fa',
        pointRadius: 5,
        tension: 0.4,
      }, {
        label: 'Forecast (stepped)',
        data: [9, 15, null, 21, 8, 27, 24],
        backgroundColor: 'rgba(167, 139, 250, 0.18)',
        borderColor: '#a78bfa',
        borderWidth: 2,
        fill: 0,
        pointBackgroundColor: '#f8fafc',
        pointBorderColor: '#a78bfa',
        pointRadius: 4,
        stepped: 'middle',
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {color: '#f8fafc', usePointStyle: true},
          title: {color: '#93c5fd', display: true, text: 'Series legend'},
        },
        subtitle: {align: 'end', color: '#a5b4fc', display: true, position: 'bottom', text: 'Canvas and SVG share the same layout box'},
        title: {color: '#f8fafc', display: true, text: ['Global title', 'multiline SVG text']},
      },
      renderer: 'canvas',
      responsive: true,
      scales: {
        x: {
          ...axisOptions,
          ticks: {...axisOptions.ticks, maxRotation: 50, minRotation: 50},
          title: {color: '#dbeafe', display: true, text: ['Release calendar', 'rotated + multiline labels']},
        },
        y: {
          ...axisOptions,
          title: {color: '#dbeafe', display: true, text: 'Revenue, $k'},
        },
        y1: {
          ...axisOptions,
          grid: {...axisOptions.grid, drawOnChartArea: false},
          position: 'right',
          title: {color: '#c4b5fd', display: true, text: 'Secondary scale'},
        },
      },
    },
  }),

  new Chart(document.getElementById('chart'), {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Experiments',
        data: [{x: 1, y: 4}, {x: 2.5, y: 8}, {x: 4, y: 3}, {x: 5, y: 9}, {x: 7, y: 5}],
        pointBackgroundColor: '#34d399',
        pointBorderColor: '#ecfdf5',
        pointBorderWidth: 2,
        pointRadius: [4, 7, 5, 8, 6],
        pointRotation: [0, 20, 45, 10, 30],
        pointStyle: ['circle', 'triangle', 'rectRounded', 'star', 'crossRot'],
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {legend: {labels: {color: '#f8fafc'}}},
      renderer: 'canvas',
      responsive: true,
      scales: {
        x: {...axisOptions, type: 'linear'},
        y: {...axisOptions, type: 'linear'},
      },
    },
  }),

  new Chart(document.getElementById('bar-svg-chart'), {
    type: 'bar',
    data: groupedBarData(),
    options: {
      ...barOptions(),
      plugins: {
        legend: {labels: {color: '#f8fafc'}},
        subtitle: {color: '#fbbf24', display: true, position: 'right', text: 'Subtitle right'},
        title: {color: '#f8fafc', display: true, position: 'left', text: 'Title left'},
      },
    },
  }),

  new Chart(document.getElementById('bar-stack-svg-chart'), {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      datasets: [{
        label: 'Base',
        backgroundColor: '#34d399',
        borderColor: '#047857',
        borderRadius: 8,
        borderSkipped: 'middle',
        borderWidth: 2,
        data: [8, 12, 6, 14, 10],
        stack: 'total',
      }, {
        label: 'Extra',
        backgroundColor: '#fbbf24',
        borderColor: '#b45309',
        borderRadius: 8,
        borderSkipped: 'middle',
        borderWidth: 2,
        data: [5, 4, 8, 3, 7],
        stack: 'total',
      }],
    },
    options: {
      ...barOptions({x: {...axisOptions, stacked: true}, y: {...axisOptions, stacked: true}}),
      plugins: {
        legend: {
          labels: {color: '#f8fafc'},
          position: 'right',
          title: {color: '#93c5fd', display: true, text: 'Vertical legend'},
        },
      },
    },
  }),

  new Chart(document.getElementById('bar-horizontal-svg-chart'), {
    type: 'bar',
    data: {
      labels: ['North', 'East', 'South', 'West'],
      datasets: [{
        label: 'Floating range',
        backgroundColor: '#f472b6',
        borderColor: '#be185d',
        borderRadius: {bottomLeft: 3, bottomRight: 8, topLeft: 12, topRight: 5},
        borderSkipped: false,
        borderWidth: {top: 1, right: 4, bottom: 3, left: 2},
        data: [[4, 14], [-8, 6], [2, 18], [-12, -3]],
      }],
    },
    options: {...barOptions({x: {...axisOptions, type: 'linear'}, y: axisOptions}), indexAxis: 'y'},
  }),

  new Chart(document.getElementById('histogram-raw-chart'), {
    type: 'histogram',
    data: {
      datasets: [{
        label: 'Requests',
        data: createHistogramBins(rawLatencySamples, {bins: 6}),
        backgroundColor: 'rgba(56, 189, 248, .7)',
        borderColor: '#0284c7',
        borderWidth: 1,
      }],
    },
    options: {
      ...barOptions({x: {...axisOptions, type: 'linear'}, y: {...axisOptions, type: 'linear'}}),
      plugins: {legend: {labels: {color: '#f8fafc'}}},
    },
  }),

  new Chart(document.getElementById('histogram-bins-chart'), {
    type: 'histogram',
    data: {
      datasets: [{
        label: 'Events from backend',
        data: backendHistogramBins,
        backgroundColor: 'rgba(167, 139, 250, .7)',
        borderColor: '#7c3aed',
        borderWidth: 1,
      }],
    },
    options: {
      ...barOptions({x: {...axisOptions, type: 'linear'}, y: {...axisOptions, type: 'linear'}}),
      plugins: {legend: {labels: {color: '#f8fafc'}}},
    },
  }),

  new Chart(document.getElementById('pie-chart'), {
    type: 'pie',
    data: {
      labels: ['Direct', 'Search', 'Partners', 'Other'],
      datasets: [{
        backgroundColor: ['#60a5fa', '#34d399', '#fbbf24', '#f472b6'],
        borderColor: '#182230',
        borderWidth: 3,
        data: [38, 27, 21, 14],
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {legend: {labels: {color: '#f8fafc'}, title: {color: '#93c5fd', display: true, text: 'Channels'}}},
      renderer: 'canvas',
      responsive: true,
    },
  }),

  new Chart(document.getElementById('doughnut-chart'), {
    type: 'doughnut',
    data: {
      labels: ['Direct', 'Search', 'Partners', 'Other'],
      datasets: [{
        backgroundColor: ['#60a5fa', '#34d399', '#fbbf24', '#f472b6'],
        borderColor: '#182230',
        borderWidth: 3,
        data: [38, 27, 21, 14],
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {legend: {labels: {color: '#f8fafc'}}},
      renderer: 'canvas',
      responsive: true,
    },
  }),

  new Chart(document.getElementById('doughnut-style-chart'), {
    type: 'doughnut',
    data: {
      labels: ['Design', 'Development', 'Testing', 'Release'],
      datasets: [{
        backgroundColor: ['#818cf8', '#38bdf8', '#2dd4bf', '#fbbf24'],
        borderAlign: 'inner',
        borderColor: '#0f172a',
        borderDash: [4, 2],
        borderRadius: 12,
        borderWidth: 3,
        data: [30, 25, 20, 25],
        offset: 10,
        spacing: 5,
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {legend: {labels: {color: '#f8fafc'}}},
      renderer: 'canvas',
      responsive: true,
    },
  }),

  new Chart(document.getElementById('doughnut-rings-chart'), {
    type: 'doughnut',
    data: {
      labels: ['North', 'East', 'South', 'West'],
      datasets: [{
        backgroundColor: ['#60a5fa', '#60a5fa', '#60a5fa', '#60a5fa'],
        borderColor: '#182230',
        borderWidth: 3,
        data: [28, 18, 34, 20],
      }, {
        backgroundColor: ['#f472b6', '#f472b6', '#f472b6', '#f472b6'],
        borderColor: '#182230',
        borderWidth: 3,
        data: [15, 32, 17, 36],
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {legend: {labels: {color: '#f8fafc'}}},
      renderer: 'canvas',
      responsive: true,
    },
  }),

  new Chart(document.getElementById('bubble-chart'), {
    type: 'bubble',
    data: {datasets: [{label: 'Pipeline', data: [{x: 1, y: 7, r: 7}, {x: 3, y: 4, r: 16}, {x: 5, y: 8, r: 11}, {x: 7, y: 3, r: 24}], backgroundColor: 'rgba(52, 211, 153, .55)', borderColor: '#34d399', borderWidth: 2}]},
    options: {...barOptions({x: {...axisOptions, type: 'linear'}, y: {...axisOptions, type: 'linear'}})},
  }),

  new Chart(document.getElementById('radar-chart'), {
    type: 'radar',
    data: {labels: ['Speed', 'Quality', 'Cost', 'Reach', 'Support'], datasets: [{label: 'Current', data: [7, 9, 5, 8, 6], backgroundColor: 'rgba(96, 165, 250, .25)', borderColor: '#60a5fa', borderWidth: 2, pointBackgroundColor: '#f8fafc', pointRadius: 4}, {label: 'Target', data: [8, 7, 7, 9, 8], borderColor: '#fbbf24', borderDash: [5, 4], borderWidth: 2, pointRadius: 3}]},
    options: {maintainAspectRatio: false, plugins: {legend: {labels: {color: '#f8fafc'}}}, renderer: 'canvas', responsive: true, scales: {r: {backgroundColor: '#1d2939', grid: {color: '#475467'}, angleLines: {color: '#475467'}, pointLabels: {color: '#dbeafe'}, ticks: {backdropColor: 'transparent', color: '#b6c2d3'}}}},
  }),

  new Chart(document.getElementById('polar-chart'), {
    type: 'polarArea',
    data: {labels: ['North', 'East', 'South', 'West', 'Centre'], datasets: [{data: [11, 16, 8, 13, 6], backgroundColor: ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa'], borderColor: '#182230', borderWidth: 3}]},
    options: {maintainAspectRatio: false, plugins: {legend: {labels: {color: '#f8fafc'}}}, renderer: 'canvas', responsive: true, scales: {r: {grid: {color: '#475467'}, ticks: {backdropColor: 'transparent', color: '#b6c2d3'}}}},
  }),

  new Chart(document.getElementById('log-chart'), {
    type: 'line',
    data: {datasets: [{label: 'Orders of magnitude', data: [{x: 1, y: 1}, {x: 2, y: 8}, {x: 10, y: 90}, {x: 50, y: 850}, {x: 100, y: 9000}], borderColor: '#fb7185', pointBackgroundColor: '#fda4af', pointRadius: 4}]},
    options: {...barOptions({x: {...axisOptions, type: 'logarithmic'}, y: {...axisOptions, type: 'logarithmic'}})},
  }),

  new Chart(document.getElementById('time-chart'), {
    type: 'line',
    data: {datasets: [{label: 'Daily signups', data: [{x: '2026-01-01', y: 12}, {x: '2026-01-04', y: 28}, {x: '2026-01-10', y: 19}, {x: '2026-01-20', y: 36}], borderColor: '#22d3ee', backgroundColor: 'rgba(34, 211, 238, .18)', fill: true, tension: .25}]},
    options: {...barOptions({x: {...axisOptions, type: 'time', time: {unit: 'day'}}, y: {...axisOptions, type: 'linear'}})},
  }),

  new Chart(document.getElementById('timeseries-chart'), {
    type: 'line',
    data: {datasets: [{label: 'Release health', data: [{x: '2026-01-01', y: 42}, {x: '2026-01-02', y: 57}, {x: '2026-01-16', y: 48}, {x: '2026-03-30', y: 73}], borderColor: '#c084fc', pointBackgroundColor: '#e9d5ff', pointRadius: 5}]},
    options: {...barOptions({x: {...axisOptions, type: 'timeseries', time: {unit: 'day'}}, y: {...axisOptions, type: 'linear'}})},
  }),
];

const canvasBarChart = new Chart(document.getElementById('bar-chart'), {
  type: 'bar',
  data: groupedBarData(),
  options: barOptions(),
});

const allCharts = [...svgCharts, canvasBarChart];
const initialData = new Map(allCharts.map((chart) => [chart, structuredClone(chart.data)]));
const picker = document.getElementById('chart-picker');
const editor = document.getElementById('data-editor');
const editorError = document.getElementById('editor-error');

allCharts.forEach((chart, index) => {
  const option = document.createElement('option');
  option.value = String(index);
  option.textContent = `${index + 1}. ${chart.config.type}`;
  picker.appendChild(option);
});

function selectedChart() {
  return allCharts[Number(picker.value)];
}

function loadChartData() {
  editor.value = JSON.stringify(selectedChart().data, null, 2);
  editorError.textContent = '';
}

picker.addEventListener('change', loadChartData);
document.getElementById('apply-data').addEventListener('click', () => {
  try {
    selectedChart().data = JSON.parse(editor.value);
    selectedChart().update();
    editorError.textContent = 'Готово';
  } catch (error) {
    editorError.textContent = `JSON: ${error.message}`;
  }
});
document.getElementById('reset-data').addEventListener('click', () => {
  selectedChart().data = structuredClone(initialData.get(selectedChart()));
  selectedChart().update();
  loadChartData();
});
loadChartData();

for (const button of document.querySelectorAll('[data-renderer]')) {
  button.addEventListener('click', () => {
    for (const chart of allCharts) {
      chart.options.renderer = button.dataset.renderer;
      chart.update();
    }
    document.querySelector('.toolbar .active').classList.remove('active');
    button.classList.add('active');
  });
}
