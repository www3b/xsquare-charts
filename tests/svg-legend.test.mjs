import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PieController,
  PointElement,
} from '../dist/chart.js';

Chart.register(ArcElement, BarController, BarElement, CategoryScale, DoughnutController, Legend, LineController, LineElement, LinearScale, PieController, PointElement);

class SvgNode {
  constructor(document) {
    this.ownerDocument = document;
    this.children = [];
    this.attributes = new Map();
    this.style = {};
  }

  appendChild(node) {
    return this.insertBefore(node, null);
  }

  insertBefore(node, before) {
    node.remove();
    node.parentNode = this;
    const index = before ? this.children.indexOf(before) : -1;
    this.children.splice(index < 0 ? this.children.length : index, 0, node);
    return node;
  }

  remove() {
    if (!this.parentNode) {
      return;
    }
    this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1);
    this.parentNode = null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  get nextSibling() {
    return this.parentNode && this.parentNode.children[this.parentNode.children.indexOf(this) + 1];
  }

  get lastElementChild() {
    return this.children[this.children.length - 1];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }
}

function findChild(node, attribute, value) {
  return node && node.children.find((child) => child.getAttribute(attribute) === value);
}

function createContext(canvas) {
  const context = {canvas, measureText: (value) => ({width: String(value).length * 8})};
  return new Proxy(context, {
    get(target, property) {
      return property in target ? target[property] : () => {};
    }
  });
}

function createChart(type = 'line', dataSets, options = {}) {
  const document = {
    defaultView: {getComputedStyle: () => ({position: 'static'})},
    createElementNS: () => new SvgNode(document)
  };
  const parent = new SvgNode(document);
  const canvas = new SvgNode(document);
  canvas.width = 440;
  canvas.height = 300;
  canvas.offsetLeft = 0;
  canvas.offsetTop = 0;
  canvas.getContext = () => createContext(canvas);
  parent.appendChild(canvas);
  const chart = new Chart(canvas, {
    type,
    data: {labels: ['One', 'Two', 'Three', 'Four', 'Five', 'Six'], datasets: dataSets},
    options: {
      animation: false,
      plugins: {
        legend: {
          align: 'center',
          labels: {
            boxWidth: 24,
            borderRadius: 6,
            color: '#1d4ed8',
            font: {family: 'monospace', size: 14, style: 'italic', weight: 'bold'},
            padding: 8,
            useBorderRadius: true,
          },
          title: {color: '#7c3aed', display: true, font: {family: 'serif', size: 16, style: 'italic', weight: 'bold'}, position: 'center', text: 'Legend heading'},
        },
      },
      renderer: 'svg',
      responsive: false,
      ...options,
    },
  });
  return {canvas, chart, parent};
}

function legend(chart) {
  return findChild(chart.$chartjsSvgBackgroundRoot, 'data-chart-svg-part', 'legend');
}

function legendItems(chart) {
  return findChild(legend(chart), 'data-legend-role', 'items').children;
}

function itemSymbol(item) {
  return findChild(item, 'data-legend-role', 'symbol');
}

function itemText(item) {
  const label = findChild(item, 'data-legend-role', 'label');
  return findChild(label.children[0], 'data-svg-text-role', 'text');
}

function datasets() {
  return [{
    backgroundColor: '#60a5fa',
    borderColor: '#1d4ed8',
    borderDash: [4, 2],
    borderDashOffset: 3,
    borderJoinStyle: 'round',
    borderRadius: 6,
    borderWidth: 3,
    data: [1, 3, 2, 5, 4, 6],
    label: 'Revenue',
    pointStyle: 'triangle',
  }, {
    backgroundColor: '#34d399',
    borderColor: '#047857',
    borderWidth: 2,
    data: [2, 4, 1, 3, 5, 4],
    label: 'Cost',
  }];
}

test('SVG legend draws line and bar items from resolved Legend layout', () => {
  const line = createChart('line', datasets());
  const items = legendItems(line.chart);
  const first = items[0];
  const symbol = itemSymbol(first);
  const text = itemText(first);
  const title = findChild(legend(line.chart), 'data-legend-role', 'title');
  const titleText = findChild(title.children[0], 'data-svg-text-role', 'text');

  assert.equal(items.length, 2);
  assert.equal(text.children[0].textContent, 'Revenue');
  assert.equal(text.getAttribute('fill'), '#1d4ed8');
  assert.equal(text.getAttribute('font-family'), 'monospace');
  assert.equal(text.getAttribute('font-size'), '14');
  assert.equal(symbol.getAttribute('fill'), '#60a5fa');
  assert.equal(symbol.getAttribute('stroke'), '#1d4ed8');
  assert.equal(symbol.getAttribute('stroke-width'), '3');
  assert.equal(symbol.getAttribute('stroke-dasharray'), '4,2');
  assert.equal(symbol.getAttribute('stroke-dashoffset'), '3');
  assert.ok(symbol.getAttribute('d').includes('A'));
  assert.equal(titleText.children[0].textContent, 'Legend heading');
  assert.equal(titleText.getAttribute('fill'), '#7c3aed');
  assert.equal(titleText.getAttribute('font-family'), 'serif');
  assert.ok(legend(line.chart).getAttribute('clip-path').startsWith('url(#chartjs-'));
  line.chart.destroy();

  const bar = createChart('bar', datasets());
  assert.equal(legendItems(bar.chart).length, 2);
  assert.equal(itemSymbol(legendItems(bar.chart)[0]).getAttribute('stroke-linejoin'), 'miter');
  bar.chart.destroy();
});

// eslint-disable-next-line max-statements
test('SVG legend supports point styles, pie items, updates and interaction state', () => {
  const chartData = datasets();
  let clicked = false;
  let hovered = false;
  let left = false;
  const line = createChart('line', chartData, {
    plugins: {
      legend: {
        labels: {
          color: '#0f172a',
          generateLabels: () => ['circle', 'triangle', 'rect', 'rectRounded', 'cross', 'star'].map((pointStyle, index) => ({
            borderRadius: index === 3 ? 5 : 0,
            datasetIndex: index,
            fillStyle: '#fbbf24',
            fontColor: '#0f172a',
            hidden: index === 0,
            index,
            lineWidth: 2,
            pointStyle,
            rotation: index * 15,
            strokeStyle: '#92400e',
            text: index === 0 ? ['Circle', 'multiline'] : pointStyle,
          })),
          pointStyleWidth: 30,
          usePointStyle: true,
        },
        onClick: () => {
          clicked = true;
        },
        onHover: () => {
          hovered = true;
        },
        onLeave: () => {
          left = true;
        },
        rtl: true,
        textDirection: 'rtl',
        title: {display: false},
      }
    }
  });
  const items = legendItems(line.chart);

  assert.equal(legend(line.chart).getAttribute('direction'), 'rtl');
  assert.equal(items.length, 6);
  assert.ok(itemSymbol(items[0]).getAttribute('d').includes('A'));
  assert.match(itemSymbol(items[0]).getAttribute('d'), /A15,[^,]+,0,1,1/);
  assert.ok(itemSymbol(items[1]).getAttribute('d').includes('L'));
  assert.ok(itemSymbol(items[3]).getAttribute('d').includes('A'));
  assert.ok(itemSymbol(items[4]).getAttribute('d').match(/M.*L.*M/));
  assert.equal(itemText(items[0]).getAttribute('text-decoration'), 'line-through');
  assert.equal(itemText(items[0]).children.length, 2);
  assert.equal(findChild(legend(line.chart), 'data-legend-role', 'title'), undefined);
  const first = items[0];

  line.chart.options.plugins.legend.labels.usePointStyle = false;
  line.chart.options.plugins.legend.labels.pointStyleWidth = 10;
  line.chart.options.plugins.legend.position = 'left';
  line.chart.options.plugins.legend.align = 'start';
  line.chart.update('none');
  assert.equal(legendItems(line.chart)[0], first);
  assert.equal(itemSymbol(first).getAttribute('stroke-linecap'), 'butt');
  assert.ok(line.chart.legend.legendHitBoxes[0].width > 0);

  const firstHitbox = line.chart.legend.legendHitBoxes[0];
  const event = {type: 'click', x: firstHitbox.left + firstHitbox.width / 2, y: firstHitbox.top + firstHitbox.height / 2};
  assert.equal(line.chart.legend._getLegendItemAt(event.x, event.y), line.chart.legend.legendItems[0]);
  line.chart.legend.handleEvent(event);
  assert.equal(clicked, true);
  line.chart.legend.handleEvent({...event, type: 'mousemove'});
  line.chart.legend.handleEvent({type: 'mouseout', x: 0, y: 0});
  assert.equal(hovered, true);
  assert.equal(left, true);
  line.chart.destroy();

  const pie = createChart('pie', [{backgroundColor: ['#60a5fa', '#34d399', '#fbbf24'], borderColor: '#172554', borderWidth: 2, data: [3, 4, 5]}]);
  pie.chart.data.labels = ['One', 'Two', 'Three'];
  pie.chart.update('none');
  assert.equal(legendItems(pie.chart).length, 3);
  assert.equal(itemText(legendItems(pie.chart)[1]).children[0].textContent, 'Two');
  pie.chart.toggleDataVisibility(0);
  pie.chart.update('none');
  assert.equal(itemText(legendItems(pie.chart)[0]).getAttribute('text-decoration'), 'line-through');
  pie.chart.destroy();
});

test('SVG legend reuses nodes through resize, renderer switching and cleanup', () => {
  const {canvas, chart, parent} = createChart('line', datasets());
  const first = legendItems(chart)[0];
  const itemCount = legendItems(chart).length;

  chart.resize(200, 300);
  assert.equal(legendItems(chart)[0], first);
  assert.ok(legendItems(chart).length <= itemCount);
  chart.data.datasets.push({...datasets()[0], label: 'Forecast'});
  chart.update('none');
  assert.equal(legendItems(chart).length, 3);
  chart.data.datasets.pop();
  chart.update('none');
  assert.equal(legendItems(chart).length, 2);

  chart.options.plugins.legend.display = false;
  chart.update('none');
  assert.equal(legend(chart), undefined);
  chart.options.renderer = 'canvas';
  chart.update('none');
  assert.equal(chart.$chartjsSvgRoot, undefined);
  chart.options.renderer = 'svg';
  chart.options.plugins.legend.display = true;
  chart.update('none');
  assert.ok(legend(chart));
  chart.destroy();
  assert.deepEqual(parent.children, [canvas]);
});
