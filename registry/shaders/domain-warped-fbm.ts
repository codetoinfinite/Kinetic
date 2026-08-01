/* ==========================================================================
   Domain-Warped FBM Fog — GLSL ES 3.00
   --------------------------------------------------------------------------
   `#version 300 es` must be the first token in the file, so the literal opens
   flush against the backtick.
   ========================================================================== */

export const DOMAIN_WARPED_FBM_VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;

void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

export const DOMAIN_WARPED_FBM_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;
uniform vec2  u_pointer;   /* 0..1, y up, already smoothed on the CPU */
uniform float u_scale;     /* < 1.0 makes features LARGER than the screen */
uniform float u_warp;      /* how far the first two fbm samples push the third */
uniform float u_gain;      /* peak brightness above the base colour */
uniform vec3  u_base;
uniform vec3  u_tint;

/* --------------------------------------------------------------------------
   Value noise. Cheaper than simplex and indistinguishable once the result has
   been through a smoothstep, which is exactly what happens below.

   The hash folds its input into 0..1 with fract() BEFORE the sin(). Feeding
   sin() a large argument is the classic way this hash falls apart: past a few
   thousand radians the fractional part of the angle is quantised, the noise
   develops visible repeating bands, and it breaks on mobile GPUs long before
   it breaks on the desktop it was written on.
   -------------------------------------------------------------------------- */
float hash13(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  /* Hermite fade. Plain linear interpolation leaves visible creases along the
     lattice because the first derivative is discontinuous at the cell walls. */
  vec3 u = f * f * (3.0 - 2.0 * f);

  float n000 = hash13(i);
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));

  float x00 = mix(n000, n100, u.x);
  float x10 = mix(n010, n110, u.x);
  float x01 = mix(n001, n101, u.x);
  float x11 = mix(n011, n111, u.x);

  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z) * 2.0 - 1.0;
}

/* Two octaves, amplitude 0.6 then 0.3, lacunarity 1.93. Standard fbm runs
   four to six; two is enough because the result is immediately crushed by
   smoothstep(0.25, 0.85, n) and the extra detail is thrown away. Halving the
   octave count halves the cost of the shader, since fbm IS the shader. */
float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.6;
  for (int i = 0; i < 2; i++) {
    sum += amp * vnoise(p);
    p *= 1.93;
    amp *= 0.5;
  }
  return sum;
}

void main() {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);

  /* Correct BOTH the sample space and the pointer. Correcting only the sample
     space leaves the cursor glow as an ellipse on a wide screen. */
  vec2 p = v_uv;
  p.x *= aspect;
  vec2 m = u_pointer;
  m.x *= aspect;

  float t = u_time * 0.03;
  vec2 sp = p * u_scale;

  /* Domain warp: two decorrelated fbm samples become an offset fed into a
     third. The vec2(2.3, 1.1) shift on the second channel is what decorrelates
     it — without it both channels return the same value and the "warp"
     degenerates into a pure diagonal translation.

     The pointer enters three times with different weights and a sign flip
     between the two warp channels, so they shear against each other. Three
     weak influences read as "the fog responds to you"; one strong influence
     reads as "the fog is stuck to the cursor". */
  vec2 q = vec2(
    fbm(vec3(sp + m * 0.20, t)),
    fbm(vec3(sp + vec2(2.3, 1.1) - m * 0.20, t))
  );
  float n = fbm(vec3(sp + q * u_warp + m * 0.12, t * 0.8)) * 0.5 + 0.5;

  float shade = smoothstep(0.25, 0.85, n);
  float lift = (u_pointer.y - 0.5) * 0.03;

  vec3 col = u_base + u_tint * (u_gain * shade + lift);

  /* Reversed smoothstep arguments make a FALLING ramp: 1 at the pointer, 0 at
     distance 0.85. Cheaper and clearer than 1.0 - smoothstep(0.0, 0.85, d). */
  float d = distance(p, m);
  col += u_tint * smoothstep(0.85, 0.0, d) * (u_gain * 0.55);

  /* Multiply, do not subtract: scaling the whole result keeps the cursor glow
     inside the vignette instead of letting it punch through at the corners. */
  float vig = smoothstep(1.25, 0.5, distance(v_uv, vec2(0.5)));
  col *= mix(0.85, 1.0, vig);

  fragColor = vec4(col, 1.0);
}
`;
