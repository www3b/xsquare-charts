import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import pixelmatch from 'pixelmatch';
import {PNG} from 'pngjs';
import test from 'node:test';
import {chrome, execute, hasChrome, startServer} from './helpers/chromium.mjs';

const fixtures=['line-straight','line-bezier-gaps','line-stepped','bar-grouped','bar-horizontal-floating','bar-stacked','doughnut','arc-multiturn','scatter','bubble','radar','filler-boundaries','filler-stack-shape','legend-title','paint-gradient'];
const width=450, height=250, gap=20, atlasWidth=width * 2 + gap, atlasHeight=(height + gap) * fixtures.length - gap;
function crop(source, [x,y,w,h]) { const result=new PNG({width:w,height:h}); PNG.bitblt(source,result,x,y,w,h,0,0); return result; }
function maxDelta(first, second) { return Math.max(...first.map((value,index)=>Math.abs(value-second[index]))); }
async function screenshot(port, profile) {
  const file=join(profile,'atlas.png');
  const {stdout}=await execute(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-sandbox','--disable-background-networking','--disable-extensions','--hide-scrollbars','--force-device-scale-factor=1',`--user-data-dir=${profile}`,`--window-size=${atlasWidth},${atlasHeight}`,'--virtual-time-budget=3000','--dump-dom',`--screenshot=${file}`,`http://127.0.0.1:${port}/tests/fixtures/visual-parity.html`],{timeout:20000,maxBuffer:4*1024*1024});
  assert.match(stdout,/data-visual-ready="true"/,'TEST ENVIRONMENT FAILURE: Chromium fixture did not become ready');
  const result=JSON.parse(stdout.match(/<output id="result">([^<]+)<\/output>/)[1]);
  assert.ifError(result.error); return {png:PNG.sync.read(await readFile(file)),result};
}
test('Canvas and SVG visual raw baseline', {skip:!hasChrome() && 'VISUAL PARITY NOT CHECKED: Chromium unavailable',timeout:30000}, async()=>{
  const server=await startServer(), profile=await mkdtemp(join(tmpdir(),'xsquare-visual-')), artifacts=await mkdtemp(join(tmpdir(),'xsquare-visual-baseline-')); const {port}=server.address();
  try { const {png,result}=await screenshot(port,profile); assert.equal(png.width,atlasWidth); assert.equal(png.height,atlasHeight);
    for(const fixture of fixtures){const canvasKey=`${fixture}-canvas`,svgKey=`${fixture}-svg`,canvas=result.layouts[canvasKey],svg=result.layouts[svgKey],canvasRect=result.rects[canvasKey],svgRect=result.rects[svgKey];
      assert.deepEqual(canvas.size,[width,height],`LAYOUT DIFFERENCE: ${fixture} canvas surface`); assert.deepEqual(svg.size,[width,height],`LAYOUT DIFFERENCE: ${fixture} svg surface`); assert.deepEqual([canvasRect[2],canvasRect[3]],[width,height]); assert.deepEqual([svgRect[2],svgRect[3]],[width,height]); assert.deepEqual(canvas.elements,svg.elements,`LAYOUT DIFFERENCE: ${fixture} elements`);
      const coordinates=[...canvas.chartArea,...Object.values(canvas.scales).flat()], other=[...svg.chartArea,...Object.values(svg.scales).flat()]; const layoutDelta=maxDelta(coordinates,other); const canvasPng=crop(png,canvasRect),svgPng=crop(png,svgRect),diff=new PNG({width,height}); const count=pixelmatch(canvasPng.data,svgPng.data,diff.data,width,height,{threshold:.1}); const ratio=count/(width*height);
      await Promise.all([writeFile(join(artifacts,`${fixture}-canvas.png`),PNG.sync.write(canvasPng)),writeFile(join(artifacts,`${fixture}-svg.png`),PNG.sync.write(svgPng)),writeFile(join(artifacts,`${fixture}-diff.png`),PNG.sync.write(diff))]);
      console.log(`${fixture.padEnd(24)} ${count.toString().padStart(6)} ${(ratio*100).toFixed(2)}% layout Δ ${layoutDelta.toFixed(3)}`);
    }
    const {diagnostics}=result;
    assert.ok(diagnostics,'TEST ENVIRONMENT FAILURE: visual fixture did not return diagnostics');
    assert.equal(diagnostics.fontStatus,'loaded','TEST ENVIRONMENT FAILURE: diagnostics ran before fonts were ready');
    assert.ok(diagnostics.text.some(probe=>probe.name==='line-straight:x'&&probe.text==='A'),'TEST ENVIRONMENT FAILURE: missing Cartesian text probe');
    assert.ok(diagnostics.text.some(probe=>probe.name==='legend-title:Parity title'),'TEST ENVIRONMENT FAILURE: missing title text probe');
    console.log('font readiness / cache locality');
    console.table([...diagnostics.fontReadiness,...diagnostics.cacheLocality]);
    console.log('text measurement diagnostics');
    console.table(diagnostics.text.map(probe=>({
      probe:probe.name,
      text:probe.text,
      font:probe.font,
      canvas:probe.canvas,
      svgMeasure:probe.svgMeasure,
      painted:probe.painted?.length,
      bbox:probe.painted?.bbox,
      difference:Number((probe.canvas-probe.svgMeasure).toFixed(4)),
      measureFontAttribute:probe.svgMeasureNode.font,
      measureFamily:probe.svgMeasureNode.computedFamily,
      paintedStyleFont:probe.painted?.styleFont,
      paintedFamily:probe.painted?.computedFamily,
      probeA:probe.probes['attribute-font'].length,
      probeB:probe.probes['style-font'].length,
      probeC:probe.probes['presentation-font'].length
    })));
    console.log('layout side deltas (SVG - Canvas)');
    console.table(diagnostics.layoutDeltas);
    console.log('Cartesian isolation diagnostics');
    console.table(diagnostics.isolation);
    console.log(`raw artifacts: ${artifacts}`);
  } finally { await new Promise(resolve=>server.close(resolve)); await rm(profile,{recursive:true,force:true}); }
});
