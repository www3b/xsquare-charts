import {Chart} from '/dist/chart.js';
import {createHistogramBins} from '/dist/utils.js';

const ids = ['area-chart','chart','bar-chart','bar-svg-chart','bar-stack-svg-chart','bar-horizontal-svg-chart','histogram-raw-chart','histogram-bins-chart','pie-chart','doughnut-chart','doughnut-style-chart','doughnut-rings-chart','bubble-chart','radar-chart','polar-chart','log-chart','time-chart','timeseries-chart'];
const palette = ['#60a5fa','#34d399','#fbbf24','#f472b6','#a78bfa'];
const hosts = new Map();
const base = {animation: false, responsive: true, maintainAspectRatio: false, legend: {display: true}, tooltip: {enabled: true}};
function make(id, type, series, extra = {}) {
  const host = document.getElementById(id);
  const chart = new Chart(host, {...base, type, renderer: extra.renderer || 'svg', data: {labels: extra.labels || ['A','B','C','D'], series}, ...extra});
  hosts.set(id, chart);
  return chart;
}
const revenue = [{name: 'Revenue', data: [12, 19, 8, 28], borderColor: palette[0], backgroundColor: 'rgba(96,165,250,.22)', fill: {target: 'origin', above: 'rgba(96,165,250,.22)', below: 'rgba(248,113,113,.22)'}, tension: .35, pointRadius: 4}];
make('area-chart', 'line', revenue, {title: {display: true, text: 'Revenue'}, subtitle: {display: true, text: 'Canvas and SVG share the same chart model'}});
make('chart', 'scatter', [{name: 'Points', data: [{x: 1,y: 4},{x: 2,y: 7},{x: 3,y: 3}], pointStyle: ['circle','triangle','star'], pointRadius: 7, backgroundColor: palette[1]}]);
make('bar-chart', 'bar', [{name: 'Actual', data: [18,-12,14,31], backgroundColor: palette[0], borderRadius: 8}], {renderer: 'canvas'});
make('bar-svg-chart', 'bar', [{name: 'Actual', data: [18,12,14,31], backgroundColor: palette[0], borderRadius: 8}, {name: 'Plan', data: [13,8,19,24], backgroundColor: palette[4], borderRadius: 8}]);
make('bar-stack-svg-chart', 'bar', [{name: 'A', data: [10,15,12,8], backgroundColor: palette[0], stack: 'total'}, {name: 'B', data: [8,6,11,14], backgroundColor: palette[1], stack: 'total'}], {scales: {x: {stacked: true}, y: {stacked: true}}});
make('bar-horizontal-svg-chart', 'bar', [{name: 'Range', data: [[2,9],[3,7],[1,6],[4,11]], backgroundColor: palette[2], borderRadius: 7}], {indexAxis: 'y'});
const bins=createHistogramBins([12,16,18,19,22,24,25,27,28,31,34,37,41,43,48,54,57,63]);
make('histogram-raw-chart','histogram',[{name:'Latency',data:bins,backgroundColor:palette[1]}]);
make('histogram-bins-chart','histogram',[{name:'Backend bins',data:[{xMin:0,xMax:10,y:4},{xMin:10,xMax:25,y:13},{xMin:25,xMax:50,y:9},{xMin:50,xMax:90,y:3}],backgroundColor:palette[2]}]);
make('pie-chart','pie',[{name:'Share',data:[11,16,8,13,6],backgroundColor:palette}]);
make('doughnut-chart','doughnut',[{name:'Share',data:[11,16,8,13,6],backgroundColor:palette}]);
make('doughnut-style-chart','doughnut',[{name:'Styled',data:[10,20,30,15],backgroundColor:palette,spacing:4,offset:4,borderRadius:5}]);
make('doughnut-rings-chart','doughnut',[{name:'Current',data:[8,12,7],backgroundColor:palette.slice(0,3)},{name:'Target',data:[6,9,11],backgroundColor:palette.slice(2)}]);
make('bubble-chart','bubble',[{name:'Pipeline',data:[{x:1,y:7,r:7},{x:3,y:4,r:16},{x:5,y:8,r:11},{x:7,y:3,r:24}],backgroundColor:'rgba(52,211,153,.55)',borderColor:palette[1]}]);
make('radar-chart','radar',[{name:'Current',data:[7,9,5,8,6],backgroundColor:'rgba(96,165,250,.25)',borderColor:palette[0],fill:true},{name:'Target',data:[8,7,7,9,8],borderColor:palette[2],borderDash:[5,4]}],{labels:['Speed','Quality','Cost','Reach','Support']});
make('polar-chart','polarArea',[{name:'Regions',data:[11,16,8,13,6],backgroundColor:palette}]);
make('log-chart','line',[{name:'Orders',data:[{x:1,y:1},{x:2,y:8},{x:10,y:90},{x:50,y:850},{x:100,y:9000}],borderColor:palette[3],pointRadius:4}],{scales:{x:{type:'logarithmic'},y:{type:'logarithmic'}}});
make('time-chart','line',[{name:'Signups',data:[{x:'2026-01-01',y:12},{x:'2026-01-04',y:28},{x:'2026-01-10',y:19},{x:'2026-01-20',y:36}],borderColor:'#22d3ee',fill:true}],{scales:{x:{type:'time'}}});
make('timeseries-chart','line',[{name:'Release health',data:[{x:'2026-01-01',y:42},{x:'2026-01-02',y:57},{x:'2026-01-16',y:48},{x:'2026-03-30',y:73}],borderColor:palette[4],pointRadius:5}],{scales:{x:{type:'timeseries'}}});
document.querySelectorAll('[data-renderer]').forEach((button) => button.addEventListener('click', () => { const renderer=button.dataset.renderer; hosts.forEach((chart) => chart.setRenderer(renderer)); document.querySelectorAll('[data-renderer]').forEach((item)=>item.classList.toggle('active',item===button)); }));
