import assert from "node:assert/strict";
import test from "node:test";
import {createSvgChart} from "./helpers/svg-feature.mjs";

test("histogram remains available through the public SVG chart API", () => {
  const {chart, host} = createSvgChart("histogram", [{name: "Bins", data: [{xMin: 0, xMax: 1, y: 2}, {xMin: 1, xMax: 3, y: 4}]}]);
  assert.equal(chart.renderer, "svg");
  assert.equal(host.children.length, 1);
  assert.ok(chart.root);
  chart.destroy();
  assert.equal(host.children.length, 0);
});
