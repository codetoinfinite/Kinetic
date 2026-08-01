# Build: Dual-Canvas Depth Split

Two stacked canvases render the same instanced particle system with opposite `uZSign`, and the page content is a DOM sibling between them. Particles with negative depth pass behind the text and positive ones pass in front. Because size, parallax rate, brightness and softness are one continuous ramp across the depth axis, the plane where the split happens cannot be seen — the effect is that the copy is embedded in the field, and it stays live, selectable text throughout.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

One particle field rendered twice with the depth sign flipped, so the text sits inside the field rather than on top of it.

- Category: webgl
- Runtime cost: webgl
- Dependencies: ogl@^1.0.11

## How it works

1. `aDepth` is the camera axis, not a distance: -1 is far behind the content plane, +1 is close to the viewer, 0 is the content plane itself. The SIGN chooses which canvas draws a particle; the magnitude drives everything else, which is why the two layers look like one field.
2. Both layers share the same typed arrays, so the two contexts hold identical particles rather than two independent fields. Only the attribute descriptor objects are per-layer, because ogl writes the buffer handle and element count into the object it is given.
3. A particle on the wrong side of the plane is rejected in the VERTEX shader by writing `gl_Position = vec4(2.0, 2.0, 2.0, 1.0)` — outside the frustum on every axis, so all four vertices are clipped before rasterisation and it costs no fragments. The vertex cost doubles across the two layers; the fragment cost, which is the only cost that mattered, does not.
4. Near particles are bigger (`mix(minSize, maxSize, depth01)`), drift further per second (`0.35 + 0.65 * depth01`), are brighter, and have a softer edge — a defocus that stops the front layer reading as dirt on the screen. Four cues from one number.
5. The back canvas is opaque and blends additively (`ONE, ONE`), which is order independent so nothing needs sorting. The front canvas sits over live text and must be transparent, which rules additive out — there is nothing on the GPU to add to — so it blends premultiplied source-over (`ONE, ONE_MINUS_SRC_ALPHA`). One fragment shader emits premultiplied colour and serves both.
6. The population is derived from container area — `clamp(round(megapixels * density), 250, maxCount)` — and applied with `setInstancedCount` on both layers. Buffers are allocated once at `maxCount`, so a resize never reallocates.
7. Drift is a pure function of `elapsed` and the per-particle seed, with `fract` wrapping the field vertically and `uFadeBand` fading alpha to zero at both ends so the wrap seam is never visible. No per-particle state, so a still frame is drawable from one number.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `split = 0.38`
  Fraction of the population placed in front of the content. Under a half on purpose: dust in front of body copy is a legibility cost, and at 0.5 the text reads as fogged rather than embedded.
- `FRONT_OPACITY = 0.55`
  Extra alpha scale on the front layer only. Depth already brightens near particles, and the front layer is entirely near particles, so without this the layer that overlaps the text is the brightest thing on screen.
- `DEPTH_FLOOR = 0.05`
  Dead zone around the content plane. A particle at exactly 0 is rejected by both layers — `aDepth * uZSign <= 0.0` is false for neither sign — so it would silently never render.
- `sizeRange = [3, 34]`
  Disc diameter at the far and near ends of the ramp. The span is what sells the depth; at 8-to-14 the field is flat, and above ~40 the near particles are large enough that their own softness becomes the dominant texture of the page.
- `parallax factor = 0.35 + 0.65 * depth01`
  Near particles travel about three times as far per second as far ones. A larger ratio makes the far layer look frozen; a smaller one and the field moves as a single sheet, which removes the only depth cue that survives in a static screenshot.
- `MAX_DPR = 1.5`
  Two layers of soft additive discs is a fill-rate problem and fill scales with the square of the pixel ratio. Dust has no detail a third sample per axis would resolve, so a 3x phone renders at 1.5x and pays a quarter of the fragments.
- `FADE_BAND = 0.14`
  Fraction of the field height the wrap fade occupies at each end. Larger than a single-layer field needs, because the near particles are up to 34px across and their radius alone is a few percent of a short container.
- `size jitter = 0.7 .. 1.3`
  Multiplier on top of the depth ramp. Without it the depth ordering is perfectly readable from size alone, which reads as a diagram of a depth field rather than a depth field.

## API

```ts
function DualCanvasZSplit(props: { children?: ReactNode; density?: number; maxCount?: number; split?: number; sizeRange?: readonly [number, number]; speed?: number; wander?: number; opacity?: number; colorA?: string; colorB?: string; background?: string; seed?: number | string; className?: string }): JSX.Element
```

- `children: ReactNode`
  Content rendered between the two particle layers. Ordinary DOM, fully interactive.
- `density: number` — default `850`
  Particles per megapixel of container area. The count is derived from this, not fixed.
- `maxCount: number` — default `1600`
  Population ceiling, and the size the shared buffers are allocated at.
- `split: number` — default `0.38`
  Fraction of the population placed in front of the content.
- `sizeRange: readonly [number, number]` — default `[3, 34]`
  Disc diameter in CSS pixels at the far and near ends of the depth ramp.
- `speed: number` — default `1`
  Multiplier on the whole drift, including the upward march.
- `wander: number` — default `0.05`
  Sinusoidal wander amplitude in field units, where 1 is the container.
- `opacity: number` — default `0.6`
  Overall alpha multiplier. The front layer takes 0.55 of it.
- `colorA: string` — default `'#8ea6c4'`
  First tint. Any value ogl's `Color` accepts.
- `colorB: string` — default `'#e6d9c4'`
  Second tint; each particle mixes between the two by a seeded amount.
- `background: string` — default `'#06080c'`
  Opaque clear colour of the back canvas. The front canvas is transparent.
- `seed: number | string` — default `'dual-canvas-z-split'`
  Seeds the scatter. Same seed, same field on every reload and on the server.
- `className: string`
  Merged onto the host element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
function createLayer(
  host: HTMLElement,
  data: FieldData,
  opts: {
    zSign: number;
    opaque: boolean;
    background: Color;
    colorA: Color;
    colorB: Color;
    speed: number;
    wander: number;
    opacity: number;
    minSize: number;
    maxSize: number;
  },
): Layer {
  const renderer = new Renderer({
    dpr: pixelRatio(MAX_DPR),
    // The back layer owns its pixels, so it is opaque and can blend
    // additively. The front layer sits over live DOM text and must be
    // transparent, which rules additive out — there is nothing on the GPU to
    // add to. It blends premultiplied source-over instead.
    alpha: !opts.opaque,
    premultipliedAlpha: !opts.opaque,
    // Nothing occludes anything in either layer; the depth ORDER is expressed
    // by which canvas a particle lands on, not by a z-buffer.
    depth: false,
    antialias: false,
    powerPreference: 'low-power',
  });

  const gl = renderer.gl;
  const canvas = gl.canvas;

  if (opts.opaque) gl.clearColor(opts.background.r, opts.background.g, opts.background.b, 1);
  else gl.clearColor(0, 0, 0, 0);

  // Each layer needs its own attribute descriptors — ogl writes the buffer
  // handle and the element count into the object it is handed — but the
  // underlying typed arrays are shared, so the two contexts hold identical
  // particles rather than two independent fields.
  const geometry = new Geometry(gl, {
    index: { data: data.index },
    position: { size: 2, data: data.quad },
    aOrigin: { size: 2, data: data.origins, instanced: 1 },
    aDepth: { size: 1, data: data.depths, instanced: 1 },
    aSeed: { size: 4, data: data.seeds, instanced: 1 },
  });

  const uniforms: Uniforms = {
    uResolution: { value: [1, 1] },
    uPixelRatio: { value: renderer.dpr },
    uElapsed: { value: 0 },
    uZSign: { value: opts.zSign },
    uDrift: { value: opts.speed },
    uRise: { value: RISE },
    uFlowScale: { value: FLOW_SCALE },
    uWander: { value: opts.wander },
    uFadeBand: { value: FADE_BAND },
    uMinSize: { value: opts.minSize },
    uMaxSize: { value: opts.maxSize },
    uColorA: { value: opts.colorA },
    uColorB: { value: opts.colorB },
    uOpacity: { value: opts.opacity },
  };

  const program = new Program(gl, {
    vertex: DUAL_CANVAS_Z_SPLIT_VERT,
    fragment: DUAL_CANVAS_Z_SPLIT_FRAG,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    // ogl defaults `cullFace` to BACK, and a culled particle is absent with no
    // error anywhere. Nothing here has a back face worth culling.
    cullFace: false,
  });
  if (opts.opaque) program.setBlendFunc(gl.ONE, gl.ONE);
  else program.setBlendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const mesh = new Mesh(gl, { geometry, program });

  host.appendChild(canvas);
  canvas.style.display = 'block';

  return { renderer, geometry, program, mesh, uniforms, canvas };
}

export function DualCanvasZSplit({
  children,
  density = 850,
  maxCount = 1600,
  split = 0.38,
  sizeRange = [3, 34],
  speed = 1,
  wander = 0.05,
  opacity = 0.6,
  colorA = '#8ea6c4',
  colorB = '#e6d9c4',
  background = '#06080c',
  seed = 'dual-canvas-z-split',
  className,
}: DualCanvasZSplitProps) {
  const host = useRef<HTMLDivElement>(null);
  const backHost = useRef<HTMLDivElement>(null);
  const frontHost = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const { width, height } = useResizeObserver(host);
  const size = useRef({ width, height });
  size.current = { width, height };

  const reduced = useReducedMotion();
  const visible = useVisibility();
  const { inView } = useInView(host, { rootMargin: '10%' });
  const ready = width > 1 && height > 1;

  const [minSize = 3, maxSize = 34] = sizeRange;

  useEffect(() => {
    const back = backHost.current;
    const front = frontHost.current;
    if (!back || !front || !ready) return;

    if (!hasWebGL()) {
      setUnsupported(true);
      return;
    }

    const total = Math.max(MIN_COUNT, Math.round(maxCount));
    const data: FieldData = {
      quad: new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]),
      index: new Uint16Array([0, 1, 2, 0, 2, 3]),
      origins: new Float32Array(total * 2),
      depths: new Float32Array(total),
      seeds: new Float32Array(total * 4),
    };

    const rng = createRng(seed);
    const frontShare = clamp(split, 0, 1);
    const lo = Math.max(1, Math.min(minSize, maxSize));
    const hi = Math.max(lo + 0.5, Math.max(minSize, maxSize));

    for (let i = 0; i < total; i += 1) {
      data.origins[i * 2] = randRange(rng, X_MIN, X_MAX);
      data.origins[i * 2 + 1] = rng();

      // The sign picks the canvas, the magnitude drives size, parallax,
      // brightness and softness. A particle exactly at 0 would be on the
      // content plane and belongs to neither layer, so the range excludes it.
      const inFront = rng() < frontShare;
      data.depths[i] = inFront
        ? randRange(rng, DEPTH_FLOOR, 1)
        : -randRange(rng, DEPTH_FLOOR, 1);

      data.seeds[i * 4] = rng() * Math.PI * 2;
      data.seeds[i * 4 + 1] = rng() * Math.PI * 2;
      data.seeds[i * 4 + 2] = rng();
      // Size jitter on top of the depth ramp. Without it the depth ordering is
      // perfectly legible from size alone, which reads as a diagram.
      data.seeds[i * 4 + 3] = randRange(rng, 0.7, 1.3);
    }

    const colA = new Color(colorA);
    const colB = new Color(colorB);
    const bg = new Color(background);
    const shared = {
      background: bg,
      colorA: colA,
      colorB: colB,
      speed,
      wander,
      minSize: lo,
      maxSize: hi,
    };

    const layers = [
      createLayer(back, data, { ...shared, zSign: -1, opaque: true, opacity }),
      createLayer(front, data, {
        ...shared,
        zSign: 1,
        opaque: false,
        opacity: opacity * FRONT_OPACITY,
      }),
    ];

    const resize = (w: number, h: number) => {
      // Population from area, not a fixed number, so one density reads right in
      // a 320px card and a 2000px hero. The buffers already hold `total`
      // particles in scattered order, so a prefix is still an even field —
      // nothing is reallocated.
      const megapixels = (w * h) / 1_000_000;
      const count = clamp(Math.round(megapixels * density), MIN_COUNT, total);

      for (const layer of layers) {
        layer.renderer.setSize(w, h);
        // `setSize` writes literal px into the canvas's inline style, which
        // beats any class. Re-asserting percentages keeps it fluid.
        layer.canvas.style.width = '100%';
        layer.canvas.style.height = '100%';
        layer.uniforms.uResolution.value = [
          layer.renderer.gl.drawingBufferWidth,
          layer.renderer.gl.drawingBufferHeight,
        ];
        layer.uniforms.uPixelRatio.value = layer.renderer.dpr;
        layer.geometry.setInstancedCount(count);
      }
    };

    const draw = (elapsed: number) => {
      for (const layer of layers) {
        layer.uniforms.uElapsed.value = elapsed;
        layer.renderer.render({ scene: layer.mesh });
      }
    };

    resize(size.current.width, size.current.height);
    stage.current = { layers, resize, draw };
    draw(STATIC_ELAPSED);

    return () => {
      stage.current = null;
      for (const layer of layers) {
        // ogl has no `dispose()`: `remove()` deletes the VAOs and every buffer,
        // then the program and its shaders, and only `WEBGL_lose_context` gives
        // the context itself back. This component holds two of them.
        layer.geometry.remove();
        layer.program.remove();
        loseContext(layer.renderer.gl);
        layer.canvas.width = 0;
        layer.canvas.height = 0;
        layer.canvas.remove();
      }
    };
  }, [
    ready,
    density,
    maxCount,
    split,
    minSize,
    maxSize,
    speed,
    wander,
    opacity,
    colorA,
    colorB,
    background,
    seed,
  ]);

  // Resize is its own effect: a reflow costs two `setSize` calls and an
  // instanced-count change, never a rebuild of the shared buffers.
  useEffect(() => {
    stage.current?.resize(width, height);
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

**Cleanup.** Per layer: `geometry.remove()` deletes the VAOs and every buffer, `program.remove()` deletes the shaders and the program, `loseContext(gl)` hands the context back through `WEBGL_lose_context` — ogl has no `dispose()` and nothing else releases a context — then the canvas backing store is zeroed and the node removed. Both layers are torn down in the same cleanup, so the component never holds one context after the other has gone.

**Reduced motion.** The rAF subscription is never made and both layers are drawn once at `elapsed` 0. That is a complete frame, not a collapsed one: the scatter, depths, sizes, tints and wrap fade are all per-particle seeds that already vary at t=0, so the still shows the same depth split, in front of and behind the same text, with only the drift absent. Resizing redraws the same still in both layers.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Trying to do this with one canvas. A canvas is a single stacking-context leaf, so DOM content cannot be interleaved with parts of it. Two contexts is not an inefficiency here, it is the requirement — and it is two of the roughly sixteen a Chromium renderer process allows, which is exactly why both are released on unmount.
- Making the front canvas additive. With `alpha: true` the destination is zero, so an additive particle over text is a flat colour patch: the layer stops looking like light and starts looking like a sticker.
- Forgetting `pointer-events: none` on the front layer. It covers the content by construction, so every link and button underneath it stops responding, and nothing about the failure looks graphical.
- Letting a particle sit at depth exactly 0. `aDepth * uZSign <= 0.0` rejects it in BOTH layers, so it is uploaded, transformed and never seen — a silent leak of the population.
- Rejecting with `discard` in the fragment shader instead of parking the vertex. `discard` still rasterises the quad and runs the shader per fragment; a clip-space position outside the frustum throws the primitive away after four vertex invocations.
- Writing `gl_Position = vec4(2.0)` for the rejection. w is then 2, the perspective divide brings it back to exactly 1.0 on every axis, and the vertex survives clipping at the frustum boundary — a row of specks in the corner.
- Giving both layers the same attribute descriptor objects. ogl mutates them with a buffer handle belonging to the first context, and the second layer then renders from a buffer its context has never heard of.
- Assuming `renderer.setSize` leaves the CSS alone. ogl writes literal px into the canvas inline style, which beats any class, so the percentages must be re-asserted after every call in both layers.

## Notes

- The content is a DOM sibling, not a texture. It stays selectable, focusable and available to a screen reader while particles pass on both sides of it — which is the entire reason to accept two contexts instead of drawing the text into the field.
- ogl rather than three: two contexts, two instanced meshes, no lights, no cameras and no scene graph. `renderer.render` is called without a camera, so ogl skips frustum culling and the matrix uniforms — the shader writes clip space itself.
- `depth: false` on both contexts. The depth ORDER is expressed by which canvas a particle lands on, so a z-buffer would be memory plus a clear per frame for no result.
- Sizes are authored in CSS pixels and scaled by the pixel ratio in the shader, so the field is identical across a dpr change and nothing rebuilds when one happens.
- GLSL ES 1.00 with no derivative functions — the anti-aliasing floor is `1.0 / sizePx`, exact for a quad of that pixel size — so the same source compiles under a WebGL1 fallback context.

## Definition of done

Particles visibly pass both behind and in front of the text, and the text is still selectable with the mouse while they do. There is no horizontal line anywhere in the container where the field changes character. Near particles are larger, softer and move further per second than far ones. Links inside the content still respond to hover and click. Resize narrow and wide: discs stay circular and the population changes without a stutter. Two contexts per instance, both released on unmount — mount and unmount six instances and none of the earlier ones go black.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
