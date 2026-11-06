# Build: Stepped Film Grain

A full-screen transparent grain layer for stacking over hero art, video, or flat colour. The pixels are an ordinary hash, and everything that makes it look like film rather than television snow is in the clock: the noise offset is quantised to twelve changes per second, and the frames in between are not drawn at all. Grain cells are sized in CSS pixels, so the overlay weighs the same on a laptop and on a 3x phone.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A transparent grain overlay whose pattern jumps twelve times a second instead of every frame, so it reads as film.

- Category: webgl
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. A `PlaneGeometry(2, 2)` is written straight to clip space — `gl_Position = vec4(position.xy, 0.0, 1.0)` — so there are no matrices and no camera transform, only a fragment shader over the whole canvas.
2. Each fragment picks a lattice cell with `cell = floor(gl_FragCoord.xy / uPixelRatio / uCellSize) + uOffset`, dividing by the pixel ratio so a cell is a fixed number of CSS pixels rather than of device pixels.
3. `cell = mod(cell, uTile)` wraps the lattice at 170 cells, which keeps the hash argument small enough for float precision and turns the offset into a jump anywhere inside a finite, tiling field.
4. The value is `fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453)`, shaped into signed grain by `g = (n - 0.5) * uContrast + uLift`. The lift is film base fog: it raises the mean so the layer opens crushed blacks instead of only speckling them.
5. One normal-blended draw carries both directions: the colour is `vec3(step(0.0, g))` — white above the lift, black below — and the alpha is `abs(g) * uOpacity`, with anything under 0.0035 discarded.
6. The rAF callback computes `index = floor(elapsed * stepsPerSecond) % steps` and returns immediately if the index is unchanged, so the GPU sees twelve draws a second regardless of display refresh rate. On a step it reads `uOffset` from a seeded table of integer jumps and renders once.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `stepsPerSecond = 12`
  The filmic/snow dial. Below about 8 the pattern visibly ticks and reads as a stutter; past about 18 the eye fuses the steps into continuous shimmer and it is television snow again. 12 is 24 fps film with each pattern held for two frames.
- `steps = 24`
  Table length. At 12 steps a second this is a 2-second cycle before the sequence repeats — long enough that nothing breathes on a one-second beat, and the whole table is 48 floats.
- `tile = 170`
  Cells before the lattice wraps. Large enough that the repeat is imperceptible in unstructured noise; small enough that `dot(cell, vec2(12.9898, 78.233))` stays around 15 000, where `fract(sin(x) * 43758)` still has usable precision.
- `contrast = 0.24`
  Peak-to-peak swing before opacity, giving a signed range of ±0.12. Past ~0.4 the grain competes with the image it sits on; below ~0.1 it disappears once the browser composites it at 8 bits.
- `lift = 0.095`
  Just under half the contrast, so roughly 80% of samples land above zero. That asymmetry is what makes it read as an emulsion over the image rather than as symmetric static in front of it.
- `opacity = 0.4`
  Peak alpha works out at 0.4 x 0.215 ≈ 0.086. Above ~0.6 the layer stops being texture and starts being a visible veil over type.
- `cellSize = 1 CSS pixel`
  One cell per CSS pixel is the finest grain that is still DPR-invariant. Larger values give coarser, pushed-film grain; smaller values ask for detail below a CSS pixel that the backing store cannot hold.
- `maxDpr = 1`
  A grain cell is a whole CSS pixel, so a 2x backing store draws four device pixels of identical value per cell — four times the fill rate for a bit-identical image. This is the one full-screen shader that should not be rendered at device resolution.
- `ALPHA_EPSILON = 0.0035`
  Just under 1/255. Below it an 8-bit compositor shows nothing, but blending still costs a framebuffer read-modify-write — and on a lifted, low-contrast field a large share of pixels land there.

## API

```ts
function SteppedFilmGrain(props: { opacity?: number; contrast?: number; lift?: number; cellSize?: number; tile?: number; stepsPerSecond?: number; steps?: number; maxDpr?: number; seed?: number | string; className?: string }): JSX.Element
```

- `opacity: number` — default `0.4`
  Overall strength, multiplied onto the grain magnitude.
- `contrast: number` — default `0.24`
  Peak-to-peak swing of the noise before opacity.
- `lift: number` — default `0.095`
  Mean added to the noise — base fog, which biases the layer toward lightening.
- `cellSize: number` — default `1`
  Size of one grain cell in CSS pixels. Clamped to a 0.25 floor.
- `tile: number` — default `170`
  Cells before the lattice repeats. Clamped to a floor of 8.
- `stepsPerSecond: number` — default `12`
  How many times a second the pattern changes. Also the draw rate.
- `steps: number` — default `24`
  Entries in the seeded offset table; the cycle length is steps / stepsPerSecond seconds.
- `maxDpr: number` — default `1`
  Backing-store cap. 1 is deliberate; see the constant.
- `seed: number | string` — default `'stepped-film-grain'`
  Seeds the offset table so the sequence is stable across reloads and matches the server.
- `className: string`
  Merged onto the host element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function SteppedFilmGrain({
  opacity = 0.4,
  contrast = 0.24,
  lift = 0.095,
  cellSize = 1,
  tile = 170,
  stepsPerSecond = 12,
  steps = 24,
  maxDpr = 1,
  seed = 'stepped-film-grain',
  className,
}: SteppedFilmGrainProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const { width, height } = useResizeObserver(host);
  const size = useRef({ width, height });
  size.current = { width, height };

  const reduced = useReducedMotion();
  const visible = useVisibility();
  const ready = width > 0 && height > 0;

  const stepCount = Math.max(1, Math.round(steps));

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    if (!hasWebGL()) {
      setUnsupported(true);
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        // Nothing here has a geometric edge, so MSAA would allocate a
        // multisample buffer the size of the canvas and resolve it every draw
        // for no visible difference.
        antialias: false,
        alpha: true,
        depth: false,
        stencil: false,
        powerPreference: 'low-power',
      });
    } catch {
      // A context can still be refused between the probe and the construction —
      // the tab may have hit the browser's live-context ceiling in between. three
      // throws rather than returning null, and an uncaught throw here takes the
      // page with it.
      setUnsupported(true);
      return;
    }
    renderer.setPixelRatio(pixelRatio(maxDpr));
    renderer.setClearAlpha(0);

    const scene = new THREE.Scene();
    // The quad is authored in clip space, so the camera exists only because
    // three's render signature requires one.
    const camera = new THREE.Camera();

    const geometry = new THREE.PlaneGeometry(2, 2);

    const uniforms: Uniforms = {
      uPixelRatio: { value: renderer.getPixelRatio() },
      uOffset: { value: new THREE.Vector2() },
      uCellSize: { value: Math.max(cellSize, 0.25) },
      uTile: { value: Math.max(tile, 8) },
      uContrast: { value: contrast },
      uLift: { value: lift },
      uOpacity: { value: opacity },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: STEPPED_FILM_GRAIN_VERT,
      fragmentShader: STEPPED_FILM_GRAIN_FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      // Normal blending, not additive: the shader emits black as well as white
      // and additive could only lighten, which turns grain into haze.
      blending: THREE.NormalBlending,
    });

    const quad = new THREE.Mesh(geometry, material);
    quad.frustumCulled = false;
    scene.add(quad);

    /* The offset table. Seeded, not `Math.random`, so the sequence is identical
       on the server, on the client, and on every reload — and integer, so each
       jump lands exactly on the cell lattice. A non-integer offset resamples
       cell boundaries and the grain appears to slide a fraction of a cell,
       which is the crawl this component exists to avoid. */
    const rng = createRng(seed);
    const wrap = uniforms.uTile.value;
    const offsets: Array<[number, number]> = [];
    for (let i = 0; i < stepCount; i += 1) {
      offsets.push([Math.floor(rng() * wrap), Math.floor(rng() * wrap)]);
    }

    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    let lastIndex = -1;

    const resize = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      renderer.setPixelRatio(pixelRatio(maxDpr));
      renderer.setSize(w, h, false);
      // Re-read rather than assume: dragging the window between a retina and a
      // non-retina display changes devicePixelRatio without changing the CSS
      // size, and a stale value rescales every grain cell.
      uniforms.uPixelRatio.value = renderer.getPixelRatio();
      // Resizing a canvas clears its drawing buffer, and this component only
      // draws on a step change — without a redraw here the overlay would be
      // blank until the next step, up to 1/stepsPerSecond later.
      renderer.render(scene, camera);
    };

    const step = (index: number) => {
      if (index === lastIndex) return;
      lastIndex = index;
      const pair = offsets[index] ?? offsets[0];
      if (pair) uniforms.uOffset.value.set(pair[0], pair[1]);
      renderer.render(scene, camera);
    };

    resize(size.current.width, size.current.height);
    stage.current = { resize, step };
    step(0);

    return () => {
      stage.current = null;
      geometry.dispose();
      material.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
  }, [ready, opacity, contrast, lift, cellSize, tile, stepCount, maxDpr, seed]);

  useEffect(() => {
    stage.current?.resize(width, height);
  }, [width, height]);

  useRaf((_dt, elapsed) => {
    // Quantised time, not time. Everything filmic about this component is the
    // fact that this number changes twelve times a second and the draw call
    // is skipped in between.
    const index = Math.floor(elapsed * stepsPerSecond) % stepCount;
    stage.current?.step(index);
  }, ready && visible && !reduced && !unsupported);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nulls the stage ref, disposes the quad geometry and the ShaderMaterial, calls `disposeRenderer` for `dispose` + `forceContextLoss` + a zeroed drawing buffer, then removes the canvas from the DOM. `useRaf` releases its own frame subscription, and there are no listeners of the component's own — sizing comes from the shared ResizeObserver and visibility from the shared document listener.

**Reduced motion.** The component reads `useReducedMotion` itself. No rAF subscription is opened, and the grain is drawn once at table entry 0 — the texture is fully present and correct, it simply never advances. That is the right degradation for grain: it is a surface quality, not a motion, and removing it entirely would change how the artwork beneath it reads.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Advancing the noise every frame. It is the single thing that separates film grain from TV static, and it also makes the effect frame-rate dependent — the same overlay churns twice as fast on a 120 Hz display. Quantising the offset fixes both at once.
- Sliding the offset by a constant per step instead of jumping to table entries. A constant increment makes the whole field crawl in one direction, and the eye locks onto and tracks that direction; uncorrelated jumps have nowhere to track.
- Using a fractional offset. Non-integer values move the lattice off the pixel grid, so cell boundaries resample and the grain shimmers within each step — the artefact the stepping was supposed to remove.
- Declaring `precision mediump float` out of habit. The hash argument reaches ~15 000, which a 16-bit float holds to three digits, so adjacent cells return the same value and the grain becomes flat blocks tens of pixels wide. This shader needs highp.
- Sizing grain in device pixels. `gl_FragCoord` is a device-pixel coordinate, so grain authored without dividing by the pixel ratio is three times finer and effectively invisible on the phone, while looking correct on the machine it was tuned on.
- Rendering the overlay at the device pixel ratio. A cell is one CSS pixel of constant value; a 2x buffer costs four times the fragments and produces the identical image.
- Forgetting that resizing a canvas clears its drawing buffer. A component that only draws on a step change goes blank for up to 1/stepsPerSecond after every resize, which during a window drag is a visible flicker — the resize path redraws explicitly.
- Using additive blending so the grain can only lighten. The result is haze rather than grain; emitting black or white with the magnitude in alpha gets both directions out of one normal-blended draw.

## Notes

- The host is `pointer-events-none` and `aria-hidden`. It is a decorative layer that must never intercept a click on the content underneath it.
- If WebGL is unavailable the component renders an empty box. A missing grain layer is a correct degradation — the content beneath is untouched.
- Stack it as the last child of a relatively-positioned container with `absolute inset-0`. It composites through the browser, so no blend mode is required, though `mix-blend-mode: overlay` is a reasonable variation over photography.

## Definition of done

A fine speckle over the content that visibly holds still for a beat and then changes, roughly twelve times a second — count it by eye and it should read as a flicker, not a fizz. Zoom the browser from 100% to 200% and the grain gets larger with the layout rather than staying pinned to device pixels. Resize the window and the overlay never blanks. With reduced motion the grain is still there and completely static.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
