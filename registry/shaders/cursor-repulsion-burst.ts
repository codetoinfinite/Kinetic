/* ==========================================================================
   Cursor Repulsion Burst — GLSL
   --------------------------------------------------------------------------
   One instanced quad per particle, and three displacements stacked on top of
   each other in field space before anything reaches clip space:

     1. an idle orbit, so the field is alive with no input at all;
     2. cursor repulsion with a linear falloff, so the pointer opens a hole;
     3. up to three concurrent shock waves, each with a per-particle magnitude
        and a Gaussian heat band at its front.

   Everything is measured in ASPECT-CORRECTED field space (x multiplied by the
   aspect ratio) and converted back before it becomes a position. Skip that and
   the repulsion hole is an ellipse on any container that is not square, and the
   shock ring arrives at the left and right edges before it reaches the top.

   GLSL ES 1.00, so the same source compiles under a WebGL1 context.
   ========================================================================== */

/**
 * position — the shared unit quad, -0.5..0.5 on both axes.
 * aHome    — rest position in field space; 0..1 covers the container.
 * aParams  — x: size in CSS px, y: orbit radius in field-height units,
 *   z: orbit rate in rad/s (signed), w: base alpha.
 * aSeed    — x: orbit phase, y: burst magnitude 0..1, z: edge softness,
 *   w: tint mix between the two colours.
 */
export const CURSOR_REPULSION_BURST_VERT = /* glsl */ `
attribute vec2 position;
attribute vec2 aHome;
attribute vec4 aParams;
attribute vec4 aSeed;

uniform vec2  uResolution;
uniform float uPixelRatio;
uniform float uElapsed;
uniform vec2  uCursor;
uniform float uCursorPresence;
uniform float uCursorRadius;
uniform float uRepel;
uniform float uBreathe;
uniform vec4  uBursts[3];
uniform float uBurstRadius;
uniform float uBurstPush;
uniform float uBurstBand;

varying vec2  vQuad;
varying float vAlpha;
varying float vSoftness;
varying float vHeat;
varying float vTint;

/**
 * Direction toward v, with the magnitude rolled off inside floorLen instead
 * of normalised. A true normalize() is undefined at the origin and violently
 * unstable just outside it: a particle sitting exactly under the cursor would
 * pick a new direction every frame from floating-point noise and buzz. Dividing
 * by a floor makes the vector shorter than unit length near the centre, so the
 * push fades in with distance and the direction stays whatever it already was.
 */
vec2 safeDir(vec2 v, float floorLen) {
  return v / max(length(v), floorLen);
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 stretch = vec2(aspect, 1.0);

  /* 1. IDLE ORBIT. Each particle circles its own home on its own phase and its
     own signed rate, so the field never syncs up into a visible pulse. The
     radius breathes on a second, slower sinusoid — a constant radius reads as
     machinery, a breathing one reads as drift. Dividing x by the aspect ratio
     is what keeps the orbit a circle rather than an ellipse. */
  float phase = aSeed.x;
  float breath = 1.0 - uBreathe + uBreathe * sin(uElapsed * 0.42 + phase * 3.0);
  float angle = uElapsed * aParams.z + phase;
  vec2 orbit = vec2(cos(angle), sin(angle)) * aParams.y * breath;
  orbit.x /= max(aspect, 0.0001);

  vec2 p = aHome + orbit;

  /* 2. CURSOR REPULSION. Linear inside the radius, exactly zero outside it, so
     the field beyond the pointer is untouched and the cost of the whole idea is
     one length() per particle. A smoothstep here would look softer and would
     also mean every particle on screen is always being displaced a little,
     which reads as the whole field sagging toward the cursor. */
  vec2 toCursor = (p - uCursor) * stretch;
  float cursorDist = length(toCursor);
  float push = max(uCursorRadius - cursorDist, 0.0) * uRepel * uCursorPresence;
  p += safeDir(toCursor, uCursorRadius * 0.15) * push / stretch;

  /* Particles inside the radius also brighten, which is what stops the hole
     from reading as a bald patch: the field gets denser at the rim. */
  float near = 1.0 - smoothstep(0.0, uCursorRadius, cursorDist);

  /* 3. BURSTS. Three slots, so a fast triple-click produces three overlapping
     waves instead of one wave restarting from zero twice. w is the active flag;
     multiplying by it rather than branching keeps every lane of the warp doing
     the same work, which is cheaper here than the branch it replaces. */
  float heat = 0.0;
  for (int i = 0; i < 3; i++) {
    vec4 slot = uBursts[i];
    float on = step(0.5, slot.w);
    float t = clamp(slot.z, 0.0, 1.0);

    vec2 fromOrigin = (p - slot.xy) * stretch;
    float originDist = length(fromOrigin);

    /* Cubic ease-out: almost all of the travel happens in the first third of
       the life, which is what a shock front does. A linear ramp reads as a
       scripted move, and an ease-in reads as an elevator. */
    float ease = 1.0 - pow(1.0 - t, 3.0);
    /* ...and then the displacement is walked back to zero by t = 1, so the slot
       can be deactivated without every particle in it snapping home. */
    float settle = 1.0 - smoothstep(0.5, 1.0, t);
    /* Only the neighbourhood of the origin is thrown. Without this the burst
       displaces the entire field uniformly, which reads as the camera jolting. */
    float reach = 1.0 - smoothstep(0.0, uBurstRadius, originDist);

    float magnitude = (0.25 + aSeed.y * 0.75) * uBurstPush * ease * settle * reach * on;
    p += safeDir(fromOrigin, uBurstRadius * 0.05) * magnitude / stretch;

    /* The heat band. The shock radius expands on the same ease, and a Gaussian
       in (distance - shockRadius) lights only the particles the front is
       passing through right now. A flat tint over the whole burst would just
       recolour the field; a band reads as something travelling through it. */
    float band = (originDist - uBurstRadius * ease) / max(uBurstBand, 0.0001);
    heat += exp(-band * band) * (1.0 - t) * on;
  }
  vHeat = clamp(heat, 0.0, 1.0);

  /* The quad is expanded in PIXELS and only then converted to clip space, so a
     particle is square in a container of any aspect ratio. */
  float size = aParams.x * uPixelRatio;
  vec2 clip = p * 2.0 - 1.0;
  vec2 offset = position * size / max(uResolution, vec2(1.0)) * 2.0;

  vQuad = position;
  vSoftness = aSeed.z;
  vTint = aSeed.w;
  vAlpha = aParams.w * (0.62 + 0.38 * near * uCursorPresence);

  gl_Position = vec4(clip + offset, 0.0, 1.0);
}
`;

export const CURSOR_REPULSION_BURST_FRAG = /* glsl */ `
precision mediump float;

uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uHeatColor;
uniform float uOpacity;

varying vec2  vQuad;
varying float vAlpha;
varying float vSoftness;
varying float vHeat;
varying float vTint;

void main() {
  /* A disc with a VARIABLE core: the flat centre shrinks as softness rises, so
     the same geometry covers hard specks and soft motes without a second
     material. A fixed core plus a variable edge cannot do the soft end — the
     particle keeps a visible hard middle no matter how far the edge is pushed. */
  float d = length(vQuad);
  float core = mix(0.34, 0.02, clamp(vSoftness, 0.0, 1.0));
  float falloff = 1.0 - smoothstep(core, 0.5, d);
  if (falloff <= 0.0) discard;

  vec3 col = mix(uColorA, uColorB, clamp(vTint, 0.0, 1.0));
  col = mix(col, uHeatColor, vHeat);

  /* Squared, because additive blending sums overlapping particles and a linear
     falloff piles up into visible bright polygons where several quads cross. */
  float alpha = falloff * falloff * vAlpha * uOpacity;

  /* Premultiplied for an additive pass: the destination is only ever added to,
     so the colour has to arrive already scaled by its own coverage. */
  gl_FragColor = vec4(col * alpha, alpha);
}
`;
