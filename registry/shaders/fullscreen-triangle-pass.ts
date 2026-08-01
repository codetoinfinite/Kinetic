/* ==========================================================================
   Fullscreen Triangle Pass — GLSL ES 3.00
   --------------------------------------------------------------------------
   `#version 300 es` MUST be the first token in the source, before any
   whitespace or comment. That is why these template literals open flush
   against the backtick instead of on the next line.
   ========================================================================== */

/**
 * The entire vertex stage. No matrices, no projection, no model transform —
 * the three vertices are already in clip space.
 *
 * `a_pos * 0.5 + 0.5` maps clip space to 0..1, so `v_uv` reads 0..1 across the
 * VISIBLE region even though two of the three vertices sit outside it at
 * uv 2.0. The rasteriser clips the triangle to the viewport and interpolates
 * the varying linearly, so the clipped result carries exactly the same uv a
 * quad would have produced.
 */
export const FULLSCREEN_TRIANGLE_VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;

void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

/**
 * Default payload: an aspect-corrected measuring grid with a soft light that
 * follows the pointer. Deliberately cheap — the point of this component is the
 * pass, not the picture.
 */
export const FULLSCREEN_TRIANGLE_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;
uniform vec2  u_pointer;

/* Analytic anti-aliased grid. Dividing the distance-to-line by fwidth gives a
   value measured in PIXELS, so a single smoothstep produces a line of constant
   apparent weight no matter how far the grid is scaled. */
float gridMask(vec2 p, float thickness) {
  vec2 w = fwidth(p);
  vec2 d = abs(fract(p - 0.5) - 0.5) / max(w, vec2(1e-5));
  float line = min(d.x, d.y);
  return 1.0 - smoothstep(thickness - 0.5, thickness + 0.5, line);
}

void main() {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);

  vec2 p = v_uv;
  p.x *= aspect;
  vec2 m = u_pointer;
  m.x *= aspect;

  /* Two grids an octave apart: the coarse one carries structure, the fine one
     only appears near the pointer, which reads as focus rather than as detail. */
  float coarse = gridMask(p * 9.0, 0.6);
  float fine = gridMask(p * 36.0, 0.5);

  float d = distance(p, m);
  float focus = smoothstep(0.55, 0.0, d);

  /* A slow breathing sweep so the pass is visibly live without animating the
     grid itself, which would read as a rendering fault. */
  float sweep = 0.5 + 0.5 * sin(p.x * 1.6 - p.y * 0.9 - u_time * 0.35);

  vec3 col = vec3(0.035, 0.038, 0.045);
  col += vec3(0.10, 0.13, 0.16) * coarse * (0.35 + 0.65 * sweep);
  col += vec3(0.16, 0.34, 0.30) * fine * focus;
  col += vec3(0.10, 0.22, 0.20) * focus * focus * 0.55;

  float vignette = smoothstep(1.35, 0.35, distance(v_uv, vec2(0.5)));
  col *= mix(0.72, 1.0, vignette);

  fragColor = vec4(col, 1.0);
}
`;
