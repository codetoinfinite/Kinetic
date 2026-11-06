# Build: Cursor-Reactive Shader Glow

A hero backdrop: a slowly drifting domain-warped noise field with a soft light that follows the pointer through it. The pointer never reaches a uniform directly — the listener records a target and the render loop damps toward it, so the light trails the hand at the same rate on a 60Hz and a 120Hz display. The composed colour is then scaled down until its Rec.709 luminance fits under `ceiling`, which is what makes the glow safe to put white headline copy on top of.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A warped-noise atmosphere with a light that trails the cursor, held under a hard luminance ceiling so copy stays readable.

- Category: webgl
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. A `PlaneGeometry(2, 2)` under an `OrthographicCamera(-1, 1, 1, -1, 0, 1)` is a full-screen quad with no projection maths, so the camera never needs touching on resize and `vUv` is exactly 0..1 across the canvas.
2. The `pointermove` handler converts the event into 0..1 UV space against the canvas rect (flipping y, since UV is up and client y is down) and stores it as a target. The loop then runs `damp(current, target, smoothing, dt)` per axis, where `smoothing` is the fraction of the gap still remaining after one second. The naive `x += (t - x) * 0.1` converges twice as fast at 120Hz as at 60Hz, so the same hand movement would produce a visibly tighter follow on better hardware.
3. The noise is a domain warp: two decorrelated 2-octave fbm samples become a `vec2` offset fed into a third sample. The second channel is shifted by `vec2(2.3, 1.1)` — without that shift both channels return the same number and the warp degenerates into a plain diagonal translation of the field.
4. The pointer is added to all three fbm samples, weighted 0.20, -0.20 and 0.12. The sign flip between the two warp channels makes them shear against each other around the cursor. Three weak influences read as an atmosphere that responds; one strong influence reads as a field glued to the cursor, which is a different and much worse effect.
5. The light itself is two falling `smoothstep(radius, 0.0, d)` ramps — a tight core and a wide halo — mixed 0.65/0.35. The halo is squared, which pushes the last few percent of its falloff below the 8-bit quantisation floor and removes the termination ring the eye otherwise finds at the edge of a single smoothstep on a dark background.
6. Finally `dot(col, vec3(0.2126, 0.7152, 0.0722))` measures the output luminance and the whole vector is multiplied by `min(1.0, ceiling / lum)`. Scaling rather than clamping per channel is deliberate: clamping crushes the brightest channel first and the glow core visibly shifts hue as it brightens.
7. `energy` is measured from the follower's own displacement divided by `dt`, giving UV units per second. Measuring the follower rather than the raw pointer means the signal is already smooth, needs no second filter, and cannot be spiked by one stray event.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `smoothing = 0.0016`
  Fraction of the pointer gap still remaining after one second, so the light closes ~99.8% of the distance per second — roughly a 120ms tail. Raise it to 0.05 and the light lags far enough behind the cursor to feel broken rather than smooth; drop it to 1e-8 and it is welded to the pointer, at which point the damping is doing nothing and a raw uniform write would look identical.
- `ceiling = 0.175`
  Maximum Rec.709 luminance of the output. Against white text this leaves roughly 12:1 contrast, comfortably past the 4.5:1 floor. Past ~0.35 white headline copy over the glow core drops under 4.5:1 and the backdrop starts eating the content it exists to sit behind.
- `coreRadius / haloRadius = 0.22 / 0.85`
  Aspect-corrected UV units. Nearly 4x apart, which is what makes the pair read as one light with a soft surround rather than as two concentric discs. Bring them within ~2x and the halo's edge becomes visible as a ring at the core's boundary.
- `scale = 0.7`
  Noise frequency. Below 1.0 the features are LARGER than the canvas, which is what makes the field read as atmosphere. At 4.0 the same shader is visible turbulence and fights the copy for attention.
- `warp = 0.9`
  How far the two warp channels push the third sample, in noise-space units — just under one full cell. Near 0 the domain warp vanishes and the result is plain fbm with no flow. Past ~2 the warp folds the field back over itself and produces hard creases where the offset reverses.
- `ENERGY_FULL_SCALE = 1.8`
  UV units per second at which `uEnergy` saturates. A deliberate sweep across a hero is roughly 0.6/s, so normal movement lands mid-range and the brightening is legible. Set it to 0.3 and the reading pins at 1 on any movement at all, which makes the parameter meaningless.
- `ENERGY_SMOOTHING / PRESENCE_SMOOTHING = 0.002 / 0.02`
  Energy must track the hand or the brightening arrives after the gesture has finished; presence is a fade in and out and 400ms of it reads as a light coming up. Give presence the fast value and the glow flicks on and off at the canvas boundary.
- `STILL_TIME = 8.2`
  Time slice for the single reduced-motion frame. Not 0, because at t=0 the drift offset is zero on both axes and the field renders its least interesting slice.

## API

```ts
function CursorReactiveShaderGlow(props: { children?: ReactNode; ceiling?: number; coreRadius?: number; haloRadius?: number; scale?: number; warp?: number; fieldGain?: number; glowGain?: number; smoothing?: number; base?: readonly [number, number, number]; tint?: readonly [number, number, number]; glowTint?: readonly [number, number, number]; maxDpr?: number; className?: string }): JSX.Element
```

- `children: ReactNode`
  Overlay content. Pointer-transparent so the canvas keeps receiving moves.
- `ceiling: number` — default `0.175`
  Rec.709 luminance the output may never exceed.
- `coreRadius: number` — default `0.22`
  Radius of the tight glow core, in aspect-corrected UV units.
- `haloRadius: number` — default `0.85`
  Radius of the wide halo. Squared in the shader, so it has no visible edge.
- `scale: number` — default `0.7`
  Noise frequency. Below 1 the features are larger than the canvas.
- `warp: number` — default `0.9`
  How far the two warp channels displace the third noise sample.
- `fieldGain: number` — default `0.08`
  Peak brightness the noise field adds over `base`.
- `glowGain: number` — default `0.1`
  Peak brightness the cursor light adds over `base`.
- `smoothing: number` — default `0.0016`
  Fraction of the pointer gap still remaining after one second.
- `base: readonly [number, number, number]` — default `[0.03, 0.031, 0.038]`
  Deepest colour, linear 0..1 RGB.
- `tint: readonly [number, number, number]` — default `[0.62, 0.7, 0.95]`
  Colour the noise field lifts toward.
- `glowTint: readonly [number, number, number]` — default `[1, 0.94, 0.86]`
  Colour of the cursor light.
- `maxDpr: number` — default `2`
  Device pixel ratio cap. The field is low-frequency, so 2 is already generous.
- `className: string`
  Merged onto the root container via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * UV units per second the follower must cover for `uEnergy` to read 1. A slow
 * deliberate sweep across a hero is roughly 0.6/s; above ~2.5 the reading
 * saturates on ordinary movement and the brightness stops meaning anything.
 */
const ENERGY_FULL_SCALE = 1.8;
/** Fast: energy must track the hand, or the brightening arrives after the move. */
const ENERGY_SMOOTHING = 0.002;
/** Slow: presence is a fade in and out, and 400ms of it reads as a light. */
const PRESENCE_SMOOTHING = 0.02;
/** Fixed time slice for the reduced-motion still. Not 0 — that is a flat frame. */
const STILL_TIME = 8.2;
/** Where the light sits in the reduced-motion still. Off-centre reads composed. */
const STILL_POINTER: readonly [number, number] = [0.34, 0.6];
const STILL_ENERGY = 0.35;

const BASE: readonly [number, number, number] = [0.03, 0.031, 0.038];
const TINT: readonly [number, number, number] = [0.62, 0.7, 0.95];
const GLOW_TINT: readonly [number, number, number] = [1, 0.94, 0.86];

interface GlowUniforms {
  /** three types `uniforms` as an open record; the index signature matches it. */
  [name: string]: THREE.IUniform;
  uResolution: THREE.IUniform<THREE.Vector2>;
  uTime: THREE.IUniform<number>;
  uPointer: THREE.IUniform<THREE.Vector2>;
  uPresence: THREE.IUniform<number>;
  uEnergy: THREE.IUniform<number>;
  uScale: THREE.IUniform<number>;
  uWarp: THREE.IUniform<number>;
  uCoreRadius: THREE.IUniform<number>;
  uHaloRadius: THREE.IUniform<number>;
  uFieldGain: THREE.IUniform<number>;
  uGlowGain: THREE.IUniform<number>;
  uCeiling: THREE.IUniform<number>;
  uBase: THREE.IUniform<THREE.Color>;
  uTint: THREE.IUniform<THREE.Color>;
  uGlowTint: THREE.IUniform<THREE.Color>;
}

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  geometry: THREE.PlaneGeometry;
  material: THREE.ShaderMaterial;
  uniforms: GlowUniforms;
}

export function CursorReactiveShaderGlow({
  children,
  ceiling = 0.175,
  coreRadius = 0.22,
  haloRadius = 0.85,
  scale = 0.7,
  warp = 0.9,
  fieldGain = 0.08,
  glowGain = 0.1,
  smoothing = 0.0016,
  base = BASE,
  tint = TINT,
  glowTint = GLOW_TINT,
  maxDpr = 2,
  className,
}: CursorReactiveShaderGlowProps) {
  const host = useRef<HTMLDivElement>(null);
  const mount = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { rootMargin: '10%' });
  const visible = useVisibility();
  const reduced = useReducedMotion();

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  /* Raw pointer target in 0..1 with y up. `null` means no real pointer has been
     seen, which is distinct from a legitimate pointer in the bottom-left
     corner — the glow must not exist before the first move. */
  const target = useRef<{ x: number; y: number } | null>(null);
  const inside = useRef(false);
  /** The damped follower. Seeded at the centre so the first move eases outward. */
  const pos = useRef({ x: 0.5, y: 0.5 });
  const presence = useRef(0);
  const energy = useRef(0);

  /* Live config, read by the loop. Changing a number must not rebuild the
     renderer: Chromium kills the OLDEST context past ~16 per process, so a
     rebuild on every prop change blanks an unrelated canvas on the page. */
  const live = useRef({
    ceiling,
    coreRadius,
    haloRadius,
    scale,
    warp,
    fieldGain,
    glowGain,
    smoothing,
  });
  live.current = {
    ceiling,
    coreRadius,
    haloRadius,
    scale,
    warp,
    fieldGain,
    glowGain,
    smoothing,
  };

  const ready = supported && width > 1 && height > 1;

  useEffect(() => {
    const slot = mount.current;
    if (!slot || !ready) return;

    /* The canvas is created here, not owned by React. `reactStrictMode` is on,
       so this effect runs twice on mount; the first cleanup calls
       `forceContextLoss()`, and asking a React-owned <canvas> for a context
       afterwards hands back the DEAD one rather than a fresh context, leaving
       the preview permanently blank. A canvas created and removed per effect
       run has no such history. */
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: 'low-power',
      });
    } catch {
      // A context can still be refused between the probe and the construction —
      // the tab may have hit the browser's live-context ceiling in between. three
      // throws rather than returning null, and an uncaught throw here takes the
      // page with it.
      setSupported(false);
      return;
    }
    renderer.setPixelRatio(pixelRatio(maxDpr));
    renderer.setSize(width, height, false);
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    /* `touch-action: none` is deliberately NOT set. This is a decorative
       backdrop; swallowing a touch scroll to feed a glow nobody can see under
       their own finger is a straight downgrade. */
    slot.appendChild(canvas);

    const uniforms: GlowUniforms = {
      uResolution: { value: new THREE.Vector2(width, height) },
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(pos.current.x, pos.current.y) },
      uPresence: { value: 0 },
      uEnergy: { value: 0 },
      uScale: { value: scale },
      uWarp: { value: warp },
      uCoreRadius: { value: coreRadius },
      uHaloRadius: { value: haloRadius },
      uFieldGain: { value: fieldGain },
      uGlowGain: { value: glowGain },
      uCeiling: { value: ceiling },
      uBase: { value: new THREE.Color(base[0], base[1], base[2]) },
      uTint: { value: new THREE.Color(tint[0], tint[1], tint[2]) },
      uGlowTint: { value: new THREE.Color(glowTint[0], glowTint[1], glowTint[2]) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: cursorReactiveShaderGlowVertexShader,
      fragmentShader: cursorReactiveShaderGlowFragmentShader,
      uniforms,
    });

    // A 2x2 plane under an identity ortho camera is a full-screen quad with no
    // projection maths and no camera to keep in sync on resize.
    const geometry = new THREE.PlaneGeometry(2, 2);
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry, material));
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    /* Listener on the CANVAS, not the window: no document-level handler
       survives to drive a disposed renderer, and the rect it measures is the
       rect it draws into. Passive, because nothing here ever calls
       preventDefault and a non-passive move listener on a scrollable page
       forces the compositor to wait for JS on every event. */
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      target.current = {
        x: (event.clientX - rect.left) / rect.width,
        // Flipped: UV y is up, client y is down.
        y: 1 - (event.clientY - rect.top) / rect.height,
      };
      inside.current = true;
    };
    const onLeave = () => {
      // Presence only. Leaving the position alone dims the light where it
      // stands; tweening it away drags a visible streak off the edge.
      inside.current = false;
    };

    canvas.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerleave', onLeave, { passive: true });

    stage.current = { renderer, scene, camera, geometry, material, uniforms };
    renderer.render(scene, camera);

    return () => {
      stage.current = null;
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      // `dispose()` frees GPU objects but leaves the context alive until GC
      // decides otherwise, which may be never. `disposeRenderer` is the one
      // that calls `forceContextLoss()` and actually hands it back.
      disposeRenderer(renderer);
      geometry.dispose();
      material.dispose();
      canvas.remove();
    };
    // Gains are pushed through `live` from the loop and the colours through the
    // effect below, so none of them may appear here — a rebuild per prop change
    // leaks contexts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, maxDpr]);

  /* Colours, written onto the live uniforms. The build effect above reads them
     exactly once, when it constructs the `THREE.Color` objects, and it is
     deliberately not keyed on them — so without this every colour prop was
     frozen at first render. A theme flip or any parent state driving the
     palette left the canvas on its original colours while every other prop
     kept responding, which reads as a broken theme switch rather than an
     unsupported one. Depended on component-wise: the props are tuples, and a
     caller writing one inline would otherwise re-run this on every render. */
  const [baseR, baseG, baseB] = base;
  const [tintR, tintG, tintB] = tint;
  const [glowR, glowG, glowB] = glowTint;
  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    s.uniforms.uBase.value.setRGB(baseR, baseG, baseB);
    s.uniforms.uTint.value.setRGB(tintR, tintG, tintB);
    s.uniforms.uGlowTint.value.setRGB(glowR, glowG, glowB);
    // Render once: the loop is not running under reduced motion or while the
    // component is off screen, and a recolour that waits for the next pointer
    // move is indistinguishable from one that never arrived.
    s.renderer.render(s.scene, s.camera);
  }, [baseR, baseG, baseB, tintR, tintG, tintB, glowR, glowG, glowB]);

  // Resize is its own effect, so a reflow never touches the renderer's lifetime.
  useEffect(() => {
    const s = stage.current;
    if (!s || width < 1 || height < 1) return;
    s.renderer.setPixelRatio(pixelRatio(maxDpr));
    s.renderer.setSize(width, height, false);
    // CSS pixels, not the drawing buffer: the shader only takes the ratio.
    s.uniforms.uResolution.value.set(width, height);
    // Render once, or a resize while paused stretches the previous framebuffer
    // until the pointer moves again.
    s.renderer.render(s.scene, s.camera);
  }, [width, height, maxDpr]);

  useRaf(
    (dt, elapsed) => {
      const s = stage.current;
      if (!s) return;
      const cfg = live.current;

      const previousX = pos.current.x;
      const previousY = pos.current.y;

      const aim = target.current;
      if (aim) {
        pos.current.x = damp(pos.current.x, aim.x, cfg.smoothing, dt);
        pos.current.y = damp(pos.current.y, aim.y, cfg.smoothing, dt);
      }

      // Speed of the follower, in UV units per second. Dividing by dt is what
      // makes it a velocity rather than a per-frame delta that reads twice as
      // large at 60Hz as at 120Hz for the same physical hand movement.
      const travelled = Math.hypot(pos.current.x - previousX, pos.current.y - previousY);
      const speed = travelled / Math.max(dt, 0.0001);
      energy.current = damp(
        energy.current,
        clamp(speed / ENERGY_FULL_SCALE, 0, 1),
        ENERGY_SMOOTHING,
        dt,
      );
      presence.current = damp(
        presence.current,
        inside.current && aim !== null ? 1 : 0,
        PRESENCE_SMOOTHING,
        dt,
      );

      const u = s.uniforms;
      u.uTime.value = elapsed;
      u.uPointer.value.set(pos.current.x, pos.current.y);
      u.uPresence.value = presence.current;
      u.uEnergy.value = energy.current;
      u.uScale.value = cfg.scale;
      u.uWarp.value = cfg.warp;
      u.uCoreRadius.value = cfg.coreRadius;
      u.uHaloRadius.value = cfg.haloRadius;
      u.uFieldGain.value = cfg.fieldGain;
      u.uGlowGain.value = cfg.glowGain;
      u.uCeiling.value = cfg.ceiling;

      s.renderer.render(s.scene, s.camera);
    },
    ready && inView && visible && !reduced,
  );

  /* Reduced motion gets a composed picture, not an empty box: one frame at a
     fixed time slice with the light parked off-centre. Nothing ever moves, and
     the pointer listener stays attached but its target is never consumed. */
  useEffect(() => {
    const s = stage.current;
    if (!s || !reduced || width < 1 || height < 1) return;
    const [stillX = 0.34, stillY = 0.6] = STILL_POINTER;
    s.uniforms.uTime.value = STILL_TIME;
    s.uniforms.uPointer.value.set(stillX, stillY);
    s.uniforms.uPresence.value = 1;
    s.uniforms.uEnergy.value = STILL_ENERGY;
    s.renderer.render(s.scene, s.camera);
  }, [reduced, width, height, ready]);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes the `pointermove` and `pointerleave` listeners from the canvas, nulls the stage ref so an in-flight frame cannot touch a disposed renderer, then calls `disposeRenderer` (which stops the animation loop, disposes the renderer and calls `forceContextLoss()` — `dispose()` alone leaves the context alive until GC decides otherwise, which may be never), disposes the geometry and the `ShaderMaterial`, and removes the canvas from the DOM. Because the canvas is created inside the effect, the StrictMode second run starts from a fresh element and a fresh context.

**Reduced motion.** The render loop never starts. One frame is drawn at a fixed time slice with the light parked at (0.34, 0.6), presence at 1 and energy at 0.35, so the panel is a composed still of the effect at rest rather than a flat rectangle. The pointer listener stays attached but its target is never read, so moving the cursor changes nothing.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Writing the pointer straight into the uniform from the event handler. The shader then gets one raw sample per event: a 120Hz trackpad delivers a staircase, and a dropped frame delivers a jump. The visible symptom is a light that judders during fast movement and snaps after a stall.
- Damping with a per-frame constant (`x += (t - x) * 0.1`). It is not frame-rate independent — the light trails noticeably further behind on a 60Hz laptop than on a 120Hz one, from identical code.
- Aspect-correcting the noise sample space but not the pointer. The glow becomes an ellipse 1.78x too wide on a 16:9 canvas, and the error scales with the container so it looks correct in a square preview and wrong in the hero it was written for.
- Deriving `energy` from raw pointer events. Event deltas depend on the sample rate, so the same hand movement measures differently per device, and one outlier event flashes the whole field.
- Letting the pointer target slide back to the centre on leave. That drags a visible streak of light across the canvas to the middle. Only `presence` is faded, so the light dims where it stands.
- Putting the pointer listener on `window` instead of the canvas. A document-level handler outlives the renderer it was written for, and the rect it measures is not the rect being drawn into — so after a scroll the glow sits at an offset from the cursor.
- Clamping the output per channel instead of scaling the vector. The brightest channel saturates first, so the glow core shifts hue as it gets brighter — a warm light turns pink at its centre.
- Rebuilding the renderer when a colour or gain prop changes. Chromium kills the oldest WebGL context past roughly 16 per renderer process, so a page with several of these blanks an unrelated canvas. Numbers go through a ref the loop reads; only size and support rebuild.
- Owning the `<canvas>` in React while calling `forceContextLoss()` on cleanup. Under `reactStrictMode` the effect runs twice, and the second `getContext` on that same element hands back the dead context — the preview is permanently blank in development and fine in production, which is the worst possible failure mode. The canvas is created inside the effect and removed with it.
- Making the content layer pointer-opaque. It covers the canvas, so `pointermove` stops firing exactly over the headline — the one place the glow is wanted. The overlay is `pointer-events-none`.

## Notes

- The two warp channels sample the same fbm function, so the shader is three fbm evaluations of two octaves each: twelve gradient-noise samples per fragment. Two octaves is enough because the result is immediately crushed by `smoothstep(0.25, 0.85)` and the finer detail is discarded.
- The hash is sin-free. `fract(sin(dot(p, k)) * 43758.5453)` quantises once the angle passes a few thousand radians and grows visible repeating bands — and it fails on mobile GPUs long before it fails on the desktop it was written on.
- Gradient noise rather than value noise: the lattice value is a dot product with a random gradient and is therefore zero at every lattice point, which is what stops the cell corners reading as a faint dot grid in the flat areas.
- Resize lives in its own effect and re-renders one frame, so a reflow while the loop is paused does not leave the previous framebuffer stretched across the new size.
- `touch-action` is deliberately left alone. Swallowing a touch scroll to drive a glow hidden under the user's own finger is a straight downgrade.

## Definition of done

Move the pointer across the panel and a soft light follows it with a short, even tail; the same tail length on a 60Hz and a 120Hz display. Move fast and the light brightens; stop and it settles to a dimmer ember without going out. Leave the panel and the light fades where it stands instead of sliding to the centre. The noise field keeps drifting slowly whether or not the pointer moves. White text over the glow core stays readable at any `glowGain`. Resize the container and the glow stays circular, not elliptical. In development, with StrictMode double-mounting, the canvas renders — it is not blank. With reduced motion the panel is a single composed still.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
