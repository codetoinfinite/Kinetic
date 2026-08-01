/* ==========================================================================
   Dot-Cloud Score Cylinder — GLSL
   --------------------------------------------------------------------------
   Two cylinders' worth of dots — measure rings, bar dividers and notes — in
   one buffer, one material, one draw call. Which cylinder a dot belongs to and
   which group it is part of are packed into an attribute; the vertex shader
   applies a different transform stack per instance.

   There is no depth buffer anywhere in this file. Ordering comes from the
   order dots were written into the buffer, and the illusion of a solid
   cylinder comes entirely from alpha and point size falling off with z.
   ========================================================================== */

/**
 * `aPointData = vec4(instanceIndex, isNote, pointScale, groupIndex)`
 *
 *   instanceIndex  0 or 1 — which of the two stacked cylinders
 *   isNote         1 for a note dot, 0 for measure and divider dots
 *   pointScale     relative dot size; notes ship at 2x the measure scale
 *   groupIndex     which note group, for the playhead highlight
 */
export const CYLINDER_DOT_SCORE_VERT = /* glsl */ `
attribute vec4 aPointData;

uniform float uSpin;
uniform float uElapsed;
uniform float uViewScale;
uniform float uViewportYOffset;
uniform float uPixelRatio;
uniform float uDotScale;
uniform float uOpacity;
uniform float uNoteInterval;
uniform float uGroupCount;

varying float vAlpha;
varying float vAlphaScale;
varying float vNote;
varying float vActive;

const float DEG2RAD = 0.017453292519943295;

/* The whole cloud is modelled at unit-ish scale and blown up here rather than
   in the buffer, so changing the framing never re-uploads a vertex. */
const float BASE_SCALE = 1.5;

/* 8 degrees of X tilt. Below ~4 the cylinder collapses into a straight band
   and stops reading as a cylinder; past ~15 you are looking into the tube and
   the far wall crowds the near one. */
const float TILT = 8.0;

/* The second cylinder is mirrored in z and turned 166 degrees, so the two
   never present the same face at the same time. */
const float INSTANCE_B_YAW = -166.0;
const float INSTANCE_A_YAW = -90.0;

/* Vertical separation of the two cylinders, in model units, applied AFTER the
   rotation so it is a pure screen-space offset and the stack never tips. */
const float STACK_OFFSET = 0.3;

/* z range the depth cue is normalised over. The cloud's radius is 0.5 and
   BASE_SCALE is 1.5, so z spans +/-0.75; 0.6 slightly over-saturates the
   nearest and furthest dots, which is what stops the middle band looking flat. */
const float DEPTH_HALF_RANGE = 0.6;

const float DEPTH_MIN_SIZE = 0.65;
const float DEPTH_MAX_SIZE = 1.0;
const float NOTE_ACTIVE_SCALE = 2.0;

const float MIN_POINT_SIZE = 2.0;
const float UNCLAMPED_MIN_POINT_SIZE = 1.0;

vec3 rotateY(vec3 p, float degrees) {
  float a = degrees * DEG2RAD;
  float c = cos(a);
  float s = sin(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

vec3 rotateX(vec3 p, float degrees) {
  float a = degrees * DEG2RAD;
  float c = cos(a);
  float s = sin(a);
  return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

vec3 applyStack(vec3 p, float instanceIndex) {
  p *= BASE_SCALE;

  if (instanceIndex > 0.5) {
    p.z *= -1.0;
    p = rotateY(p, INSTANCE_B_YAW);
  } else {
    p = rotateY(p, INSTANCE_A_YAW);
  }

  // uSpin is in DEGREES and advances linearly. No easing anywhere: a constant
  // angular rate is what makes the object read as a machine rather than as an
  // animation that is about to arrive somewhere.
  p = rotateY(p, uSpin);
  p = rotateX(p, TILT);

  if (instanceIndex < 0.5) p.y += STACK_OFFSET;
  return p;
}

void main() {
  float instanceIndex = aPointData.x;
  float isNote        = aPointData.y;
  float pointScale    = aPointData.z;
  float noteGroup     = aPointData.w;

  vec3  transformed = applyStack(position, instanceIndex);

  float depthT     = clamp((transformed.z + DEPTH_HALF_RANGE) / (2.0 * DEPTH_HALF_RANGE), 0.0, 1.0);
  float depthAlpha = 0.25 + 0.75 * depthT;
  float depthSize  = DEPTH_MIN_SIZE + depthT * (DEPTH_MAX_SIZE - DEPTH_MIN_SIZE);

  // The playhead is derived from the same clock the rotation uses, so lighting
  // a note costs neither a React render nor a uniform write.
  float playhead   = mod(floor(uElapsed / uNoteInterval), uGroupCount);
  // Named isActive, not active: the latter is reserved for future use in
  // GLSL ES, and using it fails the whole vertex shader at compile time.
  float isActive   = isNote * step(abs(noteGroup - playhead), 0.5);
  float noteScale  = mix(1.0, NOTE_ACTIVE_SCALE, isActive);

  vNote   = isNote;
  vActive = isActive;
  // An active note ignores the depth fade: the playhead has to be legible on
  // the far wall of the cylinder as well as the near one.
  vAlpha  = mix(depthAlpha, 1.0, isActive) * uOpacity;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(
    transformed.x * uViewScale,
    uViewportYOffset + transformed.y * uViewScale,
    0.0, 1.0
  );

  float raw       = pointScale * noteScale * uDotScale * depthSize * 2.0 * uPixelRatio;
  float unclamped = max(UNCLAMPED_MIN_POINT_SIZE, raw);
  float clamped   = max(MIN_POINT_SIZE, raw);
  vAlphaScale  = (unclamped * unclamped) / (clamped * clamped);
  gl_PointSize = clamped;
}
`;

export const CYLINDER_DOT_SCORE_FRAG = /* glsl */ `
precision mediump float;

uniform vec3 uColor;
uniform vec3 uNoteColor;

varying float vAlpha;
varying float vAlphaScale;
varying float vNote;
varying float vActive;

const float ALPHA_EPSILON = 0.003;

void main() {
  vec2  centered = gl_PointCoord - vec2(0.5);
  float disc = 1.0 - smoothstep(0.43, 0.5, length(centered));

  float alpha = vAlpha * vAlphaScale * disc;
  if (alpha <= ALPHA_EPSILON) discard;

  vec3 tint = mix(uColor, uNoteColor, max(vNote * 0.6, vActive));
  gl_FragColor = vec4(tint, alpha);
}
`;
