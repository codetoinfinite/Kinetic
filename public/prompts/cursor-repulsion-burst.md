# Build: Cursor Repulsion Burst

Up to 1400 particles in one instanced draw call, each circling its own home on its own phase. The pointer opens a hole in the field with a linear falloff inside its radius, and a press fires a shock wave whose front tints the particles it is passing through. The pointer is damped on the CPU before it reaches a uniform, and bursts run in a pool of three slots so overlapping presses produce overlapping waves rather than one wave restarting.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

An orbiting particle field the pointer pushes out of the way, and a press detonates into a shock wave with a heat band.

- Category: cursor
- Runtime cost: webgl
- Dependencies: ogl@^1.0.11

## How it works

1. Three displacements are stacked in field space in the vertex shader before anything becomes a position: an idle orbit, cursor repulsion, then up to three shock waves. Each stage reads the position the previous one produced, so a particle already pushed aside by the cursor is the particle the wave throws.
2. All distances are measured in aspect-corrected space — x multiplied by `uResolution.x / uResolution.y` — and the resulting displacement is divided back out before it is added to the position. Without the correction the repulsion hole is an ellipse on any container that is not square, and the shock ring reaches the side edges before the top.
3. Repulsion is `max(radius - distance, 0) * repel`: linear inside the radius and exactly zero outside it, so the field beyond the pointer is untouched and the whole idea costs one `length()` per particle. A `smoothstep` would be softer but would also mean every particle on screen is permanently displaced a little, which reads as the field sagging toward the cursor.
4. The direction is `v / max(length(v), floor)` rather than `normalize(v)`. A true normalize is undefined at the origin and unstable just outside it, so the particle sitting under the cursor picks a new direction every frame from floating-point noise and buzzes. Dividing by a floor makes the vector shorter than unit length near the centre, so the push fades in and the direction stays put.
5. A burst slot is `vec4(originX, originY, progress, active)`. The displacement is `(0.25 + seed * 0.75) * push * easeOutCubic(t) * settle(t) * reach(d)`, where `settle` walks the whole thing back to zero by t = 1 so the slot can be freed without the field snapping home, and `reach` limits the throw to the neighbourhood of the origin so the burst is not a camera jolt.
6. The heat band is `exp(-b * b)` where `b = (distance - burstRadius * ease) / band`. The shock radius expands on the same cubic ease as the displacement, so only the particles the front is passing through right now take the tint. A flat tint over the whole burst just recolours the field; a Gaussian band travelling through it reads as heat.
7. Only `active` and `progress` change per frame per slot, so a burst costs three vec4 uniforms and a three-iteration loop — no per-particle CPU state and no buffer upload.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `smoothing = 0.0008`
  Fraction of the pointer gap still remaining after one second: a tight ~90ms tail, because a repulsion hole that lags is read as broken rather than as smooth — the hole has a visible edge, unlike a glow. Raise it past ~0.01 and the field is still opening where the cursor was half a second ago.
- `cursorRadius = 0.22`
  Field units, where 1 is the container HEIGHT. Roughly a fifth of the panel, so the hole is obviously deliberate but the field still dominates. Past ~0.45 the pointer clears most of the visible particles and there is nothing left to displace.
- `repel = 0.85`
  Displacement at the centre of the field, as a fraction of the radius. Below ~0.4 the hole never actually opens — particles crowd instead of clearing. Above 1.0 the inner particles are pushed past the rim and pile into a bright ring, which is the same artefact as a hard-edged mask.
- `BURST_SLOTS = 3`
  Concurrent waves. One slot means a second press restarts the wave from zero, which visibly sucks the first one back into its origin. Three covers a fast double or triple click, and each slot is a vec4 and a loop iteration, so the ceiling is set by taste rather than by cost.
- `burstDuration = 1.1`
  Seconds of life. Under ~0.6 the wave is gone before the eye finds it; over ~2 the field spends most of its time recovering and a second press lands in a field that is still deformed.
- `burstRadius / BURST_BAND = 0.55 / 0.085`
  How far the front travels, and how thick it is. The band is roughly 15% of the travel, which is a front rather than a wash — take it past ~0.25 and the Gaussian covers the whole burst at once, which is indistinguishable from tinting every particle.
- `burstPush = 0.17`
  Peak displacement in field units, multiplied by a per-particle 0.25-1.0. The spread is what gives the wave a ragged front; a uniform magnitude produces a clean expanding circle, which reads as a UI ripple rather than as a detonation.
- `MAX_DPR = 1.5`
  Additive fill is the entire cost here and it scales with the square of the ratio. These are soft round dots with no fine detail, so a third sample per axis resolves nothing a viewer can see and costs 78% more fragments.

## API

```ts
function CursorRepulsionBurst(props: { density?: number; maxCount?: number; sizeRange?: readonly [number, number]; cursorRadius?: number; repel?: number; burstPush?: number; burstRadius?: number; burstDuration?: number; smoothing?: number; breathe?: number; opacity?: number; colorA?: string; colorB?: string; heatColor?: string; background?: string; seed?: number | string; className?: string }): JSX.Element
```

- `density: number` — default `1100`
  Particles per megapixel of container area.
- `maxCount: number` — default `1400`
  Population ceiling, and the size the buffers are allocated at.
- `sizeRange: readonly [number, number]` — default `[1.6, 5.2]`
  Particle size in CSS pixels, biased toward the small end.
- `cursorRadius: number` — default `0.22`
  Repulsion radius in field units, where 1 is the container height.
- `repel: number` — default `0.85`
  Displacement at the centre of the repulsion field, as a fraction of its radius.
- `burstPush: number` — default `0.17`
  Peak burst displacement in field units, before the per-particle spread.
- `burstRadius: number` — default `0.55`
  How far a shock front travels before it dies.
- `burstDuration: number` — default `1.1`
  Life of one burst in seconds.
- `smoothing: number` — default `0.0008`
  Fraction of the pointer gap still remaining after one second.
- `breathe: number` — default `0.22`
  Depth of the orbit-radius breathing, 0 to 0.5.
- `opacity: number` — default `0.9`
  Overall alpha multiplier.
- `colorA: string` — default `'#8fb6ff'`
  First tint. Any value ogl's Color accepts.
- `colorB: string` — default `'#e6ecf7'`
  Second tint; each particle mixes between the two.
- `heatColor: string` — default `'#ff8a3c'`
  Colour of the shock front.
- `background: string` — default `'#06070b'`
  Opaque clear colour the additive field is composited onto.
- `seed: number | string` — default `'cursor-repulsion-burst'`
  Seeds the scatter, sizes, phases and burst magnitudes.
- `className: string`
  Merged onto the root container via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Floor on the population. Below this the field reads as a few stray specks. */
const MIN_COUNT = 220;
/** Slots in the burst pool. Three overlapping waves is the most anyone produces. */
const BURST_SLOTS = 3;
/** Width of the Gaussian heat band, in field units. */
const BURST_BAND = 0.085;
/** Fraction of the presence gap left after a second. ~200ms in and out. */
const PRESENCE_SMOOTHING = 0.007;
/** Size distribution exponent. Above 1 crowds the population into small sizes. */
const SIZE_BIAS = 1.8;
/**
 * Fill cost scales with dpr squared and these are soft round dots with no fine
 * detail, so a third sample per axis resolves nothing a viewer can see.
 */
const MAX_DPR = 1.5;
/** Field-space bounds. Wider than 0..1 so orbits never bare the edges. */
const HOME_MIN = -0.06;
const HOME_MAX = 1.06;

/** The reduced-motion still: a frozen frame with the pointer and one wave in it. */
const STILL_ELAPSED = 6.5;
const STILL_CURSOR: readonly [number, number] = [0.34, 0.56];
const STILL_BURST: readonly [number, number, number] = [0.66, 0.42, 0.42];

export function CursorRepulsionBurst({
  density = 1100,
  maxCount = 1400,
  sizeRange = [1.6, 5.2],
  cursorRadius = 0.22,
  repel = 0.85,
  burstPush = 0.17,
  burstRadius = 0.55,
  burstDuration = 1.1,
  smoothing = 0.0008,
  breathe = 0.22,
  opacity = 0.9,
  colorA = '#8fb6ff',
  colorB = '#e6ecf7',
  heatColor = '#ff8a3c',
  background = '#06070b',
  seed = 'cursor-repulsion-burst',
  className,
}: CursorRepulsionBurstProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const { width, height } = useResizeObserver(host);
  const size = useRef({ width, height });
  size.current = { width, height };

  const reduced = useReducedMotion();
  const visible = useVisibility();
  const { inView } = useInView(host, { rootMargin: '10%' });
  const ready = width > 1 && height > 1;

  const [minSize = 1.6, maxSize = 5.2] = sizeRange;

  /* Raw pointer target in field space, or null until a real move has happened —
     which is not the same as a pointer resting at the bottom-left corner. */
  const target = useRef<{ x: number; y: number } | null>(null);
  const inside = useRef(false);
  /** The damped follower, seeded at the centre so the first move eases outward. */
  const follow = useRef({ x: 0.5, y: 0.5 });
  const presence = useRef(0);

  const slots = useRef<BurstSlot[]>(
    Array.from({ length: BURST_SLOTS }, () => ({ x: 0.5, y: 0.5, t: 0, active: false })),
  );
  const nextSlot = useRef(0);

  /* Live numbers the loop reads. Changing one must not rebuild the renderer:
     Chromium drops the OLDEST WebGL context past roughly 16 per process, so a
     rebuild per prop change can blank an unrelated canvas elsewhere on the page. */
  const live = useRef({
    cursorRadius,
    repel,
    burstPush,
    burstRadius,
    burstDuration,
    smoothing,
    breathe,
    opacity,
  });
  live.current = {
    cursorRadius,
    repel,
    burstPush,
    burstRadius,
    burstDuration,
    smoothing,
    breathe,
    opacity,
  };

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    if (!hasWebGL()) {
      setUnsupported(true);
      return;
    }

    /* ogl creates its own canvas, and it is appended and removed per effect
       run. Reusing one React-owned canvas breaks under StrictMode: the first
       cleanup force-loses the context, and `getContext` on that same element
       afterwards returns the dead one rather than a fresh context — the panel
       is then permanently blank in development and fine in production. */
    const renderer = new Renderer({
      dpr: pixelRatio(MAX_DPR),
      // Opaque: the pass is additive, and additive onto a transparent canvas
      // would have to brighten the page behind it, which the GPU cannot see.
      alpha: false,
      // Nothing occludes anything, so a depth buffer is memory plus a clear.
      depth: false,
      antialias: false,
      // Fill-bound, not shader-bound. The discrete GPU buys nothing here.
      powerPreference: 'low-power',
    });

    const gl = renderer.gl;
    const canvas = gl.canvas;

    const bg = new Color(background);
    gl.clearColor(bg.r, bg.g, bg.b, 1);

    const quad = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);
    const index = new Uint16Array([0, 1, 2, 0, 2, 3]);

    const total = Math.max(MIN_COUNT, Math.round(maxCount));
    const homes = new Float32Array(total * 2);
    const params = new Float32Array(total * 4);
    const seeds = new Float32Array(total * 4);

    const rng = createRng(seed);
    const lo = Math.max(0.5, Math.min(minSize, maxSize));
    const hi = Math.max(lo + 0.25, Math.max(minSize, maxSize));

    for (let i = 0; i < total; i += 1) {
      homes[i * 2] = randRange(rng, HOME_MIN, HOME_MAX);
      homes[i * 2 + 1] = randRange(rng, HOME_MIN, HOME_MAX);

      // Biased small: a linear distribution puts a quarter of the population in
      // the largest quarter of the range, and the field reads as gravel.
      const sizeT = Math.pow(rng(), SIZE_BIAS);
      params[i * 4] = lo + (hi - lo) * sizeT;
      params[i * 4 + 1] = randRange(rng, 0.004, 0.03);
      // Signed rate with a floor on the magnitude: a particle orbiting at
      // 0.001 rad/s is a particle that is simply not moving.
      params[i * 4 + 2] = (rng() < 0.5 ? -1 : 1) * randRange(rng, 0.12, 0.46);
      // Bigger particles are dimmer, so total light stays roughly constant.
      params[i * 4 + 3] = 0.34 + 0.5 * (1 - sizeT);

      seeds[i * 4] = rng() * Math.PI * 2;
      // Burst magnitude. Per-particle, so the wave has a ragged front rather
      // than a clean expanding circle — a clean circle reads as a UI ripple.
      seeds[i * 4 + 1] = rng();
      seeds[i * 4 + 2] = randRange(rng, 0.35, 1);
      seeds[i * 4 + 3] = rng();
    }

    const geometry = new Geometry(gl, {
      index: { data: index },
      position: { size: 2, data: quad },
      aHome: { size: 2, data: homes, instanced: 1 },
      aParams: { size: 4, data: params, instanced: 1 },
      aSeed: { size: 4, data: seeds, instanced: 1 },
    });

    const uniforms: Uniforms = {
      uResolution: { value: [1, 1] },
      uPixelRatio: { value: renderer.dpr },
      uElapsed: { value: 0 },
      uCursor: { value: [0.5, 0.5] },
      uCursorPresence: { value: 0 },
      uCursorRadius: { value: cursorRadius },
      uRepel: { value: repel },
      uBreathe: { value: clamp(breathe, 0, 0.5) },
      uBursts: { value: new Array<number>(BURST_SLOTS * 4).fill(0) },
      uBurstRadius: { value: burstRadius },
      uBurstPush: { value: burstPush },
      uBurstBand: { value: BURST_BAND },
      uColorA: { value: new Color(colorA) },
      uColorB: { value: new Color(colorB) },
      uHeatColor: { value: new Color(heatColor) },
      uOpacity: { value: opacity },
    };

    const program = new Program(gl, {
      vertex: CURSOR_REPULSION_BURST_VERT,
      fragment: CURSOR_REPULSION_BURST_FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      // ogl culls BACK faces by default and the quad's winding is not
      // guaranteed to face the way the driver expects. A culled particle is
      // not dim — it is absent.
      cullFace: false,
    });
    // Additive, overriding the source-over that `transparent: true` selected.
    // Order independent, so a thousand overlapping instances need no sort,
    // which is what makes one draw call possible at all.
    program.setBlendFunc(gl.ONE, gl.ONE);

    const mesh = new Mesh(gl, { geometry, program });

    el.appendChild(canvas);
    canvas.style.display = 'block';

    /* Listeners on the CANVAS, not the window. A document-level handler
       outlives the renderer it was written for, and the rect it measures is not
       the rect being drawn into — after a scroll the hole sits at an offset
       from the cursor. Passive, because nothing here calls preventDefault and a
       non-passive move handler makes the compositor wait for JS on every event. */
    const toField = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return {
        x: (event.clientX - rect.left) / rect.width,
        // Flipped: field y is up, client y is down.
        y: 1 - (event.clientY - rect.top) / rect.height,
      };
    };

    const onMove = (event: PointerEvent) => {
      const point = toField(event);
      if (!point) return;
      target.current = point;
      inside.current = true;
    };

    const onDown = (event: PointerEvent) => {
      const point = toField(event);
      if (!point) return;
      // A press is also a position: on touch there is no hover, so without this
      // the wave would fire from wherever the pointer last happened to be.
      target.current = point;
      inside.current = true;

      const slot = slots.current[nextSlot.current % BURST_SLOTS];
      if (!slot) return;
      nextSlot.current = (nextSlot.current + 1) % BURST_SLOTS;
      slot.x = point.x;
      slot.y = point.y;
      slot.t = 0;
      slot.active = true;
    };

    const onLeave = () => {
      // Position is left where it is. Tweening it back to the centre drags a
      // visible furrow across the field on the way out.
      inside.current = false;
    };

    canvas.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerdown', onDown, { passive: true });
    canvas.addEventListener('pointerleave', onLeave, { passive: true });
    canvas.addEventListener('pointercancel', onLeave, { passive: true });

    const resize = (w: number, h: number) => {
      renderer.setSize(w, h);
      // `setSize` writes literal px into the canvas's inline style, which wins
      // over any class. Re-asserting percentages keeps it fluid between
      // resize notifications.
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
      uniforms.uPixelRatio.value = renderer.dpr;

      // Population from area, not a fixed number: the same density reads right
      // in a 320px card and a 2000px hero. The buffers already hold `total`
      // particles in scattered order, so a prefix of them is still spatially
      // even — no rebuild, no reallocation, no new GPU memory.
      const megapixels = (w * h) / 1_000_000;
      const count = clamp(Math.round(megapixels * density), MIN_COUNT, total);
      geometry.setInstancedCount(count);
    };

    const draw = (elapsed: number) => {
      uniforms.uElapsed.value = elapsed;
      renderer.render({ scene: mesh });
    };

    resize(size.current.width, size.current.height);
    stage.current = { renderer, geometry, program, mesh, uniforms, resize, draw };
    draw(0);

    // A context we are never told about losing leaves a permanently blank panel
    // and no fallback beneath it, so treat the loss as a machine that never had
    // WebGL. `preventDefault` is what buys the chance of a restore at all.
    const onLost = (event: Event): void => {
      event.preventDefault();
      setUnsupported(true);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      stage.current = null;
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointercancel', onLeave);
      // ogl has no `dispose()`: `remove()` on the geometry deletes its VAOs and
      // every buffer, `remove()` on the program deletes the shaders and the
      // program, and only then is the context worth handing back. Dropping the
      // context is the part that matters — the browser's per-process budget is
      // about sixteen, and a lost one takes an unrelated canvas with it.
      geometry.remove();
      program.remove();
      loseContext(gl);
      canvas.width = 0;
      canvas.height = 0;
      canvas.remove();
    };
  }, [ready, density, maxCount, minSize, maxSize, seed]);

  // Colours are pushed into the live uniforms rather than being effect deps, so
  // recolouring never costs a context.
  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    s.uniforms.uColorA.value.set(colorA);
    s.uniforms.uColorB.value.set(colorB);
    s.uniforms.uHeatColor.value.set(heatColor);
    const bg = new Color(background);
    s.renderer.gl.clearColor(bg.r, bg.g, bg.b, 1);
  }, [colorA, colorB, heatColor, background]);

  // Resize is its own effect: a reflow costs a `setSize` and an instanced-count
  // change, never a buffer rebuild.
  useEffect(() => {
    stage.current?.resize(width, height);
  }, [width, height]);

  useRaf(
    (dt, elapsed) => {
      const s = stage.current;
      if (!s) return;
      const cfg = live.current;

      const aim = target.current;
      if (aim) {
        follow.current.x = damp(follow.current.x, aim.x, cfg.smoothing, dt);
        follow.current.y = damp(follow.current.y, aim.y, cfg.smoothing, dt);
      }
      presence.current = damp(
        presence.current,
        inside.current && aim !== null ? 1 : 0,
        PRESENCE_SMOOTHING,
        dt,
      );

      // Bursts advance on wall-clock seconds, not on frames, so a wave lasts
      // `burstDuration` on a 30Hz phone and on a 144Hz monitor alike.
      const flat = s.uniforms.uBursts.value;
      const life = Math.max(cfg.burstDuration, 0.05);
      let i = 0;
      for (const slot of slots.current) {
        if (slot.active) {
          slot.t += dt / life;
          if (slot.t >= 1) {
            slot.t = 1;
            slot.active = false;
          }
        }
        flat[i * 4] = slot.x;
        flat[i * 4 + 1] = slot.y;
        flat[i * 4 + 2] = slot.t;
        flat[i * 4 + 3] = slot.active ? 1 : 0;
        i += 1;
      }

      const u = s.uniforms;
      // Mutated in place. Assigning a fresh tuple allocates two arrays a frame
      // and defeats ogl's redundant-uniform cache, which compares by length
      // first and then element by element against the array it kept.
      u.uCursor.value[0] = follow.current.x;
      u.uCursor.value[1] = follow.current.y;
      u.uCursorPresence.value = presence.current;
      u.uCursorRadius.value = cfg.cursorRadius;
      u.uRepel.value = cfg.repel;
      u.uBurstPush.value = cfg.burstPush;
      u.uBurstRadius.value = cfg.burstRadius;
      u.uBreathe.value = clamp(cfg.breathe, 0, 0.5);
      u.uOpacity.value = cfg.opacity;

      s.draw(elapsed);
    },
    ready && inView && visible && !reduced && !unsupported,
  );

  /* Reduced motion is a composed still, not an empty box: one frame with the
     pointer parked off-centre and a single wave frozen part-way out, so the
     panel shows what the effect produces. The listeners stay attached and their
     target is never consumed, so moving or clicking changes nothing. */
  useEffect(() => {
    const s = stage.current;
    if (!s || !reduced || !ready) return;
    const [cx = 0.34, cy = 0.56] = STILL_CURSOR;
    const [bx = 0.66, by = 0.42, bt = 0.42] = STILL_BURST;
    s.uniforms.uCursor.value[0] = cx;
    s.uniforms.uCursor.value[1] = cy;
    s.uniforms.uCursorPresence.value = 1;
    const flat = s.uniforms.uBursts.value;
    flat.fill(0);
    flat[0] = bx;
    flat[1] = by;
    flat[2] = bt;
    flat[3] = 1;
    s.draw(STILL_ELAPSED);
  }, [reduced, ready, width, height]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes the four pointer listeners from the canvas, nulls the stage ref so an in-flight frame cannot touch a dead renderer, then `geometry.remove()` (deletes the VAOs and every buffer), `program.remove()` (deletes the shaders and the program), `loseContext(gl)`, zeroes the canvas dimensions and removes it from the DOM. ogl has no `dispose()`, and dropping the context is the part that matters — the per-process budget is about sixteen, and exceeding it kills the oldest context, which belongs to somebody else.

**Reduced motion.** The render loop never starts. One frame is drawn with the pointer parked at (0.34, 0.56) at full presence and a single wave frozen 42% of the way out, so the panel is a composed still of the effect rather than a static dot field. The listeners stay attached but their target is never consumed, so moving or pressing changes nothing on screen.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Writing pointer events straight into `uCursor`. The hole lands exactly where the last event was: a high-rate trackpad delivers a staircase, and after a stalled frame it is a jump that shoves the whole field sideways in one step. The listener records a target and the loop damps toward it.
- Damping with a per-frame constant (`x += (t - x) * 0.1`) instead of `damp(..., dt)`. The same code produces a noticeably tighter follow at 120Hz than at 60Hz, so the effect is tuned for whatever machine it was written on.
- Using `normalize()` for the repulsion direction. It is undefined at the origin, so the particle under the cursor jitters between random directions every frame — a visible buzzing speck exactly where the eye is.
- Aspect-correcting the distances but not dividing the displacement back out. Particles are then pushed further horizontally than vertically, and the hole slowly shears the field sideways as the pointer moves.
- Restarting one burst slot on every press. The in-flight wave is yanked back to its origin before the new one starts, which looks like a rendering fault rather than a second click. Three round-robin slots let waves overlap.
- Advancing burst progress per frame instead of by `dt / duration`. The wave is then twice as fast on a 120Hz display and half speed on a throttled tab.
- Deactivating a slot while its displacement is still non-zero. Every particle in it snaps home on one frame. The magnitude is multiplied by a settle term that reaches zero exactly when the slot expires.
- Handing ogl a Float32Array for `uniform vec4 uBursts[3]`. ogl resolves the active uniform name `uBursts[0]`, checks `Array.isArray(value)` to decide it is an array uniform, and a Float32Array fails that test — the uniform is silently skipped with a console warning and every burst is invisible. It must be a plain array.
- Leaving ogl's default BACK-face culling on. The quad winding is not guaranteed to face the way the driver expects, and a culled particle is not dim, it is absent — so the field renders empty on some machines and fine on others.
- Owning the canvas in React while calling `loseContext()` on cleanup. Under `reactStrictMode` the effect runs twice and the second `getContext` on that element hands back the dead context: blank in development, fine in production.
- Rebuilding the renderer when a colour changes. Chromium drops the oldest WebGL context past roughly sixteen per process, so recolouring one field can blank a different canvas on the same page. Colours are written into live uniforms.

## Notes

- `pointerdown` sets the pointer target as well as firing the wave. On touch there is no hover, so without it the burst would originate from wherever the pointer last happened to be — usually the previous tap.
- Blending is additive with an opaque clear colour, so a thousand overlapping instances need no depth sort and the whole field is one draw call. The fragment output is premultiplied because the destination is only ever added to.
- The population is derived from container area rather than fixed, and selected with `setInstancedCount` out of buffers allocated once at `maxCount`. Resizing changes the count without touching a byte of GPU memory.
- The scatter runs on `createRng(seed)`, never `Math.random()`, so the field is identical on every load and a visual regression is a real regression.
- Particles inside the repulsion radius also brighten, which stops the hole reading as a bald patch — the field gets denser and hotter at the rim instead.

## Definition of done

The field drifts on its own with no pointer on the page. Move the pointer in and a clear hole opens around it, tracking with a short even lag that is the same on a 60Hz and a 120Hz display, with the rim slightly brighter than the rest of the field. The particle directly under the cursor does not jitter. Press and a wave throws the nearby particles outward with a ragged front, a warm band travelling through them, and they drift back without snapping. Press three times quickly and you get three overlapping waves, not one wave restarting. Leave the panel and the hole closes where it stands. Resize to a wide container and the hole is still round. With reduced motion the panel is a single composed still.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
