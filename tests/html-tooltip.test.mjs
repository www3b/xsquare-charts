import assert from "node:assert/strict";
import test from "node:test";
import {createSvgChart} from "./helpers/svg-feature.mjs";

test("html-tooltip remains available through the public SVG chart API", () => {
  const {chart, host} = createSvgChart("line", undefined, { tooltip: {enabled: true}});
  assert.equal(chart.renderer, "svg");
  assert.equal(host.children.length, 1);
  assert.ok(chart.root);
  chart.destroy();
  assert.equal(host.children.length, 0);
});
