# Build: Anti-Aliased Point Discs

A point sprite is a square; this is the pair of shader tricks that makes it a dot. The fragment shader carves a disc with one smoothstep across the outer few percent of the sprite and discards everything below a visibility threshold, and the vertex shader clamps the point size to the hardware floor and then divides the alpha by the area that clamp invented. The field is laid out as a phyllotaxis spiral with a size ramp so both ends of the problem — sub-pixel dots and twenty-pixel dots — are on screen at once.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A phyllotaxis field of dots that stay the same weight at every pixel ratio, with no MSAA and no texture.

- Category: webgl
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. Dots are placed by golden-angle phyllotaxis: `t = sqrt((i + 0.5) / count)` for the normalised radius and `i * 137.507°` for the angle, so spacing is even rather than crowded at the centre. A seeded jitter of ±0.06 rad is added to break the moiré a pure spiral shows at small radii.
2. The vertex shader rotates differentially — `angle + uElapsed * uSpin * (0.6 + t)` — so the rim turns 1.6x faster than the core and the arms shear instead of the field spinning rigidly.
3. Point size ramps as `mix(uMinRadius, uMaxRadius, t * t)`, quadratic so most of the field stays small and the large discs are confined to the rim where the anti-aliasing is easiest to inspect.
4. The size is then clamped: `clamped = max(2.0, radius * 2.0 * uPixelRatio)` against `unclamped = max(1.0, …)`, and `vAlphaScale = unclamped² / clamped²` is passed to the fragment shader. A dot the driver forced to be twice as wide comes out four times fainter, so total emitted light is unchanged.
5. The fragment shader computes `d = length(gl_PointCoord - 0.5)` and `disc = 1.0 - smoothstep(uEdgeInner, 0.5, d)` where `uEdgeInner = 0.5 - softness`, so the falloff always ends exactly at the sprite edge and the disc stays inscribed in its square.
6. Anything whose final alpha lands below 0.003 is discarded rather than blended, which removes a framebuffer read-modify-write per pixel across the sparse outer field.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)) ≈ 2.39996 rad`
  The only angle whose successive multiples never repeat a rational fraction of a turn. Any nearby value produces visible spokes within a few hundred points.
- `softness = 0.07`
  Anti-aliased band as a fraction of the sprite radius, giving `smoothstep(0.43, 0.5, d)`. Below ~0.05 a 2px dot aliases back into a square; above ~0.15 every dot reads as blurred rather than small.
- `MIN_POINT_SIZE = 2.0`
  Hardware floor in device pixels. Below roughly 1px most GPUs rasterise nothing, so the smallest dots would be absent on some machines and present on others.
- `ALPHA_EPSILON = 0.003`
  Discard threshold, just under 1/255. Anything fainter cannot be shown by an 8-bit framebuffer, so blending it is pure fill cost.
- `radius ramp exponent = t * t`
  Quadratic rather than linear. Linear puts mid-size discs everywhere and the field turns into a solid disc; quadratic keeps the interesting large sprites at the rim.
- `count = 4000`
  One buffer, one draw call, and about 4000 sprites of up to 20px — roughly the point where fill rate rather than vertex count starts to dominate on integrated graphics.
- `differential spin factor = (0.6 + 1.0 * t)`
  Rim-to-core angular speed ratio of 1.6. At 1.0 the field spins rigidly and reads as a rotating image; past ~2.5 the arms wind into a solid ring within a minute.

## API

```ts
function AntialiasedDiscFragment(props: { count?: number; minRadius?: number; maxRadius?: number; fieldRadius?: number; spin?: number; softness?: number; opacity?: number; colorInner?: string; colorOuter?: string; seed?: number | string; className?: string }): JSX.Element
```

- `count: number` — default `4000`
  Number of discs. One draw call regardless.
- `minRadius: number` — default `0.5`
  Disc radius in CSS pixels at the centre — deliberately sub-pixel at DPR 1.
- `maxRadius: number` — default `10`
  Disc radius in CSS pixels at the rim.
- `fieldRadius: number` — default `0.92`
  Field diameter as a fraction of the container short side.
- `spin: number` — default `0.08`
  Base angular speed in radians per second; the rim runs 1.6x faster.
- `softness: number` — default `0.07`
  Anti-aliased band width as a fraction of the sprite radius.
- `opacity: number` — default `1`
  Multiplier applied before the area compensation.
- `colorInner: string` — default `'#ffffff'`
  Tint at the centre of the field.
- `colorOuter: string` — default `'#6f7680'`
  Tint at the rim.
- `seed: number | string` — default `'antialiased-disc-fragment'`
  Seeds the angular jitter so the layout is stable across reloads and matches on the server.
- `className: string`
  Merged onto the host element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function AntialiasedDiscFragment({
  count = 4000,
  minRadius = 0.5,
  maxRadius = 10,
  fieldRadius = 0.92,
  spin = 0.08,
  softness = 0.07,
  opacity = 1,
  colorInner = '#ffffff',
  colorOuter = '#6f7680',
  seed = 'antialiased-disc-fragment',
  className,
}: AntialiasedDiscFragmentProps) {
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
    const positions = new Float32Array(count * 3); // all zeros; the shader places them
    const disc = new Float32Array(count * 2);

    for (let i = 0; i < count; i += 1) {
      // sqrt spacing, not linear: linear spacing crowds the centre, which is
      // exactly where the sub-pixel dots are and where crowding is least
      // forgiving.
      const t = Math.sqrt((i + 0.5) / count);
      // A little seeded angular jitter breaks the moiré that a pure golden
      // spiral shows at small radii on a low-DPR screen.
      disc[i * 2] = t;
      disc[i * 2 + 1] = i * GOLDEN_ANGLE + (rng() - 0.5) * 0.12;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aDisc', new THREE.BufferAttribute(disc, 2));

    const uniforms: Uniforms = {
      uElapsed: { value: 0 },
      uExtent: { value: 1 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uSpin: { value: spin },
      uFieldRadius: { value: fieldRadius },
      uMinRadius: { value: minRadius },
      uMaxRadius: { value: maxRadius },
      uOpacity: { value: opacity },
      uColorInner: { value: new THREE.Color(colorInner) },
      uColorOuter: { value: new THREE.Color(colorOuter) },
      // The band always ENDS at 0.5 — the sprite's own edge. Softening inward
      // keeps the disc inscribed in the sprite; softening outward would clip
      // the falloff square at the corners.
      uEdgeInner: { value: 0.5 - softness },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: ANTIALIASED_DISC_VERT,
      fragmentShader: ANTIALIASED_DISC_FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      // Additive would blow the overlapping core to white. Normal blending
      // with a discard keeps the density readable where the dots overlap.
      blending: THREE.NormalBlending,
    });

    const points = new THREE.Points(geometry, material);
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
      uniforms.uExtent.value = Math.min(w, h);
      // Re-read rather than assume: moving a window between a retina and a
      // non-retina display changes devicePixelRatio without changing the
      // canvas size, and a stale value breaks the whole compensation.
      uniforms.uPixelRatio.value = renderer.getPixelRatio();
    };

    const draw = (elapsed: number) => {
      uniforms.uElapsed.value = elapsed;
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
    count,
    minRadius,
    maxRadius,
    fieldRadius,
    spin,
    softness,
    opacity,
    colorInner,
    colorOuter,
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

**Cleanup.** Nulls the stage ref, disposes the geometry and material via `disposeObject` plus an explicit `material.dispose()`, calls `disposeRenderer` for `dispose` + `forceContextLoss` + a zeroed drawing buffer, then removes the canvas. `useRaf` releases the frame subscription itself.

**Reduced motion.** No rAF subscription is opened. A single frame is drawn at `uElapsed = 6`, which is far enough into the rotation that the arms are already sheared, so the composition is the interesting one rather than the unrotated starting pose. The field is fully visible; only the spin stops.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Softening the disc outward from 0.5 instead of inward to it. The sprite has no pixels past 0.5, so the outer half of the falloff is clipped by the sprite boundary and the dot shows four square corners.
- Clamping `gl_PointSize` and leaving the alpha alone. The clamp does nothing at DPR 3 and doubles the covered area at DPR 1, so the identical component looks twice as heavy on a non-retina monitor — a bug that is invisible on the machine most people develop on.
- Caching the pixel ratio at construction. Dragging the window from a retina to a non-retina display changes `devicePixelRatio` without changing the canvas size, so the compensation silently goes stale; it is re-read on every resize.
- Reaching for `antialias: true` when the dots look jagged. MSAA allocates a multisample buffer the size of the canvas and does not help a point sprite whose edge is defined by alpha — the smoothstep is the fix.
- Blending fully transparent fragments instead of discarding them. At 4000 sprites with a 20px radius the outer field is mostly empty pixels, and each one still costs a read-modify-write of the framebuffer.
- Linear radial spacing instead of `sqrt`. It crowds the centre, which is precisely where the sub-pixel dots live, and the core turns into an undifferentiated smear.

## Notes

- The camera is orthographic and 1:1 with CSS pixels, so `uMinRadius` and `uMaxRadius` are literal pixel radii rather than scene units.
- The same two tricks apply to any `THREE.Points` material. The spiral is only a way to show the whole size range at once.

## Definition of done

A spiral of dots that grows from barely-visible at the centre to clearly round discs at the rim, with soft edges and no square corners at any size. Zoom the browser between 100% and 200% and the field keeps the same apparent weight instead of getting denser or lighter. Nothing shimmers along the arms as they turn. With reduced motion the spiral renders in full and holds still.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
