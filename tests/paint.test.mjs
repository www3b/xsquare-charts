import assert from "node:assert/strict";
import test from "node:test";
import {createSvgChart} from "./helpers/svg-feature.mjs";

test("paint remains available through the public SVG chart API", () => {
  const {chart, host} = createSvgChart("radar", [{name: "Paint", data: [2, 4, 3], backgroundColor: {type: "linear-gradient", x0: 0, y0: 0, x1: 100, y1: 0, colorStops: [{offset: 0, color: "#2563eb"}, {offset: 1, color: "#60a5fa"}]}}]);
  assert.equal(chart.renderer, "svg");
  assert.equal(host.children.length, 1);
  assert.ok(chart.root);
  chart.destroy();
  assert.equal(host.children.length, 0);
});
