import assert from "node:assert/strict";
import test from "node:test";
import {createSvgChart, svgParts} from "./helpers/svg-feature.mjs";

test("svg-filler renders through the SVG public path", () => {
  const {chart, host} = createSvgChart("line", [{name: "Values", data: [2, 5, 3], fill: true, backgroundColor: "#60a5fa"}]);
  assert.equal(chart.renderer, "svg");
  assert.equal(host.children.length, 1);
  assert.ok(svgParts(chart, "fill").length > 0);
  chart.destroy();
  assert.equal(host.children.length, 0);
});
