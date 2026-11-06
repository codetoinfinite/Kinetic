# Build: GPU Cubic-Bezier Burst

Concentric rings of dots turning slowly. Fire a sector — by clicking it, or by waiting for the automatic cycle — and its particles burst outward and fade, each one following its own cubic-bezier curve. The curve is the same four numbers CSS takes, but solved per vertex per frame by Newton's method, which is what lets two hundred particles carry two hundred different easings while the CPU only advances a clock.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Rings of dots that burst on click, every particle solving its own cubic-bezier easing in the vertex shader.

- Category: webgl
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. A cubic bezier is parametric: for a parameter `t` it gives a point `(x(t), y(t))`. Easing needs `y` at a given *x*, and a cubic has no closed-form inverse, so the shader runs Newton's method — 8 iterations of `t -= (x(t) - target) / x'(t)`, seeded with `t = x` because the curve is monotonic in x — then evaluates `y(t)`.
2. The four control numbers ride in an `aBezier` attribute rather than a uniform. That is the whole reason to solve on the GPU: a uniform would give every particle in the burst one shared easing, and per-particle easing computed on the CPU would mean a buffer upload every frame.
3. Firing writes the current burst-clock time into a contiguous slice of the `aStart` attribute — one sector, one range, one `needsUpdate`. Each particle then computes `age = uBurstTime - aStart - delay` and animates only while `0 <= age <= uBurstDuration`; a start time of 0 means never fired, which is why the clock starts at 1.
4. Resting dots and burst particles live in the same buffer and the same draw call, distinguished by an `isBurst` flag. Burst particles sit invisible on the outer ring until fired, rather than the resting dots being displaced — displacing them would tear a hole in the ring and then pop it shut when the burst ended.
5. There are two clocks. `uRotation` accumulates from delta time only when motion is allowed; `uBurstTime` always accumulates. Under reduced motion the ring freezes at 0.35 rad and the automatic cycle stops, but a click still fires a full burst, and the frame loop is subscribed only for as long as one is in flight.
6. Flight direction is `angle + uRotation`, evaluated live rather than baked, so a burst stays radial to the ring while the ring keeps turning underneath it. Alpha fades linearly against the eased flight, and point size shrinks to 45%, so the particle dissipates instead of blinking out at full size.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `NEWTON_ITERATIONS = 8`
  Newton converges quadratically here, so 4 iterations already land inside a pixel. 8 is cheap insurance for control points near 0 or 1, where the derivative shrinks and convergence slows.
- `MIN_DERIVATIVE = 0.000001`
  Newton divides by the derivative. A curve with a flat segment divides by ~0, `t` becomes NaN, and the NaN propagates into `gl_Position` — the vertex silently disappears rather than erroring.
- `base curve = (0, 0.9, 0.5, 1)`
  A hard ease-out: almost all the distance is covered in the first third. Each particle jitters around it, with x-coordinates clamped to 0..1 because the solver needs monotonicity in x — the same constraint CSS puts on `cubic-bezier()`.
- `MAX_LAUNCH_DELAY = 0.09s`
  Particles all leaving on one frame read as a single expanding ring. Staggering launches over ~90ms reads as a spray, and staying well under `burstDuration` keeps the last launch ahead of the first landing.
- `burstDuration = 0.45s`
  Longer than the 0.25s a click ping wants, because at preview-card size the eye needs the extra frames to actually see the easing differ between particles. Shorten it toward 0.25 when the burst is real button feedback.
- `BURST_END_SIZE = 0.45`
  Particles shrink to 45% over the flight. Constant-size particles read as confetti; shrinking ones read as one thing dissipating.
- `STATIC_ROTATION = 0.35 rad`
  Angle the ring is frozen at under reduced motion. Off-axis, so the field does not look like it snapped to a grid the moment motion was disabled.
- `RING_DOT_SCALE / BURST_DOT_SCALE = 0.7 / 1.15`
  Burst particles are visibly larger than the resting field, so the burst reads as the event rather than as the ring shedding pixels.
- `flight fan = +/- 0.175 rad`
  Jitter added to each particle's radial direction. Pure radial launches leave on rails and the burst looks like a line drawing; more than ~0.3 rad and the sectors start to overlap.

## API

```ts
function GpuBezierBurst(props: { ringCount?: number; ringDots?: number; innerRadius?: number; groups?: number; burstDots?: number; spinSpeed?: number; chordInterval?: number; burstDuration?: number; burstRadius?: number; dotScale?: number; viewScale?: number; opacity?: number; color?: string; burstColor?: string; seed?: number | string; className?: string }): JSX.Element
```

- `ringCount: number` — default `4`
  Concentric rings in the resting field.
- `ringDots: number` — default `190`
  Dots on the outermost ring; inner rings scale down to keep density even.
- `innerRadius: number` — default `0.55`
  Radius of the innermost ring as a fraction of the outermost.
- `groups: number` — default `6`
  Sectors that can be fired independently.
- `burstDots: number` — default `34`
  Burst particles per sector.
- `spinSpeed: number` — default `0.18`
  Ambient ring rotation in radians per second.
- `chordInterval: number` — default `1.5`
  Seconds between automatic firings.
- `burstDuration: number` — default `0.45`
  Seconds a single particle's flight lasts.
- `burstRadius: number` — default `26`
  How far a particle travels, in CSS pixels.
- `dotScale: number` — default `1`
  Dot radius multiplier in CSS pixels.
- `viewScale: number` — default `0.4`
  Model-to-pixel scale as a fraction of the container short side.
- `opacity: number` — default `1`
  Multiplier applied to every dot.
- `color: string` — default `'#6f757e'`
  Resting dot colour.
- `burstColor: string` — default `'#ffffff'`
  Colour mixed in at the hot start of a flight.
- `seed: number | string` — default `'gpu-bezier-burst'`
  Seeds every curve, delay and fan angle for a stable, hydration-safe field.
- `className: string`
  Merged onto the host element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function GpuBezierBurst({
  ringCount = 4,
  ringDots = 190,
  innerRadius = 0.55,
  groups = 6,
  burstDots = 34,
  spinSpeed = 0.18,
  chordInterval = 1.5,
  burstDuration = 0.45,
  burstRadius = 26,
  dotScale = 1,
  viewScale = 0.4,
  opacity = 1,
  color = '#6f757e',
  burstColor = '#ffffff',
  seed = 'gpu-bezier-burst',
  className,
}: GpuBezierBurstProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  // Gates the frame loop under reduced motion: no ambient animation, but a
  // burst in flight still needs frames until it lands.
  const [burstLive, setBurstLive] = useState(false);

  const { width, height } = useResizeObserver(host);
  const size = useRef({ width, height });
  size.current = { width, height };

  const reduced = useReducedMotion();
  // Read inside the frame loop rather than closed over, so toggling the OS
  // setting does not tear down and rebuild the GL context.
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const ready = width > 0 && height > 0;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    if (!hasWebGL()) {
      setUnsupported(true);
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    } catch {
      // A context can still be refused between the probe and the construction —
      // the tab may have hit the browser's live-context ceiling in between. three
      // throws rather than returning null, and an uncaught throw here takes the
      // page with it.
      setUnsupported(true);
      return;
    }
    renderer.setPixelRatio(pixelRatio());
    renderer.setClearAlpha(0);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const rng = createRng(seed);

    const positions: number[] = [];
    const burstData: number[] = [];
    const bezier: number[] = [];

    /* ------------------------------------------------------------------
       Resting rings. Dot count scales with radius so the inner rings are
       not visibly denser than the outer ones — constant dots-per-ring is
       the classic tell of a generated field.
       ------------------------------------------------------------------ */
    for (let r = 0; r < ringCount; r += 1) {
      const t = ringCount === 1 ? 1 : r / (ringCount - 1);
      const radius = innerRadius + (1 - innerRadius) * t;
      const count = Math.max(8, Math.round(ringDots * radius));

      for (let i = 0; i < count; i += 1) {
        const angle = (i / count) * Math.PI * 2 + rng() * 0.01;
        positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
        // isBurst 0: these never move, so flight angle, delay and curve are unused.
        burstData.push(0, angle, RING_DOT_SCALE, 0);
        bezier.push(0, 0, 1, 1);
      }
    }

    /* ------------------------------------------------------------------
       Burst particles, grouped into contiguous sectors so firing one is a
       single contiguous write into the start-time buffer. They sit on the
       outer ring invisible until fired: displacing the resting dots
       instead would leave a hole in the ring, then pop them back.
       ------------------------------------------------------------------ */
    const groupRanges: { start: number; end: number }[] = [];
    const restingDots = positions.length / 3;
    const sector = (Math.PI * 2) / groups;

    for (let g = 0; g < groups; g += 1) {
      const start = positions.length / 3;
      const centre = g * sector;

      for (let i = 0; i < burstDots; i += 1) {
        const angle = centre + (rng() - 0.5) * sector * 0.9;
        const radius = 0.94 + rng() * 0.06;
        positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
        burstData.push(
          1,
          // Flight direction fans slightly off pure radial, so the burst
          // spreads instead of leaving on rails.
          angle + (rng() - 0.5) * 0.35,
          BURST_DOT_SCALE,
          rng() * MAX_LAUNCH_DELAY,
        );

        /* Each particle gets its own curve, jittered around an ease-out
           (0, 0.9, 0.5, 1). x-coordinates are clamped to 0..1 because the
           solver needs the curve monotonic in x — exactly the constraint
           CSS puts on cubic-bezier(). y is free to overshoot. */
        bezier.push(
          Math.min(1, Math.max(0, rng() * 0.25)),
          0.9 + (rng() - 0.5) * 0.3,
          Math.min(1, Math.max(0, 0.5 + (rng() - 0.5) * 0.4)),
          0.95 + rng() * 0.1,
        );
      }
      groupRanges.push({ start, end: positions.length / 3 });
    }

    const total = positions.length / 3;
    const starts = new Float32Array(total);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(positions), 3));
    geometry.setAttribute('aBurstData', new THREE.BufferAttribute(Float32Array.from(burstData), 4));
    geometry.setAttribute('aBezier', new THREE.BufferAttribute(Float32Array.from(bezier), 4));

    const startAttribute = new THREE.BufferAttribute(starts, 1);
    // The only buffer that changes at runtime, and only on a firing.
    startAttribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aStart', startAttribute);

    const uniforms: Uniforms = {
      uBurstTime: { value: 0 },
      uRotation: { value: STATIC_ROTATION },
      uViewScale: { value: 1 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uDotScale: { value: dotScale },
      uOpacity: { value: opacity },
      uBurstDuration: { value: burstDuration },
      uBurstRadius: { value: burstRadius },
      uColor: { value: new THREE.Color(color) },
      uBurstColor: { value: new THREE.Color(burstColor) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: GPU_BEZIER_BURST_VERT,
      fragmentShader: GPU_BEZIER_BURST_FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    // Vertices are unit-scale and the real placement happens in the shader, so
    // three's bounding sphere does not describe what is on screen.
    points.frustumCulled = false;
    scene.add(points);

    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    /* -- the two clocks ------------------------------------------------ */
    let rotation = STATIC_ROTATION; // ambient; frozen under reduced motion
    let burstTime = 1; // feedback; always runs. Starts at 1 so a start
    //                    time of 0 can mean 'never fired'.
    let nextFire = chordInterval;
    let liveUntil = 0;
    let cursor = 0;

    const fire = (group: number) => {
      const range = groupRanges[group % groupRanges.length];
      if (!range) return;
      for (let i = range.start; i < range.end; i += 1) starts[i] = burstTime;
      startAttribute.needsUpdate = true;
      liveUntil = burstTime + burstDuration + MAX_LAUNCH_DELAY + 0.05;
      setBurstLive(true);
    };

    const render = () => renderer.render(scene, camera);

    const step = (dt: number) => {
      burstTime += dt;

      if (!reducedRef.current) {
        rotation += dt * spinSpeed;
        if (burstTime >= nextFire) {
          fire(cursor);
          cursor += 1;
          nextFire = burstTime + chordInterval;
        }
      } else if (burstTime > liveUntil) {
        // Nothing in flight and no ambient motion to draw: stand the loop
        // down. Idempotent, so this is safe to call every frame.
        setBurstLive(false);
      }

      uniforms.uRotation.value = rotation;
      uniforms.uBurstTime.value = burstTime;
      render();
    };

    const resize = (w: number, h: number) => {
      renderer.setSize(w, h, false);
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      uniforms.uViewScale.value = Math.min(w, h) * viewScale;
      uniforms.uPixelRatio.value = renderer.getPixelRatio();
      render();
    };

    /* -- pointer: user-initiated, so it fires under reduced motion too -- */
    const onPointerDown = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      // Screen y grows downward, model y grows upward.
      const y = rect.height / 2 - (event.clientY - rect.top);
      // Undo the ambient rotation so the sector under the cursor is the one
      // that fires, not the one that was there before the ring turned.
      const angle = Math.atan2(y, x) - rotation;
      const normalised = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      fire(Math.round(normalised / sector) % groups);
    };
    el.addEventListener('pointerdown', onPointerDown);

    resize(size.current.width, size.current.height);
    stage.current = { resize, step };

    return () => {
      stage.current = null;
      el.removeEventListener('pointerdown', onPointerDown);
      disposeObject(scene);
      material.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
  }, [
    ready,
    ringCount,
    ringDots,
    innerRadius,
    groups,
    burstDots,
    spinSpeed,
    chordInterval,
    burstDuration,
    burstRadius,
    dotScale,
    viewScale,
    opacity,
    color,
    burstColor,
    seed,
  ]);

  useEffect(() => {
    stage.current?.resize(width, height);
  }, [width, height]);

  useRaf((dt) => stage.current?.step(dt), ready && !unsupported && (!reduced || burstLive));
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes the pointerdown listener, nulls the stage ref so a queued frame cannot touch a dead renderer, disposes the geometry via `disposeObject(scene)`, disposes the material, calls `disposeRenderer` for `dispose` + `forceContextLoss` + a zeroed backing store, and removes the canvas. `useRaf` unsubscribes on unmount, so a StrictMode double-invoke leaves no orphaned context.

**Reduced motion.** The ambient rotation freezes at 0.35 rad and the automatic firing cycle stops, so nothing moves unprompted. A pointer press still fires a full burst, because that is feedback for something the user did rather than decoration. The frame loop is subscribed only while a burst is actually in flight and unsubscribes as soon as the last particle lands, so the idle cost is zero.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Freezing the burst along with the ambient rotation under reduced motion. The component then stops answering clicks, which is a broken interface, not an accessible one — feedback for a user action is not decoration, hence the two separate clocks.
- Leaving the frame loop running under reduced motion to keep the burst alive. It burns a GPU-backed rAF forever for a static image; subscribe only while a burst is in flight and stand down when it lands.
- Passing the control points as a uniform. It compiles, it animates, and every particle in the burst moves identically — the effect collapses into one expanding ring and the GPU solve buys nothing.
- Omitting the derivative guard in the Newton loop. Certain control points produce a near-zero derivative, `t` goes NaN, and the affected vertices vanish with no error anywhere — the symptom is a burst that is missing particles at some curves and not others.
- Displacing the resting ring dots instead of using dedicated burst particles. The ring develops a gap for the duration of the burst and snaps shut at the end.
- Baking the flight direction at fire time. The ring keeps rotating during the 0.45s flight, so the particles visibly drift off-radial and appear to curve away from their launch point.
- Sizing burst radius in model units. It then scales with the container, and the burst that felt right on a large canvas barely leaves the ring on a small preview card — pixels are the right unit for an effect this small.

## Notes

- One draw call and one buffer for the resting field and every burst particle. The only runtime upload is the start-time attribute, written once per firing rather than once per frame.
- Clicking maps the pointer angle back through the current rotation, so the sector under the cursor is the one that fires.
- The automatic cycle exists so the component reads as alive in a preview grid; drop `chordInterval` handling if the burst is wired to real user actions.

## Definition of done

Concentric rings of dots turn slowly. Roughly every 1.5 seconds one sector throws a spray of brighter particles outward that fade as they travel, and the particles visibly do not move in lockstep — some shoot ahead and settle, others trail. Clicking a sector fires it immediately. The ring never develops a gap where a burst came from. With reduced motion the ring is still and nothing fires on its own, but a click still produces a full burst.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
