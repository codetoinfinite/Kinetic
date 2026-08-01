/* ==========================================================================
   GPU Cubic-Bezier Burst — GLSL
   --------------------------------------------------------------------------
   A CSS cubic-bezier() easing curve, solved in the vertex shader.

   The curve is defined parametrically: for a parameter t you get a point
   (x(t), y(t)), but easing needs y at a given *x*, and there is no closed form
   for t(x) on a cubic. CSS engines solve it numerically; so does this, with
   Newton's method, 8 iterations, per vertex, per frame.

   Why bother when the CPU could compute one eased value and hand it over as a
   uniform? Because then every particle in the burst shares one easing. Here
   the control points ride in an attribute, so each particle carries its own
   curve — one flies out sharply and settles, its neighbour accelerates late —
   and the CPU does nothing per frame but advance a clock.
   ========================================================================== */

/**
 * `aBurstData = vec4(isBurst, flightAngle, sizeScale, delay)`
 * `aBezier    = vec4(p1x, p1y, p2x, p2y)` — the same four numbers CSS takes.
 * `aStart`    = burst-clock time this particle was fired at; 0 means never.
 */
export const GPU_BEZIER_BURST_VERT = /* glsl */ `
attribute vec4 aBurstData;
attribute vec4 aBezier;
attribute float aStart;

uniform float uBurstTime;
uniform float uRotation;
uniform float uViewScale;
uniform float uPixelRatio;
uniform float uDotScale;
uniform float uOpacity;
uniform float uBurstDuration;
uniform float uBurstRadius;

varying float vAlpha;
varying float vAlphaScale;
varying float vBurst;
varying float vHeat;

/* Newton's method converges quadratically on a well-behaved cubic, so 8 steps
   is far past the point of diminishing returns — 4 already lands inside a
   pixel. 8 is cheap insurance for control points near 0 or 1, where the
   derivative gets small and convergence slows. */
const int NEWTON_ITERATIONS = 8;

/* Bail out if the derivative collapses. Without the guard, a curve with a flat
   segment divides by ~0 and t explodes to NaN, which propagates into
   gl_Position and silently drops the vertex. */
const float MIN_DERIVATIVE = 0.000001;

const float MIN_POINT_SIZE = 2.0;
const float UNCLAMPED_MIN_POINT_SIZE = 1.0;

/* Burst dots shrink to 45% as they fly. Constant-size particles read as a
   spray of confetti; shrinking ones read as one thing dissipating. */
const float BURST_END_SIZE = 0.45;

/**
 * Solve y for a given x on the cubic with control points (0,0), (b.xy),
 * (b.zw), (1,1). Both endpoints are pinned, which is why only two points and
 * four numbers are needed, exactly as in CSS.
 */
float cubicBezier(float x, vec4 bezier) {
  float t = x;                       // x is a good first guess: the curve is monotonic in x
  for (int i = 0; i < NEWTON_ITERATIONS; i++) {
    float ct = 1.0 - t;
    // Bernstein form with P0x = 0 and P3x = 1 folded in.
    float bx = 3.0 * ct * ct * t * bezier.x + 3.0 * ct * t * t * bezier.z + t * t * t;
    float dx = 3.0 * ct * ct * bezier.x
             + 6.0 * ct * t * (bezier.z - bezier.x)
             + 3.0 * t * t * (1.0 - bezier.z);
    if (abs(dx) < MIN_DERIVATIVE) break;
    t -= (bx - x) / dx;
    t = clamp(t, 0.0, 1.0);          // control points may overshoot; the parameter may not
  }
  float ct = 1.0 - t;
  return 3.0 * ct * ct * t * bezier.y + 3.0 * ct * t * t * bezier.w + t * t * t;
}

vec2 rotate2(vec2 p, float radians) {
  float c = cos(radians);
  float s = sin(radians);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

void main() {
  float isBurst   = aBurstData.x;
  float angle     = aBurstData.y;
  float sizeScale = aBurstData.z;
  float delay     = aBurstData.w;

  vec2 base = rotate2(position.xy, uRotation) * uViewScale;

  // Rest state: ring dots sit still and visible, burst dots are invisible
  // until they are fired. Keeping them as separate dots rather than displacing
  // the ring dots is what stops the ring popping back at the end of a burst.
  float alpha = mix(1.0, 0.0, isBurst);
  float size  = 1.0;
  float heat  = 0.0;

  float age = uBurstTime - aStart - delay;
  if (isBurst > 0.5 && aStart > 0.0 && age >= 0.0 && age <= uBurstDuration) {
    float t = age / uBurstDuration;

    // The whole point of the file: this particle's OWN easing curve.
    float eased = cubicBezier(t, aBezier);

    // uRotation is added to the baked angle so the flight stays radial to the
    // ring while the ring is turning underneath it.
    base += vec2(cos(angle + uRotation), sin(angle + uRotation)) * eased * uBurstRadius;
    alpha = 1.0 - t;                 // linear fade against an eased flight
    size  = mix(1.0, BURST_END_SIZE, t);
    heat  = 1.0 - eased;             // hottest at launch, cooling as it settles
  }

  vBurst = isBurst;
  vHeat  = heat;
  vAlpha = alpha * uOpacity;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(base, 0.0, 1.0);

  float raw       = sizeScale * size * uDotScale * 2.0 * uPixelRatio;
  float unclamped = max(UNCLAMPED_MIN_POINT_SIZE, raw);
  float clamped   = max(MIN_POINT_SIZE, raw);
  vAlphaScale  = (unclamped * unclamped) / (clamped * clamped);
  gl_PointSize = clamped;
}
`;

export const GPU_BEZIER_BURST_FRAG = /* glsl */ `
precision mediump float;

uniform vec3 uColor;
uniform vec3 uBurstColor;

varying float vAlpha;
varying float vAlphaScale;
varying float vBurst;
varying float vHeat;

const float ALPHA_EPSILON = 0.003;

void main() {
  vec2  centered = gl_PointCoord - vec2(0.5);
  float disc = 1.0 - smoothstep(0.43, 0.5, length(centered));

  float alpha = vAlpha * vAlphaScale * disc;
  if (alpha <= ALPHA_EPSILON) discard;

  gl_FragColor = vec4(mix(uColor, uBurstColor, vBurst * vHeat), alpha);
}
`;
