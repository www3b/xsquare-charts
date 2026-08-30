import assert from "node:assert/strict";
import test from "node:test";
import {createSvgChart} from "./helpers/svg-feature.mjs";

test("svg-legend renders through the SVG public path", () => {
  const {chart, host} = createSvgChart("line", undefined, { legend: {display: true}});
  assert.equal(chart.renderer, "svg");
  assert.equal(host.children.length, 1);
  assert.ok(chart.root.children.length > 0);
  chart.destroy();
  assert.equal(host.children.length, 0);
});
