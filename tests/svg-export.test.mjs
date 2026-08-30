import assert from "node:assert/strict";
import test from "node:test";
import {createSvgChart} from "./helpers/svg-feature.mjs";

test("SVG export is scoped to an SVG chart", () => {
  const {chart} = createSvgChart("line", [{name: "Revenue", data: [2, 5, 3], fill: true, backgroundColor: "#60a5fa"}]);
  assert.throws(() => chart.toSVG(), /cloneNode|XMLSerializer/);
  chart.destroy();
});
