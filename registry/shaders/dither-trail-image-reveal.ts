/* ==========================================================================
   Dither Trail Image Reveal — GLSL
   --------------------------------------------------------------------------
   Shaders ship as .ts template literals, never .glsl. The registry item type
   enum has no GLSL member, and a .glsl import would force every consumer to
   install a bundler plugin.

   Written for three.js ShaderMaterial, which prepends position, uv and the
   matrices, so those are not declared here. GLSL ES 1.00 — which rules out the
   integer bitwise operators the usual 8x8 Bayer derivation leans on, so the
   matrix is built recursively out of the 2x2 one instead. That produces the
   identical 64-value ordering with nothing but floor, fract and a multiply.

   The whole picture is three passes over the same fragment:

     1. THE TRAIL MASK. Twenty-four pointer samples, each a soft disc, are
        thresholded against the Bayer value of the 5px BLOCK the fragment is in.
        A block is either lit or it is not, so the reveal has the hard-edged
        vocabulary of a dither rather than a soft alpha edge.
     2. THE FLOW. The same loop accumulates each sample's velocity, weighted by
        its own contribution to the mask, then clamps it. This is what makes the
        reveal smear in the direction the hand actually moved.
     3. THE COLOUR. The image is sampled at the displaced coordinate and
        quantised against the Bayer threshold again, this time per pixel rather
        than per block, so the two frequencies do not moire against each other.
   ========================================================================== */

export const ditherTrailImageRevealVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ditherTrailImageRevealFragmentShader = /* glsl */ `
  precision highp float;

  #define TRAIL_POINTS 24

  varying vec2 vUv;

  uniform vec2      uResolution;
  uniform sampler2D uImage;
  /** 1 when a decoded image is bound, 0 while it is loading or after a 404. */
  uniform float     uHasImage;
  uniform vec2      uUvScale;
  uniform vec2      uUvOffset;
  /** xy: uv of the sample, z: life 1 down to 0, w: normalised speed 0..1. */
  uniform vec4      uTrail[TRAIL_POINTS];
  /** Per-sample velocity in uv units, already clamped on the CPU. */
  uniform vec2      uFlow[TRAIL_POINTS];
  uniform float     uBlock;
  uniform float     uLevels;
  uniform float     uFlowClamp;
  uniform float     uRestBrightness;
  uniform float     uRestSaturation;

  const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

  /* The 2x2 Bayer matrix [[0, 2], [3, 1]] / 4 with no lookup. Squaring y is the
     trick: it contributes 0 on even rows and 0.75 on odd ones after the fract,
     which is exactly the diagonal ordering the matrix wants. */
  float bayer2(vec2 a) {
    a = floor(a);
    return fract(a.x * 0.5 + a.y * a.y * 0.75);
  }

  /* Bayer is self-similar: the 2n matrix is the n matrix scaled down and added
     to a half-resolution copy of itself. Two nestings give the full 8x8, i.e.
     64 distinct thresholds, and the result is in [0, 63/64] — divided by 64 and
     not by 63, so no cell ever reaches 1.0 and the brightest level survives. */
  float bayer4(vec2 a) {
    return bayer2(a * 0.5) * 0.25 + bayer2(a);
  }

  float bayer8(vec2 a) {
    return bayer4(a * 0.5) * 0.25 + bayer2(a);
  }

  /* Shown while the image is loading, and permanently if the src 404s. A
     component that throws or goes black on a missing image is a component that
     cannot be dropped into a CMS-backed page. */
  vec3 fallbackImage(vec2 uv) {
    float sweep = 0.5 + 0.5 * sin((uv.x * 1.35 + uv.y * 2.1) * 3.14159);
    float bands = 0.5 + 0.5 * sin(uv.y * 44.0);
    vec3 dark = vec3(0.07, 0.08, 0.11);
    vec3 light = vec3(0.55, 0.59, 0.68);
    return mix(dark, light, sweep * (0.82 + 0.18 * bands));
  }

  vec3 sampleImage(vec2 uv) {
    vec2 clamped = clamp(uv, vec2(0.001), vec2(0.999));
    vec3 image = texture2D(uImage, clamped * uUvScale + uUvOffset).rgb;
    return mix(fallbackImage(clamped), image, uHasImage);
  }

  void sampleTrail(vec2 screenUv, out float mask, out vec2 flow) {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 screenPixels = screenUv * uResolution;

    /* Every fragment in a block asks the same question, because the block's
       CENTRE is what gets tested. Test the fragment's own uv instead and the
       disc edge cuts through blocks, which puts a soft antialiased boundary on
       an effect whose entire argument is that it has none. */
    vec2 blockUv = (floor(screenPixels / uBlock) + 0.5) * uBlock / max(uResolution, vec2(1.0));
    float threshold = bayer8(screenPixels / uBlock);

    mask = 0.0;
    flow = vec2(0.0);

    for (int i = 0; i < TRAIL_POINTS; i++) {
      vec4 point = uTrail[i];
      if (point.z <= 0.0) continue;

      vec2 delta = blockUv - point.xy;
      // Aspect correction, or the discs are ellipses on any container that is
      // not square and the trail is visibly wider than it is tall.
      delta.x *= aspect;

      // Young samples are large and old ones shrink, so the trail tapers behind
      // the pointer instead of just fading as a constant-width stripe.
      float radius = mix(0.055, 0.115, point.z);
      float soft = 1.0 - smoothstep(radius * 0.22, radius, length(delta));

      /* The Bayer matrix contains a zero cell. Comparing against it with a bare
         step() lights that one cell in every block across the whole canvas,
         including everywhere the trail has never been — a permanent sparse grid
         of stray pixels. The epsilon is what keeps the empty areas empty. */
      float lit = step(threshold + 0.001, soft);
      float energy = lit * smoothstep(0.0, 0.2, point.z);

      mask = max(mask, energy);

      // Weighted by the sample's own speed: a slow drag smears a little, a
      // flick smears a lot, and a stationary pointer does not smear at all.
      flow += uFlow[i] * energy * (0.45 + point.w * 0.8);

      /* A small outward wake, so even a pointer that is barely moving has some
         life in the reveal. It points away from the sample rather than in a
         direction of its own, which keeps it honest: it can only ever push
         along the shape the pointer already drew. */
      flow += normalize(delta + vec2(0.00001)) * energy * point.w * 0.0025;
    }

    flow = clamp(flow, vec2(-uFlowClamp), vec2(uFlowClamp));
  }

  void main() {
    float mask;
    vec2 flow;
    sampleTrail(vUv, mask, flow);

    /* Snap the displacement to the same coarse grid as the dither. A smooth
       sub-pixel offset produces a soft directional blur, which reads as a
       filter laid on top of the picture; a snapped one moves whole blocks, so
       the motion looks like it belongs to the same rendering as the dots. */
    vec2 flowPixels = floor((flow * uResolution) / uBlock + 0.5) * uBlock;
    vec2 displacedUv = vUv - flowPixels / max(uResolution, vec2(1.0));

    vec3 revealed = sampleImage(displacedUv);
    // Quantised per PIXEL here, against a threshold sampled per BLOCK above.
    // One frequency for the shape of the reveal, a finer one for its tone.
    float tone = bayer8(gl_FragCoord.xy);
    revealed = floor(revealed * uLevels + tone) / uLevels;

    /* The resting image is dimmed and desaturated rather than hidden, so the
       panel is a photograph at rest and the pointer is restoring it, not
       painting it out of nothing. */
    vec3 rest = sampleImage(vUv);
    rest = mix(vec3(dot(rest, LUMA)), rest, uRestSaturation) * uRestBrightness;

    float reveal = smoothstep(0.02, 0.32, mask);
    gl_FragColor = vec4(mix(rest, revealed, reveal), 1.0);
  }
`;
