/* ==========================================================================
   Spring Lattice Field — GLSL ES 3.00
   --------------------------------------------------------------------------
   The fragment shader knows nothing about springs. It reads a displacement
   texture the CPU wrote this frame, offsets its own sample coordinate by it,
   and draws a grid. All of the physics is on the other side of that texture.
   ========================================================================== */

export const SPRING_LATTICE_VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;

void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

export const SPRING_LATTICE_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_field;
uniform vec2  u_resolution;
uniform vec2  u_grid;      /* lattice columns, rows */
uniform float u_dispMax;   /* the encode range, in lattice cells */
uniform float u_density;   /* grid lines across the short axis */
uniform vec3  u_ink;
uniform vec3  u_line;
uniform vec3  u_glow;

/* Analytic anti-aliased grid. Dividing distance-to-line by fwidth converts it
   into pixels, so one smoothstep gives a hairline of constant apparent weight
   whatever the grid is scaled to — and it stays one pixel while the field is
   stretching it, which a texture-based grid cannot do. */
float gridMask(vec2 p, float thickness) {
  vec2 w = fwidth(p);
  vec2 d = abs(fract(p - 0.5) - 0.5) / max(w, vec2(1e-5));
  return 1.0 - smoothstep(thickness - 0.5, thickness + 0.5, min(d.x, d.y));
}

void main() {
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);

  /* LINEAR filtering on the field texture is doing real work here: it
     interpolates between lattice cells, so a 40x24 simulation drives a
     continuous displacement across two million fragments. With NEAREST you
     see the lattice itself as blocky steps. */
  vec4 field = texture(u_field, v_uv);
  vec2 disp = (field.rg * 2.0 - 1.0) * u_dispMax;   /* cells */
  float energy = field.b;

  /* Cells -> uv. Dividing by the grid dimensions is what makes the same
     displacement mean the same physical distance at any lattice resolution. */
  vec2 duv = disp / u_grid;

  vec2 p = v_uv + duv;
  p.x *= aspect;

  float fine = gridMask(p * u_density, 0.5);
  float coarse = gridMask(p * (u_density * 0.25), 0.9);

  vec3 col = u_ink;
  col += u_line * (fine * 0.55 + coarse * 0.5);

  /* Energy is speed, not displacement: the field lights up while it is moving
     and goes dark once it settles, which is what makes it read as elastic
     rather than as a permanent dent. */
  col += u_glow * energy * (0.35 + 0.9 * (fine + coarse));

  float vig = smoothstep(1.3, 0.45, distance(v_uv, vec2(0.5)));
  col *= mix(0.7, 1.0, vig);

  fragColor = vec4(col, 1.0);
}
`;
