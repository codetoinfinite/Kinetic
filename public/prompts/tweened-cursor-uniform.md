# Build: Tweened Cursor Uniform

A full-quad fragment shader draws a procedural grid and pulls its UVs toward a lens centred on the pointer. The lens position is not assigned into the uniform — GSAP tweens it onto a plain object, and the render loop copies that object across each frame, so the distortion trails the cursor and then comes fully to rest under it. Presence is a second, independent tween, so leaving the container dims the lens where it stands rather than dragging it away.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A shader grid with a lens under the pointer, whose position is tweened into the uniform so it settles instead of chasing.

- Category: cursor
- Runtime cost: webgl
- Dependencies: three@^0.185.1, gsap@^3.15.0

## How it works

1. A `pointermove` handler converts client coordinates into NDC against the live container rect: `x = ((e.clientX - rect.left) / rect.width) * 2 - 1` and `y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)`, y negated because NDC counts upward and CSS counts downward.
2. That NDC pair is tweened onto a plain `{ x, y }` object with `gsap.to(pos, { x, y, duration: 0.6, ease: "power3.out", overwrite: true })`. This is the smoothing. Nothing else damps: the uniform copy in the rAF loop is a straight assignment.
3. The contrast with `useSmoothPointer` is the point. `damp` closes a fixed fraction of the remaining gap per second — always moving, always behind, asymptotic. A tween has a duration and an end, so `power3.out` decelerates the lens into a hard stop exactly under the cursor when the hand stops.
4. Presence is a separate scalar tweened to 1 over 0.4s on move and back to 0 over 0.6s on `pointerleave`, multiplied into the falloff in the shader. Splitting it from position is what makes the lens fade out in place instead of sliding off toward a parked coordinate.
5. The fragment shader works in aspect-corrected centre space, computes a Gaussian `fall = exp(-d² / r²)` from the cursor, and displaces the sampling point with `warped = p - normalize(p - c) * fall * uStrength * uAmount` before the grid function reads it — so the grid compresses toward the cursor like glass rather than smearing.
6. Anti-aliasing of the grid lines is derived from `uResolution` (`w = widthPx * cells / res`) instead of `fwidth`, so the same source compiles on a WebGL1 context with no derivatives extension pragma.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `PARKED_NDC = 999`
  Initial value of the tweened cursor object. Far outside the -1..1 NDC range, so `exp(-d²/r²)` underflows to exactly 0 and the very first frame is guaranteed lens-free. Initialising at (0,0) puts a full-strength bulge dead centre before the pointer has ever moved.
- `followDuration = 0.6`
  Seconds for the lens to reach the pointer. This is long for a cursor effect and deliberately so — the lens reads as heavy glass being dragged. Under ~0.25 it is welded to the pointer and the trailing quality disappears.
- `PRESENCE_IN / PRESENCE_OUT = 0.4 / 0.6`
  Asymmetric on purpose. Arrival must beat the eye to the pointer; departure is slower so the lens reads as dissipating rather than being switched off.
- `radius = 0.28`
  Gaussian sigma in centre space, where the short edge spans 1.0. So the lens core is a bit over a quarter of the container height. Past ~0.45 the falloff no longer reaches zero inside the frame and the whole grid warps.
- `amount = 0.22`
  Peak UV displacement toward the cursor, in centre-space units. Above ~0.35 the pull exceeds the local grid spacing and lines fold back through each other, which reads as a rendering fault.
- `pixelRatio cap = 2`
  Fill-rate is quadratic in DPR. On a 3x display an uncapped full-container fragment shader costs 2.25x more per frame for no visible gain.

## API

```ts
function TweenedCursorUniform(props: { followDuration?: number; radius?: number; amount?: number; className?: string }): JSX.Element
```

- `followDuration: number` — default `0.6`
  Seconds for the lens to catch the pointer.
- `radius: number` — default `0.28`
  Gaussian sigma of the lens, in centre-space units where the short edge is 1.
- `amount: number` — default `0.22`
  Peak UV displacement toward the cursor at full strength.
- `className: string`
  Merged onto the root container via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const FOLLOW_EASE = 'power3.out';
const PRESENCE_IN = 0.4;
const PRESENCE_OUT = 0.6;
/** Far outside NDC, so `exp(-d²/r²)` underflows to 0 before the first move. */
const PARKED_NDC = 999;

export function TweenedCursorUniform({
  followDuration = 0.6,
  radius = 0.28,
  amount = 0.22,
  className,
}: TweenedCursorUniformProps) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<Scene | null>(null);

  /* The two tween targets. Plain objects, not uniforms: GSAP writes numbers
     onto them and the loop copies them across once per frame. Tweening the
     uniform's `.value` vector directly works too, but this keeps the tween
     alive across a material rebuild. */
  const smooth = useRef({ x: PARKED_NDC, y: PARKED_NDC });
  const presence = useRef({ value: 0 });

  const reduced = useReducedMotion();
  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { rootMargin: '128px' });
  const visible = useVisibility();

  /* Build once. Never in the resize effect — recreating a WebGLRenderer on
     every resize leaks contexts, and Chromium kills the OLDEST live context
     when the ~16-per-process ceiling is hit, so an unrelated canvas
     elsewhere on the page goes black. */
  useEffect(() => {
    const el = host.current;
    if (!el || !hasWebGL()) return;

    /* three owns its canvas and it is appended here, per effect run. Handing
       the constructor a React-rendered `<canvas ref>` was the bug: cleanup
       calls `forceContextLoss()`, and `getContext` on an element that has been
       through that returns the same dead context, so the next construction
       threw straight into the catch below and the component stayed blank. The
       preview host hides components with `<Activity mode="hidden">` — effects
       unmount, the DOM does not — so that cycle is ordinary scrolling here,
       not just StrictMode in development. */
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
      return;
    }
    renderer.setPixelRatio(pixelRatio(2));
    renderer.domElement.className = 'block h-full w-full';
    el.append(renderer.domElement);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uResolution: { value: new THREE.Vector2(1, 1) },
        uCursor: { value: new THREE.Vector2(PARKED_NDC, PARKED_NDC) },
        uStrength: { value: 0 },
        uTime: { value: 0 },
        uRadius: { value: radius },
        uAmount: { value: amount },
        uInk: { value: new THREE.Color(0.08, 0.09, 0.11) },
        uPaper: { value: new THREE.Color(0.04, 0.04, 0.05) },
        uAccent: { value: new THREE.Color(0.95, 0.55, 0.2) },
      },
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry, material));

    // A 2x2 plane under an identity-ish ortho camera is a full-screen quad
    // with no projection maths and no camera to keep in sync on resize.
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    api.current = { renderer, camera, scene, geometry, material };

    return () => {
      api.current = null;
      // `dispose()` alone frees GPU objects but leaves the context alive;
      // only `forceContextLoss()` hands it back, which is what this does.
      disposeRenderer(renderer);
      geometry.dispose();
      material.dispose();
      renderer.domElement.remove();
    };
    // Deliberately empty. `radius` and `amount` are uniform values and used to
    // sit here, which meant changing either tore the renderer down and built a
    // whole new context for what is one float. The effect below writes them
    // onto the live material instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Uniform values, not construction inputs. Written straight onto the live
     material so a prop change costs one assignment rather than a context. */
  useEffect(() => {
    const s = api.current;
    if (!s) return;
    const r = s.material.uniforms.uRadius;
    if (r) r.value = radius;
    const a = s.material.uniforms.uAmount;
    if (a) a.value = amount;
  }, [radius, amount]);

  /* Size in its own effect so a resize never touches the renderer's lifetime. */
  useEffect(() => {
    const s = api.current;
    if (!s || width === 0 || height === 0) return;
    s.renderer.setSize(width, height, false);
    const res = s.material.uniforms.uResolution;
    if (res) (res.value as THREE.Vector2).set(width, height);
    // Render once so a resize while paused still repaints, rather than
    // stretching the previous framebuffer until the pointer moves again.
    s.renderer.render(s.scene, s.camera);
  }, [width, height]);

  /* Pointer -> tween. The tween is the smoothing; nothing else damps. */
  useEffect(() => {
    const el = host.current;
    if (!el || reduced || !hasWebGL()) return;
    // A coarse pointer only produces events during a drag, so the lens would
    // pop into existence under a finger and vanish on release.
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const pos = smooth.current;
    const pres = presence.current;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      // `overwrite: true` (not 'auto'): each move must kill the whole previous
      // tween, including the half of it that has not started easing yet.
      gsap.to(pos, { x, y, duration: followDuration, ease: FOLLOW_EASE, overwrite: true });
      gsap.to(pres, { value: 1, duration: PRESENCE_IN, ease: 'power2.out', overwrite: 'auto' });
    };

    const onLeave = () => {
      // Fade presence only. Leaving position alone means the lens dims where
      // it stands; tweening it to a corner instead drags a visible streak.
      gsap.to(pres, { value: 0, duration: PRESENCE_OUT, ease: 'power2.out', overwrite: 'auto' });
    };

    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);

    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      gsap.killTweensOf([pos, pres]);
    };
  }, [followDuration, reduced]);

  useRaf(
    (_dt, elapsed) => {
      const s = api.current;
      if (!s) return;
      const u = s.material.uniforms;
      const cursor = u.uCursor;
      const strength = u.uStrength;
      const time = u.uTime;
      if (cursor) (cursor.value as THREE.Vector2).set(smooth.current.x, smooth.current.y);
      if (strength) strength.value = presence.current.value;
      if (time) time.value = elapsed;
      s.renderer.render(s.scene, s.camera);
    },
    inView && visible && !reduced,
  );

  /* Reduced motion still gets a picture — a single frame with the lens parked
     off-centre — rather than an empty box. One render, then nothing. */
  useEffect(() => {
    const s = api.current;
    if (!s || !reduced || width === 0 || height === 0) return;
    const cursor = s.material.uniforms.uCursor;
    const strength = s.material.uniforms.uStrength;
    if (cursor) (cursor.value as THREE.Vector2).set(-0.25, 0.15);
    if (strength) strength.value = 1;
    s.renderer.render(s.scene, s.camera);
  }, [reduced, width, height]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes both pointer listeners and kills the tweens on the two plain objects. The build effect nulls its handle, calls `disposeRenderer` (which stops the animation loop, disposes, forces context loss, and zeroes the backing store), then disposes the geometry and the material. The rAF subscription is released by `useRaf`.

**Reduced motion.** The rAF loop and the pointer listeners never attach. A single frame is rendered with the lens parked slightly off-centre at full strength, so the component is a static composed image of the effect rather than an empty box. It repaints once on resize and never again.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Assigning the pointer straight into the uniform and smoothing in the shader instead. The shader has no memory between frames without a render target, so the usual workaround is to lerp a JS variable per frame with a fixed alpha — which is frame-rate dependent and converges twice as fast at 120Hz.
- Tweening position and presence together. On `pointerleave` the lens then slides toward its parked coordinate at full strength, dragging a bright streak across the whole canvas on the way out.
- Leaving the tweened cursor at (0, 0) on mount. A full-strength bulge sits dead centre from the first painted frame until the user moves, which looks like a baked-in artefact rather than an interaction.
- Using `overwrite: "auto"` on the position tween. Auto only retires *rendered* conflicts; a burst of moves inside one frame can leave the earlier tween partly live. `overwrite: true` kills the previous tween outright, which is what you want when every event supersedes the last.
- Recreating the `WebGLRenderer` inside the resize effect. Each resize leaks a context, and Chromium silently kills the oldest of its ~16 per-process contexts, so an unrelated canvas elsewhere on the page goes black.
- Calling `renderer.dispose()` and stopping there. That frees GPU objects but not the context itself; `forceContextLoss()` — what `disposeRenderer` does — is the call that actually hands it back.
- Not repainting after a resize while the loop is paused. The framebuffer keeps the old dimensions and the browser stretches the last frame, so an off-screen preview reappears visibly smeared.

## Notes

- Gated on `(pointer: fine)`. On touch the listeners never attach, so the canvas renders the idle grid with the lens parked outside NDC — a tap cannot pop a bulge under the finger and leave it there on release.
- Guarded with `hasWebGL()`: on a blocklisted GPU or with hardware acceleration off, nothing is constructed and the container is simply an empty dark panel rather than a permanently blank canvas.
- The loop is gated on `useInView` plus `useVisibility`, so an off-screen or backgrounded instance costs zero GPU time.

## Definition of done

Move across the panel and the grid compresses under a soft circular lens that arrives about half a second behind the pointer, then settles precisely under it when you stop. Leave the panel and the lens fades out where it stands without sliding. Resize the container and the lens stays circular rather than becoming an ellipse. Unmount and the WebGL context count in about:gpu goes back down.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
