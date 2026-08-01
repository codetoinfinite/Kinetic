/* ==========================================================================
   Bit-Math Bayer8 Dither — GLSL ES 3.00
   --------------------------------------------------------------------------
   The 8x8 ordered-dither matrix is DERIVED from the coordinate with six
   integer operations. No texture, no 64-entry constant array, no branches.

   Derivation. The Bayer matrix is defined recursively:

     M2   = [[0, 2], [3, 1]]
     M2n(x, y) = 4 * Mn(x mod n, y mod n) + M2(x div n, y div n)

   Write M2 in binary — 0=00, 2=10, 3=11, 1=01 — and a pattern appears:

     M2(a, b) = 2 * (a ^ b) + b

   Unrolling the recursion three times for the 8x8 case gives

     M8(x, y) = 16 * M2(x0, y0) + 4 * M2(x1, y1) + M2(x2, y2)

   where xN is bit N of x. Substituting the closed form for M2:

     M8(x, y) = 32*(x0^y0) + 16*y0
              +  8*(x1^y1) +  4*y1
              +  2*(x2^y2) +     y2

   Read as bits, that is the three-bit values of (x ^ y) and y interleaved and
   REVERSED — the least significant bit of the coordinate controls the most
   significant bit of the threshold, which is exactly what makes the pattern
   maximally dispersed rather than clustered.
   ========================================================================== */

export const BAYER8_DITHER_VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;

void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

export const BAYER8_DITHER_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;
uniform vec2  u_pointer;
uniform float u_levels;   /* output steps per channel, including both ends */
uniform float u_cell;     /* device pixels per dither cell */
uniform vec3  u_dark;
uniform vec3  u_light;

/* Threshold in [0, 1) for this cell. See the derivation at the top of the
   file. '& 7' is the modulo — the matrix tiles every 8 cells on both axes. */
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

  /* Divide by 64, not 63. The matrix holds 0..63, and dividing by 63 would
     make the top cell land on exactly 1.0, which pushes that one cell in every
     tile a full step brighter and stamps a visible dot grid into flat areas. */
  return float(v) / 64.0;
}

/* Quantise to 'levels' evenly spaced values, offsetting by the cell threshold
   first. '(t - 0.5) / steps' centres the perturbation on zero and scales it to
   exactly one output step: any larger and the dither injects contrast of its
   own, any smaller and the bands survive. */
vec3 quantise(vec3 c, float threshold, float levels) {
  float steps = max(levels - 1.0, 1.0);
  vec3 shifted = clamp(c + (threshold - 0.5) / steps, 0.0, 1.0);
  return floor(shifted * steps + 0.5) / steps;
}

void main() {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = v_uv;
  p.x *= aspect;
  vec2 m = u_pointer;
  m.x *= aspect;

  /* A deliberately smooth, banding-prone field: a wide radial falloff around
     the pointer, a vertical ramp, and a slow horizontal sweep. Every one of
     these is the kind of gradient that shows 8-bit staircase edges. */
  float g = 1.0 - smoothstep(0.0, 1.15, distance(p, m));
  g = mix(g, 1.0 - v_uv.y, 0.42);
  g += 0.09 * sin(v_uv.x * 3.1 + u_time * 0.25);
  g = clamp(g, 0.0, 1.0);

  /* Gamma before quantisation. The level steps are evenly spaced in the
     encoded value, and the eye is not, so quantising the linear value alone
     puts all the visible banding in the shadows. */
  g = pow(g, 1.35);

  vec3 col = mix(u_dark, u_light, g);

  /* Dividing gl_FragCoord by the cell size is what decouples the dither
     pattern from the pixel grid, so the texture stays the same physical size
     on a 1x and a 3x display. */
  float threshold = bayer8(gl_FragCoord.xy / max(u_cell, 1.0));

  fragColor = vec4(quantise(col, threshold, u_levels), 1.0);
}
`;
