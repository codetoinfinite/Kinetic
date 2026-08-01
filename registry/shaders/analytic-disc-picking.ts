/* ==========================================================================
   Analytic Disc Picking — GLSL
   --------------------------------------------------------------------------
   A view-space billboard. The vertex shader takes only the TRANSLATION out of
   `modelViewMatrix` — the matrix applied to the origin — and adds the quad's
   local offset afterwards, in view space. The result is always exactly
   parallel to the image plane no matter where the camera is or what rotation
   the mesh carries.

   That is also why `THREE.Raycaster` cannot pick these discs. The rotation
   never reaches the vertices, so the `BufferGeometry` in main memory is still
   an axis-aligned square lying in world XY. A raycast intersects that square.
   The pick has to be done against the shape the shader actually drew, which
   is what the analytic plane test in the component does.

   Shipped as a `.ts` template literal rather than a `.glsl` file so that
   `npx shadcn add` produces something that compiles without a bundler plugin.
   ========================================================================== */

/**
 * `uRadius` is the quad's half-width, and because the offset is added after
 * the projection-free part of the transform it is ALSO the disc's radius in
 * view-space world units. The CPU pick compares against the same number, so
 * the drawn silhouette and the hit region are the same circle by construction
 * rather than by agreement.
 *
 * `uScale` multiplies that radius. The hover growth rides on it, and the pick
 * reads the same eased value in the same frame, so a disc is never pickable
 * over an area it has not grown into yet.
 */
export const ANALYTIC_DISC_PICKING_VERT = /* glsl */ `
uniform float uRadius;
uniform float uScale;

varying vec2 vDisc;

void main() {
  // Local XY normalised to the unit disc. The quad is 2*uRadius across, so
  // this lands in [-1, 1] on both axes and the fragment shader can work in
  // units of "fraction of the radius" without knowing the radius.
  vDisc = position.xy / uRadius;

  // Column 3 of modelViewMatrix is the mesh origin in view space. Taking it
  // this way discards the mesh's rotation AND its scale, which is the point:
  // the billboard must not inherit either.
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * uScale;

  gl_Position = projectionMatrix * mv;
}
`;

/**
 * Draws the disc inside the square quad and throws the corners away. Using a
 * two-triangle quad plus `discard` rather than a `CircleGeometry` fan is the
 * cheaper and better-looking half of the trade: 2 triangles instead of 32,
 * and a rim that is analytically anti-aliased instead of polygonal.
 */
export const ANALYTIC_DISC_PICKING_FRAG = /* glsl */ `
precision highp float;

uniform vec3  uColor;
uniform vec3  uAccent;
/** 0..1, eased on the CPU so hover has weight rather than snapping. */
uniform float uHover;
/** 0 or 1. Set the instant a click resolves. */
uniform float uPicked;
/** 0..1 per disc, from a seeded PRNG. Decorrelates the plate pattern. */
uniform float uSeed;
/** Depth fade, 0 at the back of the ring and 1 at the front. */
uniform float uDepth;

varying vec2 vDisc;

const float PI = 3.141592653589793;

/* Rim softness in units of the radius. At preview scale a disc is roughly
   90 px across, so 0.035 is about 1.5 px of gradient — enough to kill the
   staircase on a 1x display, narrow enough that the edge still reads as an
   edge rather than a glow. */
const float FEATHER = 0.035;
/* Outline thickness, same units. Below ~0.03 the outline drops below one
   physical pixel on the far discs and flickers as the ring turns. */
const float RIM = 0.055;

void main() {
  float d = length(vDisc);
  // The corners of the quad. Discarding is correct here rather than wasteful:
  // it is the only reason a square mesh can stand in for a circle.
  if (d > 1.0) discard;

  float disc = 1.0 - smoothstep(1.0 - FEATHER, 1.0, d);
  float rim = smoothstep(1.0 - RIM - FEATHER, 1.0 - RIM, d) * disc;

  // Procedural plate art. One angular sweep whose phase comes from the seed,
  // so a ring of discs reads as a ring of different pieces without a single
  // byte of texture being uploaded.
  float a = atan(vDisc.y, vDisc.x) + uSeed * PI * 2.0;
  float sweep = 0.5 + 0.5 * sin(a * 3.0 + d * 6.0 - uSeed * 4.0);
  float body = mix(0.30, 0.72, sweep) * (1.0 - 0.42 * d * d);

  vec3 col = uColor * body;
  col = mix(col, uAccent * 0.85, uPicked * 0.6);
  // Hover lifts the whole plate rather than only its outline: at preview size
  // an outline-only hover is invisible on the discs at the back of the ring.
  col += uHover * 0.26;
  col = mix(col, mix(uColor, uAccent, uPicked), rim * (0.30 + 0.70 * uHover));

  // Depth is faked in the shader instead of with fog so that the fade is
  // independent of the camera's near/far planes and survives a resize.
  float fade = mix(0.30, 1.0, uDepth);

  gl_FragColor = vec4(col * fade, disc);
}
`;
