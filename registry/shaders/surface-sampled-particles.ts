/* ==========================================================================
   Area-Weighted Surface Particles — GLSL
   --------------------------------------------------------------------------
   `position` here is a real sampled point: a barycentric sample of a triangle
   picked in proportion to its world-space area, so the whole cloud has one
   uniform density no matter how the source object's meshes are divided up.

   Two things happen on top of that, and both need per-particle data:

     1. ASSEMBLY. Every particle owns a 0.55-wide slice of the 0..1 progress
        value, offset by 0.45 * aOrder. Because order is derived from the
        particle's own target height, the shell builds bottom-up — the object
        is constructed rather than faded in.
     2. PERSPECTIVE-CORRECT SIZE. `gl_PointSize` is in device pixels and does
        not scale with distance on its own, so it is divided by view-space
        depth. uSizeScale carries pixelRatio * cameraDistance, which makes
        uSize a literal CSS-pixel diameter for a particle at the centre of the
        shell instead of a constant tuned by eye.
   ========================================================================== */

/**
 * position — the sampled surface point, centred on the origin and scaled so
 *   the shell's bounding sphere has radius 1.
 * aNormal  — unit face normal at the sample, in the same space.
 * aRand    — xyz: seeds a scatter direction and three drift phases. w: size
 *   and brightness jitter.
 * aOrder   — normalised target height, 0 at the base and 1 at the top. Drives
 *   assembly order and the tint ramp.
 */
export const SURFACE_SAMPLED_PARTICLES_VERT = /* glsl */ `
attribute vec3  aNormal;
attribute vec4  aRand;
attribute float aOrder;

uniform float uElapsed;
uniform float uForm;
uniform float uScatter;
uniform float uPuff;
uniform float uSize;
uniform float uMaxSize;
uniform float uSizeScale;
uniform float uOpacity;

varying float vAlpha;
varying float vTint;

const float TAU = 6.2831853;

/* Assembly stagger and window. They sum to 1.0, so the last particle to start
   is also the one that finishes exactly as uForm reaches 1 — no dead time at
   either end of the build. */
const float STAGGER = 0.45;
const float WINDOW  = 0.55;

void main() {
  float form = smoothstep(aOrder * STAGGER, aOrder * STAGGER + WINDOW, uForm);

  /* Breathing along the SAMPLED NORMAL, not along the radius. On a torus knot
     or any concave form the two point in different directions, and normal
     displacement is the only motion that keeps a shell reading as a surface
     instead of a ball of dust. */
  float breath = sin(uElapsed * 0.9 + aOrder * 3.0 + aRand.x * TAU);
  vec3 pos = position + aNormal * breath * uPuff * (0.4 + 0.6 * aRand.w);

  /* Pre-assembly cloud. eff decays to zero as this particle's own window
     closes, so scatter and arrival are one expression rather than two states
     that have to be cross-faded. */
  float eff = uScatter * (1.0 - form);
  /* The epsilon matters: a particle whose three seeds all land near 0.5
     normalises a zero-length vector, which is NaN, and a NaN vertex takes the
     whole triangle strip with it on some drivers. */
  vec3 dir = normalize(aRand.xyz - vec3(0.5) + vec3(0.0001));
  vec3 drift = vec3(
    sin(uElapsed * 0.31 + aRand.y * TAU),
    cos(uElapsed * 0.27 + aRand.z * TAU),
    sin(uElapsed * 0.23 + aRand.x * TAU)
  );
  pos += (dir * (0.6 + aRand.x * 2.2) + drift * 0.45) * eff;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  /* 1/z sizing. max(0.1, -mv.z) is a guard, not a taste decision: a particle
     that crosses the near plane has -mv.z at or below zero, and the division
     produces an infinite point size that some drivers answer by dropping the
     entire draw call for that frame. */
  float jitter = 0.55 + aRand.w * 1.35;
  float px = uSize * jitter * uSizeScale / max(0.1, -mv.z);
  gl_PointSize = clamp(px, 1.0, uMaxSize);

  vTint  = aOrder;
  /* Brightness rides the same per-particle window as the position, so a
     particle fades up as it lands rather than arriving at full strength. */
  vAlpha = uOpacity * (0.28 + 0.72 * form) * (0.55 + 0.45 * aRand.w);
}
`;

export const SURFACE_SAMPLED_PARTICLES_FRAG = /* glsl */ `
precision mediump float;

uniform vec3 uColorBase;
uniform vec3 uColorTip;

varying float vAlpha;
varying float vTint;

/* Just under 1/255: below this the fragment cannot change an 8-bit
   framebuffer, and blending it is a read-modify-write for nothing. At these
   counts the sprite quads overlap heavily and most of that area is falloff. */
const float ALPHA_EPSILON = 0.003;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));

  /* A wide falloff from the sprite edge almost to its centre, rather than a
     hard disc with a narrow anti-aliased band. Thousands of these overlap, and
     a hard edge accumulates into visible circles; a soft one accumulates into
     density, which is the thing being drawn. */
  float a = smoothstep(0.5, 0.05, d) * vAlpha;
  if (a <= ALPHA_EPSILON) discard;

  gl_FragColor = vec4(mix(uColorBase, uColorTip, vTint), a);
}
`;
