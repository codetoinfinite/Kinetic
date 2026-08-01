import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'fullscreen-triangle-pass',
  title: 'Fullscreen Triangle Pass',
  category: 'webgl',
  tags: ['webgl2', 'shader', 'fullscreen', 'raw-gl', 'primitive'],
  blurb:
    'One 3-vertex triangle covers the viewport and runs your fragment shader. No three, no ogl, no seam.',
  cost: 'webgl',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/fullscreen-triangle-pass.tsx',
      target: 'components/motion/fullscreen-triangle-pass.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/fullscreen-triangle-pass.ts',
      target: 'components/motion/shaders/fullscreen-triangle-pass.ts',
      type: 'registry:lib',
      role: 'GLSL ES 3.00 vertex + default fragment source',
    },
  ],
  dependencies: [],
  registryDependencies: [],

  summary:
    'The smallest possible host for a full-screen fragment shader: a raw WebGL2 context, one buffer, one triangle whose vertices sit at (-1,-1), (3,-1) and (-1,3). The clipped triangle covers the viewport exactly, so there is no diagonal seam and no doubly-shaded band where two triangles would meet. Pass any GLSL ES 3.00 fragment source and it runs against `v_uv`, `u_resolution`, `u_time` and `u_pointer`.',

  mechanism: [
    'A single `Float32Array([-1,-1, 3,-1, -1,3])` is uploaded once as `STATIC_DRAW` and bound into a VAO. The vertex shader is `gl_Position = vec4(a_pos, 0.0, 1.0)` — the positions are already in clip space, so there is no model, view or projection matrix anywhere in the component.',
    '`v_uv = a_pos * 0.5 + 0.5` gives uv 0..1 at the visible corners and uv 2.0 at the two overshooting vertices; the rasteriser clips the triangle to the viewport and interpolates the varying linearly, so the surviving fragments carry exactly the uv a two-triangle quad would have produced.',
    'The context is requested with `antialias: false, depth: false, stencil: false, alpha: false` — a fullscreen pass has no polygon interiors to multisample and no depth to test, and every one of those buffers costs width x height x DPR bytes plus a resolve.',
    'Uniform locations are resolved lazily and memoised in a `Map` keyed by name, because `getUniformLocation` is a synchronous driver round-trip and calling it per frame per uniform is the single most common cause of a raw-GL component being slower than a three.js one.',
    '`u_pointer` is fed from `useSmoothPointer` with the y axis flipped (`1 - ny`), so the shader receives the same handedness as `gl_FragCoord`.',
    'Resize writes `canvas.width/height` at `pixelRatio(maxDpr)` and calls `gl.viewport`, then draws one frame immediately — which is also the only draw that happens under reduced motion.',
  ],

  constants: [
    {
      name: 'TRIANGLE',
      value: '[-1,-1, 3,-1, -1,3]',
      why: 'The minimum overshoot that still guarantees full coverage. With 1.0 instead of 3.0 you get a half-screen triangle; with 5.0 the uv range widens to 0..3 and any shader that assumes uv is 0..1 at the vertices misinterprets its own derivatives.',
    },
    {
      name: 'MAX_DPR',
      value: '2',
      why: 'Fragment count is quadratic in DPR. A fullscreen shader at DPR 3 costs 2.25x what it costs at 2 for no perceptible gain, and it is the usual reason a hero shader stutters on a phone but not on the laptop it was built on.',
    },
    {
      name: 'pointer smoothing',
      value: '0.002',
      why: 'Fraction of the pointer gap remaining after one second. Raw pointer coordinates arrive in 8-16 ms bursts and pushing them straight into a uniform makes the light jitter one pixel per event.',
    },
  ],

  pitfalls: [
    'Putting a newline, a comment, or a leading space before `#version 300 es`. The directive must be the first token in the source or the compile fails with "version directive must occur before anything else", and because the shader source lives in a template literal the offending newline is invisible in the diff.',
    'Drawing a quad out of two triangles. GPUs shade in 2x2 fragment quads, so every quad the shared diagonal crosses is rasterised by both triangles and those fragments are shaded twice — a band of pure waste down the diagonal. It also breaks `fwidth`/`dFdx` across the seam, which shows up as a visible hairline in any analytic-AA shader.',
    'Calling `gl.getUniformLocation` inside the render loop. It is a driver round-trip, not a hash lookup; the locations are constant for the life of the program, so resolve them once and cache them.',
    'Passing a uniform that the shader never reads. `getUniformLocation` returns `null` for anything the compiler optimised out, and `gl.uniform1f(null, x)` is a silent no-op that some drivers log to the console 60 times a second. Skip on null.',
    'Calling `renderer.dispose()` or just dropping the canvas and assuming the context is released. Only `WEBGL_lose_context.loseContext()` hands it back, and Chromium kills the OLDEST live context when a page exceeds roughly 16 — so a leaked context here makes an unrelated component elsewhere on the page go black.',
    'Throwing on a shader compile error. A syntax error in a user-supplied fragment then unmounts the entire React subtree; logging the info log and falling back to the static poster keeps the page alive and puts the actual error in the console.',
  ],

  notes: [
    'WebGL2 only. GLSL ES 3.00 gives `in`/`out`, integer bit operators and core derivatives without an extension dance; WebGL2 is available in every browser that has shipped since 2021 except pre-15.4 Safari, which the `hasWebGL` guard catches.',
    'Everything else in the WebGL category that does not use three.js is built on this exact pass — it is the shared floor, not a demo.',
  ],

  apiSignature:
    'function FullscreenTrianglePass(props: { fragment?: string; uniforms?: Record<string, number | readonly number[]>; speed?: number; maxDpr?: number; className?: string }): JSX.Element',

  props: [
    {
      name: 'fragment',
      type: 'string',
      default: 'FULLSCREEN_TRIANGLE_FRAG',
      description:
        'GLSL ES 3.00 fragment source. Must open with `#version 300 es` and declare an `out vec4`. Changing it relinks the program.',
    },
    {
      name: 'uniforms',
      type: 'Record<string, number | readonly number[]>',
      description:
        'Extra uniforms pushed every frame. Numbers become `uniform1f`; arrays of length 2/3/4 become `uniform2f`/`3f`/`4f`.',
    },
    { name: 'speed', type: 'number', default: '1', description: 'Multiplier applied to `u_time`.' },
    { name: 'maxDpr', type: 'number', default: '2', description: 'Upper bound on device pixel ratio.' },
    { name: 'className', type: 'string', description: 'Merged onto the host element.' },
  ],

  reducedMotion:
    'The rAF subscription never starts. The pass still draws exactly one frame on mount and one on every resize, so you get a fully composed still image rather than a blank canvas — `u_time` is pinned to 0 and the pointer light sits wherever it was seeded.',

  cleanup:
    'Deletes the VAO, the vertex buffer and the program, then calls `loseContext(gl)` to hand the WebGL context back to the browser. The rAF subscription unsubscribes with the hook. The effect is keyed on `fragment`, so a source change tears the old program down before building the new one rather than leaking it.',

  acceptance:
    'The grid fills the frame edge to edge with no lighter or darker band along either diagonal, and the fine grid brightens under the cursor. Resize the container and the grid stays square with hairlines exactly one pixel wide at any DPR. Unmount and `WEBGL_lose_context` fires — mount and unmount twenty times and the twenty-first still renders instead of going black.',

  criticalRegion: 'critical',
};

export default meta;
