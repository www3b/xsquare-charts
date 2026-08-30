# XSQUARE Charts

```ts
import {Chart} from 'xsquare-charts';

const chart = new Chart(host, {
  type: 'line',
  data: {
    labels: ['Jan', 'Feb', 'Mar'],
    series: [{name: 'Revenue', data: [12, 18, 15], borderColor: '#2563eb'}]
  },
  scales: {x: {type: 'category'}, y: {type: 'linear', beginAtZero: true}}
});
```

`host` is an HTML container. SVG is the default renderer; use `renderer: 'canvas'`
for Canvas, and `chart.setRenderer('svg' | 'canvas')` to switch surfaces.
