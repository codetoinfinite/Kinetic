import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'canvas-handoff-transition',
  title: 'Canvas Handoff Transition',
  category: 'transition',
  tags: ['webgl', 'three', 'route', 'flip', 'gsap', 'context', 'strict-mode'],
  blurb:
    'The live WebGL canvas is handed to the next page and flies to its new slot, instead of being destroyed and rebuilt.',
  cost: 'webgl',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/canvas-handoff-transition.tsx',
      type: 'registry:ui',
      role: 'host + slot + useCanvasHandoff',
    },
    {
      path: 'registry/shaders/canvas-handoff-transition.ts',
      type: 'registry:lib',
      role: 'drifting sine field, bayer-quantised',
    },
    { path: 'registry/lib/webgl.ts', type: 'registry:lib', role: 'context lifecycle' },
    {
      path: 'registry/hooks/use-reduced-motion.ts',
      type: 'registry:hook',
      role: 'motion preference',
    },
  ],
  dependencies: ['three@^0.185.1', 'gsap@^3.15.0'],

  summary:
    'The usual way to put a shader on more than one page is to mount it on each of them, and the price is a new context, a new compile and a new first frame every time the route changes. No easing hides that: a field restarting from t = 0 is visibly a different object. Here one canvas is created imperatively, outside React\'s ownership, and moved into the destination page with `appendChild` during the layout phase — no paint happens in between, so the context never blinks. What the viewer sees is the surface they were already looking at, travelling from one rectangle to another.',

  mechanism: [
    'Four steps in a fixed order. MEASURE first, inside the click handler, because one `setState` later the outgoing rectangle no longer exists. FLUSH one frame, so the pixels about to travel are current. MOVE in a `useLayoutEffect`, which shares its task with React\'s DOM mutations and therefore straddles no paint. RESIZE last, on the tween\'s completion.',
    'The move is a plain `target.appendChild(canvas)`. `appendChild` on a node that already has a parent relocates it rather than copying it, and a WebGL context belongs to the canvas element, not to its position in the document — so the context, the compiled program and the drawing buffer all survive being detached and re-attached.',
    'The flight is FLIP: `scaleX = first.width / last.width`, `scaleY = first.height / last.height`, and the translation is the difference between the two centre points. Scale, never `width`/`height` — a width tween is 0.72 s of continuous reflow, and writing the canvas\'s width attribute would reallocate the drawing buffer on every frame of it.',
    'The buffer resize is deferred to `onComplete` and the `ResizeObserver` is muted for the duration by a `flying` flag. Assigning `canvas.width` is what reallocates and CLEARS the backing store; do it while the element is mid-flight and the object being animated goes black for a frame. During the flight the old buffer is simply scaled by CSS, which is slightly soft and completely invisible at this duration.',
    'Measuring inside the handler also makes interruption correct for free. If a flight is already running, `getBoundingClientRect()` returns the TRANSFORMED rect — where the canvas visually is, mid-air — so a second click continues from that point instead of snapping back to the slot it was heading for.',
    'The destination slot has its `overflow` forced to `visible` inline for the length of the flight and restored afterwards. Inline, because the clipping usually comes from a utility class on the consumer\'s own markup that a rule in our stylesheet would lose to.',
    'A `uHandoff` uniform is tweened 0 to 1 and back on the same timeline, shearing the field\'s sampling coordinate. It disturbs the picture rather than fading it: a fade would hide precisely the frames that prove the surface is the same one.',
  ],

  constants: [
    {
      name: 'HANDOFF_DURATION',
      value: '0.72',
      why: 'Seconds for the flight. It is long for a page transition, deliberately — the whole point is that you can watch a specific fold of the field travel and see that it never restarts. Under about 0.45 s the eye cannot track it and the effect degrades to a cut; over about 1 s the route change starts to feel withheld.',
    },
    {
      name: 'HANDOFF_EASE',
      value: "'power3.inOut'",
      why: 'Symmetric, because the two rectangles are equally important — the canvas is not leaving somewhere for somewhere, it is the same object being re-placed. An `out` ease would put the acceleration at the origin and imply the old page was the one that mattered.',
    },
    {
      name: 'SURGE_EASE',
      value: "'sine.inOut'",
      why: 'The `uHandoff` shear runs half the flight forward and half back (`yoyo: true, repeat: 1`). Sine, because it is the only common ease with zero slope at both ends, so the disturbance grows out of stillness and returns to it with no visible corner at the turnaround.',
    },
    {
      name: 'LEVELS',
      value: '6',
      why: 'Tones the field is crushed to. Low enough that the quantisation edges are hard and locked to the drawing buffer, which is what makes the mid-flight scaling legible as "these are the pixels that were already there". Above about ten the picture is a smooth gradient again and the proof is lost.',
    },
    {
      name: 'CELL',
      value: '2',
      why: 'Dither cell size in DRAWING-BUFFER pixels, so on a 2x display the pattern is one CSS pixel per cell — fine enough to read as tone, coarse enough to survive the scaling. Measured in buffer pixels rather than CSS pixels on purpose: it is the buffer that stretches during the flight.',
    },
    {
      name: 'MAX_DPR',
      value: '2',
      why: 'Device pixel ratio ceiling. Above 2 the visual gain on a quantised field is nil and the fill-rate cost is quadratic — and this surface is on screen on every page rather than on one hero, so its cost is paid continuously.',
    },
    {
      name: 'INK / PAPER',
      value: '[0.42, 0.65, 1] / [0.035, 0.037, 0.045]',
      why: 'The two ends of the quantisation ramp, as raw 0..1 RGB. Passed as `THREE.Vector3` rather than `THREE.Color` because three applies working-colour-space conversion to a Color and none to a Vector3, and a `ShaderMaterial` emits `gl_FragColor` without the output-encoding chunk — Vector3 is the only pairing where the numbers written in the source are the numbers that reach the screen.',
    },
  ],

  pitfalls: [
    'Rendering the canvas from JSX. React unmounts the outgoing page\'s subtree on a route change, and a `<canvas ref>` inside it is destroyed with it — context, program, buffer and all. That is the exact failure this component exists to avoid, and it cannot be worked around from inside the page: the canvas has to be created by the effect and owned by nobody React can see.',
    'A React-owned canvas under `reactStrictMode`. The strict-mode remount reuses the SAME element across both effect invocations, so the first cleanup\'s `forceContextLoss()` hands the second invocation a dead context and the component renders permanently blank — in development only, which is a genuinely expensive way to lose an afternoon. Creating the element inside the effect gives the second run a clean one.',
    'Doing the move in `useEffect` instead of `useLayoutEffect`. Passive effects run after the browser has painted, so there is one composited frame in which the outgoing page is gone and the canvas has not arrived. It reads as a flash of empty box at exactly the moment the component is supposed to be proving continuity.',
    'Measuring First inside the layout effect. By then React has already removed the outgoing subtree, so there is nothing left to measure and the FLIP either animates from the wrong rectangle or is skipped. The measurement has to happen in the handler, before `setState`.',
    'Calling `renderer.setSize()` during the flight. Writing the canvas\'s width or height reallocates and clears the drawing buffer, so the object mid-animation flashes black for a frame. The `ResizeObserver` fires exactly then, because moving into a differently sized slot changes the border box — which is why it is muted by a `flying` flag rather than trusted.',
    'A destination slot that clips. `overflow: hidden` on the slot crops the inbound canvas to its final rectangle from the first frame, so the flight is invisible and the result looks identical to no transition. Forcing `overflow: visible` inline for the duration is the only override that reliably beats a utility class.',
    'Cloning instead of moving. `cloneNode(true)` on a canvas copies the element and NOT its bitmap or its context; `outerHTML` round-trips have the same effect. The clone is blank and the original is gone, so the page shows an empty box with no error anywhere.',
    'Tweening `width` and `height` instead of `scale`. Besides reflowing on every frame, they are the two properties that reset the drawing buffer, so the animation would clear the surface sixty times a second.',
    'Mounting the host inside the routed subtree. If the host unmounts on navigation the context goes with it and there is nothing left to hand over — the component silently degrades to the mount-a-new-one behaviour it replaces. It belongs in the layout, above the router outlet.',
    'Assuming the canvas paints where you expect. It is `position: absolute; z-index: 1` so it can lift over static page content on the way past, which means anything meant to sit ON TOP of the field needs its own stacking context. Text without `relative z-10` disappears under the canvas for the length of the flight.',
    'Letting the shader carry any state that could reset. Everything visible is a function of the absolute `setAnimationLoop` timestamp, so there is no accumulator to hand over. Drive the field from a per-frame increment instead and it will still restart on the handoff — the exact artefact the component was built to eliminate, hidden one layer deeper.',
  ],

  notes: [
    'In Next.js App Router: mount `CanvasHandoffTransition` in `app/layout.tsx`, put a `CanvasHandoffSlot` in each page with an id of its own, and replace `<Link>` with a button calling `handoff(slotId, () => router.push(href))`. The component imports nothing from `next/navigation` — the route change is a callback, so the same host works under React Router or, as in the preview, plain `useState`.',
    'The slot renders no children while WebGL is live. That is not cosmetic: React only reconciles children it created, so an empty child list is the guarantee that it will never touch the canvas sitting inside. Content that belongs over the field goes in a sibling, not inside the slot.',
    'One context for the whole site is the real prize. Chromium allows roughly sixteen live WebGL contexts per renderer process and evicts the oldest without warning when you exceed it — a per-page canvas on a site with a persistent background is how an unrelated component three routes away turns black.',
    'The field is deliberately slow, about eight seconds per visible cycle. Anything faster and the eye cannot hold a specific fold across the transition, which is the only direct evidence the viewer gets that the surface was not rebuilt.',
    'Under reduced motion there is no animation loop at all — a single frame is drawn on build and again after each move — so the component costs nothing per frame for the people most likely to be on the weakest hardware.',
  ],

  apiSignature:
    'function CanvasHandoffTransition(props: { controller: CanvasHandoff; children: ReactNode; duration?: number; ease?: string; ink?: readonly [number, number, number]; paper?: readonly [number, number, number]; levels?: number; cell?: number; maxDpr?: number; className?: string }): JSX.Element\nfunction CanvasHandoffSlot(props: { controller: CanvasHandoff; id: string; className?: string }): JSX.Element\nfunction useCanvasHandoff(initialId: string): { active: string; fallback: boolean; handoff: (id: string, commit?: () => void) => void }',

  props: [
    {
      name: 'controller',
      type: 'CanvasHandoff',
      description: 'From `useCanvasHandoff(initialSlotId)`. Shared by the host and every slot.',
    },
    {
      name: 'children',
      type: 'ReactNode',
      description: 'The pages. Each renders one `CanvasHandoffSlot` for its own landing place.',
    },
    {
      name: 'duration',
      type: 'number',
      default: '0.72',
      description: 'Seconds for the flight. `0` moves the canvas instantly with no tween.',
    },
    { name: 'ease', type: 'string', default: "'power3.inOut'", description: 'Easing for the flight.' },
    {
      name: 'ink',
      type: 'readonly [number, number, number]',
      default: '[0.42, 0.65, 1]',
      description: 'Bright end of the quantisation ramp, raw 0..1 RGB.',
    },
    {
      name: 'paper',
      type: 'readonly [number, number, number]',
      default: '[0.035, 0.037, 0.045]',
      description: 'Dark end of the quantisation ramp, raw 0..1 RGB.',
    },
    {
      name: 'levels',
      type: 'number',
      default: '6',
      description: 'How many tones the field is crushed to.',
    },
    {
      name: 'cell',
      type: 'number',
      default: '2',
      description: 'Dither cell size in drawing-buffer pixels.',
    },
    { name: 'maxDpr', type: 'number', default: '2', description: 'Device pixel ratio ceiling.' },
    { name: 'className', type: 'string', description: 'Merged onto the host root via `cn`.' },
    {
      name: 'id',
      type: 'string',
      description: '`CanvasHandoffSlot` only. Stable identity for this landing place, unique within one controller.',
    },
  ],

  reducedMotion:
    'No animation loop is started: one frame is drawn when the context is built, and one more after each move and each resize, so the field is a still image rather than a drifting one. The handoff still moves the canvas — that is a DOM relocation, not motion — but the FLIP tween and the `uHandoff` surge are both skipped, and the drawing buffer is resized immediately instead of on a completion that will never fire. `prefers-reduced-motion` is read by the component through `useReducedMotion`, never inferred from the page.',

  cleanup:
    '`disposeRenderer` stops the animation loop before releasing the context, so a queued frame cannot render into a lost one and throw out of the cleanup; it then calls `dispose()`, `forceContextLoss()` and zeroes the canvas dimensions to release the backing store immediately. The `ResizeObserver` is disconnected, both the canvas transform tweens and the `uHandoff` tween are killed, the material and geometry are disposed, and the canvas element is removed by the same effect that appended it. The flight effect\'s own cleanup kills its timeline and restores the destination slot\'s original `overflow`, so an unmount mid-flight cannot leave a slot permanently unclipped.',

  acceptance:
    'Watch one bright fold of the field and click a nav item: the same fold is still there when the canvas lands, offset only by the time the flight took. Nothing blanks, blinks, or restarts. The canvas visibly changes proportion in flight — wide banner to tall column — with the dither cells stretching along with it, then snapping to square at the end when the buffer is finally resized. Click twice in quick succession and the second flight starts from wherever the canvas is in the air rather than jumping to the first destination. In React DevTools the canvas element has no owner. Under `reactStrictMode` in development the preview renders on first load, not blank. With reduced motion the field is a still image and the canvas relocates without a flight.',

  criticalRegion: 'critical',
};

export default meta;
