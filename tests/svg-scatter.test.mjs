import assert from "node:assert/strict";
import test from "node:test";
import {createSvgChart, svgDatasetLayer} from "./helpers/svg-feature.mjs";

test("svg-scatter renders through the SVG public path", () => {
  const {chart, host} = createSvgChart("scatter", undefined);
  assert.equal(chart.renderer, "svg");
  assert.equal(host.children.length, 1);
  assert.ok(svgDatasetLayer(chart).length > 0);
  chart.destroy();
  assert.equal(host.children.length, 0);
});
