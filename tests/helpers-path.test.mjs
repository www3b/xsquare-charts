import assert from 'node:assert/strict';
import test from 'node:test';
import {Path} from '../src/geometry/path.js';

test('Path serializes full ellipses with independent horizontal and vertical radii', () => {
  const path = new Path();
  path.ellipse(0, 0, 20, 10, 0, 0, Math.PI * 2);
  const d = path.toString();

  assert.match(d, /^M20,0A20,10,0,1,1,-20,/);
  assert.match(d, /A20,10,0,1,1,20,0$/);
});

test('Path ellipse preserves rotation, endpoints and sweep direction', () => {
  const rotated = new Path();
  rotated.ellipse(0, 0, 20, 10, Math.PI / 4, 0, Math.PI / 2);
  assert.match(rotated.toString(), /A20,10,45,0,1,-7\.07106781186547/);

  const counterclockwise = new Path();
  counterclockwise.ellipse(0, 0, 20, 10, 0, 0, -Math.PI / 2, true);
  assert.match(counterclockwise.toString(), /A20,10,0,0,0,/);
});
