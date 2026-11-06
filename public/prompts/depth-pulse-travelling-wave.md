# Build: Depth Fade And Travelling Pulse

A lattice of dots bent around a shallow arc and lit by a pulse that travels across it. Depth is faked entirely from model-space z, which drives alpha and point size at the same time, so the arc reads as curved with no depth buffer and no perspective camera. The pulse is a cosine whose phase varies per column, and its crest also pushes dots toward the viewer, so the two techniques compound: the wave arrives as a moving band of brighter, larger dots.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A dot lattice on an arc: z drives alpha and point size together, and a per-column phase sweeps the pulse across the field.

- Category: webgl
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. Columns are placed by angle across `arcSpan`, then z is renormalised so the centre column lands at exactly `+arcDepth` and both edges at `-arcDepth`, independent of the span. Without that renormalisation the usable z range shrinks with the span and the depth cue silently weakens whenever the arc is flattened.
2. The depth cue is `depthT = clamp((z + 0.55) / 1.1, 0, 1)`, which drives alpha from 0.25 to 1.0 *and* point size from 0.65 to 1.0. Both together are the point: alpha alone reads as a grey copy of the near dots, size alone reads as a resolution change, and only the pair reads as distance.
3. The pulse is `raw = 0.65 + 0.35 * cos(2π * (uElapsed / pulseCycle - phase))`, with `phase = columnT * waveTurns + rowT * 0.12` baked into an attribute. Subtracting the phase inside the cosine is what makes the crest move *along* the lattice rather than the whole field breathing in unison.
4. The crest, renormalised to 0..1, is added to z as `p.z += crest * uWaveDepth`, so the wave feeds the depth cue. A dot at the crest is pushed nearer, and the depth fade then brightens and enlarges it — one displacement drives three visible changes.
5. The pulse ramps in over the first second (`clamp(uElapsed / 1.0, 0, 1)`), so the first frame does not land on an arbitrary point of the cosine and flash. Yaw is `sin(elapsed * yawSpeed * 2π) * yawAmplitude` degrees, applied in the shader after the wave so the lattice rocks through its own depth range.
6. `gl_PointSize` is clamped to a 2px floor and alpha is compensated by `unclamped² / clamped²`, so the field keeps the same apparent density at DPR 1 and DPR 2 instead of getting heavier on retina.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `PULSE_BASE / PULSE_SWING = 0.65 / 0.35`
  The pulse rides between 0.30 and 1.00 of nominal size and alpha. A trough at 0 would make dots vanish entirely and the lattice would look like it is dropping frames rather than breathing.
- `DEFAULT_CYCLE / pulseCycle = 3.0 seconds`
  Under ~2s the crest outruns the eye following it across the lattice; over ~5s it stops reading as a wave and becomes an idle shimmer.
- `INTRO_SECONDS = 1.0`
  Ramps the pulse amplitude from 0. Without it the first rendered frame samples the cosine at an arbitrary phase and the whole field flashes on mount.
- `DEPTH_HALF_RANGE = 0.55`
  The arc spans ±0.34 and the wave adds up to +0.18, so normalising over ±0.55 leaves headroom at both ends — no dot sits at exactly 0 or 1 and the falloff never visibly clips.
- `DEPTH_MIN_SIZE / DEPTH_MAX_SIZE = 0.65 / 1.0`
  Far dots at 65% of near ones. Paired with the 0.25→1.0 alpha ramp; either cue on its own is ambiguous, and this ratio is the smallest that still reads as depth at preview-card sizes.
- `waveTurns = 1.4`
  Wavelengths visible across the lattice at any instant. At 1 the crest and trough sit at opposite edges and it reads as a tilt; past ~2.5 the bands are too narrow to track and the field just shimmers.
- `ROW_PHASE_LEAN = 0.12`
  Small row contribution to the phase, so the crest leans instead of arriving as a perfectly vertical bar. Bigger than ~0.3 and the wave starts reading as diagonal stripes.
- `yawAmplitude / yawSpeed = 16 degrees / 0.25 Hz`
  The lattice rocks rather than spins. A full rotation would carry columns through the arc's entire depth range and destroy the near/far reading the crest depends on.
- `crest tint threshold = smoothstep(0.65, 1.0, crest)`
  Only the top third of the crest picks up `crestColor`. Tinting the whole cosine spreads the accent across the field and the wave stops having a location.

## API

```ts
function DepthPulseTravellingWave(props: { columns?: number; rows?: number; arcSpan?: number; arcDepth?: number; fieldHeight?: number; pulseCycle?: number; waveTurns?: number; waveDepth?: number; yawAmplitude?: number; yawSpeed?: number; dotScale?: number; viewScale?: number; opacity?: number; color?: string; crestColor?: string; seed?: number | string; className?: string }): JSX.Element
```

- `columns: number` — default `110`
  Columns across the arc.
- `rows: number` — default `44`
  Rows down each column.
- `arcSpan: number` — default `110`
  Arc the lattice is bent around, in degrees.
- `arcDepth: number` — default `0.34`
  Half-depth of the arc in model units — how far the edges recede.
- `fieldHeight: number` — default `1.1`
  Lattice height in model units.
- `pulseCycle: number` — default `3`
  Seconds per pulse.
- `waveTurns: number` — default `1.4`
  Wavelengths visible across the lattice at any instant.
- `waveDepth: number` — default `0.18`
  How far a crest pushes a dot toward the viewer, in model units.
- `yawAmplitude: number` — default `16`
  Peak yaw of the whole lattice, in degrees.
- `yawSpeed: number` — default `0.25`
  Yaw oscillations per second.
- `dotScale: number` — default `1`
  Dot radius multiplier in CSS pixels.
- `viewScale: number` — default `0.46`
  Model-to-pixel scale as a fraction of the container short side.
- `opacity: number` — default `1`
  Multiplier applied to every dot.
- `color: string` — default `'#6f757e'`
  Base dot colour.
- `crestColor: string` — default `'#ffffff'`
  Colour mixed in at the top of the crest.
- `seed: number | string` — default `'depth-pulse-travelling-wave'`
  Seeds the sub-cell jitter for a stable, hydration-safe lattice.
- `className: string`
  Merged onto the host element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function DepthPulseTravellingWave({
  columns = 110,
  rows = 44,
  arcSpan = 110,
  arcDepth = 0.34,
  fieldHeight = 1.1,
  pulseCycle = 3,
  waveTurns = 1.4,
  waveDepth = 0.18,
  yawAmplitude = 16,
  yawSpeed = 0.25,
  dotScale = 1,
  viewScale = 0.46,
  opacity = 1,
  color = '#6f757e',
  crestColor = '#ffffff',
  seed = 'depth-pulse-travelling-wave',
  className,
}: DepthPulseTravellingWaveProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const { width, height } = useResizeObserver(host);
  const size = useRef({ width, height });
  size.current = { width, height };

  const reduced = useReducedMotion();
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

    const total = columns * rows;
    const positions = new Float32Array(total * 3);
    const wave = new Float32Array(total * 2);

    /* ------------------------------------------------------------------
       The arc. Columns are placed by angle, then z is renormalised so the
       centre column sits at +arcDepth and the two edges at -arcDepth
       exactly. Without the renormalisation the usable z range depends on
       arcSpan, and the depth fade would get weaker every time the arc was
       flattened — the cue would silently stop working at shallow spans.
       ------------------------------------------------------------------ */
    const halfSpan = (arcSpan * Math.PI) / 360;
    const cosEdge = Math.cos(halfSpan);
    // Guard the degenerate case: a 0 degree span has no depth to normalise.
    const depthSpan = Math.max(1e-4, 1 - cosEdge);

    let cursor = 0;
    for (let c = 0; c < columns; c += 1) {
      const colT = columns === 1 ? 0.5 : c / (columns - 1);
      const angle = (colT - 0.5) * 2 * halfSpan;
      const x = Math.sin(angle);
      const z = ((Math.cos(angle) - cosEdge) / depthSpan) * 2 * arcDepth - arcDepth;

      for (let r = 0; r < rows; r += 1) {
        const rowT = rows === 1 ? 0.5 : r / (rows - 1);
        // Sub-cell jitter, seeded. A perfect lattice moirés against the pixel
        // grid and shows banding as the field yaws.
        const jx = (rng() - 0.5) * (1 / columns) * 0.9;
        const jy = (rng() - 0.5) * (1 / rows) * 0.9;

        positions[cursor * 3] = x + jx;
        positions[cursor * 3 + 1] = (rowT - 0.5 + jy) * fieldHeight;
        positions[cursor * 3 + 2] = z;

        // Phase is what makes it travel. Constant phase across the lattice
        // would give a field that breathes in unison.
        wave[cursor * 2] = colT * waveTurns + rowT * ROW_PHASE_LEAN;
        wave[cursor * 2 + 1] = rng() - 0.5;
        cursor += 1;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aWave', new THREE.BufferAttribute(wave, 2));

    const uniforms: Uniforms = {
      uElapsed: { value: 0 },
      uViewScale: { value: 1 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uDotScale: { value: dotScale },
      uOpacity: { value: opacity },
      uPulseCycle: { value: pulseCycle },
      uWaveDepth: { value: waveDepth },
      uYaw: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uCrestColor: { value: new THREE.Color(crestColor) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: DEPTH_PULSE_WAVE_VERT,
      fragmentShader: DEPTH_PULSE_WAVE_FRAG,
      uniforms,
      transparent: true,
      // Every dot is projected at z = 0; the depth cue is alpha and size, not
      // the depth buffer. Leaving these on would let near dots reject far ones
      // that were rasterised first and punch holes through the lattice.
      depthTest: false,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    // Positions are unit-scale around the origin and the real placement happens
    // in the shader, so three's bounding sphere does not describe what is on
    // screen and culling against it would blank the field at some sizes.
    points.frustumCulled = false;
    scene.add(points);

    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const resize = (w: number, h: number) => {
      renderer.setSize(w, h, false);
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      uniforms.uViewScale.value = Math.min(w, h) * viewScale;
      uniforms.uPixelRatio.value = renderer.getPixelRatio();
    };

    const draw = (elapsed: number) => {
      uniforms.uElapsed.value = elapsed;
      // Yaw oscillates rather than spins. A full rotation would carry columns
      // through the arc's own depth range and the travelling crest would stop
      // being readable as a wave.
      uniforms.uYaw.value = Math.sin(elapsed * yawSpeed * Math.PI * 2) * yawAmplitude;
      renderer.render(scene, camera);
    };

    resize(size.current.width, size.current.height);
    stage.current = { resize, draw };
    draw(STATIC_ELAPSED);

    return () => {
      stage.current = null;
      disposeObject(scene);
      material.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
  }, [
    ready,
    columns,
    rows,
    arcSpan,
    arcDepth,
    fieldHeight,
    pulseCycle,
    waveTurns,
    waveDepth,
    yawAmplitude,
    yawSpeed,
    dotScale,
    viewScale,
    opacity,
    color,
    crestColor,
    seed,
  ]);

  useEffect(() => {
    stage.current?.resize(width, height);
    if (reduced) stage.current?.draw(STATIC_ELAPSED);
  }, [width, height, reduced]);

  useRaf((_dt, elapsed) => stage.current?.draw(elapsed), ready && !reduced && !unsupported);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nulls the stage ref so a queued frame cannot touch a dead renderer, disposes the geometry through `disposeObject(scene)`, disposes the material, calls `disposeRenderer` for `dispose` + `forceContextLoss` + a zeroed backing store, and removes the canvas. `useRaf` unsubscribes on unmount, so a StrictMode double-invoke leaves no orphaned context.

**Reduced motion.** No frame loop is opened. A single frame is drawn at `uElapsed = 1.9` — past the one-second amplitude ramp, and a third of the way through the default cycle, so the crest sits inside the lattice rather than off its edge. Both the depth falloff and the wave band are visible in that still; neither advances.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Giving every dot the same phase. The field then pulses in unison, which reads as a loading state rather than as something moving through the lattice — the per-column phase offset *is* the effect.
- Fading alpha with depth but leaving point size constant. The far edge of the arc becomes a grey copy of the near edge instead of receding, because size is the cue the eye actually uses for distance at these scales.
- Leaving `depthTest` on. Every dot is projected at z = 0, so whichever dot rasterises first wins the pixel and the lattice develops holes wherever it folds back on itself.
- Starting the pulse at full amplitude. The first frame samples the cosine at whatever phase `elapsed` happens to be, and the field flashes on mount — hence the one-second amplitude ramp.
- Placing columns by angle without renormalising z. The depth range then scales with `cos(arcSpan/2)`, so flattening the arc quietly kills the depth fade and the component looks broken at shallow spans while working at wide ones.
- A perfectly regular lattice. It moirés against the pixel grid and shows banding as the field yaws; the seeded sub-cell jitter costs nothing and removes it.
- Rebuilding the buffer on resize. Model space is size-independent — only `uViewScale` and `uPixelRatio` change, so a container reflow costs two uniform writes rather than a dropped GL context.

## Notes

- Dot count is `columns * rows`, 4840 at the defaults, in one draw call with one attribute beyond position.
- The wave is purely a function of `uElapsed` and a baked per-dot phase, so there is no simulation state and no drift — pausing and resuming lands exactly where the clock says it should.

## Definition of done

A curved lattice of dots is visibly dimmer and smaller toward its left and right edges than at its centre. A band of brighter, larger dots sweeps repeatedly across the field, roughly once every three seconds, rather than the whole field brightening at once. The lattice rocks gently side to side. Nothing flashes on mount. Resize the container and the field rescales without a flicker or a dropped context. With reduced motion it holds a single frame showing both the depth falloff and the crest.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
