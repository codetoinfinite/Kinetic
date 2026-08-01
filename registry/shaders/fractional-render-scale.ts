/* ==========================================================================
   Fractional Render Scale — GLSL
   --------------------------------------------------------------------------
   A field that is deliberately rendered into a backing store smaller than the
   element it fills, and is written so the upscale cannot be seen.

   Two rules make that possible, and both live in this file:

     1. Nothing has a hard edge. The fog is smoothstepped into mush, so
        bilinear upsampling has nothing to blur that was not already blurred.
     2. The one thing that DOES have an edge — the grid — is measured in
        BACKING-STORE pixels, not in CSS pixels. A line specified as one
        backing pixel is 1/scale CSS pixels after the upscale: softer and
        wider as the scale drops, never thinner, so it can never fall through
        the sampling grid and break into dashes.

   Note the absence of fwidth(). The grid is axis-aligned in screen space, so
   the derivative of the cell coordinate is a constant this shader already
   knows — uScale * uGridSize backing pixels per cell. Computing it directly
   is exact, costs one multiply, and needs no derivatives extension.
   ========================================================================== */

/**
 * A single triangle covering the viewport, not a quad.
 *
 * Two triangles meet along the diagonal, and every quad-based fullscreen pass
 * pays for that seam: the GPU shades in 2x2 quads, so the pixels along the
 * diagonal are shaded by both triangles. One oversized triangle is three
 * vertices, no seam, and a marginally better cache pattern.
 */
export const FRACTIONAL_SCALE_VERT = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const FRACTIONAL_SCALE_FRAG = /* glsl */ `
precision mediump float;

uniform vec2  uResolution;
uniform float uScale;
uniform float uTime;
uniform vec2  uPointer;
uniform float uGridSize;
uniform float uMajorEvery;
uniform float uLineWidth;
uniform float uGlowRadius;
uniform vec3  uBaseColor;
uniform vec3  uFogColor;
uniform vec3  uLineColor;
uniform vec3  uGlowColor;

/* Distance to the nearest cell boundary, in BACKING-STORE pixels. cell is the
   coordinate in cell units; pxPerCell converts back. The 0.5 offsets put the
   boundary at integer cell values. */
float gridBand(vec2 cell, float pxPerCell, float width) {
  vec2 d = abs(fract(cell - 0.5) - 0.5) * pxPerCell;
  float nearest = min(d.x, d.y);
  /* A one-pixel ramp centred on the requested width. Because the units are
     backing pixels, this ramp is always exactly one texel wide whatever the
     render scale — which is the whole trick. */
  return 1.0 - smoothstep(width - 0.5, width + 0.5, nearest);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv   = frag / uResolution;
  /* CSS pixels, y up. Everything a designer would specify in px is measured
     here, so the layout does not change when uScale does. */
  vec2 css  = frag / uScale;

  float aspect = uResolution.x / uResolution.y;
  vec2  p = uv * vec2(aspect, 1.0);

  /* Three sines and a hard smoothstep. This is not trying to be fbm — it is
     trying to have no detail smaller than a dozen pixels, which is what makes
     rendering it at 0.6 and letting the browser stretch it undetectable. */
  float fog = 0.5 + 0.5 * sin(p.x * 2.3 + uTime * 0.21);
  fog *= 0.5 + 0.5 * sin(p.y * 3.1 - uTime * 0.17 + 1.7);
  fog += 0.35 * sin((p.x + p.y) * 1.7 + uTime * 0.11);
  fog = smoothstep(-0.15, 1.15, fog);

  vec3 color = mix(uBaseColor, uFogColor, fog * 0.85);

  /* Pointer arrives 0..1 with y already flipped to GL's up. Converting it to
     CSS pixels means the glow radius is a real px value and does not stretch
     with the aspect ratio of the box. */
  vec2  pointerCss = uPointer * (uResolution / uScale);
  float d = length(css - pointerCss) / max(uGlowRadius, 1.0);
  float glow = exp(-d * d * 2.2);

  float pxPerCell = uScale * uGridSize;
  float minor = gridBand(css / uGridSize, pxPerCell, uLineWidth);
  float major = gridBand(css / (uGridSize * uMajorEvery), pxPerCell * uMajorEvery, uLineWidth * 1.6);

  /* The grid is mostly latent and the cursor develops it. A grid at full
     strength everywhere is a background; a grid that appears under the pointer
     is the surface reacting to being touched. */
  float lines = max(minor * 0.34, major * 0.7) * (0.18 + 0.82 * glow);

  color = mix(color, uLineColor, lines);
  color += uGlowColor * glow * 0.36;

  /* Square-space vignette, so it stays circular in a wide box. */
  vec2 v = (uv - vec2(0.5)) * vec2(aspect, 1.0);
  color *= 1.0 - 0.55 * smoothstep(0.28, 1.0, length(v));

  gl_FragColor = vec4(color, 1.0);
}
`;
