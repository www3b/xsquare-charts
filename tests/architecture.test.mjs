import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import test from 'node:test';

const root = new URL('../src/', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');
function files(path) { return readdirSync(new URL(path, root), {withFileTypes: true}).flatMap((entry) => entry.isDirectory() ? files(`${path}/${entry.name}`) : [`${path}/${entry.name}`]); }

test('series, geometry, scales and component models remain renderer-neutral', () => {
  for (const domain of ['series', 'geometry', 'scales']) {
    for (const file of files(domain).filter((name) => /\.(?:js|ts)$/.test(name))) assert.doesNotMatch(source(file), /renderers\/(?:canvas|svg)|createElementNS/, file);
  }
  for (const file of ['components/legend.js', 'components/title.js', 'components/subtitle.js']) assert.doesNotMatch(source(file), /renderers\/(?:canvas|svg)|createElementNS/, file);
});

test('active source contains no legacy registry or controller/element architecture', () => {
  const active = ['components', 'series', 'geometry', 'scales', 'renderers', 'animation', 'platform', 'shared', 'utils'].flatMap(files).filter((name) => /\.(?:js|ts)$/.test(name)).map(source).join('\n');
  assert.doesNotMatch(active, /ComponentCatalog|ComponentStore|PluginService|Chart\.register|registerables|RendererRegistry/);
  assert.doesNotMatch(active, /\b(?:DatasetController|LineController|BarController|BubbleController|DoughnutController|HistogramController|PieController|PolarAreaController|RadarController|ScatterController|ArcElement|BarElement|LineElement|PointElement)\b/);
});

test('internal modules do not depend on the public root entry point', () => {
  for (const domain of ['components', 'series', 'geometry', 'scales', 'renderers', 'animation', 'platform', 'shared']) {
    for (const file of files(domain).filter((name) => /\.(?:js|ts)$/.test(name))) assert.doesNotMatch(source(file), /from ['\"][^'\"]*index(?:\.ts)?['\"]/, file);
  }
});
