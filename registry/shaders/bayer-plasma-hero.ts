/* ==========================================================================
   Bayer-Quantised Plasma — GLSL ES 3.00
   --------------------------------------------------------------------------
   A domain-warped plasma reduced to a small number of grey levels through the
   same 8x8 ordered matrix used by `bayer8-ordered-dither`. The matrix is
   derived from the coordinate rather than sampled from a texture; the full
   derivation is documented in that component's shader file.

   The function is duplicated here on purpose. Each registry item has to
   install standalone via `npx shadcn add`, and a shared GLSL chunk would mean
   a fourth file and a resolution order that shadcn does not guarantee.
   ========================================================================== */

export const BAYER_PLASMA_VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;

void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

export const BAYER_PLASMA_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;
uniform vec2  u_pointer;
uniform int   u_iterations;
uniform float u_warp;
uniform float u_freq;
uniform float u_rotate;
uniform float u_contrast;
uniform float u_gamma;
uniform float u_levels;
uniform float u_cell;
uniform float u_vignette;
uniform vec3  u_ink;
uniform vec3  u_paper;

/* A constant upper bound, with a uniform-driven 'break'. A fully dynamic loop
   bound is legal in ES 3.00 but stops the compiler bounding register pressure,
   and some mobile drivers respond by recompiling the shader whenever the
   uniform changes — a visible hitch at exactly the moment you lower the
   quality setting to avoid one. */
const int MAX_ITERATIONS = 48;

vec2 rot(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c) * p;
}

/* Iterated domain warp. Each pass rotates the coordinate, folds it through the
   sine of its own transpose ('p.yx', not 'p.xy' — swapping the components is
   what couples the axes and produces marbling instead of stripes), and
   accumulates a wave. The per-iteration phase offset 'float(i) * 0.7'
   decorrelates the passes; without it every iteration warps in lockstep and
   the result is a plain ripple. */
float plasma(vec2 uv, float t) {
  vec2 p = uv * u_freq;
  float value = 0.0;
  float amp = 1.0;
  float norm = 0.0;

  for (int i = 0; i < MAX_ITERATIONS; i++) {
    if (i >= u_iterations) break;
    p = rot(p, u_rotate);
    p += u_warp * sin(p.yx * 1.31 + t + float(i) * 0.7) / (1.0 + float(i) * 0.35);
    value += amp * sin(p.x + p.y + t * 0.6);
    norm += amp;
    amp *= 0.86;
  }

  /* Divide by the amplitude actually accumulated, not by a hard-coded
     constant. Otherwise dropping from 21 iterations to 8 for a weak GPU also
     drops the exposure, and the low-quality path renders visibly darker. */
  return value / max(norm, 1e-4);
}

float bayer8(vec2 cellCoord) {
  ivec2 c = ivec2(floor(cellCoord));
  int x = c.x & 7;
  int y = c.y & 7;
  int v = 32 * ((x & 1) ^ (y & 1))
        + 16 * (y & 1)
        +  8 * (((x >> 1) & 1) ^ ((y >> 1) & 1))
        +  4 * ((y >> 1) & 1)
        +  2 * (((x >> 2) & 1) ^ ((y >> 2) & 1))
        +       ((y >> 2) & 1);
  return float(v) / 64.0;
}

/* An elliptical vignette centred at (0.5, 0.4) — the OPTICAL centre, roughly
   where the eye expects the middle of a frame to be, not the geometric one.
   Centring it at 0.5 makes a hero read as slightly bottom-heavy. */
float heroVignette(vec2 uv, float aspect) {
  vec2 d = uv - vec2(0.5, 0.4);
  d.x *= aspect;
  float r = length(d * vec2(0.82, 1.25));
  return 1.0 - u_vignette * smoothstep(0.18, 0.92, r);
}

void main() {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);

  vec2 p = v_uv - 0.5;
  p.x *= aspect;

  /* The pointer nudges the plasma's own coordinate space rather than adding a
     highlight, so the field appears to lean into the cursor. */
  vec2 m = (u_pointer - 0.5) * vec2(aspect, 1.0);
  float lum = plasma(p + m * 0.12, u_time * 0.35) * 0.5 + 0.5;

  lum = clamp((lum - 0.5) * u_contrast + 0.5, 0.0, 1.0);
  lum *= heroVignette(v_uv, aspect);

  /* Quantise on a gamma-spaced ramp. The reference implementation carried an
     11-entry grey table and found the nearest entry with a branchless ladder
     of ten mix/step pairs. A monotone ramp collapses that whole search into
     encode, round, decode — and the dither offset has to be applied in the
     ENCODED space, or the perturbation is the wrong size in the shadows. */
  float steps = max(u_levels - 1.0, 1.0);
  float threshold = bayer8(gl_FragCoord.xy / max(u_cell, 1.0));
  float encoded = pow(lum, 1.0 / u_gamma);
  encoded = clamp(encoded + (threshold - 0.5) / steps, 0.0, 1.0);
  float quantised = pow(floor(encoded * steps + 0.5) / steps, u_gamma);

  fragColor = vec4(mix(u_ink, u_paper, quantised), 1.0);
}
`;
