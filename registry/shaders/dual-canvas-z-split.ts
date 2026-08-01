/* ==========================================================================
   Dual-Canvas Depth Split — GLSL
   --------------------------------------------------------------------------
   One particle system, one buffer, rendered twice into two stacked canvases
   with opposite uZSign. The DOM content sits between them, so the particles
   whose signed depth is negative pass behind it and the positive ones pass in
   front. That is the entire illusion: the text is not on top of a field, it is
   inside one.

   aDepth is the CAMERA AXIS, not a distance. -1 is far behind the content
   plane, +1 is close to the viewer, and 0 is the content plane itself. Size,
   parallax rate, brightness and edge softness are all one continuous ramp in
   that value, which is why the split at zero is invisible.

   Rejection happens in the vertex shader: a particle on the wrong side is
   given a clip-space position outside the frustum, so all four of its vertices
   are discarded before rasterisation and it costs no fragments at all.

   GLSL ES 1.00, so the same source compiles under a WebGL1 fallback context.
   ========================================================================== */

/**
 * position — the shared unit quad, -0.5..0.5 on both axes.
 * aOrigin  — rest position in field space; 0..1 covers the container, with x
 *   seeded slightly wider so wander never bares the side edges.
 * aDepth   — signed depth, -1..1. Sign picks the canvas; magnitude drives
 *   everything else.
 * aSeed    — x, y: flow phase offsets. z: tint mix. w: size jitter.
 */
export const DUAL_CANVAS_Z_SPLIT_VERT = /* glsl */ `
attribute vec2  position;
attribute vec2  aOrigin;
attribute float aDepth;
attribute vec4  aSeed;

uniform vec2  uResolution;
uniform float uPixelRatio;
uniform float uElapsed;
uniform float uZSign;
uniform float uDrift;
uniform float uRise;
uniform float uFlowScale;
uniform float uWander;
uniform float uFadeBand;
uniform float uMinSize;
uniform float uMaxSize;

varying vec2  vQuad;
varying float vAlpha;
varying float vTint;
varying float vSoft;
varying float vPixel;

const float TAU = 6.2831853;

void main() {
  vQuad  = position;
  vTint  = aSeed.z;

  /* Wrong side of the content plane: park the vertex outside the frustum. w is
     1.0 on purpose — vec4(2.0) would divide down to exactly the boundary and
     survive clipping. Setting vAlpha first keeps the varying defined for
     drivers that interpolate before clipping. */
  if (aDepth * uZSign <= 0.0) {
    vAlpha = 0.0;
    vSoft  = 0.0;
    vPixel = 1.0;
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }

  float depth01 = aDepth * 0.5 + 0.5;

  /* Parallax: near particles travel further per second than far ones. This is
     the only depth cue that survives a still frame being described in prose,
     and the one the eye trusts most. */
  float par = 0.35 + 0.65 * depth01;

  float t = uElapsed * uDrift;

  vec2 p = aOrigin;
  p.y = fract(p.y + t * uRise * par);

  float wx = sin(p.y * uFlowScale * TAU + aSeed.x + t * TAU * 0.11);
  float wy = cos(p.x * uFlowScale * TAU + aSeed.y + t * TAU * 0.09);
  p += vec2(wx, wy) * uWander * par;

  /* fract() teleports a particle across the field; without a fade at both ends
     that seam is a visible pop, and at these counts something crosses it every
     few frames. */
  float fade = smoothstep(0.0, uFadeBand, p.y) * smoothstep(0.0, uFadeBand, 1.0 - p.y);

  float sizePx = mix(uMinSize, uMaxSize, depth01) * aSeed.w * uPixelRatio;

  /* The corner offset is scaled in PIXELS and converted to clip space after,
     so a disc stays circular in a container of any aspect ratio. */
  vec2 offset = position * sizePx / uResolution * 2.0;

  gl_Position = vec4(p * 2.0 - 1.0 + offset, 0.0, 1.0);

  vAlpha = fade * mix(0.35, 0.9, depth01);
  /* Near particles are softer, as a lens would render them. The defocus is
     what stops the front layer reading as dirt on the screen. */
  vSoft  = mix(0.3, 1.0, depth01);
  vPixel = 1.0 / max(sizePx, 1.0);
}
`;

export const DUAL_CANVAS_Z_SPLIT_FRAG = /* glsl */ `
precision mediump float;

uniform vec3  uColorA;
uniform vec3  uColorB;
uniform float uOpacity;

varying vec2  vQuad;
varying float vAlpha;
varying float vTint;
varying float vSoft;
varying float vPixel;

void main() {
  /* Analytic disc. No point sprites anywhere in this component: gl_PointCoord
     would cap the size at 255px on many drivers, and the near particles are
     deliberately larger than that at full width. */
  float d = length(vQuad) - 0.5;

  /* One device pixel is the floor on the edge width, which anti-aliases the
     hardest particles without derivatives — fwidth needs an extension under
     WebGL1 and this shader is ES 1.00 so it can run there. */
  float edge = max(vSoft * 0.5, vPixel);
  float mask = 1.0 - smoothstep(-edge, 0.0, d);
  if (mask <= 0.002) discard;

  float a = mask * vAlpha * uOpacity;
  vec3  tint = mix(uColorA, uColorB, vTint);

  /* Premultiplied output, which is what both layers need for different
     reasons: the back canvas is opaque and blends additively (ONE, ONE), the
     front canvas is transparent over live DOM text and blends source-over
     (ONE, ONE_MINUS_SRC_ALPHA). Same fragment, same colour, one output form. */
  gl_FragColor = vec4(tint * a, a);
}
`;
