import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'tweened-cursor-uniform',
  title: 'Tweened Cursor Uniform',
  category: 'cursor',
  tags: ['three', 'gsap', 'shader', 'pointer', 'uniform', 'lens'],
  blurb: 'A shader grid with a lens under the pointer, whose position is tweened into the uniform so it settles instead of chasing.',
  cost: 'webgl',
  motif: 'trail',

  files: [
    {
      path: 'registry/ui/tweened-cursor-uniform.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/shaders/tweened-cursor-uniform.ts',
      type: 'registry:lib',
      role: 'vertex + fragment GLSL',
    },
  ],
  dependencies: ['three@^0.185.1', 'gsap@^3.15.0'],

  summary:
    'A full-quad fragment shader draws a procedural grid and pulls its UVs toward a lens centred on the pointer. The lens position is not assigned into the uniform — GSAP tweens it onto a plain object, and the render loop copies that object across each frame, so the distortion trails the cursor and then comes fully to rest under it. Presence is a second, independent tween, so leaving the container dims the lens where it stands rather than dragging it away.',

  mechanism: [
    'A `pointermove` handler converts client coordinates into NDC against the live container rect: `x = ((e.clientX - rect.left) / rect.width) * 2 - 1` and `y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)`, y negated because NDC counts upward and CSS counts downward.',
    'That NDC pair is tweened onto a plain `{ x, y }` object with `gsap.to(pos, { x, y, duration: 0.6, ease: "power3.out", overwrite: true })`. This is the smoothing. Nothing else damps: the uniform copy in the rAF loop is a straight assignment.',
    'The contrast with `useSmoothPointer` is the point. `damp` closes a fixed fraction of the remaining gap per second — always moving, always behind, asymptotic. A tween has a duration and an end, so `power3.out` decelerates the lens into a hard stop exactly under the cursor when the hand stops.',
    'Presence is a separate scalar tweened to 1 over 0.4s on move and back to 0 over 0.6s on `pointerleave`, multiplied into the falloff in the shader. Splitting it from position is what makes the lens fade out in place instead of sliding off toward a parked coordinate.',
    'The fragment shader works in aspect-corrected centre space, computes a Gaussian `fall = exp(-d² / r²)` from the cursor, and displaces the sampling point with `warped = p - normalize(p - c) * fall * uStrength * uAmount` before the grid function reads it — so the grid compresses toward the cursor like glass rather than smearing.',
    'Anti-aliasing of the grid lines is derived from `uResolution` (`w = widthPx * cells / res`) instead of `fwidth`, so the same source compiles on a WebGL1 context with no derivatives extension pragma.',
  ],

  constants: [
    {
      name: 'PARKED_NDC',
      value: '999',
      why: 'Initial value of the tweened cursor object. Far outside the -1..1 NDC range, so `exp(-d²/r²)` underflows to exactly 0 and the very first frame is guaranteed lens-free. Initialising at (0,0) puts a full-strength bulge dead centre before the pointer has ever moved.',
    },
    {
      name: 'followDuration',
      value: '0.6',
      why: 'Seconds for the lens to reach the pointer. This is long for a cursor effect and deliberately so — the lens reads as heavy glass being dragged. Under ~0.25 it is welded to the pointer and the trailing quality disappears.',
    },
    {
      name: 'PRESENCE_IN / PRESENCE_OUT',
      value: '0.4 / 0.6',
      why: 'Asymmetric on purpose. Arrival must beat the eye to the pointer; departure is slower so the lens reads as dissipating rather than being switched off.',
    },
    {
      name: 'radius',
      value: '0.28',
      why: 'Gaussian sigma in centre space, where the short edge spans 1.0. So the lens core is a bit over a quarter of the container height. Past ~0.45 the falloff no longer reaches zero inside the frame and the whole grid warps.',
    },
    {
      name: 'amount',
      value: '0.22',
      why: 'Peak UV displacement toward the cursor, in centre-space units. Above ~0.35 the pull exceeds the local grid spacing and lines fold back through each other, which reads as a rendering fault.',
    },
    {
      name: 'pixelRatio cap',
      value: '2',
      why: 'Fill-rate is quadratic in DPR. On a 3x display an uncapped full-container fragment shader costs 2.25x more per frame for no visible gain.',
    },
  ],

  pitfalls: [
    'Assigning the pointer straight into the uniform and smoothing in the shader instead. The shader has no memory between frames without a render target, so the usual workaround is to lerp a JS variable per frame with a fixed alpha — which is frame-rate dependent and converges twice as fast at 120Hz.',
    'Tweening position and presence together. On `pointerleave` the lens then slides toward its parked coordinate at full strength, dragging a bright streak across the whole canvas on the way out.',
    'Leaving the tweened cursor at (0, 0) on mount. A full-strength bulge sits dead centre from the first painted frame until the user moves, which looks like a baked-in artefact rather than an interaction.',
    'Using `overwrite: "auto"` on the position tween. Auto only retires *rendered* conflicts; a burst of moves inside one frame can leave the earlier tween partly live. `overwrite: true` kills the previous tween outright, which is what you want when every event supersedes the last.',
    'Recreating the `WebGLRenderer` inside the resize effect. Each resize leaks a context, and Chromium silently kills the oldest of its ~16 per-process contexts, so an unrelated canvas elsewhere on the page goes black.',
    'Calling `renderer.dispose()` and stopping there. That frees GPU objects but not the context itself; `forceContextLoss()` — what `disposeRenderer` does — is the call that actually hands it back.',
    'Not repainting after a resize while the loop is paused. The framebuffer keeps the old dimensions and the browser stretches the last frame, so an off-screen preview reappears visibly smeared.',
  ],

  notes: [
    'Gated on `(pointer: fine)`. On touch the listeners never attach, so the canvas renders the idle grid with the lens parked outside NDC — a tap cannot pop a bulge under the finger and leave it there on release.',
    'Guarded with `hasWebGL()`: on a blocklisted GPU or with hardware acceleration off, nothing is constructed and the container is simply an empty dark panel rather than a permanently blank canvas.',
    'The loop is gated on `useInView` plus `useVisibility`, so an off-screen or backgrounded instance costs zero GPU time.',
  ],

  apiSignature:
    'function TweenedCursorUniform(props: { followDuration?: number; radius?: number; amount?: number; className?: string }): JSX.Element',

  props: [
    { name: 'followDuration', type: 'number', default: '0.6', description: 'Seconds for the lens to catch the pointer.' },
    { name: 'radius', type: 'number', default: '0.28', description: 'Gaussian sigma of the lens, in centre-space units where the short edge is 1.' },
    { name: 'amount', type: 'number', default: '0.22', description: 'Peak UV displacement toward the cursor at full strength.' },
    { name: 'className', type: 'string', description: 'Merged onto the root container via `cn`.' },
  ],

  reducedMotion:
    'The rAF loop and the pointer listeners never attach. A single frame is rendered with the lens parked slightly off-centre at full strength, so the component is a static composed image of the effect rather than an empty box. It repaints once on resize and never again.',

  cleanup:
    'Removes both pointer listeners and kills the tweens on the two plain objects. The build effect nulls its handle, calls `disposeRenderer` (which stops the animation loop, disposes, forces context loss, and zeroes the backing store), then disposes the geometry and the material. The rAF subscription is released by `useRaf`.',

  acceptance:
    'Move across the panel and the grid compresses under a soft circular lens that arrives about half a second behind the pointer, then settles precisely under it when you stop. Leave the panel and the lens fades out where it stands without sliding. Resize the container and the lens stays circular rather than becoming an ellipse. Unmount and the WebGL context count in about:gpu goes back down.',

  criticalRegion: 'critical',
};

export default meta;
