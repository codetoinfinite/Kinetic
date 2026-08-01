# Build: Radial Ripple Dot Cloud

Several thousand dots in one draw call, with a wave travelling outward from a point left of centre. The displacement is a sine in radius minus a phase in time, attenuated exponentially, so the field is violent near the source and nearly still at the rim — which is what gives the motion an origin rather than making it a screensaver. Dot density along the radius is a hand-placed cubic B-spline, so the rings and gaps in the layout are drawn rather than derived from a formula.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A dot field with a travelling wave running out of one off-centre point, its density drawn by hand as a B-spline.

- Category: webgl
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. Rest positions are baked once, in field units, into an `aOrigin` attribute: the field spans ±16/9 horizontally and ±1 vertically. The draw-time uniform `uCover = max(1, aspect / (16/9))` scales that field to cover the camera, so a resize writes one float instead of rebuilding a buffer.
2. Density along the radius comes from a uniform cubic B-spline over eight hand-placed control points — five spans — evaluated in JS at bake time. `bsplineWeights(t)` returns the four basis values `[(1-t)³, 4-6t²+3t³, 1+3t+3t²-3t³, t³] / 6` and `sampleRamp` blends control points `i..i+3`. The curve is C2 and does not pass through its control points, which is what lets a hand-placed sequence stay smooth.
3. Positions are chosen by rejection sampling: a seeded candidate uniform over the field rectangle is kept with probability `ramp(dist / maxRadius)`, where `maxRadius` is the distance from the ripple source to the farthest field corner. That is the only way to realise an arbitrary drawn radial density from a uniform PRNG without inverting the curve analytically.
4. The same ramp value is baked into `aScale` (0.55 + 0.75d) and `aAlpha` (0.3 + 0.7d), so a sparse band is also a dim band. Two independent curves would let them disagree and the field would read as noise with holes in it.
5. The vertex shader computes `dist = length(origin - uCenter)`, `wave = sin(dist * uFrequency - uElapsed * uSpeed)` — a travelling wave, because the time term is subtracted from the radius term — and `attenuated = wave * exp(-dist * uDecay)`, then displaces each dot along its own outward direction by `attenuated * uAmplitude`.
6. The direction is guarded: `dir = dist > 1e-5 ? delta / dist : vec2(0.0)`, because normalising a zero vector at the exact source yields NaN and one NaN vertex takes the whole point with it.
7. `gl_PointSize` is floored at 2 device pixels and the alpha is divided by the area that flooring invented, so the cloud has the same density on a 1x monitor as on a 3x phone. The fragment shader cuts a disc with `1 - smoothstep(0.42, 0.5, d)` and tints toward `uCrestColor` by the signed wave, so only the outgoing crest lights up.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `FIELD_HALF_W = 16 / 9`
  Half-width of the baked field, with the field 2 units tall. Baking at one fixed aspect is what makes a resize a single uniform write; 16:9 is the aspect most containers are near, so `uCover` is usually 1 and nothing is scaled at all.
- `DENSITY_RAMP = [1, 1, 0.34, 0.28, 0.92, 0.5, 0, -0.15]`
  Eight control points, so five spans. Sampled it reads 0.89 / 0.44 / 0.40 / 0.74 / 0.49 / 0.06 — dense core, gap, secondary band at ~60% radius, empty rim. The last point is negative deliberately: a control point is not a value, and pulling it below zero is what makes the tail actually reach zero instead of settling around 0.15.
- `centerX = 0.4`
  Ripple source at 40% of the width rather than 50%. A centred radial wave is bilaterally symmetric and the eye reads symmetry as a screensaver; a source off the axis reads as an impact somewhere in the scene.
- `frequency = 6.5 rad per field unit`
  Wavelength 2π/6.5 ≈ 0.97 units, about half the field height, so roughly two and a half crests fit between the source and the far corner. Past ~12 the rings alias against the dot spacing and the field boils; below ~3 there is only one crest and no ripple to read.
- `speed = 2.4 rad per second`
  Crest speed is speed / frequency = 0.37 field units per second, so a crest crosses the field in about six seconds. Fast enough to be motion, slow enough that the eye can follow a single ring outward.
- `decay = 0.85 per field unit`
  Amplitude is 43% at one unit from the source and 13% at the far corner, which gives the wave a source without a visible boundary. A linear falloff reaches exactly zero at a fixed radius and draws a hard circle there.
- `amplitude = 0.045 field units`
  2.25% of the field height — around 25px on a 1100px-tall field, in the same range as the 18px the technique was observed at. Past ~0.12 dots cross each other and the cloud shears instead of rippling.
- `size = 2.6 CSS pixels`
  Base diameter, scaled 0.55..1.3 per dot. Under ~2 the hardware point-size floor kicks in for most dots and the alpha compensation is doing all the work; over ~5 the dense core fills solid and the ripple stops being legible.
- `count = 6000`
  One interleaved-free buffer, one draw call. At this size the field is vertex-bound rather than fill-bound, and 6000 is roughly where the core reads as continuous without the gaps needing more dots to hide them.
- `MAX_ATTEMPTS_PER_DOT = 24`
  Rejection-sampling budget. The mean of the ramp is about 0.45, so ~2.2 attempts per kept dot; a 24x budget absorbs a much sparser custom curve and still terminates rather than spinning forever if someone authors a ramp that is zero everywhere.
- `STATIC_ELAPSED = 3.4 s`
  The frame drawn under reduced motion. Far enough in that two crests have left the source, so the still frame shows the ripple structure rather than the undisturbed lattice.

## API

```ts
function RadialRippleDotCloud(props: { count?: number; size?: number; frequency?: number; speed?: number; decay?: number; amplitude?: number; centerX?: number; centerY?: number; color?: string; crestColor?: string; opacity?: number; seed?: number | string; className?: string }): JSX.Element
```

- `count: number` — default `6000`
  Dots kept after density rejection. One draw call regardless.
- `size: number` — default `2.6`
  Base dot diameter in CSS pixels, before the per-dot density scale.
- `frequency: number` — default `6.5`
  Radians of wave per field unit; wavelength is 2π / frequency.
- `speed: number` — default `2.4`
  Radians of phase per second. Crest speed is speed / frequency.
- `decay: number` — default `0.85`
  Exponential attenuation per field unit of radius.
- `amplitude: number` — default `0.045`
  Peak displacement in field units, where the field is 2 units tall.
- `centerX: number` — default `0.4`
  Ripple source across the field, 0..1. Deliberately not centred.
- `centerY: number` — default `0.5`
  Ripple source down the field, 0..1.
- `color: string` — default `'#5d6b7a'`
  Dot colour in the troughs.
- `crestColor: string` — default `'#eaf2ff'`
  Dot colour on an outgoing crest.
- `opacity: number` — default `1`
  Multiplier applied after the per-dot area compensation.
- `seed: number | string` — default `'radial-ripple-dot-cloud'`
  Seeds rejection sampling, so the layout is stable across reloads and matches the server.
- `className: string`
  Merged onto the host element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Uniform cubic B-spline basis at parameter `t` within one span. */
function bsplineWeights(t: number): [number, number, number, number] {
  const t2 = t * t;
  const t3 = t2 * t;
  return [
    (1 - 3 * t + 3 * t2 - t3) / 6,
    (4 - 6 * t2 + 3 * t3) / 6,
    (1 + 3 * t + 3 * t2 - 3 * t3) / 6,
    t3 / 6,
  ];
}

/**
 * Sample the density curve at `u` in 0..1. `n` control points give `n - 3`
 * spans; the curve is C2 and does NOT pass through its control points, which
 * is the property that lets a hand-placed sequence stay smooth.
 */
function sampleRamp(ramp: readonly number[], u: number): number {
  const spans = ramp.length - 3;
  if (spans < 1) return clamp(ramp[0] ?? 0, 0, 1);
  const s = clamp(u, 0, 1) * spans;
  const span = Math.min(Math.floor(s), spans - 1);
  const weights = bsplineWeights(s - span);
  let total = 0;
  for (let k = 0; k < 4; k += 1) {
    total += (ramp[span + k] ?? 0) * (weights[k] ?? 0);
  }
  return clamp(total, 0, 1);
}

export function RadialRippleDotCloud({
  count = 6000,
  size = 2.6,
  frequency = 6.5,
  speed = 2.4,
  decay = 0.85,
  amplitude = 0.045,
  centerX = 0.4,
  centerY = 0.5,
  color = '#5d6b7a',
  crestColor = '#eaf2ff',
  opacity = 1,
  seed = 'radial-ripple-dot-cloud',
  className,
}: RadialRippleDotCloudProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const { width, height } = useResizeObserver(host);
  const size2 = useRef({ width, height });
  size2.current = { width, height };

  const reduced = useReducedMotion();
  const visible = useVisibility();
  const { inView } = useInView(host, { threshold: 0 });
  const ready = width > 0 && height > 0;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    if (!hasWebGL()) {
      setUnsupported(true);
      return;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(pixelRatio());
    renderer.setClearAlpha(0);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    // Field-unit centre of the ripple. Baked alongside the origins so the
    // normalised radius each dot stores is measured from the same point the
    // shader will use.
    const cx = (centerX * 2 - 1) * FIELD_HALF_W;
    const cy = 1 - centerY * 2;

    /* The farthest corner from the source. Normalising radius by this is what
       makes the density ramp aspect-independent: the tail of the curve lands on
       the corner of the field rather than at some arbitrary unit distance. */
    const maxRadius = Math.max(
      Math.hypot(FIELD_HALF_W - cx, 1 - cy),
      Math.hypot(FIELD_HALF_W + cx, 1 - cy),
      Math.hypot(FIELD_HALF_W - cx, 1 + cy),
      Math.hypot(FIELD_HALF_W + cx, 1 + cy),
    );

    /* Rejection sampling against the density curve. Candidates are uniform over
       the field rectangle and kept with probability `ramp(r)`, which is the only
       way to get an arbitrary hand-drawn radial density out of a uniform PRNG
       without inverting the curve analytically. Seeded, so the layout is
       identical on the server, on the client, and on every reload. */
    const rng = createRng(seed);
    const wanted = Math.max(1, Math.round(count));
    const origins: number[] = [];
    const scales: number[] = [];
    const alphas: number[] = [];

    let attempts = 0;
    const budget = wanted * MAX_ATTEMPTS_PER_DOT;
    while (origins.length < wanted * 2 && attempts < budget) {
      attempts += 1;
      const x = (rng() * 2 - 1) * FIELD_HALF_W;
      const y = rng() * 2 - 1;
      const density = sampleRamp(DENSITY_RAMP, Math.hypot(x - cx, y - cy) / maxRadius);
      if (rng() > density) continue;
      origins.push(x, y);
      // The ramp is reused for weight as well as for density, so a sparse band
      // is also a dim one. Two curves would let them disagree and the field
      // would read as noise with holes in it.
      scales.push(0.55 + 0.75 * density);
      alphas.push(0.3 + 0.7 * density);
    }

    const kept = scales.length;
    const positions = new Float32Array(kept * 3); // zeros; the shader positions
    const originAttr = new Float32Array(kept * 2);
    const scaleAttr = new Float32Array(kept);
    const alphaAttr = new Float32Array(kept);
    for (let i = 0; i < kept; i += 1) {
      originAttr[i * 2] = origins[i * 2] ?? 0;
      originAttr[i * 2 + 1] = origins[i * 2 + 1] ?? 0;
      scaleAttr[i] = scales[i] ?? 1;
      alphaAttr[i] = alphas[i] ?? 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aOrigin', new THREE.BufferAttribute(originAttr, 2));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scaleAttr, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphaAttr, 1));

    const uniforms: Uniforms = {
      uElapsed: { value: 0 },
      uCover: { value: 1 },
      uCenter: { value: new THREE.Vector2(cx, cy) },
      uFrequency: { value: frequency },
      uSpeed: { value: speed },
      uDecay: { value: decay },
      uAmplitude: { value: amplitude },
      uSize: { value: size },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uColor: { value: new THREE.Color(color) },
      uCrestColor: { value: new THREE.Color(crestColor) },
      uOpacity: { value: opacity },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: RADIAL_RIPPLE_VERT,
      fragmentShader: RADIAL_RIPPLE_FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      // Additive, because overlapping dots in the dense core should read as
      // brighter rather than as a flat plate of the same colour.
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    // Every vertex is displaced in the shader, so three's bounding sphere is
    // wrong by construction and culling against it can blank the whole cloud.
    points.frustumCulled = false;
    scene.add(points);

    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const resize = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      camera.left = -aspect;
      camera.right = aspect;
      camera.top = 1;
      camera.bottom = -1;
      camera.updateProjectionMatrix();

      /* Cover, not contain. Past 16:9 the baked field is narrower than the
         camera, so it is scaled up until it reaches both edges; the alternative
         is a visible vertical seam where the dots stop. The centre is scaled by
         the same factor so the ripple stays put relative to the field. */
      const cover = Math.max(1, aspect / FIELD_HALF_W);
      uniforms.uCover.value = cover;
      uniforms.uCenter.value.set(cx * cover, cy * cover);
      // Re-read: moving a window between displays changes devicePixelRatio
      // without changing the CSS size, and dot sizes are specified in CSS px.
      uniforms.uPixelRatio.value = renderer.getPixelRatio();
    };

    const draw = (elapsed: number) => {
      uniforms.uElapsed.value = elapsed;
      renderer.render(scene, camera);
    };

    resize(size2.current.width, size2.current.height);
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
    count,
    size,
    frequency,
    speed,
    decay,
    amplitude,
    centerX,
    centerY,
    color,
    crestColor,
    opacity,
    seed,
  ]);

  useEffect(() => {
    stage.current?.resize(width, height);
    // A resize clears the drawing buffer, so the frozen frame has to be
    // redrawn or a reduced-motion visitor sees an empty box after any reflow.
    if (reduced) stage.current?.draw(STATIC_ELAPSED);
  }, [width, height, reduced]);

  useRaf(
    (_dt, elapsed) => stage.current?.draw(elapsed),
    ready && inView && visible && !reduced && !unsupported,
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nulls the stage ref, walks the scene with `disposeObject` to release the geometry and its four attribute buffers, disposes the ShaderMaterial explicitly, then calls `disposeRenderer` — `dispose` plus `forceContextLoss` plus a zeroed drawing buffer — and removes the canvas. The canvas is created inside the effect and appended imperatively rather than being owned by a React ref, so a StrictMode double-mount builds a fresh context instead of handing back the one that was just killed.

**Reduced motion.** The component reads `useReducedMotion` itself and opens no rAF subscription. One frame is drawn at `uElapsed = 3.4`, by which point two crests have left the source — so the still image shows the ripple structure and the drawn density bands, not the undisturbed lattice. The layout, the colours and the crest tinting are all present; only the travel stops. The frame is re-drawn on resize because a canvas resize clears the buffer.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Writing `sin(dist * frequency) * sin(elapsed * speed)`. That is a standing wave: the rings pulse in place and never travel. Subtracting the phase from the radius inside one sine is what makes crests move outward — and adding it instead sends them inward, which reads as a drain rather than an impact.
- Normalising the offset vector without guarding the source. At `dist == 0` the division produces NaN, the vertex is discarded by the rasteriser, and on some drivers the whole primitive goes with it — an intermittently missing dot that is very hard to attribute.
- Attenuating the radius instead of the wave, or using a linear falloff. Linear reaches zero at a fixed radius and draws a visible circle across the field; the exponential never quite reaches zero and has no edge.
- Rebuilding the position buffer on resize. It reallocates hundreds of kilobytes during a window drag and, if the layout is re-sampled, re-randomises every dot mid-motion. Baking in field units and scaling by one `uCover` uniform avoids both.
- Leaving `frustumCulled` at its default. Every vertex is displaced in the shader, so three's bounding sphere — computed from the undisplaced attribute — is wrong, and the whole cloud can vanish when the camera or the container changes.
- Using `Math.random()` for the layout. The server and the client disagree, so React logs a hydration mismatch, and the composition a designer approved is not the one the next visitor sees.
- Treating the B-spline control points as points on the curve. The curve does not pass through them — the value at the start of the first span is `(P0 + 4P1 + P2) / 6`. Authoring the ramp as if it were interpolating produces a flatter, wrong curve and hours of confusion.
- Driving dot brightness from a second curve independent of the density curve. Where they disagree the field reads as random noise with holes in it rather than as drawn bands.
- Forgetting that a resize clears the drawing buffer. Under reduced motion nothing redraws afterwards, so the component is blank after any reflow unless the frozen frame is re-rendered.

## Notes

- The camera is orthographic, ±aspect by ±1, so field units are directly comparable to the container height: 1 unit is half the visible height.
- `uCover` implements cover, not contain. Past 16:9 the baked field would otherwise stop short of the container edge and leave a visible vertical seam where the dots end.
- The ripple runs on absolute elapsed time from the shared rAF clock, so several instances on one page stay in phase with each other.

## Definition of done

Rings of dots visibly travel outward from a point left of centre, roughly two crests visible at a time, brightening as each crest passes and dimming behind it. The rim of the field barely moves. The layout has obvious drawn structure — a dense core, a gap, a second band — and is identical after a reload and after resizing the window. With reduced motion the field renders in full and holds a frozen mid-ripple frame.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
