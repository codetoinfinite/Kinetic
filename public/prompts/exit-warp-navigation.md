# Build: Exit Warp Before Navigate

Choosing a destination does not navigate. It plays an exit: the DOM chrome lifts and fades, the ring of cards is shoved thirty slots forward while its vertical spacing explodes and its radius collapses, the planes dissolve in index order, and only after one settle frame does the router move. The ease is expo.in, so almost nothing happens for the first half-second and then everything happens at once.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A ring of cards tears itself apart and rushes past the camera, and only then does the route change.

- Category: transition
- Runtime cost: webgl
- Dependencies: three@^0.185.1, gsap@^3.15.0

## How it works

1. Four scalars describe the ring — `position`, `spacing`, `hSpacing`, `radius` — and one `layout()` reads them: `angle = wrappedOffset(i, position, count) * (2*PI/count) * hSpacing`, then `mesh.position.set(sin(angle) * radius, offset * spacing * 0.12, cos(angle) * radius - radius)` and `mesh.rotation.y = angle`. Idle and exit both drive the same function, so no second code path can disagree about where a card belongs.
2. Idle rotation is `position += dt * 0.16` inside `setAnimationLoop`, with `dt` in seconds clamped to 50 ms — a per-frame constant would spin twice as fast on a 120 Hz display.
3. On select, a timeline fades the chrome (`opacity: 0, y: -20, 0.5s, power2.out, stagger 0.05`) and a `tl.call` pinned at an absolute 0.4s starts the warp, so the ring begins moving 0.1s before the text has finished leaving.
4. The warp is one `gsap.to` on the scalar object: `position + 30`, `spacing 0.8 -> 10`, `hSpacing 1 -> 3`, `radius 2.3 -> 0.6`, 1.4s, `expo.in`, with `onUpdate` calling `layout()`. Radius shrinking while spacing explodes is what makes the planes leave in different directions instead of receding as a group.
5. Each material tweens `opacity: 0` over 1s with `delay: 0.03 * i`, so the ring dissolves in index order rather than as a single fade.
6. The tween's `onComplete` sets a 50 ms timeout, and only that timeout calls `onNavigate`. Textures are canvas-drawn gradients with the item label baked in, so the component ships without a single image.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `duration = 1.4`
  Seconds of warp. With expo.in the perceived length is roughly half the real one; below ~1.1s the accelerating half is too brief to register and it reads as a cut, above ~1.8s the destination feels withheld.
- `shove = 30`
  Ring slots travelled during the exit. For a six-item ring that is five full revolutions — enough that individual cards stop being trackable and the ring reads as a blur rather than as a carousel scrubbing.
- `WARP_CUE = 0.4`
  Absolute seconds at which the scene warp starts, against a 0.5s chrome fade. The 0.1s overlap fuses two moves into one gesture; at 0.5 they read as sequential steps, and at 0 the ring pulls the eye off the text before it has gone.
- `FADE_STAGGER = 0.03`
  Seconds between per-card dissolves. 30 ms x 6 cards is 180 ms of sweep — visible as a direction, short enough that the last card still fades inside the warp.
- `SETTLE_MS = 50`
  GSAP fires onComplete on the same frame the tween ends, before that frame is presented. Navigating there shows one frame of the un-warped ring. One extra tick guarantees the final layout has been painted.
- `WARP_SPACING / WARP_RADIUS = 10 / 0.6`
  Vertical gap goes 0.8 -> 10 while radius goes 2.3 -> 0.6. Spreading without shrinking looks like a zoom out; shrinking without spreading looks like a dolly. Both together are the only combination that reads as the ring tearing apart around the camera.
- `IDLE_SPEED = 0.16`
  Ring slots per second at rest. One card takes about six seconds to reach the front — slow enough to read as ambience, fast enough that the ring is never mistaken for a static image.

## API

```ts
function ExitWarpNavigation(props: { items: { id: string; label: string }[]; onNavigate: (id: string) => void; children?: ReactNode; duration?: number; shove?: number; className?: string }): JSX.Element
```

- `items: { id: string; label: string }[]`
  Destinations. One card and one nav button each; the label is drawn into the card texture.
- `onNavigate: (id: string) => void`
  Called after the warp and its settle frame. Do the router push here.
- `children: ReactNode`
  Chrome over the canvas. Descendants marked `data-warp-chrome` fade and lift first.
- `duration: number` — default `1.4`
  Warp length in seconds.
- `shove: number` — default `30`
  Ring slots the drum travels during the warp.
- `className: string`
  Merged onto the positioned wrapper.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
useEffect(() => {
  const el = host.current;
  if (!el) return;

  // Checked in an effect, never during render: `hasWebGL()` needs `document`
  // and returning different markup on the server than on the client is a
  // hydration mismatch, not a graceful degradation.
  if (!hasWebGL() || reduced) {
    setFallback(true);
    return;
  }
  setFallback(false);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    // A context can still be refused between the probe and the construction —
    // the tab may have hit the browser's live-context ceiling in between. three
    // throws rather than returning null, and an uncaught throw here takes the
    // page with it.
    setFallback(true);
    return;
  }
  renderer.setPixelRatio(pixelRatio(2));
  renderer.setClearAlpha(0);
  el.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);

  const geometry = new THREE.PlaneGeometry(1, CARD_H / CARD_W);
  const meshes: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  const textures: THREE.CanvasTexture[] = [];

  items.forEach((item, i) => {
    const texture = new THREE.CanvasTexture(drawCard(item.label, i, items.length));
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshes.push(mesh);
  });

  const state: Warp = {
    position: 0,
    spacing: REST_SPACING,
    hSpacing: 1,
    radius: REST_RADIUS,
  };

  /* One layout function, driven by four scalars. The idle loop and the exit
     tween both call it; there is no second code path that could disagree
     about where a card belongs. */
  const layout = () => {
    const count = meshes.length;
    const step = count > 0 ? (Math.PI * 2) / count : 0;
    for (let i = 0; i < count; i += 1) {
      const mesh = meshes[i];
      if (!mesh) continue;
      const offset = wrappedOffset(i, state.position, count);
      const angle = offset * step * state.hSpacing;
      mesh.position.set(
        Math.sin(angle) * state.radius,
        offset * state.spacing * Y_PER_SLOT,
        Math.cos(angle) * state.radius - state.radius,
      );
      mesh.rotation.y = angle;
    }
  };

  const resize = () => {
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Pull the camera back on narrow boxes so the ring never grows wider
    // than the frame; a fixed z crops the front card on a phone.
    camera.position.z = 3.2 * Math.max(1, 1.35 / camera.aspect);
    camera.updateProjectionMatrix();
  };

  const observer = new ResizeObserver(resize);
  observer.observe(el);
  resize();
  layout();

  let last = 0;
  renderer.setAnimationLoop((time) => {
    const dt = last === 0 ? 0 : Math.min((time - last) / 1000, 0.05);
    last = time;
    const b = bundle.current;
    if (b && !b.exiting) {
      // Seconds, not frames: a per-frame increment idles twice as fast on a
      // 120 Hz display as it does on 60 Hz.
      state.position += dt * IDLE_SPEED;
      layout();
    }
    renderer.render(scene, camera);
  });

  bundle.current = { renderer, scene, camera, geometry, meshes, textures, state, exiting: false };

  return () => {
    observer.disconnect();
    // A rebuild — the caller changed the item ids — must not leave the latch
    // set, or every button on the new ring is dead for the life of the page.
    exitTl.current?.kill();
    exitTl.current = null;
    exiting.current = false;
    gsap.killTweensOf(state);
    for (const mesh of meshes) gsap.killTweensOf(mesh.material);
    // disposeRenderer stops the animation loop first: a queued frame that
    // renders into a context we just released throws out of cleanup.
    disposeRenderer(renderer);
    for (const mesh of meshes) mesh.material.dispose();
    for (const texture of textures) texture.dispose();
    geometry.dispose();
    renderer.domElement.remove();
    bundle.current = null;
  };
  // `ids` stands in for `items` so a caller passing a fresh array literal
  // every render does not rebuild the whole scene each time.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [ids, reduced]);

const start = useCallback(
  (id: string) => {
    const b = bundle.current;
    const chromeEl = chrome.current;

    // Re-entrancy guard. Without it a double click starts two warps that
    // tween the same scalars in opposite directions and the ring jitters —
    // and on the no-GL branch below, two crossfades each ending in their own
    // `onNavigate`.
    if (exiting.current) return;
    exiting.current = true;

    const chromeTargets = chromeEl
      ? Array.from(chromeEl.querySelectorAll<HTMLElement>('[data-warp-chrome]'))
      : [];

    if (!b) {
      // No GL: the static crossfade. Same shape, no warp.
      const target = chromeTargets.length > 0 ? chromeTargets : chromeEl;
      if (target) {
        // On the same ref as the GL path's timeline, so one kill on unmount
        // covers both branches — and this is the branch the build effect
        // returns early from, so it has no cleanup of its own.
        exitTl.current = gsap.timeline().to(target, {
          opacity: 0,
          duration: reduced ? 0.15 : 0.3,
          ease: 'power2.out',
          onComplete: () => navigate.current(id),
        });
      } else {
        navigate.current(id);
      }
      return;
    }

    b.exiting = true;
    const state = b.state;

    const tl = gsap.timeline();
    exitTl.current = tl;
    if (chromeTargets.length > 0) {
      tl.to(chromeTargets, {
        opacity: 0,
        y: -20,
        duration: CHROME_DURATION,
        ease: 'power2.out',
        stagger: CHROME_STAGGER,
      });
    }

    // Absolute position: the warp starts 0.1 s before the chrome finishes
    // leaving, so the two overlap into one gesture instead of reading as
    // "text goes, then something else happens".
    tl.call(
      () => {
        gsap.to(state, {
          position: state.position + shove,
          spacing: WARP_SPACING,
          hSpacing: WARP_HSPACING,
          radius: WARP_RADIUS,
          duration,
          ease: 'expo.in',
          onComplete: () => {
            // One more frame before the route changes. GSAP's onComplete
            // fires on the same frame the tween ends, so navigating here
            // shows a single frame of the un-warped ring.
            const t = setTimeout(() => navigate.current(id), SETTLE_MS);
            timers.current.push(t);
          },
        });
        for (let i = 0; i < b.meshes.length; i += 1) {
          const mesh = b.meshes[i];
          if (!mesh) continue;
          gsap.to(mesh.material, {
            opacity: 0,
            duration: 1,
            ease: 'power2.in',
            delay: FADE_STAGGER * i,
          });
        }
      },
      undefined,
      WARP_CUE,
    );
  },
  [duration, shove, reduced],
);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Disconnects the ResizeObserver, kills the tweens on the scalar object and on every material, clears the pending navigation timeout, calls `disposeRenderer` (which stops the animation loop, disposes, forces context loss and zeroes the canvas), then disposes every material, texture and the shared geometry, and removes the canvas element.

**Reduced motion.** No WebGL context is created. The same cards render as a static CSS-gradient grid, and choosing one fades the chrome over 0.15s before navigating — the transition still covers the swap, it just does not move.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Calling `router.push` in the click handler and animating afterwards. React unmounts the canvas as the route resolves, so the warp plays for two frames and then disappears; the navigation must be the last step, inside the tween's completion.
- No re-entrancy guard. A double click starts two warps tweening the same four scalars from different origins — the ring jitters and the second navigation fires into an already-unmounting tree.
- Navigating in `onComplete` instead of one tick later. The final frame has not been presented, so a single frame of the intact ring flashes just before the route changes.
- Calling `renderer.dispose()` and stopping there. The GL context stays alive; Chromium kills the oldest context once about sixteen exist, so an unrelated canvas elsewhere on the page goes black. `disposeRenderer` also calls `forceContextLoss()` and zeroes the backing store.
- Leaving the exit tweens running through unmount. They keep writing to disposed materials and to a scalar object nobody reads; the material writes throw once the context is gone. Cleanup kills the tweens on the state object and every material before disposing.
- Deciding whether WebGL exists during render. `hasWebGL()` needs `document`, so it returns false on the server and true on the client, and the two renders disagree — the check runs in an effect and flips to the static fallback afterwards.
- Advancing the idle rotation by a per-frame constant. The ring idles at double speed on a 120 Hz laptop, which is exactly the sort of bug that never reproduces on the developer's machine.

## Notes

- App Router wiring: `onNavigate={(id) => router.push(`/work/${id}`)}`. Call `router.prefetch` on hover (see `hover-prefetch-wipe`) so the 1.4s warp is spent downloading the destination rather than waiting after it.
- Reduced motion and no-WebGL share one path: a static grid of the same cards, a 0.3s fade of the chrome, then navigate. No context is ever created in that branch.
- The ring is index-driven, not raycast-driven. Picking is done with real DOM buttons over the canvas, which keeps the nav keyboard-reachable and screen-reader-legible for free.

## Definition of done

The ring idles at the same speed on a 60 Hz and a 120 Hz display. Choosing a destination fades the caption, then the ring barely moves for about half a second before tearing outward and past the camera; the new route appears only once the frame is empty, with no flash of the intact ring. Unmount mid-warp and the console stays clean.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
