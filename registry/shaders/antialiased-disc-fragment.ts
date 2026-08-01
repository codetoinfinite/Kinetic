/* ==========================================================================
   Anti-Aliased Point Discs — GLSL
   --------------------------------------------------------------------------
   A point sprite is a square. Everything that makes it look like a round dot
   happens in the fragment shader, and everything that makes it look like the
   SAME round dot on every display happens in the vertex shader.

   The two halves are inseparable, which is why they live in one file:
   clamping the point size without correcting the alpha, or correcting the
   alpha without clamping the size, both produce a field whose density changes
   with the device pixel ratio.
   ========================================================================== */

/** `aDisc = vec2(normalisedRadius 0..1, angle in radians)`. */
export const ANTIALIASED_DISC_VERT = /* glsl */ `
attribute vec2 aDisc;

uniform float uElapsed;
uniform float uExtent;
uniform float uPixelRatio;
uniform float uSpin;
uniform float uFieldRadius;
uniform float uMinRadius;
uniform float uMaxRadius;
uniform float uOpacity;

varying float vAlpha;
varying float vAlphaScale;
varying float vT;

const float MIN_POINT_SIZE = 2.0;
const float UNCLAMPED_MIN_POINT_SIZE = 1.0;

void main() {
  float t     = aDisc.x;
  // Differential rotation: the rim turns 1.6x faster than the core, which
  // shears the spiral arms instead of spinning the whole field rigidly.
  float angle = aDisc.y + uElapsed * uSpin * (0.6 + 1.0 * t);
  float r     = t * uFieldRadius * uExtent * 0.5;

  vec2 p = vec2(cos(angle), sin(angle)) * r;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 0.0, 1.0);

  vT     = t;
  vAlpha = uOpacity * (0.30 + 0.70 * t);

  // The size ramp is the point of the component: the innermost dots are
  // sub-pixel at DPR 1 and the outermost are twenty pixels across, and both
  // ends have to survive the same clamp.
  float radiusPx = mix(uMinRadius, uMaxRadius, t * t);
  float raw       = radiusPx * 2.0 * uPixelRatio;
  float unclamped = max(UNCLAMPED_MIN_POINT_SIZE, raw);
  float clamped   = max(MIN_POINT_SIZE, raw);

  /* Area-equivalent alpha compensation. "clamped" is what the GPU will
     actually rasterise; "unclamped" is what the design asked for. The ratio of
     the squares is the ratio of covered areas, so multiplying alpha by it
     keeps total emitted light constant and the field's perceived density
     identical across device pixel ratios. */
  vAlphaScale  = (unclamped * unclamped) / (clamped * clamped);
  gl_PointSize = clamped;
}
`;

export const ANTIALIASED_DISC_FRAG = /* glsl */ `
precision mediump float;

uniform vec3  uColorInner;
uniform vec3  uColorOuter;
uniform float uEdgeInner;

varying float vAlpha;
varying float vAlphaScale;
varying float vT;

/* Below this the pixel contributes nothing a display can show, and blending it
   still costs a read-modify-write of the framebuffer. Discarding is the
   cheaper answer on the fill-bound end of a large point field. */
const float ALPHA_EPSILON = 0.003;

void main() {
  vec2  centered = gl_PointCoord - vec2(0.5);
  float d = length(centered);

  // One smoothstep across the outer few percent of the radius is the whole
  // anti-aliasing story. uEdgeInner is 0.5 - softness, so the band always
  // ends exactly at the sprite edge and the disc never gets clipped square.
  float disc = 1.0 - smoothstep(uEdgeInner, 0.5, d);

  float alpha = vAlpha * vAlphaScale * disc;
  if (alpha <= ALPHA_EPSILON) discard;

  gl_FragColor = vec4(mix(uColorInner, uColorOuter, vT), alpha);
}
`;
