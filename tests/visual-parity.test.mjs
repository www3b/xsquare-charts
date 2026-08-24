import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import pixelmatch from 'pixelmatch';
import {PNG} from 'pngjs';
import test from 'node:test';
import {chrome, execute, hasChrome, startServer} from './helpers/chromium.mjs';

const fixtures=['line-straight','line-bezier-gaps','line-stepped','bar-grouped','bar-horizontal-floating','bar-stacked','doughnut','arc-multiturn','scatter','bubble','radar','filler-boundaries','filler-stack-shape','legend-title','paint-gradient'];
const width=420, height=250, threshold=.1, maxRatio=.01;
async function capture(port, profile, fixture, renderer) {
  const file=join(profile, `${fixture}-${renderer}.png`);
  const {stdout}=await execute(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-sandbox','--force-device-scale-factor=1',`--user-data-dir=${profile}`,`--window-size=${width},${height}`,'--virtual-time-budget=1000',`--screenshot=${file}`,'--dump-dom',`http://127.0.0.1:${port}/tests/fixtures/visual-parity.html?fixture=${fixture}&renderer=${renderer}`],{timeout:15000,maxBuffer:1024*1024});
  assert.match(stdout,/data-visual-ready="true"/,'TEST ENVIRONMENT FAILURE: fixture did not become ready');
  const layout=JSON.parse(stdout.match(/<output id="result">([^<]+)<\/output>/)[1]);
  assert.ifError(layout.error);
  return {file,layout,png:PNG.sync.read(await readFile(file))};
}
test('Canvas and SVG canonical charts remain visually equivalent', {skip:!hasChrome(),timeout:120000}, async()=>{
 const server=await startServer(), profile=await mkdtemp(join(tmpdir(),'xsquare-visual-')); const {port}=server.address();
 try { for(const fixture of fixtures) { const canvas=await capture(port,profile,fixture,'canvas'), svg=await capture(port,profile,fixture,'svg');
   assert.deepEqual(canvas.layout,svg.layout,`LAYOUT DIFFERENCE: ${fixture}`); assert.equal(canvas.png.width,svg.png.width); assert.equal(canvas.png.height,svg.png.height);
   const diff=new PNG({width:canvas.png.width,height:canvas.png.height}); const count=pixelmatch(canvas.png.data,svg.png.data,diff.data,width,height,{threshold}); const ratio=count/(width*height);
   console.log(`${fixture.padEnd(24)} ${(ratio*100).toFixed(2)}% diff ${ratio<=maxRatio?'PASS':'FAIL'}`);
   if(ratio>maxRatio){const artifacts=await mkdtemp(join(tmpdir(),`xsquare-visual-${fixture}-`)); await Promise.all([writeFile(join(artifacts,'canvas.png'),PNG.sync.write(canvas.png)),writeFile(join(artifacts,'svg.png'),PNG.sync.write(svg.png)),writeFile(join(artifacts,'diff.png'),PNG.sync.write(diff))]); assert.fail(`VISUAL DIFFERENCE: ${fixture} ${(ratio*100).toFixed(2)}%; artifacts: ${artifacts}`);}
 }} finally {await new Promise(resolve=>server.close(resolve)); await rm(profile,{recursive:true,force:true});}
});
