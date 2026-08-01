# Build: Pause, Don't Unmount

A rotating stack of slabs mounted twice over: once behind `<Activity mode="hidden">` and once behind a plain conditional, switchable live. Hiding tears the Effects down either way — the WebGL context is released, which is what you want, since contexts are a scarce per-process resource. What Activity keeps is everything React owns: the fiber, the DOM, and every `useState` and `useRef` value inside. So the stack resumes at the angle it left, and the build counter on its fiber survives to be incremented again. Requires React 19.2 or newer.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

React 19's Activity hides a WebGL scene without losing its state. Effects still tear down, so the GL context is genuinely released.

- Category: primitive
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. `<Activity mode="hidden">` does three separable things, and conflating them is where the misuse starts: it sets `display: none` on the host children, it destroys the Effects inside — cleanup functions run, in order, exactly as on unmount — and it keeps the fiber alive, so state, refs and DOM nodes are all still there when `mode` goes back to `visible`. Children continue to re-render, at a priority below anything visible.
2. Because Effects are destroyed, the scene's cleanup runs on every hide: materials and geometry are disposed and `disposeRenderer` calls `renderer.forceContextLoss()`. That is the correct behaviour rather than a shortfall — Chromium hands out roughly sixteen WebGL contexts per renderer process and evicts the oldest past that, so a context parked behind `display: none` is the thing that blanks an unrelated canvas three sections down the page.
3. The rotation phase lives in a `useRef` inside the hidden subtree, and the build Effect seeds the slab rotations from it BEFORE the first draw. On re-show the scene is correct on frame one; there is no snap from zero up to the resumed angle. Under the `unmount` arm the same ref is a fresh zero because the fiber it lived on was collected.
4. The build counter is the proof, and it needs both halves to move: it increments inside the Effect, so it only rises if the Effect really re-ran, and it survives between runs only if the fiber was preserved. Under `activity` it climbs 1, 2, 3; under `unmount` it is pinned, because each show starts a new fiber whose counter is new too.
5. Build cost is measured with `performance.now()` from the top of the Effect to the end of the first completed `render`, so it covers context acquisition, program linking and the initial upload — the work Activity does not save. On a desktop GPU it lands in the tens of milliseconds; the point of the readout is that the number is not zero.
6. The size hook re-seeds synchronously from `getBoundingClientRect` on every Effect run, and its state is preserved across the hide as well, so the re-shown scene already knows its dimensions and skips the zero-sized first render that a fresh mount has to pass through. That one saved render round-trip is a second, quieter thing the preserved fiber buys.
7. The renderer creates its own canvas inside the Effect and it is removed in cleanup. A React-rendered `<canvas ref>` cannot work here: with `forceContextLoss()` in cleanup, StrictMode's double-invoke hands the second run a permanently dead element, and Activity turns that from a once-per-mount hazard into a once-per-toggle one.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `GAP = 0.2`
  Vertical spacing between slabs in world units, at a slab height of 1.15. Tight enough that the group reads as one stack rather than seven separate cards, wide enough that the back-to-front transparent sort has visible separation to work with.
- `TWIST = 0.24`
  Radians of rotation between neighbouring slabs — about 14 degrees, so seven slabs fan through 84 degrees, just under a quarter turn. Past a full turn the stack becomes rotationally ambiguous and "it resumed where it left" stops being checkable by eye.
- `count / period = 7 / 24`
  Seven slabs at 24 seconds a revolution: 15 degrees per second. Slow enough that a hide and a show a second apart leaves a gap the eye can measure against the readout, which is the entire experiment.
- `CAM_Y / CAM_Z = 2.05 / 4.4`
  A camera lean of about 25 degrees above the stack. Flatter and the slabs collapse into a single silhouette; steeper and it reads as a plan view where the vertical stacking disappears.
- `opacity ramp = 0.34 to 0.80`
  Bottom slab to top. The ramp is what makes the stack legible through itself; a constant alpha turns seven slabs into one muddy plane.

## API

```ts
function PauseDontUnmount(props: { strategy?: 'activity' | 'unmount'; count?: number; period?: number; color?: string; accent?: string; seed?: number | string; className?: string }): JSX.Element
```

- `strategy: 'activity' | 'unmount'` — default `'activity'`
  Which arm the switch starts on.
- `count: number` — default `7`
  Slabs in the stack.
- `period: number` — default `24`
  Seconds for one full rotation.
- `color: string` — default `'#5f6873'`
  Colour of the bottom slab.
- `accent: string` — default `'#e8e4dc'`
  Colour of the top slab. The stack lerps between the two.
- `seed: number | string` — default `'pause-dont-unmount'`
  Seeds the per-slab size jitter.
- `className: string`
  Merged onto the host element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
useEffect(() => {
  const el = host.current;
  if (!el || !ready) return;

  if (!hasWebGL()) {
    setUnsupported(true);
    return;
  }

  // Timed from here to the first completed draw: allocating the context,
  // linking the programs and uploading the geometry are what re-showing
  // actually costs, and the number is the honest counterweight to "Activity
  // makes hiding free".
  const t0 = performance.now();

  // The renderer makes its own canvas inside the effect. Two reasons, and
  // both bite here: StrictMode double-invokes this effect, so a React-owned
  // `<canvas ref>` would be handed back after `forceContextLoss()` killed
  // it; and Activity destroys and re-runs this effect on every show, which
  // is the same hazard once per toggle instead of once per mount.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(pixelRatio());
  renderer.setClearAlpha(0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, CAM_Y, CAM_Z);
  camera.lookAt(0, 0, 0);

  const geometry = new THREE.PlaneGeometry(SLAB_W, SLAB_H);
  const rng = createRng(seed);
  const base = new THREE.Color(color);
  const tint = new THREE.Color(accent);

  const slabs: Slab[] = [];
  const span = Math.max(count - 1, 1);

  for (let i = 0; i < count; i += 1) {
    const t = i / span;
    const material = new THREE.MeshBasicMaterial({
      color: base.clone().lerp(tint, t),
      transparent: true,
      opacity: 0.34 + 0.46 * t,
      side: THREE.DoubleSide,
      // The slabs are flat and stacked along Y with nothing between them, so
      // the transparent pass sorted back to front is already correct. Writing
      // depth would let the upper slabs clip the lower ones they overhang.
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    const k = 0.66 + rng() * 0.46;
    mesh.scale.set(k, k, 1);
    mesh.position.y = (i - span / 2) * GAP;
    scene.add(mesh);
    slabs.push({ mesh, material });
  }

  el.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';

  const resize = (w: number, h: number) => {
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    dirty.current = true;
  };
  resize(size.current.width, size.current.height);

  // Seed the scene from the PRESERVED phase before the first draw. Under
  // Activity this is wherever the stack was when it went away; under a
  // conditional the ref is new and this reads zero. Doing it before the
  // timed draw also means the resumed frame is correct on frame one, with
  // no snap from zero to the real angle.
  for (let i = 0; i < slabs.length; i += 1) {
    const slab = slabs[i];
    if (slab) slab.mesh.rotation.set(-Math.PI / 2, 0, phase.current + i * TWIST);
  }
  renderer.render(scene, camera);

  builds.current += 1;
  buildMs.current = performance.now() - t0;

  stage.current = { renderer, scene, camera, slabs, geometry, resize };
  report(true);

  return () => {
    stage.current = null;
    for (const slab of slabs) {
      scene.remove(slab.mesh);
      slab.material.dispose();
    }
    geometry.dispose();
    // Not optional. `dispose()` alone leaves the context alive and counting
    // against the per-process budget; only `forceContextLoss()`, which
    // `disposeRenderer` calls, actually gives it back. Every hide runs this.
    disposeRenderer(renderer);
    renderer.domElement.remove();
  };
}, [ready, count, color, accent, seed, report]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The Effect removes each slab and disposes its material, disposes the one shared geometry, calls `disposeRenderer` — which stops the loop, disposes the renderer and calls `forceContextLoss()` — and removes the canvas it appended. This runs on unmount, on a StrictMode double-invoke, and on every Activity hide, so it is exercised constantly rather than once. `useRaf` unsubscribes and the shared loop parks when its last subscriber leaves; the `ResizeObserver` unobserves with its hook. A separate Effect reports the scene as gone on teardown so the readout does not freeze on a stale row.

**Reduced motion.** The stack holds still — the phase is integrated from delta time, so freezing it is a matter of adding nothing — and with nothing marking the frame dirty the renderer draws once per build and then idles. The demonstration survives the loss of motion because it was never really about the motion: the build counter still climbs under `activity` and stays pinned under `unmount`, and the rebuild cost in milliseconds is still charged on every show. Only the resumed rotation angle stops being informative, since both arms sit at zero degrees.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Expecting Activity to keep the WebGL context alive. It does not, by design — Effects are destroyed on hide, so your cleanup runs and the context is released. If you had assumed otherwise and skipped disposal, you leak instead; if you assumed re-showing is free, the rebuild millisecond readout says otherwise.
- Lifting the state you wanted preserved above the boundary. Anything outside the `<Activity>` was never at risk, and anything the parent owns is not evidence of anything. The value has to live on a fiber inside the boundary or the comparison proves nothing.
- Changing the element at the boundary position instead of changing `mode`. Swapping `<Activity>{scene}</Activity>` for `{scene}` reconciles as a different type at that slot, so React unmounts the subtree and every preserved value goes with it. Keep the boundary mounted and toggle `mode`.
- Treating hidden as unrendered. Children keep re-rendering, only at a lower priority, so a parent state update still walks the hidden subtree. Anything expensive in render — not in an Effect — is still paid for while hidden.
- Assuming a ref into hidden DOM behaves the same as a ref into visible DOM. The DOM nodes themselves survive, but ref attachment is part of the layout-effect phase that the offscreen path tears down and replays, and this component does not depend on the answer either way. Do the work in an Effect, which is re-run on show, rather than caching a node in a closure that outlives the hide.
- Handing three's renderer a React-rendered `<canvas ref>`. Cleanup calls `forceContextLoss()`, and the next Effect run — from StrictMode or from a re-show — is given the same dead element. Let the renderer build its own canvas in the Effect and remove it in cleanup.
- Reading the build counter in development and taking the absolute number literally. StrictMode double-invokes Effects on mount, so the first build reads 2, not 1. The claim to check is the shape: climbing under `activity`, pinned under `unmount`.

## Notes

- `Activity` is exported from `react` from 19.2 (verified against 19.2.8: `exports.Activity = REACT_ACTIVITY_TYPE`, typed as `ExoticComponent<ActivityProps>` with `mode?: "hidden" | "visible"`). On anything older the import is undefined at runtime, not a build error, which fails as a blank subtree.
- The strongest real use is not a canvas at all — it is a tab, a route the user is likely to come back to, or a filter panel: scroll offsets, uncontrolled input values and list virtualisation windows are all preserved for free, and none of them cost a GPU context to rebuild.
- Pre-rendering the other direction, `mode="hidden"` on a subtree that has never been visible, mounts it at low priority without running Effects. Useful for warming a route, useless for warming a renderer, for the same reason as above.

## Definition of done

On `activity`: press hide, wait, press show. The stack picks up at the angle the readout froze at, `builds` has gone up by one, and the rebuild cost is a real number of milliseconds. On `unmount`: the same sequence returns the stack to zero degrees and `builds` never moves. Hide on either arm and the canvas is gone from the DOM inspector under `unmount` but present with `display: none` under `activity`. Neither arm accumulates WebGL contexts — toggle twenty times and the other previews on the page stay drawn.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
