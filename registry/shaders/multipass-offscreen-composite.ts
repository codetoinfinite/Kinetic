/* ==========================================================================
   Multipass Offscreen Composite — GLSL
   --------------------------------------------------------------------------
   Four passes, four fragment programs, two render targets:

     1. RAMP        -> scene target   an angled three-stop colour ramp
     2. DISC        -> scene target   additive gradient discs, no clear between
     3. BLOOM       -> bloom target   bright-pass plus a 3x3 tent, at half size
     4. COMPOSITE   -> canvas         scene + bloom + vignette + dither

   Every pass here is a ShaderMaterial, and three only injects its output
   colour-space conversion into its own built-in materials. So there is no
   conversion anywhere in this chain: the numbers in the ramp uniforms are the
   numbers that land in the framebuffer. That is a choice, not an oversight —
   one conversion in the middle of a multipass chain is far harder to reason
   about than none at all.

   Shipped as a .ts template literal rather than a .glsl file so that
   'npx shadcn add' produces something that compiles with no bundler plugin.
   ========================================================================== */

/**
 * Clip-space quad for the passes that cover the whole target. PlaneGeometry(2,
 * 2) already spans -1..1, so no matrices are needed and each pass costs four
 * vertices.
 */
export const MULTIPASS_FLAT_VERT = /* glsl */ `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** Pass 1 — the background ramp. */
export const MULTIPASS_RAMP_FRAG = /* glsl */ `
precision mediump float;

uniform vec2  uResolution;
uniform float uAngle;
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uColorC;

void main() {
  vec2 uv  = gl_FragCoord.xy / uResolution;
  vec2 dir = vec2(cos(uAngle), sin(uAngle));

  /* Project onto the ramp axis, then normalise by abs(dir.x) + abs(dir.y) —
     the maximum the projection can reach inside the unit square. Without that
     term the ramp saturates before the far corner at every angle except the
     axes, and the corner reads as a flat plate of the end colour. */
  float t = clamp(dot(uv - 0.5, dir) / (abs(dir.x) + abs(dir.y)) + 0.5, 0.0, 1.0);

  /* Three stops, not two. A straight A-to-B mix is the flat look of a CSS
     gradient; the mid stop is where the hue bends, and the bend is what makes
     it read as light in a space. */
  vec3 c = t < 0.5
    ? mix(uColorA, uColorB, t * 2.0)
    : mix(uColorB, uColorC, (t - 0.5) * 2.0);

  gl_FragColor = vec4(c, 1.0);
}
`;

/** Pass 2 — one gradient disc. Needs the model matrix, so not the flat vert. */
export const MULTIPASS_DISC_VERT = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const MULTIPASS_DISC_FRAG = /* glsl */ `
precision mediump float;

uniform vec3  uColor;
uniform float uIntensity;
uniform float uSoftness;

varying vec2 vUv;

void main() {
  float d = length(vUv - vec2(0.5)) * 2.0;

  /* A Gaussian, not a smoothstep. smoothstep has a discontinuity in its second
     derivative at the outer edge, and three of these stacked additively make
     that discontinuity visible as a faint ring. exp(-d*d*k) never ends, so
     there is no edge to see. */
  float fall = exp(-d * d * uSoftness);

  float alpha = fall * uIntensity;
  if (alpha <= 0.002) discard;

  /* NOT premultiplied. three's AdditiveBlending is (SrcAlpha, One), so the
     blender multiplies by alpha; doing it here as well squares it and the discs
     all but disappear. */
  gl_FragColor = vec4(uColor, alpha);
}
`;

/** Pass 3 — bright-pass and blur, rendered into the half-size target. */
export const MULTIPASS_BLOOM_FRAG = /* glsl */ `
precision mediump float;

uniform sampler2D uSource;
uniform vec2      uTexel;
uniform float     uThreshold;
uniform float     uRadius;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

vec3 bright(vec2 uv) {
  vec3  c = texture2D(uSource, uv).rgb;
  float l = dot(c, LUMA);
  /* Soft knee over a quarter of the range. With a hard step the bright region's
     boundary snaps from pixel to pixel as the discs drift, and the bloom edge
     crawls — the most common giveaway of a hand-rolled bloom. */
  return c * smoothstep(uThreshold, uThreshold + 0.25, l);
}

void main() {
  vec2 uv = gl_FragCoord.xy * uTexel;
  vec2 o  = uTexel * uRadius;

  /* 3x3 tent, weights 4 / 2 / 1, normalised by 16. uTexel is the HALF-size
     target's texel, so every offset covers two source pixels: the blur radius
     doubles because of where this pass renders, not because of extra taps. */
  vec3 sum = bright(uv) * 4.0;
  sum += (
      bright(uv + vec2(o.x, 0.0))
    + bright(uv - vec2(o.x, 0.0))
    + bright(uv + vec2(0.0, o.y))
    + bright(uv - vec2(0.0, o.y))
  ) * 2.0;
  sum +=
      bright(uv + o)
    + bright(uv - o)
    + bright(uv + vec2(o.x, -o.y))
    + bright(uv + vec2(-o.x, o.y));

  gl_FragColor = vec4(sum / 16.0, 1.0);
}
`;

/** Pass 4 — the only pass that touches the canvas. */
export const MULTIPASS_COMPOSITE_FRAG = /* glsl */ `
precision mediump float;

uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec2      uResolution;
uniform float     uBloomStrength;
uniform float     uVignette;
uniform float     uDither;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  vec3 scene = texture2D(uScene, uv).rgb;
  /* The bloom target is half size, so this read is a bilinear upsample — a
     free extra blur, which is most of the reason to render bloom small rather
     than a reason to apologise for it. */
  vec3 bloom = texture2D(uBloom, uv).rgb;

  vec3 c = scene + bloom * uBloomStrength;

  /* Vignette measured in a square space, so it stays a circle in a wide box
     instead of stretching into a lens-shaped band across the sides. */
  vec2 v = (uv - vec2(0.5)) * vec2(uResolution.x / uResolution.y, 1.0);
  c *= mix(1.0, 1.0 - uVignette, smoothstep(0.25, 0.95, length(v)));

  /* Triangular-PDF dither: the difference of two uniform samples, which has a
     flatter error spectrum than a single one. The ramp crosses only a few
     hundred 8-bit codes over a thousand pixels, and without a sub-LSB
     perturbation that shows up as hard contour lines across the whole frame. */
  float n = hash(gl_FragCoord.xy) - hash(gl_FragCoord.xy + 17.0);

  gl_FragColor = vec4(c + n * uDither, 1.0);
}
`;
