import assert from 'node:assert/strict';
import test from 'node:test';
import {createHistogramBins} from '../dist/utils.js';

test('createHistogramBins selects and validates binning strategies', () => {
  const values = [0, 0.5, 1, 1.5, 2, NaN, Infinity];
  const thresholds = [0, 1, 2];

  assert.deepEqual(createHistogramBins([], {bins: 2}), []);
  assert.deepEqual(createHistogramBins([4, NaN]), [{xMin: 3.5, xMax: 4.5, y: 1}]);
  assert.equal(createHistogramBins([4, 4, 4, 4]).length, 3); // Sturges plus non-zero width
  assert.deepEqual(createHistogramBins(values, {thresholds}), [
    {xMin: 0, xMax: 1, y: 2},
    {xMin: 1, xMax: 2, y: 3},
  ]);
  assert.deepEqual(thresholds, [0, 1, 2]);

  const fixedWidth = createHistogramBins([0.1, 1.9, 2], {binWidth: 1});
  assert.deepEqual(fixedWidth, [
    {xMin: 0, xMax: 1, y: 1},
    {xMin: 1, xMax: 2, y: 2},
  ]);

  const explicitCount = createHistogramBins([0, 1, 2, 3], {bins: 3});
  assert.equal(explicitCount.length, 3);
  assert.equal(explicitCount.reduce((sum, bin) => sum + bin.y, 0), 4);
  assert.equal(createHistogramBins([0, 1, 2, 3]).length, 3); // Sturges

  assert.throws(() => createHistogramBins([1], {thresholds: [0]}), /at least two/);
  assert.throws(() => createHistogramBins([1], {thresholds: [0, 0]}), /strictly ascending/);
  assert.throws(() => createHistogramBins([1], {binWidth: 0}), /greater than zero/);
  assert.throws(() => createHistogramBins([1], {bins: 1.5}), /positive integer/);
});
