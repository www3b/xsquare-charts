import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  ScatterController,
  SubTitle,
  Title,
  Tooltip,
  PieController,
} from '/dist/chart.js';

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  ScatterController,
  SubTitle,
  Title,
  Tooltip,
  PieController,
);

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
];

new Chart(document.getElementById('bar-chart'), {
  type: 'bar',
  data: groupedBarData(),
  options: barOptions(),
});

for (const button of document.querySelectorAll('[data-renderer]')) {
  button.addEventListener('click', () => {
    for (const chart of svgCharts) {
      chart.options.renderer = button.dataset.renderer;
      chart.update();
    }
    document.querySelector('.toolbar .active').classList.remove('active');
    button.classList.add('active');
  });
}
