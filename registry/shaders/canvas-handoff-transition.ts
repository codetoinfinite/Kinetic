/* ==========================================================================
   Canvas Handoff Field — GLSL
   --------------------------------------------------------------------------
   Shaders ship as `.ts` template literals, never `.glsl`. The registry item
   type enum has no GLSL member, and a `.glsl` import would force every
   consumer to install a bundler plugin — `npx shadcn add` would land a
   component that does not compile.

   Written for three.js `ShaderMaterial`, which prepends `position`, `uv` and
   the matrices, so those are not declared here. GLSL ES 1.00, which is what
   `ShaderMaterial` compiles to unless `glslVersion` says otherwise.

   This picture exists to PROVE the handoff. The whole claim of the component
   is that the same live context follows the route change instead of being
   torn down and rebuilt, and a claim like that is only believable if the
   image would visibly betray a restart. So every property here is a function
   of absolute elapsed time:

     - the field drifts continuously, so a reset to t = 0 would jump;
     - the drift is slow enough (about 8 seconds per visible cycle) that the
       eye tracks a specific fold across the transition and can see it survive;
     - `uHandoff` shears the field DURING the flight rather than fading it,
       because a fade would hide exactly the frames the component is about.

   The ordered dither is the second half of the proof. Quantising to a handful
   of levels turns a smooth gradient into a hard-edged pattern whose cells are
   locked to `gl_FragCoord`, i.e. to the DRAWING BUFFER, not to the CSS box.
   When the FLIP scales the canvas mid-flight the cells stretch with it, which
   is honest: it shows you that the pixels being moved are the pixels that were
   already there, not a freshly rendered frame at the new size.
   ========================================================================== */

export const canvasHandoffVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const canvasHandoffFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform vec2  uResolution;
  uniform float uTime;
  uniform float uHandoff;
  uniform float uLevels;
  uniform float uCell;
  uniform vec3  uInk;
  uniform vec3  uPaper;

  /* The 2x2 Bayer matrix [[0, 2], [3, 1]] / 4, written without a lookup.
     'a.y * a.y * 0.75' is the trick: squaring makes the y contribution 0 for
     even rows and 0.75 for odd ones after the fract, which is the diagonal
     ordering the matrix needs. A texture or a const array would cost either a
     sampler or sixteen uniforms per draw for four numbers. */
  float bayer2(vec2 a) {
    a = floor(a);
    return fract(a.x * 0.5 + a.y * a.y * 0.75);
  }

  /* Recursive doubling: the fine 2x2 carries the low bits and a coarser copy,
     sampled at half the frequency and scaled by 1/4, carries the high bits.
     The sum takes sixteen evenly spaced values in 0 .. 15/16 over a 4x4 tile,
     which is exactly the 4x4 Bayer matrix. Two multiply-adds instead of a
     sixteen-entry table, and it extends to 8x8 by nesting once more. */
  float bayer4(vec2 a) {
    return bayer2(a * 0.5) * 0.25 + bayer2(a);
  }

  void main() {
    /* Aspect correction on the SHORT axis, so the field keeps its proportions
       when the canvas is handed from a wide banner slot to a tall one. Without
       it the pattern would squash on the move and the transition would read as
       a re-render rather than as the same surface travelling. */
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);

    float t = uTime * 0.12;

    /* The surge. During the flight the sampling coordinate is sheared by a
       counter-rotating pair, so the field folds through itself and springs
       back. Amplitude 0.35 is a little under half a visible cell: enough to
       register as a disturbance, not enough to scramble the pattern you are
       supposed to be tracking across the swap. */
    vec2 q = p + uHandoff * 0.35 * vec2(
      sin(p.y * 4.0 + t * 3.0),
      cos(p.x * 4.0 - t * 2.4)
    );

    /* Three sines, each fed the running sum of the ones before it. The
       feedback is what stops this looking like plaid: an unfed sum of sines
       is separable and the eye reads the two axes independently, whereas
       'sin(y + f)' bends each row by how bright the row above it was. */
    float f = sin(q.x * 3.1 + t * 1.7);
    f += sin(q.y * 2.7 - t * 1.3 + f * 0.8);
    f += sin(length(q) * 4.3 - t * 2.1 + f * 0.4);

    float lum = f / 3.0 * 0.5 + 0.5;

    /* Elliptical falloff measured in the aspect-corrected space, so the fade
       stays circular in whichever slot the canvas currently occupies. */
    float vig = smoothstep(1.15, 0.15, length(p));
    lum = mix(lum * 0.45, lum, vig);

    /* A small lift while the surge runs. The canvas is in motion and briefly
       overlapping type it does not normally sit under; a touch more contrast
       is what keeps it reading as one object rather than as a hole. */
    lum = clamp(lum + uHandoff * 0.12, 0.0, 1.0);

    /* Quantisation. The dither offset is +/- half a step, so a value exactly
       between two levels lands on either one with equal probability across the
       tile — that spatial average IS the intermediate tone. Divide by anything
       other than 'steps' and the pattern either bands (too small) or turns to
       noise (too large). */
    float steps = max(uLevels - 1.0, 1.0);
    float offset = (bayer4(gl_FragCoord.xy / max(uCell, 1.0)) - 0.5) / steps;
    float level = floor(clamp(lum + offset, 0.0, 1.0) * steps + 0.5) / steps;

    gl_FragColor = vec4(mix(uPaper, uInk, level), 1.0);
  }
`;
