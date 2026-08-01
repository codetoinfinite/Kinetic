/* ==========================================================================
   Radial Ripple Dot Cloud — GLSL
   --------------------------------------------------------------------------
   One THREE.Points, one draw call. Every dot's rest position is baked once
   into 'aOrigin' at a fixed field size and scaled by the camera at draw time,
   so a resize never rebuilds the buffer.

   The ripple is entirely in the vertex shader: a travelling sine in radius,
   attenuated by an exponential in radius, displacing each dot along its own
   outward direction. Nothing about it is per-dot state — the whole animation
   is one uniform.

   Shipped as a .ts template literal rather than a .glsl file so that
   'npx shadcn add' produces something that compiles without a bundler plugin.
   ========================================================================== */

/**
 * aOrigin — rest position in field units. The field spans -FIELD_HALF_W..
 *   FIELD_HALF_W horizontally and -1..1 vertically; the orthographic camera
 *   covers -aspect..aspect by -1..1, and uCover scales the field up when the
 *   viewport is wider than the baked field.
 * aScale  — per-dot size multiplier, baked from the density ramp.
 * aAlpha  — per-dot brightness, baked from the density ramp.
 */
export const RADIAL_RIPPLE_VERT = /* glsl */ `
attribute vec2 aOrigin;
attribute float aScale;
attribute float aAlpha;

uniform float uElapsed;
uniform float uCover;
uniform vec2  uCenter;
uniform float uFrequency;
uniform float uSpeed;
uniform float uDecay;
uniform float uAmplitude;
uniform float uSize;
uniform float uPixelRatio;

varying float vAlpha;
varying float vWave;

/* GPUs quietly refuse point sizes below ~1px and rasterise nothing at all, so
   the size is floored and the alpha is corrected for the area that flooring
   invented. Without the correction a dot cloud is visibly denser on a 1x
   monitor than on a 3x phone. */
const float MIN_POINT_SIZE = 2.0;
const float UNCLAMPED_MIN = 1.0;

void main() {
  vec2 origin = aOrigin * uCover;

  vec2  delta = origin - uCenter;
  float dist  = length(delta);
  /* At the exact centre the outward direction is undefined. Displacing by zero
     is the only answer that does not produce a NaN, and one dot standing still
     at the origin is invisible anyway. */
  vec2 dir = dist > 1e-5 ? delta / dist : vec2(0.0);

  /* A travelling wave, not a standing one: the phase term is subtracted from
     the radius term, so crests move outward from the centre at uSpeed /
     uFrequency field units per second. Adding it instead sends them inward,
     which reads as a drain rather than an impact. */
  float wave = sin(dist * uFrequency - uElapsed * uSpeed);

  /* Exponential attenuation, applied to the wave and not to the radius. This is
     what stops the cloud looking like a screensaver: the ripple is violent near
     the origin and the outer field is nearly still, so the eye is given a
     source. A linear falloff reaches zero at a hard radius and draws a circle
     there. */
  float attenuated = wave * exp(-dist * uDecay);

  vec2 point = origin + dir * attenuated * uAmplitude;

  vWave = attenuated;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 0.0, 1.0);

  float raw       = uSize * aScale * uPixelRatio;
  float unclamped = max(UNCLAMPED_MIN, raw);
  float pointSize = max(MIN_POINT_SIZE, raw);

  /* Area-equivalent alpha compensation: a dot the driver forced to be twice as
     wide covers four times the area, so its alpha is divided by four and the
     light it emits is unchanged. */
  vAlpha = aAlpha * (unclamped * unclamped) / (pointSize * pointSize);
  gl_PointSize = pointSize;
}
`;

export const RADIAL_RIPPLE_FRAG = /* glsl */ `
precision mediump float;

uniform vec3  uColor;
uniform vec3  uCrestColor;
uniform float uOpacity;

varying float vAlpha;
varying float vWave;

void main() {
  vec2  centered = gl_PointCoord - vec2(0.5);
  float d = length(centered);

  /* Analytic circular mask. A 7%-of-radius soft edge is enough to read as
     round at 2px without asking the renderer for MSAA, which on a cloud this
     fill-heavy is a real cost for an edge nobody can see. */
  float disc = 1.0 - smoothstep(0.42, 0.5, d);

  /* Discarding rather than blending a zero: with additive blending a fully
     transparent fragment still costs a read-modify-write, and there are four
     of those per dot at the corners of every point sprite. */
  if (disc <= 0.001) discard;

  /* Crest dots brighten. Using the signed wave rather than its magnitude means
     only the outgoing crest lights up and the trough stays dim, so the ripple
     has a direction you can see. */
  float crest = clamp(vWave, 0.0, 1.0);
  vec3  tint  = mix(uColor, uCrestColor, crest);

  float alpha = vAlpha * uOpacity * disc * (0.55 + 0.45 * crest);
  if (alpha <= 0.001) discard;

  gl_FragColor = vec4(tint, alpha);
}
`;
