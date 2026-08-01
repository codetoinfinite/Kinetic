/* ==========================================================================
   Single-Draw Orbit Rings — GLSL
   --------------------------------------------------------------------------
   Every dot in every ring is one vertex of one `THREE.Points`. The vertex
   shader is the only thing that knows where a dot belongs: `position` stays
   at the origin for all of them and the real screen position is computed here
   from a packed identity attribute.

   Shipped as a `.ts` template literal rather than a `.glsl` file so that
   `npx shadcn add` produces something that compiles without a bundler plugin.
   ========================================================================== */

/**
 * `aPointData = vec4(kind, ringIndex, angle, dotRadius)`
 *
 *   kind       0 = static path dot, 1 = orbiting marker
 *   ringIndex  0 = innermost
 *   angle      radians; for a marker this is its phase offset
 *   dotRadius  CSS pixels before pixel-ratio scaling
 */
export const ORBIT_RING_POINTS_VERT = /* glsl */ `
attribute vec4 aPointData;

uniform float uElapsed;
uniform float uExtent;
uniform float uPixelRatio;
uniform float uOpacity;
uniform float uRingCount;
uniform float uSpeed;
uniform float uBaseRadius;

varying float vAlpha;
varying float vAlphaScale;
varying float vMarker;

/* Only used to dim the wider rings. There is no perspective camera here — the
   projection is orthographic and 1:1 with CSS pixels. A focal length of 800
   makes the outermost ring roughly 30% dimmer than the innermost at typical
   preview sizes, which is enough to read as depth and not enough to read as a
   fade. */
const float FOCAL_LENGTH = 800.0;

/* GPUs quietly refuse point sizes below ~1px and rasterise nothing, so the
   size is clamped and the alpha is corrected for the area that clamping
   invented. See vAlphaScale below. */
const float MIN_POINT_SIZE = 2.0;
const float UNCLAMPED_MIN_POINT_SIZE = 1.0;

/* Rings step 10% apart, outermost at the full base radius. */
const float RING_STEP = 0.1;

const float PI = 3.141592653589793;

void main() {
  float kind      = aPointData.x;
  float ringIndex = aPointData.y;
  float angle     = aPointData.z;
  float dotRadius = aPointData.w;

  float scale      = 1.0 - (uRingCount - 1.0 - ringIndex) * RING_STEP;
  float ringRadius = uBaseRadius * scale * uExtent * 0.5;

  vec2  point;
  float alpha;

  if (kind < 0.5) {
    // Static path dot: fixed angle, dimmed by how far out its ring sits.
    point = vec2(cos(angle), sin(angle)) * ringRadius;
    alpha = 0.15 + 0.65 * max(0.0, FOCAL_LENGTH / (FOCAL_LENGTH + ringRadius));
  } else {
    // Orbiting marker: same ring, angle advanced by the clock. -PI/2 starts it
    // at twelve o'clock, which is where a viewer expects a cycle to begin.
    float orbitAngle = angle - PI * 0.5 + uElapsed * uSpeed;
    point = vec2(cos(orbitAngle), sin(orbitAngle)) * ringRadius;
    alpha = 1.0;
  }

  vAlpha  = alpha * uOpacity;
  vMarker = step(0.5, kind);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 0.0, 1.0);

  /* Area-equivalent alpha compensation. A dot the driver forced to be twice
     as wide covers four times the area, so its alpha is divided by four and
     the total light it emits is unchanged. This is why the field looks
     identical on a 1x monitor and a 3x phone instead of visibly denser on
     one of them. */
  float rawPointSize = dotRadius * 2.0 * uPixelRatio;
  float unclamped    = max(UNCLAMPED_MIN_POINT_SIZE, rawPointSize);
  float pointSize    = max(MIN_POINT_SIZE, rawPointSize);
  vAlphaScale = (unclamped * unclamped) / (pointSize * pointSize);
  gl_PointSize = pointSize;
}
`;

export const ORBIT_RING_POINTS_FRAG = /* glsl */ `
precision mediump float;

uniform vec3 uColor;
uniform vec3 uMarkerColor;

varying float vAlpha;
varying float vAlphaScale;
varying float vMarker;

void main() {
  vec2  centered = gl_PointCoord - vec2(0.5);
  float d = length(centered);
  // ~7% of the radius of soft edge. Enough to read as round at 2px without
  // asking the renderer for MSAA, which is a real cost on a fill-heavy scene.
  float disc = 1.0 - smoothstep(0.43, 0.5, d);

  if (disc <= 0.0 || vAlpha <= 0.0) discard;

  vec3 tint = mix(uColor, uMarkerColor, vMarker);
  gl_FragColor = vec4(tint, vAlpha * vAlphaScale * disc);
}
`;
