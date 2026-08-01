/* ==========================================================================
   Superellipse Text Avoidance — GLSL
   --------------------------------------------------------------------------
   A lattice of instanced quads that flows AROUND the headline instead of
   through it. The avoidance region is a 6-norm superellipse — a squircle —
   fitted to the measured DOM rect of the text.

   Why a 6-norm. A circle around a wide headline clears far more space than the
   words occupy and leaves an obvious empty halo at the ends of the line. An
   axis-aligned box clears the right area but its corners are a discontinuity in
   the field: particles turn a sharp corner and the lattice creases along four
   straight lines. Raising the exponent past 2 squares the shape up while
   keeping the corners differentiable, and 6 is close enough to a text block
   that nothing reads as either halo or crease.

   The remap. Everything inside the shell is not clamped ONTO it — that maps a
   whole area onto a curve and piles every interior particle into one infinitely
   dense line. It is remapped: radii in [0, 1 + whip] are compressed linearly
   into [1, 1 + whip], so the interior turns into a band hugging the shape and
   the field is continuous where it meets the undisturbed lattice outside.
   WHIP_DISC is that band's width, and it is the whole feel of the effect: small
   values whip particles out hard and stack them on the outline, large values
   let the lattice bend around at a distance.

   The same function runs twice per particle — once for the text rect at
   exponent 6, once for the pointer at exponent 2 — because a disc is just a
   superellipse with a lower exponent.

   GLSL ES 1.00, so the same source compiles under a WebGL1 context.
   ========================================================================== */

/**
 * position — the shared unit quad, -0.5..0.5 on both axes.
 * aHome    — lattice rest position in uv space, 0..1 across the container.
 * aParams  — x: size in CSS px, y: drift radius in uv, z: drift rate in rad/s,
 *   w: base alpha.
 * aSeed    — x: drift phase, y: edge softness, z: tint mix, w: unused spare.
 */
export const SUPERELLIPSE_TEXT_AVOIDANCE_VERT = /* glsl */ `
attribute vec2 position;
attribute vec2 aHome;
attribute vec4 aParams;
attribute vec4 aSeed;

uniform vec2  uResolution;
uniform float uPixelRatio;
uniform float uElapsed;
/** Measured text box in uv space: xy centre, zw half-extents, already padded. */
uniform vec4  uRect;
uniform float uRectPresence;
uniform float uExponent;
uniform float uWhip;
uniform vec2  uPointer;
uniform float uPointerPresence;
uniform float uPointerRadius;
uniform float uPointerWhip;

varying vec2  vQuad;
varying float vAlpha;
varying float vSoftness;
varying float vTint;
varying float vPush;

/**
 * The p-norm of n. abs() first, and an epsilon, because pow() is undefined for
 * a negative base and for 0 raised to a non-positive power — and a lattice has
 * particles sitting exactly on both axes, so both cases are reached on the
 * first frame rather than never.
 */
float snorm(vec2 n, float e) {
  vec2 a = abs(n) + 1e-5;
  return pow(pow(a.x, e) + pow(a.y, e), 1.0 / e);
}

/**
 * Displacement that lifts p out of the superellipse centred on rectCenter with
 * half-extents rectHalf. amount comes back as how much of the lift applied, for
 * the brightness ramp.
 */
vec2 avoid(vec2 p, vec2 center, vec2 rectHalf, float e, float whip, out float amount) {
  vec2 safeHalf = max(rectHalf, vec2(1e-4));
  vec2 n = (p - center) / safeHalf;
  float r = snorm(n, e);

  /* The remap, branchless. Inside the band, r is compressed into
     [1, 1 + whip]; outside it, mapped == r exactly, so the lattice beyond the
     band is untouched and there is no seam where the influence ends. */
  float span = 1.0 + whip;
  float inner = 1.0 + whip * min(r, span) / span;
  float mapped = inner + max(r - span, 0.0);

  amount = clamp(mapped - r, 0.0, 1.0);

  /* Divide by a floor rather than normalize(): a particle at the exact centre
     has no direction, and normalize() there returns NaN, which propagates into
     gl_Position and drops the entire instance rather than one component. */
  vec2 dir = n / max(r, 1e-3);
  return safeHalf * dir * (mapped - r);
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);

  /* Idle drift, so the lattice is alive before anything is avoided. Each
     particle traces its own small ellipse on its own phase; a shared phase
     turns the whole grid into one visible pulse. */
  float phase = aSeed.x;
  vec2 drift = vec2(
    sin(uElapsed * aParams.z + phase),
    cos(uElapsed * aParams.z * 0.83 + phase * 1.7)
  ) * aParams.y;
  vec2 p = aHome + drift;

  /* 1. THE TEXT RECT, at exponent 6. Deliberately NOT aspect-corrected: the
     rect was measured from the DOM in element space, so the avoidance field has
     to live in the same space or it stops agreeing with the letters — on a wide
     container a "corrected" rect clears a region visibly narrower than the
     headline it is supposed to be protecting. */
  float textAmount = 0.0;
  p += avoid(p, uRect.xy, uRect.zw, uExponent, uWhip, textAmount) * uRectPresence;
  textAmount *= uRectPresence;

  /* 2. THE POINTER, at exponent 2, which is a plain disc. This one IS
     aspect-corrected — x scaled by the aspect ratio — because it is a shape in
     screen space rather than a measured box, and an uncorrected disc is a
     visible ellipse on anything but a square container. */
  vec2 pointerHalf = vec2(uPointerRadius / max(aspect, 1e-4), uPointerRadius);
  float pointerAmount = 0.0;
  p += avoid(p, uPointer, pointerHalf, 2.0, uPointerWhip, pointerAmount) * uPointerPresence;
  pointerAmount *= uPointerPresence;

  float push = clamp(max(textAmount, pointerAmount) * 3.0, 0.0, 1.0);
  vPush = push;

  /* The quad is expanded in PIXELS and only then converted to clip space, so a
     particle stays square in a container of any aspect ratio. */
  float size = aParams.x * uPixelRatio * (1.0 + push * 0.5);
  vec2 clip = p * 2.0 - 1.0;
  vec2 offset = position * size / max(uResolution, vec2(1.0)) * 2.0;

  vQuad = position;
  vSoftness = aSeed.y;
  vTint = aSeed.z;
  /* Displaced particles brighten. Without it the lattice around the headline is
     just a hole; with it the shape of the field is legible as a rim, which is
     the only visual evidence that the avoidance is a squircle and not a box. */
  vAlpha = aParams.w * (0.55 + 0.45 * push);

  gl_Position = vec4(clip + offset, 0.0, 1.0);
}
`;

export const SUPERELLIPSE_TEXT_AVOIDANCE_FRAG = /* glsl */ `
precision mediump float;

uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uGlowColor;
uniform float uOpacity;

varying vec2  vQuad;
varying float vAlpha;
varying float vSoftness;
varying float vTint;
varying float vPush;

void main() {
  /* A disc with a variable core: the flat centre shrinks as softness rises, so
     one material covers hard specks and soft motes. A fixed core with a
     variable edge cannot reach the soft end — the particle keeps a hard middle
     however far the edge is pushed out. */
  float d = length(vQuad);
  float core = mix(0.3, 0.02, clamp(vSoftness, 0.0, 1.0));
  float falloff = 1.0 - smoothstep(core, 0.5, d);
  if (falloff <= 0.0) discard;

  vec3 col = mix(uColorA, uColorB, clamp(vTint, 0.0, 1.0));
  col = mix(col, uGlowColor, vPush * 0.85);

  /* Squared, because additive blending sums overlapping quads and a linear
     falloff piles into visible bright polygons wherever several cross. */
  float alpha = falloff * falloff * vAlpha * uOpacity;

  /* Premultiplied for an additive pass: the destination is only ever added to,
     so the colour has to arrive already scaled by its own coverage. */
  gl_FragColor = vec4(col * alpha, alpha);
}
`;
