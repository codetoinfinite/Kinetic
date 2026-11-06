# Build: Superellipse Text Avoidance

The headline is real DOM on top of an instanced particle field, and the field is pushed out of a 6-norm superellipse fitted to the headline's measured rect. Interior particles are remapped into a band hugging the shape rather than clamped onto it, so the hole has a bright rim instead of a pile-up. The same avoidance function runs a second time at exponent 2 for the damped pointer, because a disc is a superellipse with a lower exponent.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A particle field that flows around the headline, held off by a 6-norm superellipse fitted to the measured text box.

- Category: webgl
- Runtime cost: webgl
- Dependencies: ogl@^1.0.11

## How it works

1. The avoidance region is `pow(pow(|nx|, e) + pow(|ny|, e), 1/e) < 1` in the rect's own normalised space. At e = 2 that is an ellipse, at e = 6 a squircle, at e = 20 effectively a box. Six is the useful one: a circle around a wide headline clears a large empty halo past the ends of the line, and a box has four corner discontinuities that crease the field along straight lines.
2. Interior radii are REMAPPED, not clamped. `mapped = 1 + whip * min(r, 1 + whip) / (1 + whip) + max(r - (1 + whip), 0)` compresses [0, 1 + whip] into [1, 1 + whip] and is the identity beyond it. Clamping instead maps a whole area onto a curve, so every interior particle lands on the outline and the shape is drawn as one infinitely dense line with an empty interior behind it.
3. The displacement is `half * (n / max(r, 1e-3)) * (mapped - r)` — divided by a floor rather than normalized. A particle at the exact centre has no direction and `normalize()` returns NaN there, which propagates into `gl_Position` and drops the whole instance rather than one component. A lattice puts particles exactly on both axes on the first frame, so this case is reached immediately, not never.
4. `pow()` is undefined for a negative base and for zero raised to a non-positive power, and a symmetric field hits both. The norm takes `abs()` first and adds 1e-5, which costs nothing and removes an entire class of driver-dependent black frames.
5. The rect is measured, never passed in. `getBoundingClientRect()` on the text node and on the host produce four uv numbers; a ResizeObserver on the text node plus `document.fonts.ready` keeps them in step through a rewrap, a font swap and a container resize. A hand-tuned rect is wrong on the first webfont load and wrong again on the first narrow viewport.
6. The text rect is deliberately NOT aspect-corrected, because it was measured in element space and has to stay there or it stops agreeing with the letters. The pointer disc IS aspect-corrected, because it is a shape in screen space and an uncorrected one is a visible ellipse on any non-square container. The two live in the same shader and want opposite treatment.
7. Displaced particles brighten and grow slightly, tinted toward a third colour. Without it the field is just a hole and the exponent is invisible; with it the squircle is legible as a rim, which is the only on-screen evidence that the shape is not a box.
8. The scatter is a jittered lattice, then shuffled. Uniform random has clumps and voids at this population, and once the avoidance opens a real hole the accidental voids read as more holes. The shuffle matters because the instanced count is a prefix of the buffers — in lattice order a smaller count would draw only the top rows.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `exponent = 6`
  The p-norm. Below ~4 the shape is round enough that the clear zone bulges past the ends of the line; above ~10 the corners are sharp enough to crease the field visibly, which is the axis-aligned-box failure the superellipse exists to avoid.
- `WHIP_DISC = 0.3`
  Width of the band the interior is compressed into, in normalised units — the whole feel of the effect. Small values whip particles out hard and stack them into a bright outline; past ~0.6 the field bends around from so far away that the text no longer reads as the cause.
- `margin = 0.06`
  Clear ring around the text, in units of container HEIGHT, divided by the aspect ratio for x so the gap is the same number of pixels on all four sides. Adding one uv figure to both halves pads a wide container far more at the ends of the line than above it.
- `pointerRadius / pointerWhip = 0.16 / 0.45`
  The second field, at exponent 2. Softer than the text rect on purpose: the pointer is a passing influence and a hard-edged hole following the cursor competes with the headline it is supposed to frame.
- `smoothing = 0.0008`
  Fraction of the pointer gap still remaining after one second — an ~90ms tail. The pointer hole has a visible edge, unlike a glow, so lag reads as broken rather than as smooth.
- `CELL_JITTER = 0.42`
  Displacement inside a lattice cell, as a fraction of the cell. Zero is a visible grid; past ~0.5 neighbouring cells overlap and the stratification that made the scatter even in the first place is gone.
- `density = 900`
  Particles per megapixel, so the same value reads right in a 320px card and a 2000px hero. Too sparse and the rim is a dotted line rather than a shape.
- `MAX_DPR = 1.5`
  Additive fill is the whole cost and it scales with the square of the ratio. These are soft round dots with no fine detail, so a third sample per axis resolves nothing and costs 78% more fragments.

## API

```ts
function SuperellipseTextAvoidance(props: { children?: ReactNode; density?: number; maxCount?: number; sizeRange?: readonly [number, number]; exponent?: number; margin?: number; whip?: number; pointerRadius?: number; pointerWhip?: number; smoothing?: number; opacity?: number; colorA?: string; colorB?: string; glowColor?: string; background?: string; seed?: number | string; className?: string; textClassName?: string }): JSX.Element
```

- `children: ReactNode`
  The headline. Rendered above the field and measured for the avoidance rect.
- `density: number` — default `900`
  Particles per megapixel of container area.
- `maxCount: number` — default `1600`
  Population ceiling, and the size the buffers are allocated at.
- `sizeRange: readonly [number, number]` — default `[1.4, 4.4]`
  Particle size in CSS pixels, biased toward the small end.
- `exponent: number` — default `6`
  Superellipse exponent. 2 is a circle, 6 a squircle, high values a box.
- `margin: number` — default `0.06`
  Clear ring around the text, in units of container height.
- `whip: number` — default `0.3`
  Width of the band the interior is compressed into.
- `pointerRadius: number` — default `0.16`
  Pointer avoidance radius in container-height units. 0 disables it.
- `pointerWhip: number` — default `0.45`
  Whip band for the pointer disc.
- `smoothing: number` — default `0.0008`
  Fraction of the pointer gap still remaining after one second.
- `opacity: number` — default `0.92`
  Overall alpha multiplier.
- `colorA: string` — default `'#9ec6ff'`
  First tint. Any value ogl's Color accepts.
- `colorB: string` — default `'#eef2fb'`
  Second tint; each particle mixes between the two.
- `glowColor: string` — default `'#ffd9a0'`
  Tint for displaced particles, which is what makes the shape legible.
- `background: string` — default `'#07080d'`
  Opaque clear colour the additive field is composited onto.
- `seed: number | string` — default `'superellipse-text-avoidance'`
  Seeds the lattice jitter, sizes, phases and tints.
- `className: string`
  Merged onto the root container via `cn`.
- `textClassName: string`
  Merged onto the measured text layer.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Floor on the population. Below this the field reads as a few stray specks. */
const MIN_COUNT = 260;
/**
 * Width of the band interior particles are compressed into, in normalised
 * superellipse units. The catalogue's WHIP_DISC. Small values throw particles
 * out hard and stack them on the outline; large ones bend the field around from
 * a distance and the text stops looking like the cause.
 */
const WHIP_DISC = 0.3;
/** Fraction of the presence gap left after a second. ~200ms in and out. */
const PRESENCE_SMOOTHING = 0.007;
/** Size distribution exponent. Above 1 crowds the population into small sizes. */
const SIZE_BIAS = 1.7;
/** Fill scales with dpr squared, and these are soft dots with no fine detail. */
const MAX_DPR = 1.5;
/** Lattice bounds. Wider than 0..1 so drift never bares the edges. */
const HOME_MIN = -0.05;
const HOME_MAX = 1.05;
/** Jitter as a fraction of a lattice cell. Past ~0.5 cells overlap and clump. */
const CELL_JITTER = 0.42;
/** The reduced-motion still: one frame with the pointer parked off to one side. */
const STILL_ELAPSED = 4.2;
const STILL_POINTER: readonly [number, number] = [0.3, 0.34];

export function SuperellipseTextAvoidance({
  children,
  density = 900,
  maxCount = 1600,
  sizeRange = [1.4, 4.4],
  exponent = 6,
  margin = 0.06,
  whip = WHIP_DISC,
  pointerRadius = 0.16,
  pointerWhip = 0.45,
  smoothing = 0.0008,
  opacity = 0.92,
  colorA = '#9ec6ff',
  colorB = '#eef2fb',
  glowColor = '#ffd9a0',
  background = '#07080d',
  seed = 'superellipse-text-avoidance',
  className,
  textClassName,
}: SuperellipseTextAvoidanceProps) {
  const host = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const { width, height } = useResizeObserver(host);
  const textSize = useResizeObserver(text);
  const size = useRef({ width, height });
  size.current = { width, height };

  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const visible = useVisibility();
  const { inView } = useInView(host, { rootMargin: '10%' });
  const ready = width > 1 && height > 1;

  const [minSize = 1.4, maxSize = 4.4] = sizeRange;

  /* Raw pointer target in field space, or null until a real move — which is not
     the same as a pointer resting at the bottom-left corner. */
  const target = useRef<{ x: number; y: number } | null>(null);
  const inside = useRef(false);
  const follow = useRef({ x: 0.5, y: 0.5 });
  const presence = useRef(0);

  /* Live numbers the loop reads. Changing one must not rebuild the renderer:
     Chromium drops the OLDEST WebGL context past roughly 16 per process, so a
     rebuild per prop change can blank an unrelated canvas on the same page. */
  const live = useRef({ exponent, margin, whip, pointerRadius, pointerWhip, smoothing, opacity });
  live.current = { exponent, margin, whip, pointerRadius, pointerWhip, smoothing, opacity };

  /**
   * Reads the text box out of the DOM and writes it into `uRect` as uv centre
   * plus padded half-extents. No React state: a measurement that re-renders is
   * a measurement that can re-measure itself in a loop.
   */
  const measure = () => {
    const s = stage.current;
    const hostEl = host.current;
    const textEl = text.current;
    if (!s || !hostEl || !textEl) return;

    const hostBox = hostEl.getBoundingClientRect();
    if (hostBox.width < 1 || hostBox.height < 1) return;
    const textBox = textEl.getBoundingClientRect();

    if (textBox.width < 1 || textBox.height < 1) {
      // No children, or the text has not laid out yet. Presence 0 rather than a
      // zero-size rect, which would be a singularity at the centre of the field.
      s.uniforms.uRectPresence.value = 0;
      return;
    }

    const aspect = hostBox.width / hostBox.height;
    /* The margin is specified in HEIGHT units and divided by the aspect ratio
       for x, so the clear ring is the same number of pixels on all four sides.
       Adding the same uv figure to both halves pads a wide container far more
       at the ends of the line than above and below it. */
    const padX = live.current.margin / Math.max(aspect, 0.0001);
    const padY = live.current.margin;

    s.uniforms.uRect.value[0] = (textBox.left - hostBox.left + textBox.width * 0.5) / hostBox.width;
    // Flipped: field y is up, client y is down.
    s.uniforms.uRect.value[1] =
      1 - (textBox.top - hostBox.top + textBox.height * 0.5) / hostBox.height;
    s.uniforms.uRect.value[2] = textBox.width * 0.5 / hostBox.width + padX;
    s.uniforms.uRect.value[3] = textBox.height * 0.5 / hostBox.height + padY;
    s.uniforms.uRectPresence.value = 1;

    // The live loop picks this up next frame; a paused one has to be told.
    if (reducedRef.current) s.draw(STILL_ELAPSED);
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
       cleanup force-loses the context, and `getContext` on that element
       afterwards hands back the dead one rather than a fresh context — the
       panel is then permanently blank in development and fine in production. */
    const renderer = new Renderer({
      dpr: pixelRatio(MAX_DPR),
      // Opaque: the pass is additive, and additive onto a transparent canvas
      // would have to brighten the page behind it, which the GPU cannot see.
      alpha: false,
      // Nothing occludes anything, so a depth buffer is memory plus a clear.
      depth: false,
      antialias: false,
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

    /* A STRATIFIED scatter, not `rng()` twice. Uniform random has clumps and
       voids at this population, and once the avoidance opens a real hole those
       accidental voids read as more holes — the shape of the field stops being
       legible. A jittered lattice is even everywhere and still looks organic.
       Cells are then SHUFFLED, because the instanced count is a prefix of these
       buffers: in lattice order a smaller count would draw the top rows only. */
    const aspect = Math.max(size.current.width, 1) / Math.max(size.current.height, 1);
    const cols = Math.max(2, Math.round(Math.sqrt(total * aspect)));
    const rows = Math.max(2, Math.ceil(total / cols));
    const cells: Array<[number, number]> = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        cells.push([(c + 0.5) / cols, (r + 0.5) / rows]);
      }
    }
    shuffle(rng, cells);

    const spanX = HOME_MAX - HOME_MIN;
    const spanY = HOME_MAX - HOME_MIN;

    for (let i = 0; i < total; i += 1) {
      const cell = cells[i % cells.length] ?? [0.5, 0.5];
      const [cellX = 0.5, cellY = 0.5] = cell;
      homes[i * 2] = HOME_MIN + (cellX + randRange(rng, -CELL_JITTER, CELL_JITTER) / cols) * spanX;
      homes[i * 2 + 1] =
        HOME_MIN + (cellY + randRange(rng, -CELL_JITTER, CELL_JITTER) / rows) * spanY;

      // Biased small: a linear distribution puts a quarter of the population in
      // the largest quarter of the range and the field reads as gravel.
      const sizeT = Math.pow(rng(), SIZE_BIAS);
      params[i * 4] = Math.max(0.5, minSize) + Math.max(maxSize - minSize, 0.25) * sizeT;
      // Drift radius and rate. Small, because this field is a texture the text
      // sits in — a fast one competes with the headline for attention.
      params[i * 4 + 1] = randRange(rng, 0.002, 0.014);
      params[i * 4 + 2] = (rng() < 0.5 ? -1 : 1) * randRange(rng, 0.08, 0.32);
      // Bigger particles are dimmer, so total light stays roughly constant.
      params[i * 4 + 3] = 0.32 + 0.5 * (1 - sizeT);

      seeds[i * 4] = rng() * Math.PI * 2;
      seeds[i * 4 + 1] = randRange(rng, 0.3, 1);
      seeds[i * 4 + 2] = rng();
      seeds[i * 4 + 3] = 0;
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
      uRect: { value: [0.5, 0.5, 0.001, 0.001] },
      uRectPresence: { value: 0 },
      uExponent: { value: clamp(exponent, 2, 16) },
      uWhip: { value: Math.max(whip, 0.02) },
      uPointer: { value: [0.5, 0.5] },
      uPointerPresence: { value: 0 },
      uPointerRadius: { value: Math.max(pointerRadius, 0) },
      uPointerWhip: { value: Math.max(pointerWhip, 0.02) },
      uColorA: { value: new Color(colorA) },
      uColorB: { value: new Color(colorB) },
      uGlowColor: { value: new Color(glowColor) },
      uOpacity: { value: opacity },
    };

    const program = new Program(gl, {
      vertex: SUPERELLIPSE_TEXT_AVOIDANCE_VERT,
      fragment: SUPERELLIPSE_TEXT_AVOIDANCE_FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      // ogl culls BACK faces by default and the quad's winding is not
      // guaranteed to face the way the driver expects. A culled particle is not
      // dim — it is absent.
      cullFace: false,
    });
    // Additive, overriding the source-over that `transparent: true` selected.
    // Order independent, so a thousand overlapping instances need no sort.
    program.setBlendFunc(gl.ONE, gl.ONE);

    const mesh = new Mesh(gl, { geometry, program });

    el.insertBefore(canvas, el.firstChild);
    canvas.style.display = 'block';

    /* Listeners on the CANVAS, not the window. A document-level handler
       outlives the renderer it was written for, and the rect it measures is not
       the rect being drawn into — after a scroll the hole sits at an offset
       from the cursor. Passive, because nothing here calls preventDefault and a
       non-passive move handler makes the compositor wait for JS on every event. */
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      target.current = {
        x: (event.clientX - rect.left) / rect.width,
        y: 1 - (event.clientY - rect.top) / rect.height,
      };
      inside.current = true;
    };
    const onLeave = () => {
      // Position is left where it is. Tweening it back to the centre drags a
      // visible furrow across the field on the way out.
      inside.current = false;
    };

    canvas.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerleave', onLeave, { passive: true });
    canvas.addEventListener('pointercancel', onLeave, { passive: true });

    const resize = (w: number, h: number) => {
      renderer.setSize(w, h);
      // `setSize` writes literal px into the canvas's inline style, which wins
      // over any class. Re-asserting percentages keeps it fluid between resize
      // notifications.
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
      uniforms.uPixelRatio.value = renderer.dpr;

      // Population from area, not a fixed number: the same density reads right
      // in a 320px card and a 2000px hero. The buffers already hold `total`
      // particles in shuffled order, so a prefix of them is still spatially
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
    measure();
    draw(0);

    /* A webfont swap changes the text box after the first measurement, and
       nothing about a font swap resizes the element's border box on every
       engine — so the ResizeObserver alone is not enough. */
    let cancelled = false;
    if (typeof document !== 'undefined' && 'fonts' in document) {
      void document.fonts.ready.then(() => {
        if (!cancelled) measure();
      });
    }

    // Nothing repaints a lost context of its own accord: unhandled, the panel
    // sits blank behind the text indefinitely with no fallback, so the loss is
    // folded into the unsupported path. `preventDefault` keeps a restore legal.
    const onLost = (event: Event): void => {
      event.preventDefault();
      setUnsupported(true);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      cancelled = true;
      stage.current = null;
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointercancel', onLeave);
      // ogl has no `dispose()`: `remove()` on the geometry deletes its VAOs and
      // every buffer, `remove()` on the program deletes the shaders and the
      // program, and only then is the context worth handing back. Dropping the
      // context is the part that matters — the per-process budget is about
      // sixteen, and exceeding it kills someone else's oldest context.
      geometry.remove();
      program.remove();
      loseContext(gl);
      canvas.width = 0;
      canvas.height = 0;
      canvas.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, density, maxCount, minSize, maxSize, seed]);

  // Colours go into the live uniforms rather than being effect deps, so
  // recolouring never costs a context.
  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    s.uniforms.uColorA.value.set(colorA);
    s.uniforms.uColorB.value.set(colorB);
    s.uniforms.uGlowColor.value.set(glowColor);
    const bg = new Color(background);
    s.renderer.gl.clearColor(bg.r, bg.g, bg.b, 1);
  }, [colorA, colorB, glowColor, background]);

  // Resize is its own effect: a reflow costs a `setSize`, an instanced-count
  // change and a re-measure, never a buffer rebuild.
  useEffect(() => {
    stage.current?.resize(width, height);
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  // The text box changes on its own too — wrapping to a new line, a font swap,
  // or different children entirely.
  useEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textSize.width, textSize.height, margin, children]);

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

      const u = s.uniforms;
      // Mutated in place. Assigning a fresh tuple allocates an array a frame and
      // defeats ogl's redundant-uniform cache, which compares by length first
      // and then element by element against the array it kept.
      u.uPointer.value[0] = follow.current.x;
      u.uPointer.value[1] = follow.current.y;
      u.uPointerPresence.value = presence.current;
      u.uPointerRadius.value = Math.max(cfg.pointerRadius, 0);
      u.uPointerWhip.value = Math.max(cfg.pointerWhip, 0.02);
      u.uExponent.value = clamp(cfg.exponent, 2, 16);
      u.uWhip.value = Math.max(cfg.whip, 0.02);
      u.uOpacity.value = cfg.opacity;

      s.draw(elapsed);
    },
    ready && inView && visible && !reduced && !unsupported,
  );

  /* Reduced motion is a composed still, not an empty box: one frame with the
     text rect fully avoided and the pointer parked off to one side, so the
     shape of the field is exactly what a moving version would show. The
     listeners stay attached and their target is never consumed. */
  useEffect(() => {
    const s = stage.current;
    if (!s || !reduced || !ready) return;
    const [px = 0.3, py = 0.34] = STILL_POINTER;
    s.uniforms.uPointer.value[0] = px;
    s.uniforms.uPointer.value[1] = py;
    s.uniforms.uPointerPresence.value = 1;
    s.draw(STILL_ELAPSED);
  }, [reduced, ready, width, height]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes the three pointer listeners from the canvas, cancels the pending `document.fonts.ready` callback with a flag, nulls the stage ref so an in-flight frame cannot touch a dead renderer, then `geometry.remove()` (deletes the VAOs and every buffer), `program.remove()` (deletes the shaders and the program), `loseContext(gl)`, zeroes the canvas dimensions and removes it from the DOM. ogl has no `dispose()`, and dropping the context is the part that matters — the per-process budget is about sixteen, and exceeding it kills the oldest, which belongs to someone else.

**Reduced motion.** The loop never starts. One frame is drawn with the text rect fully avoided and the pointer parked off to one side at full presence, so the still shows exactly the shape a moving version produces — the drift is the only thing lost. Re-measuring after a font swap redraws that single frame rather than starting a loop. The listeners stay attached but their target is never consumed.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Using `normalize()` for the push direction. It is NaN at the origin, and NaN in `gl_Position` discards the entire primitive — so the bug looks like missing particles, not like a maths error.
- `pow()` with a negative base or a zero base. Both are undefined in GLSL, both are reached on the axes of a symmetric field, and the result is driver-dependent: fine on the machine it was written on, black on someone else's.
- Clamping interior particles onto the shell instead of remapping their radius. Every particle inside lands exactly on the outline, so the shape is one dense curve with a dead interior behind it — visibly a stencil rather than a field flowing around something.
- Hard-coding the text rect, or deriving it from a character count. It is wrong the moment a webfont swaps, the line rewraps, or the container narrows, and the hole drifts off the words while still looking deliberate.
- Relying on the ResizeObserver alone for the text box. A font swap does not necessarily change the element's border box on every engine, so the measurement has to be repeated after `document.fonts.ready` as well.
- Aspect-correcting the text rect. It was measured in element space; correcting it clears a region visibly narrower than the headline on a wide container, which is worse than not avoiding at all.
- Forgetting to aspect-correct the POINTER disc. Exactly the opposite case — a screen-space shape left uncorrected is an obvious ellipse on anything but a square container.
- Writing pointer events straight into `uPointer`. A high-rate trackpad delivers a staircase, and after a stalled frame it is a jump that drags the hole across the field in one step. The listener records a target; the loop damps toward it.
- Damping with a per-frame constant (`x += (t - x) * 0.1`) instead of `damp(..., dt)`. The follow is visibly tighter at 120Hz than at 60Hz, so the feel is tuned to whichever display it was authored on.
- Scattering with `rng()` twice. The clumps and voids of a uniform random field are indistinguishable from more avoidance holes once the real one exists. A jittered lattice, shuffled so the instanced-count prefix is still spatially even, costs the same.
- Leaving ogl's default BACK-face culling on. The quad winding is not guaranteed to face the way the driver expects, and a culled particle is not dim — it is absent, so the field renders empty on some machines and fine on others.
- Owning the canvas in React while calling `loseContext()` on cleanup. Under `reactStrictMode` the effect runs twice and the second `getContext` on that element returns the dead context: blank in development, fine in production.
- Letting the text layer swallow pointer events. It sits above the canvas, so without `pointer-events: none` the pointer hole disappears whenever the cursor crosses the headline — precisely where the effect is most visible.
- Re-measuring through React state. A measurement that triggers a render can trigger another measurement; the rect is written straight into the uniform instead.

## Notes

- `children` is the headline and is rendered as real DOM above the field, so it is selectable, searchable and styled with ordinary classes. The component only reads its box.
- The text layer is `pointer-events: none` so the canvas underneath keeps receiving moves. Anything interactive belongs outside it.
- The same `avoid()` function serves both fields; the pointer is just exponent 2 with a wider whip. Adding a third avoided region is one more call, not one more code path.
- Blending is additive with an opaque clear colour, so a thousand overlapping instances need no depth sort and the whole field is one draw call. The fragment output is premultiplied because the destination is only ever added to.
- Population is derived from container area and selected with `setInstancedCount` out of buffers allocated once at `maxCount`, so a resize changes the count without touching GPU memory.
- The scatter runs on `createRng(seed)`, never `Math.random()`, so the field is identical on every load and a visual regression is a real regression.

## Definition of done

The headline sits in a clear zone whose shape is a squircle, not a circle and not a rectangle: the gap above and below the line is the same as the gap at its ends, and the corners are rounded without being round. A brighter rim traces that shape. Resize the container until the headline rewraps to two lines — the clear zone re-fits within a frame, with no visible sweep from the old rect. Move the pointer in and a second, softer hole follows it with a short even lag that is identical on a 60Hz and a 120Hz display; the hole stays circular on a wide container and does not disappear when the pointer crosses the headline. No particle sits inside the clear zone and none pile into a single dense outline. Reload twice: the field is identical. With reduced motion the panel is one composed still with the same shape.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
