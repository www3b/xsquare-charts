/* eslint-disable brace-style */
/* eslint-disable camelcase */
/* eslint-disable eqeqeq */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-eq-null */
//
const pi = Math.PI;
const tau = 2 * pi;
const epsilon = 1e-6;
const tauEpsilon = tau - epsilon;

function append(strings) {
  this._ += strings[0];
  for (let i = 1, n = strings.length; i < n; ++i) {
    this._ += arguments[i] + strings[i];
  }
}

function appendRound(digits) {
  let d = Math.floor(digits);
  if (!(d >= 0)) {
    throw new Error(`invalid digits: ${digits}`);
  }
  if (d > 15) {
    return append;
  }
  const k = 10 ** d;
  return function(strings) {
    this._ += strings[0];
    for (let i = 1, n = strings.length; i < n; ++i) {
      this._ += Math.round(arguments[i] * k) / k + strings[i];
    }
  };
}

export class Path {
  constructor(digits) {
    this._x0 = this._y0 = // start of current subpath
    this._x1 = this._y1 = null; // end of current subpath
    this._ = '';
    this._append = digits == null ? append : appendRound(digits);
  }
  moveTo(x, y) {
    this._append`M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}`;
  }
  closePath() {
    if (this._x1 !== null) {
      this._x1 = this._x0;
      this._y1 = this._y0;
      this._append`Z`;
    }
  }
  lineTo(x, y) {
    this._append`L${this._x1 = +x},${this._y1 = +y}`;
  }
  quadraticCurveTo(x1, y1, x, y) {
    this._append`Q${+x1},${+y1},${this._x1 = +x},${this._y1 = +y}`;
  }
  bezierCurveTo(x1, y1, x2, y2, x, y) {
    this._append`C${+x1},${+y1},${+x2},${+y2},${this._x1 = +x},${this._y1 = +y}`;
  }
  arcTo(x1, y1, x2, y2, r) {
    x1 = +x1;
    y1 = +y1;
    x2 = +x2;
    y2 = +y2;
    r = +r;

    // Is the radius negative? Error.
    if (r < 0) {
      throw new Error(`negative radius: ${r}`);
    }

    let x0 = this._x1;
    let y0 = this._y1;
    let x21 = x2 - x1;
    let y21 = y2 - y1;
    let x01 = x0 - x1;
    let y01 = y0 - y1;
    let l01_2 = x01 * x01 + y01 * y01;

    // Is this path empty? Move to (x1,y1).
    if (this._x1 === null) {
      this._append`M${this._x1 = x1},${this._y1 = y1}`;
    }

    // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
    else if (!(l01_2 > epsilon)) {
      //
    }

    // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
    // Equivalently, is (x1,y1) coincident with (x2,y2)?
    // Or, is the radius zero? Line to (x1,y1).
    else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
      this._append`L${this._x1 = x1},${this._y1 = y1}`;
    }

    // Otherwise, draw an arc!
    else {
      let x20 = x2 - x0;
      let y20 = y2 - y0;
      let l21_2 = x21 * x21 + y21 * y21;
      let l20_2 = x20 * x20 + y20 * y20;
      let l21 = Math.sqrt(l21_2);
      let l01 = Math.sqrt(l01_2);
      let l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2);
      let t01 = l / l01;
      let t21 = l / l21;

      // If the start tangent is not coincident with (x0,y0), line to.
      if (Math.abs(t01 - 1) > epsilon) {
        this._append`L${x1 + t01 * x01},${y1 + t01 * y01}`;
      }

      this._append`A${r},${r},0,0,${+(y01 * x20 > x01 * y20)},${this._x1 = x1 + t21 * x21},${this._y1 = y1 + t21 * y21}`;
    }
  }
  arc(x, y, r, a0, a1, ccw) {
    x = +x;
    y = +y;
    r = +r;
    ccw = !!ccw;

    // Is the radius negative? Error.
    if (r < 0) {
      throw new Error(`negative radius: ${r}`);
    }

    let dx = r * Math.cos(a0);
    let dy = r * Math.sin(a0);
    let x0 = x + dx;
    let y0 = y + dy;
    let cw = 1 ^ ccw;
    let da = ccw ? a0 - a1 : a1 - a0;

    // Is this path empty? Move to (x0,y0).
    if (this._x1 === null) {
      this._append`M${x0},${y0}`;
    }

    // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
    else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
      this._append`L${x0},${y0}`;
    }

    // Is this arc empty? We’re done.
    if (!r) {
      return;
    }

    // Does the angle go the wrong way? Flip the direction.
    if (da < 0) {
      da = da % tau + tau;
    }

    // Is this a complete circle? Draw two arcs to complete the circle.
    if (da > tauEpsilon) {
      this._append`A${r},${r},0,1,${cw},${x - dx},${y - dy}A${r},${r},0,1,${cw},${this._x1 = x0},${this._y1 = y0}`;
    }

    // Is this arc non-empty? Draw an arc!
    else if (da > epsilon) {
      this._append`A${r},${r},0,${+(da >= pi)},${cw},${this._x1 = x + r * Math.cos(a1)},${this._y1 = y + r * Math.sin(a1)}`;
    }
  }
  // eslint-disable-next-line complexity
  ellipse(x, y, rx, ry, rotation, a0, a1, ccw) {
    x = +x;
    y = +y;
    rx = +rx;
    ry = +ry;
    rotation = +rotation;
    ccw = !!ccw;

    if (rx < 0 || ry < 0) {
      throw new Error('negative radius: ' + (rx < 0 ? rx : ry));
    }

    const point = (angle) => {
      const cosAngle = Math.cos(angle);
      const sinAngle = Math.sin(angle);
      const cosRotation = Math.cos(rotation);
      const sinRotation = Math.sin(rotation);
      return {
        x: x + rx * cosAngle * cosRotation - ry * sinAngle * sinRotation,
        y: y + rx * cosAngle * sinRotation + ry * sinAngle * cosRotation
      };
    };
    const start = point(a0);
    const end = point(a1);
    const cw = 1 ^ ccw;
    let da = ccw ? a0 - a1 : a1 - a0;

    if (this._x1 === null) {
      this._append`M${this._x1 = start.x},${this._y1 = start.y}`;
    } else if (Math.abs(this._x1 - start.x) > epsilon || Math.abs(this._y1 - start.y) > epsilon) {
      this._append`L${this._x1 = start.x},${this._y1 = start.y}`;
    }

    if (!rx || !ry) {
      return;
    }

    if (da < 0) {
      da = da % tau + tau;
    }

    const rotationDegrees = rotation * 180 / pi;
    if (da > tauEpsilon) {
      const opposite = point(a0 + pi);
      this._append`A${rx},${ry},${rotationDegrees},1,${cw},${opposite.x},${opposite.y}A${rx},${ry},${rotationDegrees},1,${cw},${this._x1 = start.x},${this._y1 = start.y}`;
    } else if (da > epsilon) {
      this._append`A${rx},${ry},${rotationDegrees},${+(da >= pi)},${cw},${this._x1 = end.x},${this._y1 = end.y}`;
    }
  }
  rect(x, y, w, h) {
    this._append`M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}h${w = +w}v${+h}h${-w}Z`;
  }
  toString() {
    return this._;
  }
}

export function path() {
  return new Path();
}

// Allow instanceof d3.path
path.prototype = Path.prototype;

export function pathRound(digits = 3) {
  return new Path(+digits);
}
