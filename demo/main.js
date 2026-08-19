import {
  Chart,
  CategoryScale,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from '/dist/chart.js';

Chart.register(CategoryScale, Legend, LineController, LineElement, LinearScale, PointElement, Tooltip);

const chart = new Chart(document.getElementById('chart'), {
  type: 'line',
  data: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Revenue',
      data: [12, 19, null, 28, 22, 35, 31],
      borderColor: '#60a5fa',
      borderWidth: 3,
      borderDash: [8, 5],
      cubicInterpolationMode: 'monotone',
      tension: 0.4,
      pointBackgroundColor: '#f8fafc',
      pointBorderColor: '#60a5fa',
      pointRadius: 5,
      segment: {
        borderColor(context) {
          return context.p0.parsed.y > context.p1.parsed.y ? '#f87171' : '#60a5fa';
        },
      },
    }],
  },
  options: {
    renderer: 'canvas',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {labels: {color: '#f8fafc'}},
    },
    scales: {
      x: {ticks: {color: '#b6c2d3'}, grid: {color: '#344054'}},
      y: {ticks: {color: '#b6c2d3'}, grid: {color: '#344054'}},
    },
  },
});

for (const button of document.querySelectorAll('[data-renderer]')) {
  button.addEventListener('click', () => {
    chart.options.renderer = button.dataset.renderer;
    chart.update();
    document.querySelector('.active').classList.remove('active');
    button.classList.add('active');
  });
}
