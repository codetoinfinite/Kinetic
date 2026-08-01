/* ==========================================================================
   Depth Fade And Travelling Pulse — GLSL
   --------------------------------------------------------------------------
   Two techniques that belong together, because each one covers for the other's
   weakness.

   The depth cue: model-space z drives BOTH alpha and point size, so a dot
   further from the viewer is dimmer AND smaller. Alpha alone reads as a grey
   copy of the near dots; size alone reads as a resolution change. Together
   they read as distance, with no depth buffer and no perspective camera.

   The pulse: every column carries its own phase, so the cosine peaks sweep
   along the lattice instead of the whole field breathing in unison. A field
   that pulses in unison looks like a loading state; one that pulses in
   sequence looks like something is passing through it.
   ========================================================================== */

/** `aWave = vec2(phase 0..1, per-dot jitter -0.5..0.5)`. */
export const DEPTH_PULSE_WAVE_VERT = /* glsl */ `
attribute vec2 aWave;

uniform float uElapsed;
uniform float uViewScale;
uniform float uPixelRatio;
uniform float uDotScale;
uniform float uOpacity;
uniform float uPulseCycle;
uniform float uWaveDepth;
uniform float uYaw;

varying float vAlpha;
varying float vAlphaScale;
varying float vPulse;

const float TAU = 6.283185307179586;
const float DEG2RAD = 0.017453292519943295;

/* One pulse every 3 seconds. Faster than ~2s and the crest overtakes the eye's
   ability to follow it along the lattice; slower than ~5s and it stops reading
   as a wave and starts reading as an idle shimmer. */
const float DEFAULT_CYCLE = 3.0;

/* The pulse ramps in over the first second so it does not fight whatever
   entrance the field is doing. Without it the very first frame lands on an
   arbitrary point of the cosine and the field flashes. */
const float INTRO_SECONDS = 1.0;

/* Pulse rides between 0.30 and 1.00 of nominal. A trough of 0 would make dots
   disappear entirely and the lattice would look like it is dropping frames. */
const float PULSE_BASE = 0.65;
const float PULSE_SWING = 0.35;

/* z range the depth cue normalises over. The arc itself only spans +/-0.34 and
   the wave adds up to +0.18 on top, so 0.55 leaves headroom at both ends: no
   dot ever sits at exactly 0 or 1 and the falloff never visibly clips. */
const float DEPTH_HALF_RANGE = 0.55;
const float DEPTH_MIN_SIZE = 0.65;
const float DEPTH_MAX_SIZE = 1.0;

const float MIN_POINT_SIZE = 2.0;
const float UNCLAMPED_MIN_POINT_SIZE = 1.0;

vec3 rotateY(vec3 p, float degrees) {
  float a = degrees * DEG2RAD;
  float c = cos(a);
  float s = sin(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

void main() {
  float phase  = aWave.x;
  float jitter = aWave.y;

  // The travelling wave. Subtracting the phase inside the cosine is what makes
  // the crest move ALONG the lattice: at any instant, columns further through
  // the phase range are further through the cycle.
  float cycle  = uPulseCycle > 0.0 ? uPulseCycle : DEFAULT_CYCLE;
  float raw    = PULSE_BASE + PULSE_SWING * cos(TAU * (uElapsed / cycle - phase));
  float intro  = clamp(uElapsed / INTRO_SECONDS, 0.0, 1.0);
  float pulse  = 1.0 + (raw - 1.0) * intro;

  // Crest normalised to 0..1, used to push the dot toward the viewer. This is
  // what makes the two techniques visibly interact: the wave moves dots in z,
  // and the depth cue then brightens and enlarges them for it.
  float crest = (raw - (PULSE_BASE - PULSE_SWING)) / (2.0 * PULSE_SWING);

  vec3 p = position;
  p.z += crest * uWaveDepth * (1.0 + jitter * 0.3);
  p = rotateY(p, uYaw);

  float depthT     = clamp((p.z + DEPTH_HALF_RANGE) / (2.0 * DEPTH_HALF_RANGE), 0.0, 1.0);
  float depthAlpha = 0.25 + 0.75 * depthT;
  float depthSize  = DEPTH_MIN_SIZE + depthT * (DEPTH_MAX_SIZE - DEPTH_MIN_SIZE);

  vPulse = crest;
  vAlpha = depthAlpha * pulse * uOpacity;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p.xy * uViewScale, 0.0, 1.0);

  float raw2      = uDotScale * pulse * depthSize * 2.0 * uPixelRatio;
  float unclamped = max(UNCLAMPED_MIN_POINT_SIZE, raw2);
  float clamped   = max(MIN_POINT_SIZE, raw2);
  vAlphaScale  = (unclamped * unclamped) / (clamped * clamped);
  gl_PointSize = clamped;
}
`;

export const DEPTH_PULSE_WAVE_FRAG = /* glsl */ `
precision mediump float;

uniform vec3 uColor;
uniform vec3 uCrestColor;

varying float vAlpha;
varying float vAlphaScale;
varying float vPulse;

const float ALPHA_EPSILON = 0.003;

void main() {
  vec2  centered = gl_PointCoord - vec2(0.5);
  float disc = 1.0 - smoothstep(0.43, 0.5, length(centered));

  float alpha = vAlpha * vAlphaScale * disc;
  if (alpha <= ALPHA_EPSILON) discard;

  // Tint only the top third of the crest. Colouring the whole cosine washes
  // the tint across the entire field and the wave stops having a location.
  gl_FragColor = vec4(mix(uColor, uCrestColor, smoothstep(0.65, 1.0, vPulse)), alpha);
}
`;
