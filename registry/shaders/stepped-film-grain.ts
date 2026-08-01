/* ==========================================================================
   Stepped Film Grain — GLSL
   --------------------------------------------------------------------------
   One fullscreen quad, one hash per pixel, and a single vec2 uniform that
   decides which part of a tiling noise field each pixel reads. The whole
   "filmic" quality lives in how often that uniform changes: the JS side
   quantises it to a fixed step rate, so the pattern holds still for several
   frames and then jumps, the way a projected frame does.

   Shipped as a .ts template literal rather than a .glsl file so that
   'npx shadcn add' produces something that compiles with no bundler plugin.
   ========================================================================== */

/**
 * The quad is authored in clip space, so no matrices are needed and the
 * vertex stage is three multiplies. PlaneGeometry(2, 2) already spans
 * -1..1 in x and y.
 */
export const STEPPED_FILM_GRAIN_VERT = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const STEPPED_FILM_GRAIN_FRAG = /* glsl */ `
/* highp, not mediump. The hash is fract(sin(x) * 43758.5453), and on a 16-bit
   float x has about three significant digits — neighbouring cells hash to the
   same value and the grain collapses into flat blocks the size of a thumbnail.
   This is the one place in the registry where mediump is not a free win. */
precision highp float;

uniform float uPixelRatio;
uniform vec2  uOffset;
uniform float uCellSize;
uniform float uTile;
uniform float uContrast;
uniform float uLift;
uniform float uOpacity;

/* Just under 1/255. An 8-bit compositor cannot show anything fainter, and
   blending it still costs a read-modify-write of the framebuffer — across a
   full-screen overlay that is the majority of the pixels. */
const float ALPHA_EPSILON = 0.0035;

float hash(vec2 cell) {
  return fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  /* Grain is a physical property of film, so its cell size is specified in CSS
     pixels and divided back out of the device-pixel gl_FragCoord. Without this
     the same overlay is three times finer — and effectively invisible — on a
     3x phone than on the laptop it was tuned on. */
  vec2 css  = gl_FragCoord.xy / uPixelRatio;
  vec2 cell = floor(css / uCellSize) + uOffset;

  /* Wrapping the lattice keeps the hash argument inside float precision. It
     also means the field tiles every uTile cells, which is invisible for
     unstructured noise and is what lets the offset table jump anywhere in it. */
  cell = mod(cell, uTile);

  float n = hash(cell);

  /* Signed grain around a positive lift: uContrast is the peak-to-peak swing
     and uLift raises the mean, which is film base fog — the reason a grain
     overlay opens up crushed blacks instead of only speckling them. */
  float g = (n - 0.5) * uContrast + uLift;

  float alpha = min(abs(g) * uOpacity, 1.0);
  if (alpha <= ALPHA_EPSILON) discard;

  /* Bidirectional grain out of one normal-blended draw: white where the sample
     is above the lift, black where it is below, alpha carrying the magnitude.
     Additive blending could only ever brighten, which reads as haze. */
  gl_FragColor = vec4(vec3(step(0.0, g)), alpha);
}
`;
