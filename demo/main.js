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
  Tooltip,
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
  Tooltip,
);

const axisOptions = {
  backgroundColor: 'rgba(15, 23, 42, 0.25)',
  border: {color: '#667085', width: 2},
  grid: {color: '#344054', tickColor: '#667085', tickWidth: 1},
  ticks: {color: '#b6c2d3'},
};

const svgCharts = [
  new Chart(document.getElementById('area-chart'), {
    type: 'line',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
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
      plugins: {legend: {labels: {color: '#f8fafc'}}},
      renderer: 'canvas',
      responsive: true,
      scales: {x: axisOptions, y: axisOptions},
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
];

new Chart(document.getElementById('bar-chart'), {
  type: 'bar',
  data: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [{
      label: 'Orders',
      data: [18, 26, 14, 31, 22],
      backgroundColor: ['#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#f0abfc'],
      borderRadius: 6,
    }],
  },
  options: {
    maintainAspectRatio: false,
    plugins: {legend: {labels: {color: '#f8fafc'}}},
    responsive: true,
    scales: {x: axisOptions, y: axisOptions},
  },
});

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
    responsive: true,
  },
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
