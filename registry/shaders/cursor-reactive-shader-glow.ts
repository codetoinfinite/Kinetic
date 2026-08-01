/* ==========================================================================
   Cursor-Reactive Shader Glow — GLSL
   --------------------------------------------------------------------------
   Shaders ship as `.ts` template literals, never `.glsl`. The registry item
   type enum has no GLSL member, and a `.glsl` import would force every
   consumer to install a bundler plugin — `npx shadcn add` would land a
   component that does not compile.

   Written for three.js `ShaderMaterial`, which prepends `position`, `uv` and
   the matrices, so those are not declared here. GLSL ES 1.00, which is what
   `ShaderMaterial` compiles to unless `glslVersion` says otherwise.

   Two ideas live in this file.

   1. THE POINTER ENTERS THE FIELD THREE TIMES, WEAKLY. Once on each of the
      two warp channels with opposite signs so they shear against each other,
      and once more on the final sample. Three weak influences read as "the
      atmosphere responds to you". One strong influence reads as "the
      atmosphere is glued to the cursor", which is a completely different and
      much worse effect.

   2. THE BRIGHTNESS BUDGET. The composed colour's Rec.709 luminance is
      measured and the whole vector is scaled down until it fits under
      `uCeiling`. The glow can therefore be tuned to taste without ever
      eating the contrast of white text sitting on top of it — the guarantee
      is enforced in the shader rather than promised in a comment.
   ========================================================================== */

export const cursorReactiveShaderGlowVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const cursorReactiveShaderGlowFragmentShader = /* glsl */ `
  precision highp float;

  uniform vec2  uResolution;
  uniform float uTime;
  /** Pointer in 0..1 with y up, ALREADY damped on the CPU. Writing a raw
      pointer here makes the field jump one full mouse-jerk per event. */
  uniform vec2  uPointer;
  /** 0..1. Damped up while the pointer is over the canvas, down on leave, so
      the glow dims where it stands instead of sliding away to a corner. */
  uniform float uPresence;
  /** 0..1 follower speed. A moving cursor burns brighter than a resting one. */
  uniform float uEnergy;
  /** Noise frequency. Below 1.0 the features are LARGER than the screen. */
  uniform float uScale;
  /** How far the two warp channels push the third sample. */
  uniform float uWarp;
  uniform float uCoreRadius;
  uniform float uHaloRadius;
  uniform float uFieldGain;
  uniform float uGlowGain;
  /** Hard ceiling on output luminance. The contrast guarantee. */
  uniform float uCeiling;
  uniform vec3  uBase;
  uniform vec3  uTint;
  uniform vec3  uGlowTint;

  varying vec2 vUv;

  /* --------------------------------------------------------------------------
     Sin-free hash. The usual fract(sin(dot(p, k)) * 43758.5) breaks down once
     the argument to sin() reaches a few thousand radians: the fractional part
     of the angle is quantised, the noise grows visible repeating bands, and it
     fails on mobile GPUs long before it fails on the desktop it was written
     on. This one is pure multiply-and-fract, so it has no such range limit.
     -------------------------------------------------------------------------- */
  vec2 hash22(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    q += dot(q, q.yzx + 33.33);
    return -1.0 + 2.0 * fract((q.xx + q.yz) * q.zy);
  }

  /* Gradient noise, not value noise: the lattice value is a DOT PRODUCT with a
     random gradient, which is zero at every lattice point. That is what stops
     the cell corners reading as a faint dot grid in the flat areas — the exact
     artefact you cannot smoothstep away afterwards. */
  float gnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    /* Hermite fade. Linear interpolation leaves creases along the cell walls
       because the first derivative is discontinuous there. */
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = dot(hash22(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0));
    float b = dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
    float c = dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
    float d = dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  /* Two octaves, amplitude 0.6 then 0.3. Standard fbm runs four to six; two is
     enough because the result is immediately crushed by smoothstep(0.25, 0.85)
     and the extra detail is thrown away. fbm IS the cost of this shader, so
     halving the octave count halves the shader.

     The 0.8/0.6 rotation between octaves is not decoration. Both octaves share
     one axis-aligned lattice, and without a rotation their cell walls line up
     and the sum reads as a grid rather than as cloud. */
  const mat2 OCTAVE_ROT = mat2(0.8, 0.6, -0.6, 0.8);

  float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.6;
    for (int i = 0; i < 2; i++) {
      sum += amp * gnoise(p);
      p = OCTAVE_ROT * p * 1.93;
      amp *= 0.5;
    }
    return sum;
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);

    /* Correct BOTH the sample space and the pointer. Correcting only the sample
       space leaves the glow as an ellipse 1.78x too wide on a 16:9 canvas. */
    vec2 p = vUv;
    p.x *= aspect;
    vec2 m = uPointer;
    m.x *= aspect;

    /* Extremely slow, and deliberately so. At 60fps the field advances 0.0005
       units per frame: weather, not animation. */
    float t = uTime * 0.03;
    /* Time as a 2D drift rather than a third noise dimension. 2D gradient noise
       costs four hashes per sample where 3D costs eight, and a slice through a
       3D field looks no different once it has been through the smoothstep. */
    vec2 sp = p * uScale + vec2(t, -t * 0.42);

    /* Domain warp. Two decorrelated fbm samples become an offset fed into a
       third. The vec2(2.3, 1.1) shift on the second channel is what
       decorrelates it — without it both channels return the same number and the
       warp degenerates into a plain diagonal translation.

       The pointer appears on all three samples with a sign flip between the two
       warp channels, so they shear against each other. */
    vec2 q = vec2(
      fbm(sp + m * 0.20),
      fbm(sp + vec2(2.3, 1.1) - m * 0.20)
    );
    float n = fbm(sp + q * uWarp + m * 0.12) * 0.5 + 0.5;
    float shade = smoothstep(0.25, 0.85, n);

    /* Two FALLING ramps. smoothstep(a, b, x) with a > b falls from 1 at the
       pointer to 0 at the radius — cheaper and clearer than
       1.0 - smoothstep(0.0, r, d), and it is one instruction either way.

       The halo is squared. A single smoothstep has a visible termination ring
       at its outer edge on a dark background because the eye is very good at
       finding the point where a gradient stops; squaring pushes the last few
       percent of the falloff below the 8-bit quantisation floor and the ring
       disappears. */
    float d = distance(p, m);
    float core = smoothstep(uCoreRadius, 0.0, d);
    float halo = smoothstep(uHaloRadius, 0.0, d);
    halo *= halo;
    float glow = (core * 0.65 + halo * 0.35) * uPresence;
    /* A resting cursor is an ember; a moving one is a torch. The floor is 0.72
       rather than 0 so stopping dims the glow instead of extinguishing it. */
    glow *= mix(0.72, 1.0, uEnergy);

    /* A vertical lift tied to pointer height. Tiny, and the only cue that the
       field knows where the cursor is when it is nowhere near the glow. */
    float lift = (uPointer.y - 0.5) * 0.03;

    vec3 col = uBase
             + uTint * (uFieldGain * shade + lift)
             + uGlowTint * (uGlowGain * glow);

    /* THE BRIGHTNESS BUDGET. Scale the whole vector, never clamp per channel:
       clamping crushes one channel first and the glow core visibly shifts hue
       as it brightens. Scaling preserves the ratio, so the colour is identical
       and only the level is capped. */
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col *= min(1.0, uCeiling / max(lum, 0.0001));

    /* Multiply, do not subtract. Scaling the whole result keeps the glow inside
       the vignette instead of letting it punch through at the corners. */
    float vig = smoothstep(1.25, 0.5, distance(vUv, vec2(0.5)));
    col *= mix(0.85, 1.0, vig);

    gl_FragColor = vec4(col, 1.0);
  }
`;
