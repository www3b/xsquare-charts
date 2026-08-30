import assert from "node:assert/strict";
import test from "node:test";
import {createSvgChart, svgParts} from "./helpers/svg-feature.mjs";

test("svg-line renders through the SVG public path", () => {
  const {chart, host} = createSvgChart("line", undefined);
  assert.equal(chart.renderer, "svg");
  assert.equal(host.children.length, 1);
  assert.ok(svgParts(chart, "line").length > 0);
  chart.destroy();
  assert.equal(host.children.length, 0);
});
