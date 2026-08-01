/* ==========================================================================
   Text-Target Particle Glyphs — GLSL
   --------------------------------------------------------------------------
   Two positions per particle and one number that moves between them.

   Both positions are stored NORMALISED — the home cloud in 0..1 per axis, the
   glyph target in glyph-box units — and scaled to world space here in the
   shader. That is what makes a container resize a matter of writing two
   uniforms rather than re-rasterising the text and re-uploading the buffers.

   The order of the morph is the load-bearing detail. `order` is the target's
   own horizontal position, so the stagger writes the word LEFT TO RIGHT
   instead of fading it in everywhere at once, and the eye reads it as
   typesetting rather than as a cross-fade.
   ========================================================================== */

/**
 * position — normalised home scatter, 0..1 on each axis. Mapped to the visible
 *   frustum, so the resting cloud fills whatever the container is.
 * aTarget  — glyph destination in glyph-box units: x is -0.5..0.5 across the
 *   word, y is already multiplied by the rasterised bounding box's aspect so a
 *   single `uWordWidth` scales both axes without squashing the letters.
 * aRand    — x, y: drift phases. z: depth within the word's thickness.
 *   w: size and brightness jitter.
 */
export const TEXT_TARGET_PARTICLE_GLYPHS_VERT = /* glsl */ `
attribute vec2 aTarget;
attribute vec4 aRand;

uniform float uElapsed;
uniform float uMorph;
uniform vec2  uViewSize;
uniform float uHomeDepth;
uniform float uWordWidth;
uniform float uThickness;
uniform float uHomeDrift;
uniform float uGlyphDrift;
uniform float uSwarm;
uniform float uSize;
uniform float uMaxSize;
uniform float uSizeScale;
uniform float uOpacity;

varying float vAlpha;
varying float vTint;

const float TAU = 6.2831853;
const float PI  = 3.14159265;

/* Stagger and window sum to 1.0: the rightmost particle starts last and
   finishes exactly as uMorph reaches 1, so there is no dead time at either end
   of the write. */
const float STAGGER = 0.45;
const float WINDOW  = 0.55;

void main() {
  /* Order from the DESTINATION, not from the buffer index. Index order is
     random, which dissolves the word into place; destination order writes it. */
  float order = clamp(aTarget.x + 0.5, 0.0, 1.0);
  float form  = smoothstep(order * STAGGER, order * STAGGER + WINDOW, uMorph);

  vec3 home = vec3(
    (position.x - 0.5) * uViewSize.x,
    (position.y - 0.5) * uViewSize.y,
    (position.z - 0.5) * uHomeDepth
  );

  /* One uWordWidth scales both axes because aTarget.y already carries the
     rasterised bounding box's aspect ratio. Scaling x and y independently is
     how particle text ends up stretched at one container width and squashed at
     another. */
  vec3 glyph = vec3(aTarget * uWordWidth, (aRand.z - 0.5) * uThickness);

  vec3 pos = mix(home, glyph, form);

  vec3 drift = vec3(
    sin(uElapsed * 0.21 + aRand.x * TAU),
    cos(uElapsed * 0.17 + aRand.y * TAU),
    sin(uElapsed * 0.13 + aRand.x * TAU)
  );
  /* The drift amplitude collapses as the particle lands: a loose cloud at rest,
     a barely-breathing letterform once written. Two separate motion states
     would need cross-fading; one interpolated amplitude does not. */
  pos += drift * mix(uHomeDrift * uViewSize.y, uGlyphDrift * uWordWidth, form);

  /* Mid-flight swarm. sin(form * PI) is zero at both ends and peaks at the
     halfway point, so the travel bows outward instead of running down the
     straight line between the two positions — which is what makes it read as
     particles moving rather than as a lerp. */
  float turb = sin(form * PI);
  pos.xy += vec2(cos(aRand.x * TAU), sin(aRand.y * TAU)) * turb * uSwarm * uWordWidth;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  /* Perspective-correct size. uSizeScale is pixelRatio * the camera's distance
     to the word plane, so uSize is a literal CSS-pixel diameter for a particle
     that has landed, rather than a constant found by trial. max(0.1, -mv.z)
     guards the particle that drifts across the near plane: the unguarded
     division asks for an enormous point size, and some drivers answer by
     dropping the draw call for that frame. */
  float jitter = 0.6 + aRand.w * 1.2;
  float px = uSize * jitter * mix(0.85, 1.0, form) * uSizeScale / max(0.1, -mv.z);
  gl_PointSize = clamp(px, 1.0, uMaxSize);

  vTint  = form;
  vAlpha = uOpacity * mix(0.42, 1.0, form) * (0.6 + 0.4 * aRand.w);
}
`;

export const TEXT_TARGET_PARTICLE_GLYPHS_FRAG = /* glsl */ `
precision mediump float;

uniform vec3 uColorCloud;
uniform vec3 uColorGlyph;

varying float vAlpha;
varying float vTint;

/* Just under 1/255. Below it the fragment cannot change an 8-bit framebuffer,
   and the sprite quads overlap heavily inside a letter stroke, so most of that
   area is falloff that would otherwise cost a blend each. */
const float ALPHA_EPSILON = 0.003;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));

  /* Soft all the way in rather than a hard disc with a thin anti-aliased band.
     Inside a stroke these overlap by the dozen, and hard edges accumulate into
     visible circles where the intent is a continuous mark. */
  float a = smoothstep(0.5, 0.06, d) * vAlpha;
  if (a <= ALPHA_EPSILON) discard;

  gl_FragColor = vec4(mix(uColorCloud, uColorGlyph, vTint), a);
}
`;
