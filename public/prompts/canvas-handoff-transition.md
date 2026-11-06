# Build: Canvas Handoff Transition

The usual way to put a shader on more than one page is to mount it on each of them, and the price is a new context, a new compile and a new first frame every time the route changes. No easing hides that: a field restarting from t = 0 is visibly a different object. Here one canvas is created imperatively, outside React's ownership, and moved into the destination page with `appendChild` during the layout phase — no paint happens in between, so the context never blinks. What the viewer sees is the surface they were already looking at, travelling from one rectangle to another.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

The live WebGL canvas is handed to the next page and flies to its new slot, instead of being destroyed and rebuilt.

- Category: transition
- Runtime cost: webgl
- Dependencies: three@^0.185.1, gsap@^3.15.0

## How it works

1. Four steps in a fixed order. MEASURE first, inside the click handler, because one `setState` later the outgoing rectangle no longer exists. FLUSH one frame, so the pixels about to travel are current. MOVE in a `useLayoutEffect`, which shares its task with React's DOM mutations and therefore straddles no paint. RESIZE last, on the tween's completion.
2. The move is a plain `target.appendChild(canvas)`. `appendChild` on a node that already has a parent relocates it rather than copying it, and a WebGL context belongs to the canvas element, not to its position in the document — so the context, the compiled program and the drawing buffer all survive being detached and re-attached.
3. The flight is FLIP: `scaleX = first.width / last.width`, `scaleY = first.height / last.height`, and the translation is the difference between the two centre points. Scale, never `width`/`height` — a width tween is 0.72 s of continuous reflow, and writing the canvas's width attribute would reallocate the drawing buffer on every frame of it.
4. The buffer resize is deferred to `onComplete` and the `ResizeObserver` is muted for the duration by a `flying` flag. Assigning `canvas.width` is what reallocates and CLEARS the backing store; do it while the element is mid-flight and the object being animated goes black for a frame. During the flight the old buffer is simply scaled by CSS, which is slightly soft and completely invisible at this duration.
5. Measuring inside the handler also makes interruption correct for free. If a flight is already running, `getBoundingClientRect()` returns the TRANSFORMED rect — where the canvas visually is, mid-air — so a second click continues from that point instead of snapping back to the slot it was heading for.
6. The destination slot has its `overflow` forced to `visible` inline for the length of the flight and restored afterwards. Inline, because the clipping usually comes from a utility class on the consumer's own markup that a rule in our stylesheet would lose to.
7. A `uHandoff` uniform is tweened 0 to 1 and back on the same timeline, shearing the field's sampling coordinate. It disturbs the picture rather than fading it: a fade would hide precisely the frames that prove the surface is the same one.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `HANDOFF_DURATION = 0.72`
  Seconds for the flight. It is long for a page transition, deliberately — the whole point is that you can watch a specific fold of the field travel and see that it never restarts. Under about 0.45 s the eye cannot track it and the effect degrades to a cut; over about 1 s the route change starts to feel withheld.
- `HANDOFF_EASE = 'power3.inOut'`
  Symmetric, because the two rectangles are equally important — the canvas is not leaving somewhere for somewhere, it is the same object being re-placed. An `out` ease would put the acceleration at the origin and imply the old page was the one that mattered.
- `SURGE_EASE = 'sine.inOut'`
  The `uHandoff` shear runs half the flight forward and half back (`yoyo: true, repeat: 1`). Sine, because it is the only common ease with zero slope at both ends, so the disturbance grows out of stillness and returns to it with no visible corner at the turnaround.
- `LEVELS = 6`
  Tones the field is crushed to. Low enough that the quantisation edges are hard and locked to the drawing buffer, which is what makes the mid-flight scaling legible as "these are the pixels that were already there". Above about ten the picture is a smooth gradient again and the proof is lost.
- `CELL = 2`
  Dither cell size in DRAWING-BUFFER pixels, so on a 2x display the pattern is one CSS pixel per cell — fine enough to read as tone, coarse enough to survive the scaling. Measured in buffer pixels rather than CSS pixels on purpose: it is the buffer that stretches during the flight.
- `MAX_DPR = 2`
  Device pixel ratio ceiling. Above 2 the visual gain on a quantised field is nil and the fill-rate cost is quadratic — and this surface is on screen on every page rather than on one hero, so its cost is paid continuously.
- `INK / PAPER = [0.42, 0.65, 1] / [0.035, 0.037, 0.045]`
  The two ends of the quantisation ramp, as raw 0..1 RGB. Passed as `THREE.Vector3` rather than `THREE.Color` because three applies working-colour-space conversion to a Color and none to a Vector3, and a `ShaderMaterial` emits `gl_FragColor` without the output-encoding chunk — Vector3 is the only pairing where the numbers written in the source are the numbers that reach the screen.

## API

```ts
function CanvasHandoffTransition(props: { controller: CanvasHandoff; children: ReactNode; duration?: number; ease?: string; ink?: readonly [number, number, number]; paper?: readonly [number, number, number]; levels?: number; cell?: number; maxDpr?: number; className?: string }): JSX.Element
function CanvasHandoffSlot(props: { controller: CanvasHandoff; id: string; className?: string }): JSX.Element
function useCanvasHandoff(initialId: string): { active: string; fallback: boolean; handoff: (id: string, commit?: () => void) => void }
```

- `controller: CanvasHandoff`
  From `useCanvasHandoff(initialSlotId)`. Shared by the host and every slot.
- `children: ReactNode`
  The pages. Each renders one `CanvasHandoffSlot` for its own landing place.
- `duration: number` — default `0.72`
  Seconds for the flight. `0` moves the canvas instantly with no tween.
- `ease: string` — default `'power3.inOut'`
  Easing for the flight.
- `ink: readonly [number, number, number]` — default `[0.42, 0.65, 1]`
  Bright end of the quantisation ramp, raw 0..1 RGB.
- `paper: readonly [number, number, number]` — default `[0.035, 0.037, 0.045]`
  Dark end of the quantisation ramp, raw 0..1 RGB.
- `levels: number` — default `6`
  How many tones the field is crushed to.
- `cell: number` — default `2`
  Dither cell size in drawing-buffer pixels.
- `maxDpr: number` — default `2`
  Device pixel ratio ceiling.
- `className: string`
  Merged onto the host root via `cn`.
- `id: string`
  `CanvasHandoffSlot` only. Stable identity for this landing place, unique within one controller.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/* ------------------------------------------------------------------------
   BUILD. Depends on the motion preference and the DPR ceiling and nothing
   else — emphatically not on the active slot, or a route change would tear
   down the very context the component exists to preserve.
   ------------------------------------------------------------------------ */
useEffect(() => {
  const rootEl = root.current;
  if (!rootEl) return;

  /* Probed in an effect, never during render: `hasWebGL()` needs `document`,
     and branching the markup on it would be a hydration mismatch rather than
     a graceful degradation. */
  if (!hasWebGL()) {
    setFallback(true);
    return;
  }
  setFallback(false);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    });
  } catch {
    // A context can still be refused between the probe and the construction —
    // the tab may have hit the browser's live-context ceiling in between. three
    // throws rather than returning null, and an uncaught throw here takes the
    // page with it.
    setFallback(true);
    return;
  }
  renderer.setPixelRatio(pixelRatio(maxDpr));

  /* three constructs the canvas; React never sees it. This is the whole
     strict-mode story: the second invocation gets a brand new element and a
     brand new context, because the first invocation's cleanup removed and
     released its own. */
  const canvas = renderer.domElement;
  canvas.className = 'kx-handoff-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const l = look.current;
  const uniforms: HandoffUniforms = {
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uHandoff: { value: 0 },
    uLevels: { value: l.levels },
    uCell: { value: l.cell },
    /* Vector3, not Color: three applies working-colour-space conversion to a
       Color and none to a Vector3, and a `ShaderMaterial` emits `gl_FragColor`
       without the output-encoding chunk. Vector3 is the only pair of ends
       where the numbers written here are the numbers that reach the screen. */
    uInk: { value: new THREE.Vector3(l.ink0, l.ink1, l.ink2) },
    uPaper: { value: new THREE.Vector3(l.paper0, l.paper1, l.paper2) },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: canvasHandoffVertexShader,
    fragmentShader: canvasHandoffFragmentShader,
    uniforms,
  });
  // A 2x2 plane under an identity ortho camera is a full-screen quad with no
  // projection maths and no camera to keep in sync on resize.
  const geometry = new THREE.PlaneGeometry(2, 2);
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(geometry, material));
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const render = () => renderer.render(scene, camera);

  const resize = () => {
    const host = canvas.parentElement;
    if (!host) return;
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w === 0 || h === 0) return;
    // `false` leaves the CSS size alone; the stylesheet's 100%/100% is what
    // keeps the canvas glued to whichever slot currently owns it.
    renderer.setSize(w, h, false);
    uniforms.uResolution.value.set(w, h);
    render();
  };

  // Whatever slot is active right now. `rootEl` is the safety net for a
  // controller whose slots have not registered — the canvas is visible and
  // full-bleed rather than orphaned.
  const home = slots.current.get(activeRef.current) ?? rootEl;
  home.appendChild(canvas);
  resize();

  /* Observed on the CANVAS, not the slot: the observation follows the node
     across the handoff, so one observer covers every slot it will ever live
     in. `setSize(..., false)` never writes the CSS box, so this cannot feed
     back on itself. */
  const observer = new ResizeObserver(() => {
    // The flight deliberately runs at the OLD buffer size, scaled. Honouring
    // the resize here is the black frame the deferral exists to prevent.
    if (engine.current?.flying) return;
    resize();
  });
  observer.observe(canvas);

  if (reduced) {
    // One frame, then nothing. A field that drifts forever is motion, and
    // motion is what was asked not to happen.
    render();
  } else {
    // The timestamp is absolute, so elapsed time survives the handoff with
    // no accumulator to carry across and nothing to reset.
    renderer.setAnimationLoop((time) => {
      uniforms.uTime.value = time / 1000;
      render();
    });
  }

  engine.current = { canvas, uniforms, render, resize, flying: false };

  return () => {
    observer.disconnect();
    gsap.killTweensOf(canvas);
    gsap.killTweensOf(uniforms.uHandoff);
    // Stops the loop before releasing the context; a queued frame rendering
    // into a lost context throws out of the cleanup.
    disposeRenderer(renderer);
    material.dispose();
    geometry.dispose();
    // The effect appended it, the effect removes it. React has no idea this
    // node was ever here and will not try to reconcile it.
    canvas.remove();
    engine.current = null;
  };
}, [reduced, maxDpr, slots, engine, activeRef, setFallback]);

/* ------------------------------------------------------------------------
   HAND OVER. A LAYOUT effect, because React's mutations and its layout
   effects share one task: the canvas leaves the old parent and arrives at
   the new one with no paint in between. The same code in `useEffect` shows a
   frame with a hole where the canvas used to be.
   ------------------------------------------------------------------------ */
useLayoutEffect(() => {
  const e = engine.current;
  const target = slots.current.get(active);
  if (!e || !target) return;

  const from = first.current;
  first.current = null;

  // First run after the build already parked it correctly.
  if (e.canvas.parentElement === target) return;

  // `appendChild` on a node that already has a parent MOVES it. No clone, no
  // re-creation, and the WebGL context rides along untouched.
  target.appendChild(e.canvas);

  /* An interrupted flight leaves an inline transform behind. Clear it before
     measuring or Last is read through the previous flight's scale, and the
     inversion comes out compounded — the canvas leaps somewhere neither slot
     has ever been. `clearProps` rather than a set to identity so the instant
     paths below leave the element genuinely untouched. */
  gsap.killTweensOf(e.canvas);
  gsap.set(e.canvas, { clearProps: 'transform' });

  if (!from || reduced || duration <= 0) {
    e.resize();
    return;
  }

  const to = e.canvas.getBoundingClientRect();
  if (to.width === 0 || to.height === 0) {
    e.resize();
    return;
  }

  // FLIP: invert the measured difference, then animate the inversion away.
  // Scale rather than width/height — width is a layout property and a layout
  // property tweened for 0.7 s is 0.7 s of reflow.
  const scaleX = from.width / to.width;
  const scaleY = from.height / to.height;
  const x = from.left + from.width / 2 - (to.left + to.width / 2);
  const y = from.top + from.height / 2 - (to.top + to.height / 2);

  /* For the length of the flight the canvas is bigger than, and outside, the
     slot it now lives in — so the slot must not clip. Written INLINE and
     restored afterwards, because the thing being overridden is usually a
     utility class on the consumer's own markup, and a rule in our stylesheet
     would lose to it. Skip this and the transition is invisible: the canvas
     is cropped to its destination rectangle from the first frame, which
     looks exactly like no transition at all. */
  const clipped = target.style.overflow;
  target.style.overflow = 'visible';
  const unclip = () => {
    target.style.overflow = clipped;
  };

  e.flying = true;
  const tl = gsap.timeline({
    onComplete: () => {
      e.flying = false;
      unclip();
      gsap.set(e.canvas, { clearProps: 'transform' });
      // The ONE buffer resize, now that nothing is moving.
      e.resize();
    },
  });

  tl.fromTo(
    e.canvas,
    { x, y, scaleX, scaleY, transformOrigin: '50% 50%' },
    { x: 0, y: 0, scaleX: 1, scaleY: 1, duration, ease },
    0,
  ).fromTo(
    e.uniforms.uHandoff,
    { value: 0 },
    { value: 1, duration: duration / 2, ease: SURGE_EASE, yoyo: true, repeat: 1 },
    0,
  );

  return () => {
    tl.kill();
    unclip();
    e.flying = false;
  };
}, [active, duration, ease, reduced, engine, slots, first]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** `disposeRenderer` stops the animation loop before releasing the context, so a queued frame cannot render into a lost one and throw out of the cleanup; it then calls `dispose()`, `forceContextLoss()` and zeroes the canvas dimensions to release the backing store immediately. The `ResizeObserver` is disconnected, both the canvas transform tweens and the `uHandoff` tween are killed, the material and geometry are disposed, and the canvas element is removed by the same effect that appended it. The flight effect's own cleanup kills its timeline and restores the destination slot's original `overflow`, so an unmount mid-flight cannot leave a slot permanently unclipped.

**Reduced motion.** No animation loop is started: one frame is drawn when the context is built, and one more after each move and each resize, so the field is a still image rather than a drifting one. The handoff still moves the canvas — that is a DOM relocation, not motion — but the FLIP tween and the `uHandoff` surge are both skipped, and the drawing buffer is resized immediately instead of on a completion that will never fire. `prefers-reduced-motion` is read by the component through `useReducedMotion`, never inferred from the page.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Rendering the canvas from JSX. React unmounts the outgoing page's subtree on a route change, and a `<canvas ref>` inside it is destroyed with it — context, program, buffer and all. That is the exact failure this component exists to avoid, and it cannot be worked around from inside the page: the canvas has to be created by the effect and owned by nobody React can see.
- A React-owned canvas under `reactStrictMode`. The strict-mode remount reuses the SAME element across both effect invocations, so the first cleanup's `forceContextLoss()` hands the second invocation a dead context and the component renders permanently blank — in development only, which is a genuinely expensive way to lose an afternoon. Creating the element inside the effect gives the second run a clean one.
- Doing the move in `useEffect` instead of `useLayoutEffect`. Passive effects run after the browser has painted, so there is one composited frame in which the outgoing page is gone and the canvas has not arrived. It reads as a flash of empty box at exactly the moment the component is supposed to be proving continuity.
- Measuring First inside the layout effect. By then React has already removed the outgoing subtree, so there is nothing left to measure and the FLIP either animates from the wrong rectangle or is skipped. The measurement has to happen in the handler, before `setState`.
- Calling `renderer.setSize()` during the flight. Writing the canvas's width or height reallocates and clears the drawing buffer, so the object mid-animation flashes black for a frame. The `ResizeObserver` fires exactly then, because moving into a differently sized slot changes the border box — which is why it is muted by a `flying` flag rather than trusted.
- A destination slot that clips. `overflow: hidden` on the slot crops the inbound canvas to its final rectangle from the first frame, so the flight is invisible and the result looks identical to no transition. Forcing `overflow: visible` inline for the duration is the only override that reliably beats a utility class.
- Cloning instead of moving. `cloneNode(true)` on a canvas copies the element and NOT its bitmap or its context; `outerHTML` round-trips have the same effect. The clone is blank and the original is gone, so the page shows an empty box with no error anywhere.
- Tweening `width` and `height` instead of `scale`. Besides reflowing on every frame, they are the two properties that reset the drawing buffer, so the animation would clear the surface sixty times a second.
- Mounting the host inside the routed subtree. If the host unmounts on navigation the context goes with it and there is nothing left to hand over — the component silently degrades to the mount-a-new-one behaviour it replaces. It belongs in the layout, above the router outlet.
- Assuming the canvas paints where you expect. It is `position: absolute; z-index: 1` so it can lift over static page content on the way past, which means anything meant to sit ON TOP of the field needs its own stacking context. Text without `relative z-10` disappears under the canvas for the length of the flight.
- Letting the shader carry any state that could reset. Everything visible is a function of the absolute `setAnimationLoop` timestamp, so there is no accumulator to hand over. Drive the field from a per-frame increment instead and it will still restart on the handoff — the exact artefact the component was built to eliminate, hidden one layer deeper.

## Notes

- In Next.js App Router: mount `CanvasHandoffTransition` in `app/layout.tsx`, put a `CanvasHandoffSlot` in each page with an id of its own, and replace `<Link>` with a button calling `handoff(slotId, () => router.push(href))`. The component imports nothing from `next/navigation` — the route change is a callback, so the same host works under React Router or, as in the preview, plain `useState`.
- The slot renders no children while WebGL is live. That is not cosmetic: React only reconciles children it created, so an empty child list is the guarantee that it will never touch the canvas sitting inside. Content that belongs over the field goes in a sibling, not inside the slot.
- One context for the whole site is the real prize. Chromium allows roughly sixteen live WebGL contexts per renderer process and evicts the oldest without warning when you exceed it — a per-page canvas on a site with a persistent background is how an unrelated component three routes away turns black.
- The field is deliberately slow, about eight seconds per visible cycle. Anything faster and the eye cannot hold a specific fold across the transition, which is the only direct evidence the viewer gets that the surface was not rebuilt.
- Under reduced motion there is no animation loop at all — a single frame is drawn on build and again after each move — so the component costs nothing per frame for the people most likely to be on the weakest hardware.

## Definition of done

Watch one bright fold of the field and click a nav item: the same fold is still there when the canvas lands, offset only by the time the flight took. Nothing blanks, blinks, or restarts. The canvas visibly changes proportion in flight — wide banner to tall column — with the dither cells stretching along with it, then snapping to square at the end when the buffer is finally resized. Click twice in quick succession and the second flight starts from wherever the canvas is in the air rather than jumping to the first destination. In React DevTools the canvas element has no owner. Under `reactStrictMode` in development the preview renders on first load, not blank. With reduced motion the field is a still image and the canvas relocates without a flight.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
