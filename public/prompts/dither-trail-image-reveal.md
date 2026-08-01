# Build: Dither Trail Image Reveal

The image rests dimmed and near-monochrome; dragging across it restores it through a trail of 5px blocks, each block either lit or not according to an 8x8 Bayer threshold. Twenty-four pointer samples live about a second and ride in two flat uniform arrays, so the whole trail is one fullscreen quad with no geometry and no render targets. Samples are spawned on distance travelled by a damped follower rather than per event, and each carries the velocity it was born with, so the reveal smears the way the hand moved.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A dimmed image restored through a trail of Bayer-thresholded blocks that smear in the direction the pointer moved.

- Category: cursor
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. The trail is state, not geometry. Twenty-four samples sit in a ring buffer as `vec4(u, v, life, speed)` plus a parallel `vec2` of velocity, uploaded as two flat uniform arrays every frame. The fragment shader loops all twenty-four and takes `max()` of their contributions, so a full trail costs one quad and twenty-four `length()` calls per fragment — no instanced sprites, no ping-pong feedback buffer, nothing to resize.
2. A sample is released when the FOLLOWER has travelled `spawnDistance`, or after `spawnInterval` with no movement. Spawning per pointer event instead clumps on a slow drag — events fire on sub-pixel movement — and leaves gaps on a flick, because the ring is short and a fast sweep can consume all of it between two frames. The time floor is what keeps a stationary hover from decaying to nothing under the cursor.
3. The Bayer threshold is sampled at the CENTRE of the 5px block the fragment sits in, not at the fragment itself. Per-fragment sampling lets the disc edge cut through a block, which puts a soft antialiased boundary on an effect whose entire argument is that it has none. Per-block, a block is wholly lit or wholly absent and the reveal has a dither vocabulary.
4. The 8x8 matrix is built recursively — `bayer4(a) = bayer2(a * 0.5) * 0.25 + bayer2(a)`, and again for 8 — because GLSL ES 1.00 has no integer bitwise operators and the usual derivation is bit-twiddled. Three multiplies and a `fract` produce the same 64-value ordering with no lookup texture and no GLSL3 upgrade.
5. Each sample contributes its stored velocity to a flow vector, weighted by how much it contributed to the mask, and the sum is clamped. The image is then sampled at `uv - flow`, with the flow SNAPPED to the same 5px grid as the dither: a smooth sub-pixel offset is a directional blur laid on top of the picture, while a snapped one moves whole blocks and belongs to the same rendering as the dots.
6. Colour is quantised twice at two different frequencies — the reveal mask against a per-block threshold, the tone against a per-pixel one — so the shape of the trail and the banding of the image do not moire against each other.
7. `object-fit: cover` is reproduced in uv space from the intrinsic aspect of the decoded texture, so the shader crops exactly the way the equivalent CSS would and a resize is two uniform writes rather than a re-layout.
8. The pointer state updates every frame while the DRAW is throttled to 30fps. The trail geometry is smooth because the samples are, and 30fps is invisible through 5px blocks; halving the draw rate halves the fill, which is the only real cost here.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `TRAIL_POINTS = 24`
  Ring length, and a compile-time `#define` because GLSL ES 1.00 needs a constant loop bound. At the default spacing this is roughly a second of trail. Past ~48 the shader is doing more work than the image is worth, and the far end of the trail is below the first dither level anyway.
- `MAX_BUFFER_WIDTH = 1100`
  Absolute cap on drawing-buffer width in device pixels, applied on top of the dpr cap. The output is 5px blocks quantised to four levels, so a wider buffer resolves nothing: a 2560px hero at dpr 2 would shade 26 million fragments per draw for a picture with no detail above the block size.
- `fps = 30`
  Draw ceiling. This is an overlay, not the subject, and the block size hides the difference between 30 and 120. The accumulator subtracts the budget rather than zeroing, so the long-run rate is exact instead of quietly losing the remainder each frame.
- `smoothing = 0.0002`
  Fraction of the pointer gap still remaining after one second — an ~80ms half-life. Tighter than a glow needs, because the trail has a visible head: lag past ~150ms and the reveal is drawing where the pointer was, which reads as dropped frames.
- `spawnDistance / spawnInterval = 0.012 / 0.042`
  Roughly 1.2% of the container per sample, or one every 42ms if the pointer is still. Below ~0.006 a slow drag exhausts the ring in a few centimetres; above ~0.03 a fast sweep is visibly a string of beads.
- `trail radius = 0.055 -> 0.115`
  A sample GROWS as it ages, so the trail widens and softens behind the head instead of fading as a constant-width stripe. Equal radii read as a paint stroke; the taper is what makes it a wake.
- `FLOW_MAX / FLOW_CLAMP = 0.04 / 0.055`
  Per-sample and total displacement ceilings in uv units. Uncapped, a flick tears the image into unrecognisable stripes; the total clamp also stops overlapping samples from summing into a displacement several times either individual one.
- `levels = 4`
  Quantisation steps per channel inside the reveal. Two is a duotone stencil that loses the photograph; past ~8 the dither is too fine to read as one and the effect looks like a slightly noisy image.
- `Bayer epsilon = 0.001`
  The matrix contains a zero cell, so `step(threshold, soft)` lights that cell in every block on the canvas — a permanent sparse grid of stray pixels everywhere the trail has never been. Biasing the threshold is what keeps the untouched area untouched.

## API

```ts
function DitherTrailImageReveal(props: { src: string; alt?: string; levels?: number; blockSize?: number; trailLife?: number; spawnDistance?: number; spawnInterval?: number; flowGain?: number; smoothing?: number; restBrightness?: number; restSaturation?: number; fps?: number; maxDpr?: number; className?: string }): JSX.Element
```

- `src: string`
  Required. Image URL — http(s), blob: or data:. Never a bundled asset.
- `alt: string` — default `''`
  Accessible name for the panel. Empty marks it decorative.
- `levels: number` — default `4`
  Quantisation steps per channel inside the reveal.
- `blockSize: number` — default `5`
  Dither block size in CSS pixels.
- `trailLife: number` — default `1.05`
  Life of one trail sample in seconds.
- `spawnDistance: number` — default `0.012`
  Follower travel in uv units that releases the next sample.
- `spawnInterval: number` — default `0.042`
  Seconds after which a sample is released even with no movement.
- `flowGain: number` — default `0.03`
  uv offset stored per uv/second of pointer velocity.
- `smoothing: number` — default `0.0002`
  Fraction of the pointer gap still remaining after one second.
- `restBrightness: number` — default `0.5`
  Brightness of the untouched image, 0 to 1.
- `restSaturation: number` — default `0.16`
  Saturation of the untouched image, 0 to 1.
- `fps: number` — default `30`
  Draw rate ceiling. Pointer state still updates every frame.
- `maxDpr: number` — default `1.5`
  Device pixel ratio cap, before the 1100px absolute buffer cap.
- `className: string`
  Merged onto the root container via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Samples in the ring. Must match TRAIL_POINTS in the fragment shader. */
const TRAIL_POINTS = 24;
/**
 * Hard cap on drawing-buffer width in device pixels. An overlay of 5px blocks
 * carries no detail a wider buffer could resolve, and fill is the whole cost:
 * a 2560px hero at dpr 2 would shade 26 million fragments per draw for a
 * picture that is quantised to four levels.
 */
const MAX_BUFFER_WIDTH = 1100;
/** uv units per second at which the speed term saturates. */
const SPEED_FULL_SCALE = 1.6;
/** Fraction of the velocity gap left after a second. Fast: speed must track. */
const VELOCITY_SMOOTHING = 0.001;
/** Ceiling on a single sample's stored flow, in uv units. */
const FLOW_MAX = 0.04;
/** Ceiling on the SUM of all samples' flow, applied in the shader. */
const FLOW_CLAMP = 0.055;

/** The reduced-motion still: a frozen swipe with a plausible velocity. */
const STILL_POINTS = 9;
const STILL_FLOW: readonly [number, number] = [0.02, 0.008];

interface RevealUniforms {
  /** three types `uniforms` as an open record; the index signature matches it. */
  [name: string]: THREE.IUniform;
  uResolution: THREE.IUniform<THREE.Vector2>;
  uImage: THREE.IUniform<THREE.Texture | null>;
  uHasImage: THREE.IUniform<number>;
  uUvScale: THREE.IUniform<THREE.Vector2>;
  uUvOffset: THREE.IUniform<THREE.Vector2>;
  /** Flat vec4 array: three's uniform setters take a typed array unchanged. */
  uTrail: THREE.IUniform<Float32Array>;
  uFlow: THREE.IUniform<Float32Array>;
  uBlock: THREE.IUniform<number>;
  uLevels: THREE.IUniform<number>;
  uFlowClamp: THREE.IUniform<number>;
  uRestBrightness: THREE.IUniform<number>;
  uRestSaturation: THREE.IUniform<number>;
}

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  geometry: THREE.PlaneGeometry;
  material: THREE.ShaderMaterial;
  uniforms: RevealUniforms;
  placeholder: THREE.DataTexture;
  render: () => void;
}

interface TrailSample {
  x: number;
  y: number;
  /** Elapsed seconds at spawn. Negative means the slot has never been used. */
  born: number;
  flowX: number;
  flowY: number;
  speed: number;
}

/**
 * A 1x1 opaque texture, bound before anything has loaded. Sampling an unbound
 * sampler2D is undefined behaviour: some drivers return black, some warn on
 * every draw, and one of them will be the reviewer's.
 */
function createPlaceholder(): THREE.DataTexture {
  const texture = new THREE.DataTexture(new Uint8Array([16, 17, 21, 255]), 1, 1);
  texture.needsUpdate = true;
  return texture;
}

export function DitherTrailImageReveal({
  src,
  alt = '',
  levels = 4,
  blockSize = 5,
  trailLife = 1.05,
  spawnDistance = 0.012,
  spawnInterval = 0.042,
  flowGain = 0.03,
  smoothing = 0.0002,
  restBrightness = 0.5,
  restSaturation = 0.16,
  fps = 30,
  maxDpr = 1.5,
  className,
}: DitherTrailImageRevealProps) {
  const host = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { rootMargin: '10%' });
  const visible = useVisibility();
  const reduced = useReducedMotion();
  /* A trail needs a pointer that exists while no button is held. On touch
     `pointermove` only fires mid-drag, so the reveal would appear under the
     finger that is covering it and then be stranded on lift. */
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);
  const [failed, setFailed] = useState(false);

  /** The decoded image, kept across renderer rebuilds so a resize never refetches. */
  const image = useRef<THREE.Texture | null>(null);
  /** Intrinsic aspect of that image; 0 until one has decoded. */
  const imageAspect = useRef(0);

  const target = useRef<{ x: number; y: number } | null>(null);
  const inside = useRef(false);
  const follow = useRef({ x: 0.5, y: 0.5 });
  const velocity = useRef({ x: 0, y: 0 });
  const lastSpawn = useRef({ x: 0.5, y: 0.5, at: -1 });
  const writeIndex = useRef(0);
  const budget = useRef(0);

  const trail = useRef<TrailSample[]>(
    Array.from({ length: TRAIL_POINTS }, () => ({
      x: 0,
      y: 0,
      born: -1,
      flowX: 0,
      flowY: 0,
      speed: 0,
    })),
  );

  const live = useRef({
    levels,
    blockSize,
    trailLife,
    spawnDistance,
    spawnInterval,
    flowGain,
    smoothing,
    restBrightness,
    restSaturation,
    fps,
  });
  live.current = {
    levels,
    blockSize,
    trailLife,
    spawnDistance,
    spawnInterval,
    flowGain,
    smoothing,
    restBrightness,
    restSaturation,
    fps,
  };

  const ready = supported && width > 1 && height > 1;

  /** object-fit: cover, replicated in uv space so the shader matches the CSS. */
  const applyCover = (w: number, h: number) => {
    const s = stage.current;
    if (!s || w < 1 || h < 1) return;
    const ia = imageAspect.current;
    if (ia <= 0) {
      s.uniforms.uUvScale.value.set(1, 1);
      s.uniforms.uUvOffset.value.set(0, 0);
      return;
    }
    const canvasAspect = w / h;
    if (ia > canvasAspect) {
      // Image is wider than the box: crop the sides.
      const scale = canvasAspect / ia;
      s.uniforms.uUvScale.value.set(scale, 1);
      s.uniforms.uUvOffset.value.set((1 - scale) * 0.5, 0);
    } else {
      const scale = ia / canvasAspect;
      s.uniforms.uUvScale.value.set(1, scale);
      s.uniforms.uUvOffset.value.set(0, (1 - scale) * 0.5);
    }
  };

  useEffect(() => {
    const slot = mount.current;
    if (!slot || !ready) return;

    /* The canvas is created here rather than owned by React. `reactStrictMode`
       double-invokes this effect; the first cleanup calls `forceContextLoss()`,
       and `getContext` on that same element afterwards returns the DEAD context
       instead of a fresh one — blank in development, fine in production, which
       is the worst way for a bug to behave. */
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    });
    // Two caps, and the lower wins: a ratio cap for sane machines and an
    // absolute width cap so a 4K hero cannot ask for a 7680px buffer.
    const ratio = Math.min(pixelRatio(maxDpr), MAX_BUFFER_WIDTH / Math.max(width, 1));
    renderer.setPixelRatio(Math.max(ratio, 0.5));
    renderer.setSize(width, height, false);
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    slot.appendChild(canvas);

    const placeholder = createPlaceholder();

    const uniforms: RevealUniforms = {
      uResolution: { value: new THREE.Vector2(width, height) },
      uImage: { value: image.current ?? placeholder },
      uHasImage: { value: image.current ? 1 : 0 },
      uUvScale: { value: new THREE.Vector2(1, 1) },
      uUvOffset: { value: new THREE.Vector2(0, 0) },
      uTrail: { value: new Float32Array(TRAIL_POINTS * 4) },
      uFlow: { value: new Float32Array(TRAIL_POINTS * 2) },
      uBlock: { value: blockSize },
      uLevels: { value: levels },
      uFlowClamp: { value: FLOW_CLAMP },
      uRestBrightness: { value: restBrightness },
      uRestSaturation: { value: restSaturation },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: ditherTrailImageRevealVertexShader,
      fragmentShader: ditherTrailImageRevealFragmentShader,
      uniforms,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry, material));
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const render = () => renderer.render(scene, camera);

    /* Listeners on the CANVAS, not the window: a document-level handler
       outlives the renderer it drives, and the rect it measures is not the rect
       being drawn into. Passive, because nothing calls preventDefault here and
       a non-passive move handler stalls the compositor on every event. */
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      target.current = {
        x: (event.clientX - rect.left) / rect.width,
        // Flipped: uv y is up, client y is down.
        y: 1 - (event.clientY - rect.top) / rect.height,
      };
      if (!inside.current) {
        // Entering: teleport the follower rather than damping to it, or the
        // trail draws a stripe from wherever the pointer was last seen.
        follow.current.x = target.current.x;
        follow.current.y = target.current.y;
        lastSpawn.current.x = target.current.x;
        lastSpawn.current.y = target.current.y;
        velocity.current.x = 0;
        velocity.current.y = 0;
      }
      inside.current = true;
    };
    const onLeave = () => {
      inside.current = false;
      // Samples already in the ring keep ageing out on their own, so the trail
      // finishes its life instead of vanishing the instant the pointer leaves.
    };

    canvas.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerleave', onLeave, { passive: true });
    canvas.addEventListener('pointercancel', onLeave, { passive: true });

    stage.current = {
      renderer,
      scene,
      camera,
      geometry,
      material,
      uniforms,
      placeholder,
      render,
    };
    applyCover(width, height);
    render();

    return () => {
      stage.current = null;
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointercancel', onLeave);
      // `dispose()` frees GPU objects but leaves the context alive until GC
      // decides otherwise. `disposeRenderer` is the one that force-loses it,
      // and the per-process budget is about sixteen contexts.
      disposeRenderer(renderer);
      geometry.dispose();
      material.dispose();
      placeholder.dispose();
      canvas.remove();
    };
    // Everything else is pushed through `live` or the uniforms from the loop.
    // Rebuilding on a prop change would churn WebGL contexts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, maxDpr]);

  /* Loading is its own effect and its own lifetime. It never throws: a 404
     leaves `uHasImage` at 0 and the shader keeps drawing its stand-in. */
  useEffect(() => {
    if (!ready || !src) return;
    let cancelled = false;
    setFailed(false);

    const loader = new THREE.TextureLoader();
    loader.load(
      src,
      (texture) => {
        if (cancelled) {
          // The component unmounted, or `src` changed, mid-decode. Without this
          // the texture is uploaded to a dead context and then leaked.
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        // No mipmaps: the quad is screen-filling, the image is never minified
        // past 1:1, and mipmapping a non-power-of-two texture silently fails.
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        image.current?.dispose();
        image.current = texture;

        const source = texture.image as { width?: number; height?: number } | null;
        const w = source?.width ?? 0;
        const h = source?.height ?? 0;
        imageAspect.current = w > 0 && h > 0 ? w / h : 0;

        const s = stage.current;
        if (!s) return;
        s.uniforms.uImage.value = texture;
        s.uniforms.uHasImage.value = 1;
        applyCover(width, height);
        s.render();
      },
      undefined,
      () => {
        if (cancelled) return;
        // A missing image is a content problem, not a crash. The stand-in field
        // keeps the panel legible and the trail keeps working on top of it.
        setFailed(true);
        imageAspect.current = 0;
        const s = stage.current;
        if (!s) return;
        s.uniforms.uHasImage.value = 0;
        s.render();
      },
    );

    return () => {
      cancelled = true;
    };
    // `width`/`height` are read for the cover fit but must not retrigger a
    // fetch; the resize effect re-applies the fit on its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, ready]);

  // The decoded texture outlives the renderer, so it is released on unmount
  // rather than in the loader effect, which reruns whenever `src` changes.
  useEffect(() => {
    return () => {
      image.current?.dispose();
      image.current = null;
    };
  }, []);

  useEffect(() => {
    const s = stage.current;
    if (!s || width < 1 || height < 1) return;
    const ratio = Math.min(pixelRatio(maxDpr), MAX_BUFFER_WIDTH / width);
    s.renderer.setPixelRatio(Math.max(ratio, 0.5));
    s.renderer.setSize(width, height, false);
    s.uniforms.uResolution.value.set(width, height);
    applyCover(width, height);
    // Redraw once, or a resize while the loop is paused leaves the previous
    // framebuffer stretched across the new size.
    s.render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, maxDpr]);

  const writeTrailUniforms = (elapsed: number, life: number) => {
    const s = stage.current;
    if (!s) return;
    const points = s.uniforms.uTrail.value;
    const flows = s.uniforms.uFlow.value;
    let i = 0;
    for (const sample of trail.current) {
      const age = sample.born < 0 ? Infinity : elapsed - sample.born;
      const remaining = clamp(1 - age / life, 0, 1);
      points[i * 4] = sample.x;
      points[i * 4 + 1] = sample.y;
      points[i * 4 + 2] = remaining;
      points[i * 4 + 3] = sample.speed;
      flows[i * 2] = sample.flowX;
      flows[i * 2 + 1] = sample.flowY;
      i += 1;
    }
  };

  useRaf(
    (dt, elapsed) => {
      const s = stage.current;
      if (!s) return;
      const cfg = live.current;

      const previousX = follow.current.x;
      const previousY = follow.current.y;

      const aim = target.current;
      if (aim) {
        follow.current.x = damp(follow.current.x, aim.x, cfg.smoothing, dt);
        follow.current.y = damp(follow.current.y, aim.y, cfg.smoothing, dt);
      }

      // Velocity of the FOLLOWER, in uv units per second. Dividing by dt is
      // what makes it a velocity rather than a per-frame delta that measures
      // twice as large at 60Hz as at 120Hz for the same hand movement.
      const step = Math.max(dt, 0.0001);
      velocity.current.x = damp(
        velocity.current.x,
        (follow.current.x - previousX) / step,
        VELOCITY_SMOOTHING,
        dt,
      );
      velocity.current.y = damp(
        velocity.current.y,
        (follow.current.y - previousY) / step,
        VELOCITY_SMOOTHING,
        dt,
      );

      /* Spawn on DISTANCE travelled, or on a time floor. Distance alone gives
         an evenly spaced trail but lets the reveal decay to nothing under a
         pointer that has stopped; the time floor keeps a stationary hover
         alive. Spawning per event instead would clump on a slow drag and smear
         on a flick, because events fire on sub-pixel movement. */
      if (inside.current && aim) {
        const moved = Math.hypot(
          follow.current.x - lastSpawn.current.x,
          follow.current.y - lastSpawn.current.y,
        );
        const waited = elapsed - lastSpawn.current.at;
        if (moved >= cfg.spawnDistance || waited >= cfg.spawnInterval) {
          const slot = trail.current[writeIndex.current % TRAIL_POINTS];
          if (slot) {
            writeIndex.current = (writeIndex.current + 1) % TRAIL_POINTS;
            slot.x = follow.current.x;
            slot.y = follow.current.y;
            slot.born = elapsed;
            slot.flowX = clamp(velocity.current.x * cfg.flowGain, -FLOW_MAX, FLOW_MAX);
            slot.flowY = clamp(velocity.current.y * cfg.flowGain, -FLOW_MAX, FLOW_MAX);
            slot.speed = clamp(
              Math.hypot(velocity.current.x, velocity.current.y) / SPEED_FULL_SCALE,
              0,
              1,
            );
          }
          lastSpawn.current.x = follow.current.x;
          lastSpawn.current.y = follow.current.y;
          lastSpawn.current.at = elapsed;
        }
      }

      const life = Math.max(cfg.trailLife, 0.05);
      writeTrailUniforms(elapsed, life);

      const u = s.uniforms;
      u.uBlock.value = Math.max(cfg.blockSize, 1);
      u.uLevels.value = Math.max(cfg.levels, 2);
      u.uRestBrightness.value = cfg.restBrightness;
      u.uRestSaturation.value = cfg.restSaturation;

      /* Draw-rate throttle. The state above updates every frame — a trail
         sampled at 30Hz has visible corners — but the DRAW is the expensive
         half and 30fps is indistinguishable through 5px blocks. Subtracting
         the budget rather than zeroing the accumulator keeps the long-run rate
         exact instead of quietly losing the remainder every frame. */
      const frameBudget = 1 / clamp(cfg.fps, 10, 120);
      budget.current += dt;
      if (budget.current < frameBudget) return;
      budget.current = Math.min(budget.current - frameBudget, frameBudget);

      s.render();
    },
    ready && inView && visible && !reduced && finePointer,
  );

  /* Reduced motion, and coarse pointers, get a composed still: a short frozen
     swipe baked into the ring so the panel shows what the effect produces. The
     listeners stay attached and their target is never consumed. */
  useEffect(() => {
    const s = stage.current;
    if (!s || !ready) return;
    if (!reduced && finePointer) return;

    const [flowX = 0.02, flowY = 0.008] = STILL_FLOW;
    let i = 0;
    for (const sample of trail.current) {
      const t = i / (STILL_POINTS - 1);
      const inSwipe = i < STILL_POINTS;
      sample.x = 0.3 + t * 0.42;
      sample.y = 0.4 + Math.sin(t * 2.2) * 0.12;
      sample.flowX = flowX;
      sample.flowY = flowY;
      sample.speed = inSwipe ? 0.45 : 0;
      // `born` is unused by the still: lives are written straight below.
      sample.born = -1;
      i += 1;
    }

    const points = s.uniforms.uTrail.value;
    const flows = s.uniforms.uFlow.value;
    let j = 0;
    for (const sample of trail.current) {
      const remaining = j < STILL_POINTS ? 1 - j / STILL_POINTS : 0;
      points[j * 4] = sample.x;
      points[j * 4 + 1] = sample.y;
      points[j * 4 + 2] = remaining;
      points[j * 4 + 3] = sample.speed;
      flows[j * 2] = sample.flowX;
      flows[j * 2 + 1] = sample.flowY;
      j += 1;
    }
    s.render();
  }, [reduced, finePointer, ready, width, height]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes the three pointer listeners from the canvas, nulls the stage ref so an in-flight frame cannot touch a dead renderer, then `disposeRenderer(renderer)` — which force-loses the context, not just `dispose()`, since Chromium keeps roughly sixteen per process and drops the oldest — followed by the geometry, the material and the 1x1 placeholder texture, and finally removes the canvas from the DOM. The decoded image texture is disposed in a separate unmount effect, and an in-flight decode is cancelled by a flag so its callback disposes the result instead of binding it.

**Reduced motion.** The loop never starts. A short frozen swipe — nine samples with descending life and a plausible velocity — is baked into the ring and one frame is drawn, so the panel shows what the effect produces rather than a flat dimmed image. Coarse pointers get the same still, for the same reason. The listeners stay attached but their target is never consumed, so moving the pointer changes nothing.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Pushing pointer events straight into the trail. Event positions are not a path: they arrive at whatever rate the device chooses, cluster on slow movement and stop dead when the hand pauses. The handler records a target only; the loop damps a follower toward it and samples the follower.
- Damping with a per-frame constant (`x += (t - x) * 0.1`) instead of `damp(..., dt)`. The trail is visibly tighter at 120Hz than at 60Hz, so the feel is tuned to whichever machine it was authored on.
- Measuring velocity as a per-frame delta rather than dividing by `dt`. The same hand movement then reads as half the speed at 120Hz, and the smear strength — and with it the whole character of the effect — depends on the display.
- Sampling the Bayer threshold per fragment instead of per block. The reveal edge becomes smooth, which is precisely the thing a dither is supposed to replace, and the block grid stops being legible.
- Comparing against the Bayer matrix without an epsilon. Its zero cell passes `step()` everywhere, so one pixel in every 5x5 block is lit across the entire canvas, including areas the pointer has never visited.
- Dividing the 8x8 matrix by 63 instead of 64. A threshold of exactly 1.0 means the brightest level can never be selected, and the whitest part of the image clips one step down.
- Assuming `src` is decoded. A `TextureLoader` result arrives asynchronously and may never arrive at all. Leaving the sampler unbound until then is undefined behaviour — black on some drivers, a console warning per draw on others. A 1x1 placeholder is bound from the first frame and a `uHasImage` float selects a procedural stand-in.
- Letting a 404 throw or blank the panel. A component that cannot survive a missing image cannot be dropped into a CMS-backed page. The error callback leaves `uHasImage` at 0 and the trail keeps working over the stand-in field.
- Not cancelling an in-flight decode. If `src` changes or the component unmounts mid-load, the callback fires against a dead renderer and the texture is uploaded and then leaked. A `cancelled` flag disposes it instead.
- Rendering at full device pixel ratio. Fill is the entire cost of a fullscreen quad and it scales with the square of the ratio, for an image whose smallest feature is deliberately five pixels wide.
- Owning the canvas in React while calling `forceContextLoss()` on cleanup. Under `reactStrictMode` the effect runs twice and the second `getContext` on that same element returns the DEAD context: blank in development, fine in production, which is the worst way for a bug to behave.
- Shipping the demo image as a committed asset. The image is a prop; the demo paints its own canvas and passes a data URL, so the registry carries no binary.

## Notes

- `src` is required and is never bundled. Anything a browser can fetch works: an http(s) URL, a `blob:` from an upload, or a `data:` URL.
- Coarse pointers get the composed still rather than the live effect. `pointermove` only fires mid-drag on touch, so the reveal would appear under the finger covering it and then be stranded on lift.
- Without WebGL the component renders the image plainly with `object-fit: cover`. The picture is the content; the dither is decoration on top of it.
- The decoded texture is held across renderer rebuilds, so a resize or a dpr change re-uploads it rather than refetching. It is disposed in its own unmount effect, separate from the loader effect that reruns on every `src` change.
- Leaving the panel does not clear the trail. Samples keep ageing out on their own, so the reveal finishes its life instead of vanishing on `pointerleave`.
- The root carries `role="img"` and the `alt` text; an empty `alt` marks the whole panel decorative with `aria-hidden` instead.

## Definition of done

At rest the image is visible but dimmed and nearly grey. Drag across it and full colour appears in a trail of hard-edged square blocks that widens and fades behind the pointer, with the blocks smeared along the direction of travel — more on a flick, less on a slow drag. The untouched area contains no stray lit pixels anywhere. Stop moving and the reveal stays alive under the cursor instead of dying. Leave the panel and the trail finishes ageing out where it stands. The follow lag is identical on a 60Hz and a 120Hz display. Point at a `src` that 404s: the panel shows a banded stand-in field, the trail still works, and the console carries no exception. Resize wide and the image stays cover-cropped with no stretching, and the trail discs stay round.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
