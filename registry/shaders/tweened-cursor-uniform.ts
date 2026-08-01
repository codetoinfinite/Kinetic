/* ==========================================================================
   Tweened Cursor Uniform — GLSL
   --------------------------------------------------------------------------
   Shaders ship as `.ts` template literals, never `.glsl`. The registry item
   type enum has no GLSL member, and a `.glsl` import would force every
   consumer to install a bundler plugin — `npx shadcn add` would land a
   component that does not compile.

   Written for three.js `ShaderMaterial`, which prepends the built-in
   attributes (`position`, `uv`) and matrices, so they are not declared here.
   ========================================================================== */

export const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  uniform vec2  uResolution;
  /** Pointer in NDC (-1..1, y up). Parked far outside that range until a real
      pointer event lands, which is what guarantees a zero bulge on frame 1. */
  uniform vec2  uCursor;
  /** 0..1 presence. Tweened up on move, down on leave — separate from position
      so the bulge fades where it is instead of sliding away to a corner. */
  uniform float uStrength;
  uniform float uTime;
  uniform float uRadius;
  uniform float uAmount;
  uniform vec3  uInk;
  uniform vec3  uPaper;
  uniform vec3  uAccent;

  varying vec2 vUv;

  /* Anti-aliased grid without derivatives. 'fwidth' would be the idiomatic
     way, but the line width is derived from uResolution instead so the same
     source compiles unchanged on a WebGL1 context with no extension pragma. */
  float grid(vec2 p, float cells, float widthPx, vec2 res) {
    vec2 q = p * cells;
    vec2 g = abs(fract(q - 0.5) - 0.5);
    vec2 w = vec2(widthPx) * cells / res;
    vec2 m = vec2(1.0) - smoothstep(vec2(0.0), w, g);
    return clamp(max(m.x, m.y), 0.0, 1.0);
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);

    // Aspect-corrected centre space: y spans -0.5..0.5, x spans the same
    // scaled by aspect, so a "radius" is a circle rather than an ellipse.
    vec2 p = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
    vec2 c = vec2(uCursor.x * 0.5 * aspect, uCursor.y * 0.5);

    vec2 toCursor = p - c;
    float dist = length(toCursor);

    // Gaussian falloff: exp(-d²/r²) is 1.000 / 0.368 / 0.018 at d = 0 / r / 2r.
    // No threshold, no branch, so the lens has no visible edge.
    float fall  = exp(-(dist * dist) / max(uRadius * uRadius, 1e-4));
    float bulge = fall * uStrength;

    // Pull the sampling point toward the cursor. The +1e-6 keeps 'normalize'
    // defined at dist == 0, where the direction is arbitrary anyway.
    vec2 warped = p - normalize(toCursor + vec2(1e-6)) * bulge * uAmount;
    vec2 uv = vec2(warped.x / aspect + 0.5, warped.y + 0.5);

    // A drift slow enough to read as "alive" rather than as scrolling.
    uv += vec2(uTime * 0.006, uTime * 0.0025);

    float coarse = grid(uv, 9.0, 1.0, uResolution);
    float fine   = grid(uv, 36.0, 1.0, uResolution) * 0.35;
    float lines  = clamp(coarse + fine, 0.0, 1.0);

    vec3 col = mix(uPaper, uInk, lines);
    // Tint only where the lens is, and brighten the compressed lines inside it
    // so the distortion reads as magnification rather than as a colour wash.
    col = mix(col, uAccent, lines * fall * uStrength * 0.9);
    col += uAccent * fall * uStrength * 0.06;

    // Vignette, computed in centre space so it follows the aspect too.
    float vig = 1.0 - smoothstep(0.35, 0.78, length(p));
    col *= mix(0.78, 1.0, vig);

    gl_FragColor = vec4(col, 1.0);
  }
`;
