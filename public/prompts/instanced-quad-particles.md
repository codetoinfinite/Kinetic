# Build: Instanced Quad Particles

Four vertices and six indices are shared by every particle; three instanced attributes carry position, size, spin, alpha, tint and shape. One `drawElementsInstanced` puts the whole field on screen. Quads instead of `gl_PointSize` because point sprites are capped at 255px on many drivers, cannot be rotated, and are culled whole the instant their centre leaves the viewport — a large sprite disappears while half of it is still visible.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Up to 1800 drifting particles in one draw call — quads rather than point sprites, so each one has its own size, spin and shape.

- Category: webgl
- Runtime cost: webgl
- Dependencies: ogl@^1.0.11

## How it works

1. The geometry is one unit quad in `position` (-0.5..0.5) plus an index buffer, and three attributes marked `instanced: 1`: `aOrigin` (field-space rest position), `aParams` (size in CSS px, signed spin rate, base alpha, tint mix) and `aSeed` (two flow phases, spin phase, shape mix). Ten floats per particle, 72 KB at the 1800 ceiling.
2. Buffers are allocated once at `maxCount` and never reallocated. The visible population comes from `geometry.setInstancedCount(count)` where `count` is derived from container area — `clamp(round(megapixels * density), 250, maxCount)` — so the same density reads correctly in a 320px card and a 2000px hero. Because the scatter is random, any prefix of the buffer is still a spatially even field.
3. The vertex shader rotates the quad corner in PIXEL space and only then divides by the drawing-buffer resolution to reach clip space. Rotating in clip space would shear the quad by the container aspect ratio, and a square particle would become a lozenge that changes shape as it spins.
4. Drift is a pure function of `elapsed` and the per-particle seed: the field marches upward with `fract(y + t * RISE)`, then two out-of-phase sinusoids sampled at the particle's own position add wander. No per-particle state is stored, so a resize, a tab switch or a reduced-motion still can all be drawn from one number.
5. `fract` teleports a particle from the top edge to the bottom, which is a visible pop. `uFadeBand` smoothsteps alpha to zero within 12% of each end, so the population always arrives and leaves at zero opacity.
6. One rounded-box SDF in the fragment shader covers both shapes. At `shape` 0 the half-extents and the corner radius are both 0.5, which reduces exactly to `length(uv) - 0.5` — a true circle. At 1 it is a narrow shard, and the shard is the only reason per-particle rotation is visible at all.
7. Blending is additive (`ONE, ONE`) onto an opaque clear colour, which is order independent — a thousand overlapping instances need no depth sort, which is what makes one draw call possible. The canvas is opaque rather than transparent because additive blending onto transparency would have to brighten the page background, and the GPU cannot see it.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `density = 900`
  Particles per megapixel. Tuned so a typical card holds 250-400 and a full-width hero approaches the ceiling. Doubling it does not double the perceived density — it doubles the fill rate and flattens the depth cue that comes from having gaps.
- `maxCount = 1800`
  Ceiling and allocation size. Not a performance limit on the vertex side — 1800 quads is 7200 vertices, nothing — but the fill cost of 1800 soft additive quads averaging 12px is roughly one full screen of blended pixels per frame.
- `MAX_DPR = 1.5`
  Additive fill is the entire cost of this component and it scales with the square of the pixel ratio. Dust has no fine detail that a third sample per axis resolves, so 3x phones render at 1.5x and the frame budget drops by a factor of four against an uncapped ratio.
- `SIZE_BIAS = 2.2`
  Exponent on the uniform random used for size. At 1 a quarter of the population lands in the largest quarter of the range, and a hundred 28px blobs is fog rather than dust. At 2.2 the large sizes are rare enough to read as individuals.
- `RISE = 0.045`
  Field heights per second at `speed` 1 — about 22 seconds to cross. Slow enough that the eye reads drift rather than travel; above ~0.15 the field looks like falling snow played in reverse.
- `FADE_BAND = 0.12`
  Fraction of the field height the wrap fade occupies at each end. Below ~0.06 the pop at the seam becomes visible for the largest particles, whose radius alone is a couple of percent of the height. Above 0.2 a quarter of the field is permanently dim.
- `FLOW_SCALE = 1.4`
  Cycles of wander across the field. Under 1 the whole population slides sideways as a sheet; well above 2 adjacent particles move in opposite directions and the motion reads as noise rather than air.
- `X_MIN / X_MAX = -0.08 / 1.08`
  Field-space x range. Seeding wider than the container means horizontal wander can never bare a strip at the left or right edge. The off-screen quads are clipped by the rasteriser and cost nothing — which is exactly what a point sprite could not do.
- `alpha per particle = 1 - 0.78 * sizeT`
  Large particles are dimmed so total emitted light is roughly independent of size. Without it the few big instances dominate every additive overlap and the field looks like it has hot spots.

## API

```ts
function InstancedQuadParticles(props: { density?: number; maxCount?: number; sizeRange?: readonly [number, number]; softness?: number; spin?: number; speed?: number; wander?: number; opacity?: number; colorA?: string; colorB?: string; background?: string; seed?: number | string; className?: string }): JSX.Element
```

- `density: number` — default `900`
  Particles per megapixel of container area. The count is derived from this, not fixed.
- `maxCount: number` — default `1800`
  Population ceiling, and the size the buffers are allocated at.
- `sizeRange: readonly [number, number]` — default `[5, 28]`
  Particle size in CSS pixels. The distribution is biased toward the small end.
- `softness: number` — default `0.62`
  Edge width, 0..1. 0 is a hard silhouette, 1 is a pure gradient. Floored at one device pixel.
- `spin: number` — default `0.5`
  Peak spin in radians per second; each particle takes a signed fraction of it.
- `speed: number` — default `1`
  Multiplier on the whole drift, including the upward march.
- `wander: number` — default `0.06`
  Sinusoidal wander amplitude in field units, where 1 is the container.
- `opacity: number` — default `0.55`
  Overall alpha multiplier applied in the fragment shader.
- `colorA: string` — default `'#9fb4cc'`
  First tint. Any value ogl's `Color` accepts.
- `colorB: string` — default `'#e8ddc9'`
  Second tint; each particle mixes between the two by a seeded amount.
- `background: string` — default `'#07090d'`
  Opaque clear colour the additive field is composited onto.
- `seed: number | string` — default `'instanced-quad-particles'`
  Seeds the scatter. Same seed, same field on every reload and on the server.
- `className: string`
  Merged onto the host element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function InstancedQuadParticles({
  density = 900,
  maxCount = 1800,
  sizeRange = [5, 28],
  softness = 0.62,
  spin = 0.5,
  speed = 1,
  wander = 0.06,
  opacity = 0.55,
  colorA = '#9fb4cc',
  colorB = '#e8ddc9',
  background = '#07090d',
  seed = 'instanced-quad-particles',
  className,
}: InstancedQuadParticlesProps) {
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

  const [minSize = 5, maxSize = 28] = sizeRange;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    if (!hasWebGL()) {
      setUnsupported(true);
      return;
    }

    // ogl creates its own canvas, and it is appended and removed per effect
    // run. Reusing one React-owned canvas would break under StrictMode: the
    // cleanup force-loses the context, and `getContext` on that same element
    // afterwards hands back the dead one rather than a fresh context.
    const renderer = new Renderer({
      dpr: pixelRatio(MAX_DPR),
      // Opaque, so the field owns every pixel and reads the same on a light or
      // a dark page. Additive blending onto a transparent canvas would have to
      // brighten whatever is behind it, which is the page background, which
      // the GPU cannot see.
      alpha: false,
      // Nothing is sorted and nothing occludes anything, so a depth buffer is
      // memory and a clear per frame for no result.
      depth: false,
      antialias: false,
      // The field is fill-bound, not shader-bound. Asking for the discrete GPU
      // on a laptop costs battery and buys nothing.
      powerPreference: 'low-power',
    });

    const gl = renderer.gl;
    const canvas = gl.canvas;

    const bg = new Color(background);
    gl.clearColor(bg.r, bg.g, bg.b, 1);

    // Four vertices, six indices, shared by every instance.
    const quad = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);
    const index = new Uint16Array([0, 1, 2, 0, 2, 3]);

    const total = Math.max(MIN_COUNT, Math.round(maxCount));
    const origins = new Float32Array(total * 2);
    const params = new Float32Array(total * 4);
    const seeds = new Float32Array(total * 4);

    const rng = createRng(seed);
    const lo = Math.max(1, Math.min(minSize, maxSize));
    const hi = Math.max(lo + 0.5, Math.max(minSize, maxSize));

    for (let i = 0; i < total; i += 1) {
      origins[i * 2] = randRange(rng, X_MIN, X_MAX);
      origins[i * 2 + 1] = rng();

      // Biased toward small: a linear distribution puts a quarter of the
      // population in the largest quarter of the size range, and a hundred
      // 28px blobs is fog rather than dust.
      const sizeT = Math.pow(rng(), SIZE_BIAS);
      params[i * 4] = lo + (hi - lo) * sizeT;
      params[i * 4 + 1] = randRange(rng, -1, 1) * spin;
      // Big particles are dimmer. Alpha per particle rather than per pixel
      // keeps the total light roughly constant as the size scales.
      params[i * 4 + 2] = 1 - 0.78 * sizeT;
      params[i * 4 + 3] = rng();

      seeds[i * 4] = rng() * Math.PI * 2;
      seeds[i * 4 + 1] = rng() * Math.PI * 2;
      seeds[i * 4 + 2] = rng();
      // A third are discs. The rest are shards, and the shards are the only
      // reason per-particle rotation is visible at all.
      seeds[i * 4 + 3] = rng() < 0.34 ? 0 : randRange(rng, 0.55, 1);
    }

    const geometry = new Geometry(gl, {
      index: { data: index },
      position: { size: 2, data: quad },
      aOrigin: { size: 2, data: origins, instanced: 1 },
      aParams: { size: 4, data: params, instanced: 1 },
      aSeed: { size: 4, data: seeds, instanced: 1 },
    });

    const uniforms: Uniforms = {
      uResolution: { value: [1, 1] },
      uPixelRatio: { value: renderer.dpr },
      uElapsed: { value: 0 },
      uDrift: { value: speed },
      uRise: { value: RISE },
      uFlowScale: { value: FLOW_SCALE },
      uWander: { value: wander },
      uFadeBand: { value: FADE_BAND },
      uColorA: { value: new Color(colorA) },
      uColorB: { value: new Color(colorB) },
      uSoftness: { value: clamp(softness, 0, 1) },
      uOpacity: { value: opacity },
    };

    const program = new Program(gl, {
      vertex: INSTANCED_QUAD_PARTICLES_VERT,
      fragment: INSTANCED_QUAD_PARTICLES_FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      // ogl defaults `cullFace` to BACK. The quad's index winding is not
      // guaranteed to face the way the driver expects once it is rotated in
      // the vertex shader, and a culled particle is simply absent.
      cullFace: false,
    });
    // Additive, overriding the source-over that `transparent: true` selected.
    // Order independent, so a thousand overlapping instances need no sort —
    // which is what makes one draw call possible in the first place.
    program.setBlendFunc(gl.ONE, gl.ONE);

    const mesh = new Mesh(gl, { geometry, program });

    el.appendChild(canvas);
    canvas.style.display = 'block';

    const resize = (w: number, h: number) => {
      renderer.setSize(w, h);
      // `setSize` writes literal px into the canvas's inline style, which wins
      // over any class. Re-asserting percentages keeps the element fluid
      // between resize notifications.
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
      uniforms.uPixelRatio.value = renderer.dpr;

      // Population from area, not from a fixed number: the same density looks
      // right in a 320px card and in a 2000px hero. The buffers already hold
      // `total` particles in scattered order, so a prefix of them is still a
      // spatially even field — no rebuild, no reallocation.
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
    draw(STATIC_ELAPSED);

    return () => {
      stage.current = null;
      // ogl has no `dispose()`: `remove()` on the geometry deletes its VAOs and
      // every buffer, `remove()` on the program deletes the shaders and the
      // program, and only then is the context worth handing back.
      geometry.remove();
      program.remove();
      loseContext(gl);
      canvas.width = 0;
      canvas.height = 0;
      canvas.remove();
    };
  }, [
    ready,
    density,
    maxCount,
    minSize,
    maxSize,
    softness,
    spin,
    speed,
    wander,
    opacity,
    colorA,
    colorB,
    background,
    seed,
  ]);

  // Resize is its own effect: a reflow costs a `setSize` and an instanced-count
  // change, never a buffer rebuild.
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

**Cleanup.** `geometry.remove()` deletes every VAO and every buffer, `program.remove()` deletes the shaders and the program, then `loseContext(gl)` hands the context back through `WEBGL_lose_context` — ogl has no `dispose()` and nothing else releases a context. The canvas backing store is zeroed and the node removed, so the drawing buffer goes with it rather than waiting for GC.

**Reduced motion.** The rAF subscription is never made and the field is drawn once at `elapsed` 0. That is a complete, correct frame rather than a collapsed one: the scatter, sizes, tints, shapes and spin phases are all per-particle seeds that already vary at t=0, and the wrap fade applies exactly as it does in motion. Resizing redraws the same still.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Reaching for `gl_PointSize`. It is capped — 255px on a great many drivers, and the cap is silent — it cannot be rotated, and the sprite is culled by its centre point, so anything large blinks out while half of it is still on screen.
- Leaving ogl's `cullFace` at its default. `Program` defaults it to `gl.BACK`; once the quad corners are rotated in the vertex shader the winding the driver sees is not the winding you authored, and culled particles are simply absent with no error anywhere.
- Rotating the corner offset after converting to clip space. The container aspect ratio shears it, so a particle is square only when the container is, and it visibly changes shape through a spin.
- Rebuilding the buffers on resize to change the particle count. `setInstancedCount` selects a prefix of what is already uploaded; reallocating 72 KB of GPU memory on every ResizeObserver notification is a stall for no visual difference.
- Wrapping with `fract` and no fade. The seam is a hard teleport, and at 1800 particles something is crossing it constantly, so the field flickers along one edge.
- Compositing an additive field onto a transparent canvas. Additive needs to know what it is adding to; with `alpha: true` the destination is zero, the result is the particle colour flat, and the field looks pasted on rather than glowing.
- Reusing one React-owned canvas across effect runs. Cleanup force-loses the context, and `getContext` on that same element afterwards returns the dead one — under StrictMode's mount / unmount / mount that means every instance is permanently black. ogl creates its own canvas, which is appended and removed per run.
- Assuming `renderer.setSize` leaves the CSS alone. ogl writes literal px into the canvas's inline `style`, which beats any class; the percentages have to be re-asserted after every call or the element stops being fluid.

## Notes

- ogl rather than three: the whole component is one instanced mesh with no lights, no camera and no scene graph, and ogl's `Geometry` exposes instanced attributes directly with `instanced: 1` instead of through an `InstancedBufferGeometry` wrapper.
- No camera is passed to `renderer.render`, which is deliberate. Without one ogl skips frustum culling and the matrix uniforms entirely — the shader writes clip space itself, so a projection matrix would be an identity multiply per vertex.
- `depth: false` on the context. Nothing occludes anything under additive blending, so a depth buffer would be memory plus a clear per frame for no result.
- Sizes are authored in CSS pixels and multiplied by the pixel ratio in the shader, so the field looks identical across a dpr change and nothing needs rebuilding when one happens.
- GLSL ES 1.00 with no derivative functions: the edge anti-aliasing floor is `1.0 / sizePx`, which is exact for a quad of that pixel size, so the same source compiles under a WebGL1 fallback context where `fwidth` needs an extension.

## Definition of done

The field drifts upward and sideways with no visible seam at the top or bottom edge, and no particle ever appears or vanishes abruptly. Individual particles spin, and the shards are visibly rotating rather than shimmering. Resize the container narrow and wide: particles stay square at every aspect ratio, and the population changes without a stutter. One draw call per frame in a frame capture, whatever the count. Mount and unmount a dozen instances and none of the earlier ones go black.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
