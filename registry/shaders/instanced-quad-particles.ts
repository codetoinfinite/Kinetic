/* ==========================================================================
   Instanced Quad Particles — GLSL
   --------------------------------------------------------------------------
   Every particle is a two-triangle quad, not a point sprite. Point sprites
   are capped at 255px on a lot of drivers, cannot be rotated, and are culled
   whole the moment their centre leaves the viewport — so a large sprite pops
   out of existence while half of it is still on screen. An instanced quad has
   none of those limits and still costs one draw call.

   Four vertices and six indices are shared by every instance; the per-instance
   attributes carry position, size, spin, alpha, tint and shape. The quad's
   corners are rotated in PIXEL space and only then converted to clip space, so
   a particle stays square in a container of any aspect ratio.

   GLSL ES 1.00, so the same source compiles under a WebGL1 fallback context.
   ========================================================================== */

/**
 * position — the shared unit quad, -0.5..0.5 on both axes.
 * aOrigin  — rest position in field space. 0..1 covers the container; x is
 *   seeded slightly outside that range so horizontal wander never exposes a
 *   bald strip at the edges.
 * aParams  — x: size in CSS px, y: spin rate in rad/s (signed),
 *   z: base alpha, w: tint mix between the two colours.
 * aSeed    — x, y: flow phase offsets, z: spin phase, w: shape mix.
 */
export const INSTANCED_QUAD_PARTICLES_VERT = /* glsl */ `
attribute vec2 position;
attribute vec2 aOrigin;
attribute vec4 aParams;
attribute vec4 aSeed;

uniform vec2  uResolution;
uniform float uPixelRatio;
uniform float uElapsed;
uniform float uDrift;
uniform float uRise;
uniform float uFlowScale;
uniform float uWander;
uniform float uFadeBand;

varying vec2  vQuad;
varying float vAlpha;
varying float vTint;
varying float vShape;
varying float vPixel;

const float TAU = 6.2831853;

void main() {
  float t = uElapsed * uDrift;

  /* The field marches upward and wraps. fract() is what makes it endless with
     no buffer rebuild and no per-particle state — but it also teleports a
     particle from the top edge to the bottom one, which is visible as a pop
     unless the alpha is faded to zero on approach. That is uFadeBand below. */
  vec2 p = aOrigin;
  p.y = fract(p.y + t * uRise);

  /* Two out-of-phase sinusoids sampled at the particle's own position, not at
     a global time only: neighbours drift apart instead of sliding as a sheet.
     The per-particle seed offsets stop the whole field breathing in unison. */
  float wx = sin(p.y * uFlowScale * TAU + aSeed.x + t * TAU * 0.11);
  float wy = cos(p.x * uFlowScale * TAU + aSeed.y + t * TAU * 0.09);
  p += vec2(wx, wy) * uWander;

  float fade = smoothstep(0.0, uFadeBand, p.y) * smoothstep(0.0, uFadeBand, 1.0 - p.y);

  vec2 ndc = p * 2.0 - 1.0;

  /* Size is authored in CSS pixels, so it survives a dpr change and a resize
     without rebuilding anything. */
  float sizePx = aParams.x * uPixelRatio;

  float ang = aSeed.z * TAU + uElapsed * aParams.y;
  float s = sin(ang);
  float c = cos(ang);
  vec2 corner = vec2(position.x * c - position.y * s, position.x * s + position.y * c);

  /* Rotate in pixels, convert to clip space afterwards. Rotating in clip space
     shears the quad by the container's aspect ratio: a square particle becomes
     a lozenge that changes shape as it spins. */
  vec2 offset = corner * sizePx / uResolution * 2.0;

  gl_Position = vec4(ndc + offset, 0.0, 1.0);

  /* The UNROTATED quad coordinate is what the fragment shader gets, so the
     shape SDF is axis-aligned in quad space and the rotation comes entirely
     from the displaced corners. Rotating both would cancel out. */
  vQuad  = position;
  vAlpha = aParams.z * fade;
  vTint  = aParams.w;
  vShape = aSeed.w;
  /* One device pixel expressed in quad units. Used as a floor on the edge
     width so a hard-edged small particle still anti-aliases, without asking
     for derivatives (fwidth needs an extension under WebGL1). */
  vPixel = 1.0 / max(sizePx, 1.0);
}
`;

export const INSTANCED_QUAD_PARTICLES_FRAG = /* glsl */ `
precision mediump float;

uniform vec3  uColorA;
uniform vec3  uColorB;
uniform float uSoftness;
uniform float uOpacity;

varying vec2  vQuad;
varying float vAlpha;
varying float vTint;
varying float vShape;
varying float vPixel;

void main() {
  /* One rounded-box SDF covers both shapes. At vShape 0 the half-extents are
     0.5 and the corner radius is 0.5, which reduces exactly to length(uv)-0.5:
     a true circle. At vShape 1 it is a narrow shard, and the shard is the
     reason per-particle rotation is worth having at all — a disc looks
     identical at every angle. */
  vec2  ext    = vec2(mix(0.5, 0.17, vShape), 0.5);
  float radius = mix(0.5, 0.15, vShape);
  vec2  q = abs(vQuad) - (ext - radius);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;

  float edge = max(uSoftness * 0.5, vPixel);
  float mask = 1.0 - smoothstep(-edge, 0.0, d);

  /* Roughly a third of the quad's area is outside the shape at vShape 1, and
     with additive blending a zero still costs a read-modify-write per
     fragment. Discarding is cheaper than blending nothing. */
  if (mask <= 0.002) discard;

  float a = mask * vAlpha * uOpacity;
  vec3  tint = mix(uColorA, uColorB, vTint);

  /* Premultiplied: the blend func is (ONE, ONE), so rgb is added to the
     framebuffer and the alpha channel is never read. Additive is order
     independent, which is the whole reason a thousand overlapping instances
     need no depth sort. */
  gl_FragColor = vec4(tint * a, a);
}
`;
