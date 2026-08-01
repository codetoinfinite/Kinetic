# Build: Cylinder Gallery Drum

A flat PlaneGeometry per item, all sharing one compiled program, each bent around a common cylinder by its own uniform. The camera never moves and the CPU never touches a vertex: scrolling changes one float, `position`, and every plane recomputes its angle, its height and its focus weight from that single scalar. Because the ring offset is the shortest signed distance on a circular index, the list is genuinely endless in both directions with no clones and no rebuilding.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Nineteen planes wrapped around a drum in the vertex shader, spun by wheel or scroll, focus falling off from centre.

- Category: webgl
- Runtime cost: webgl
- Dependencies: three@^0.185.1, gsap@^3.15.0, lenis@^1.3.11

## How it works

1. The vertex shader treats a vertex's own x as an arc offset: `angle = uSpiralAngle + position.x`, then `pos.x = uRadius * sin(angle)` and `pos.z = uRadius * cos(angle)`, so one world unit of plane width wraps exactly one radian of drum. `pos.y = sin(position.y)` pulls the top and bottom edges in, which turns a rolled sheet into a barrel.
2. Per frame and per plane, `wrappedOffset(i, position, count)` returns the shortest signed distance from that plane to the focused index — the value that makes index 0 sit one step before index 18 rather than eighteen steps after it. That offset drives `uSpiralAngle = (offset / count) * 2π * turns`, the vertical stack `y = -offset * spacing`, and the focus term.
3. Focus is `gaussian(offset)` = `exp(-offset²)`: 1.0 at the centre, 0.368 one step out, 0.018 two, 0.0001 three. The fragment shader mixes toward luminance and dims by that weight, so attention falls off continuously instead of one plane being flagged "selected".
4. A single `uIntro` scalar lerps between two complete layouts inside the shader — `mix(rowPos, ringPos, uIntro)` — where `rowPos` is a flat facing row and `ringPos` is the drum. Every intermediate value is a valid frame, and the CPU lerps the mesh x/y positions with the same scalar so the two layouts stay consistent.
5. Signed scroll velocity feeds `uDeform`, which adds `sin(position.y * 3.0 + 100.0) * uDeform * 0.07` to z and `sin(position.x * 3.0) * uDeform * 0.04` to y. It samples `position` — the original flat coordinates — not the already-bent `pos`, so the ripple is locked to the picture and reads as the image flexing rather than the drum wobbling.
6. Pointer proximity is measured inside the vertex shader by projecting each vertex once as a probe (`ndc = probe.xy / probe.w`), taking `exp(-mouseDist² * 5.0)`, lifting z by half of it and passing it to the fragment shader, which pushes the centred UV outward by the same weight so the bump also magnifies — a lens, not a bump.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `PLANE_WIDTH / PLANE_HEIGHT = 1 / 1.95`
  Width 1 because the bend uses the vertex's raw x as radians — at width 1 each plane spans exactly 1 rad of the drum, which is the whole reason no trigonometry is needed on the CPU. Height must stay under 2π/3 or `sin(position.y)` leaves its monotonic range and the barrel folds its own edges back through the surface.
- `CAMERA_FOV / CAMERA_Z = 45 / 5`
  The camera never animates, so these only set how much drum is in shot. Below ~35° the ring flattens into a row and the depth cue vanishes; above ~60° the near plane balloons and the barrel curve reads as a keystone error.
- `OVERSCAN = 1.12`
  The cover-fit UV is divided by this, zooming the crop in 12%. At exactly 1.0 the wave and the bulge push vertices past the sampled region and the texture's own clamped border smears along the edge. Beyond ~1.25 the crop eats the subject.
- `segments = 64`
  The bend is evaluated per vertex, so subdivision *is* the curve. Below ~24 the drum visibly becomes a folded card and the mouse bulge turns into a triangular tent; past ~128 you are paying vertex cost for a curve the pixel grid cannot resolve.
- `POSITION_SMOOTHING = 0.0006`
  Fraction of remaining distance left after one second. Larger (slower) and the drum lags visibly behind the wheel; much smaller and the velocity spike that drives `uDeform` never has time to build, so the wave disappears.
- `SNAP_DELAY_MS = 170`
  Idle time before the drum eases to a whole index. Under ~120 ms it fires between the discrete events of a single trackpad flick and fights the gesture; over ~250 ms the gallery feels like it forgot to settle.
- `MAX_DEFORM / DEFORM_PER_INDEX = 1.5 / 0.42`
  Deform is clamped to ±1.5 because the shader multiplies it by 0.07 world units — past that the planes intersect each other and the far side of the drum pokes through the near side. 0.42 sets how many index-steps per second count as full deflection.
- `RADIUS_VELOCITY_GAIN = 0.5`
  The drum widens up to 50% at full speed, which is what sells inertia. Above ~0.8 the nearest plane crosses the camera's near plane during a fast flick and clips away.
- `gaussian falloff = 1 (exp(-offset²))`
  A falloff of 1 keeps the immediate neighbours legible at 0.37 while the third plane out is effectively gone. Raising it dims the neighbours to black and the ring loses its context; lowering it flattens every plane to the same weight.
- `renderOrder scale = -worldZ * 1000`
  Reconstructed drum depth, scaled up so it survives rounding to an integer sort key. At a smaller scale adjacent planes collapse into the same bucket and flicker between frames.

## API

```ts
function CylinderGallery(props: { items: CylinderGalleryItem[]; drive?: "pointer" | "page"; radius?: number; turns?: number; spacing?: number; segments?: number; pixelsPerIndex?: number; opacity?: number; paint?: (ctx: CanvasRenderingContext2D, item: CylinderGalleryItem, index: number, size: { width: number; height: number }) => void; onSelect?: (item: CylinderGalleryItem, index: number) => void; onFocusChange?: (item: CylinderGalleryItem, index: number) => void; className?: string }): JSX.Element
```

- `items: CylinderGalleryItem[]`
  `{ id, title, meta?, hue? }` per plane. One mesh and one generated texture each.
- `drive: "pointer" | "page"` — default `"pointer"`
  Wheel and drag inside the component, or document scroll via a shared infinite Lenis.
- `radius: number` — default `2`
  Drum radius in world units, before the velocity widening.
- `turns: number` — default `3`
  Full revolutions the ring spans across the whole list.
- `spacing: number` — default `0.8`
  World units of vertical travel per index step.
- `segments: number` — default `64`
  Plane subdivisions per axis. This is the resolution of the bend.
- `pixelsPerIndex: number` — default `240`
  Document scroll pixels per index step, in `page` mode only.
- `opacity: number` — default `1`
  Global alpha multiplier applied before the focus falloff.
- `paint: (ctx, item, index, size) => void`
  Override the generated plate. Receives a 2D context for a 512x1024 canvas.
- `onSelect: (item, index) => void`
  Tap on the drum. A drag never counts as a tap.
- `onFocusChange: (item, index) => void`
  Fires when a different index takes the centre.
- `className: string`
  Merged onto the wrapper via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function CylinderGallery({
  items,
  drive = 'pointer',
  radius = 2,
  turns = 3,
  spacing = 0.8,
  segments = 64,
  pixelsPerIndex = 240,
  opacity = 1,
  paint,
  onSelect,
  onFocusChange,
  className,
}: CylinderGalleryProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { threshold: 0 });
  const visible = useVisibility();
  const reduced = useReducedMotion();
  const pointer = useSmoothPointer({ target: host, smoothing: 0.0015 });

  // `hasWebGL` touches `document`, so it cannot run during render without
  // disagreeing with the server. Start optimistic and correct after mount:
  // both renders then agree and nothing hydrates twice.
  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  const [focused, setFocused] = useState(0);

  const position = useRef(0);
  const target = useRef(0);
  const velocity = useRef(0);
  const intro = useRef(0);
  const strength = useRef(0);
  const hovered = useRef(false);
  const focusedRef = useRef(0);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapTween = useRef<Tween | null>(null);

  // Everything the frame loop reads but must not resubscribe on. Written on
  // every render, read once per frame; the loop itself never re-creates.
  const live = useRef({ radius, turns, spacing, opacity, drive, pixelsPerIndex, items, onSelect, onFocusChange });
  live.current = { radius, turns, spacing, opacity, drive, pixelsPerIndex, items, onSelect, onFocusChange };

  // Rebuilding the scene is expensive, so it is keyed on what actually changes
  // the meshes — identity, label and hue — not on the array's reference, which
  // is new on every render for any caller who writes the list inline.
  const itemsKey = items.map((item) => `${item.id}:${item.title}:${item.hue ?? ''}`).join('|');

  const lenis = useLenis({ infinite: true, enabled: drive === 'page' });

  const killSnap = useCallback(() => {
    if (snapTimer.current !== null) {
      clearTimeout(snapTimer.current);
      snapTimer.current = null;
    }
    snapTween.current?.kill();
    snapTween.current = null;
  }, []);

  const scheduleSnap = useCallback(() => {
    if (snapTimer.current !== null) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      snapTimer.current = null;
      // Snap the TARGET, not the position: the frame loop keeps damping
      // toward it, so the settle stays one continuous motion instead of a
      // second animation fighting the first.
      snapTween.current = gsap.to(target, {
        current: Math.round(target.current),
        duration: SNAP_DURATION,
        ease: 'power3.out',
      });
    }, SNAP_DELAY_MS);
  }, []);

  /* ---- scene construction ------------------------------------------------ */

  const ready = width > 1 && height > 1 && supported;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready || items.length === 0) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // Capped, not raw. A 3x phone with an uncapped ratio pays 9x the fill rate
    // for a difference nobody can see.
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      el.clientWidth / Math.max(el.clientHeight, 1),
      0.1,
      100,
    );
    camera.position.z = CAMERA_Z;

    // One geometry for every plane. The bend is per-vertex, so the mesh has to
    // be dense enough that the curve reads as a curve: below ~24 segments the
    // drum visibly becomes a folded card.
    const geometry = new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT, segments, segments);
    const planeAspect = PLANE_WIDTH / PLANE_HEIGHT;
    const paintItem = paint ?? paintPlate;
    const maxAnisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

    const planes: Plane[] = items.map((item, index) => {
      const canvas = document.createElement('canvas');
      canvas.width = TEXTURE_WIDTH;
      canvas.height = TEXTURE_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (ctx) paintItem(ctx, item, index, { width: TEXTURE_WIDTH, height: TEXTURE_HEIGHT });

      const texture = new THREE.CanvasTexture(canvas);
      // sRGB in, sRGB out. Skip this and the plates render noticeably darker
      // than the CSS colours sitting next to them.
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAnisotropy;
      texture.needsUpdate = true;

      const uniforms: PlaneUniforms = {
        uTexture: { value: texture },
        uTextureAspect: { value: TEXTURE_WIDTH / TEXTURE_HEIGHT },
        uPlaneAspect: { value: planeAspect },
        uOverscan: { value: OVERSCAN },
        uSpiralAngle: { value: 0 },
        uRadius: { value: radius },
        uIntro: { value: 0 },
        uFocus: { value: 1 },
        uOpacity: { value: opacity },
        uDeform: { value: 0 },
        uMouseNdc: { value: new THREE.Vector2(0, 0) },
        uMouseStrength: { value: 0 },
      };

      // A material per mesh, because every plane needs its own spiralAngle,
      // radius and focus. three keys its program cache on the shader source,
      // so all of these share one compiled program regardless.
      const material = new THREE.ShaderMaterial({
        vertexShader: cylinderGalleryVertexShader,
        fragmentShader: cylinderGalleryFragmentShader,
        uniforms,
        transparent: true,
        side: THREE.DoubleSide,
        // Painted strictly back to front via renderOrder below, so neither
        // depth write nor depth test has anything to contribute — and both
        // would be wrong anyway, since the depth they compare is the depth of
        // a mesh the CPU thinks is still flat at the origin.
        depthWrite: false,
        depthTest: false,
      });

      const mesh = new THREE.Mesh(geometry, material);
      // The CPU-side geometry is a flat plane at mesh.position; the shape you
      // can actually see is somewhere else entirely. Frustum culling compares
      // against that stale bounding sphere and blanks planes that are plainly
      // on screen.
      mesh.frustumCulled = false;
      scene.add(mesh);
      return { mesh, uniforms, texture };
    });

    stage.current = { renderer, scene, camera, geometry, planes };
    renderer.render(scene, camera);

    return () => {
      stage.current = null;
      for (const plane of planes) {
        scene.remove(plane.mesh);
        // disposeObject walks a material's own properties looking for
        // textures. These live inside `uniforms`, two levels down, so it will
        // never find them — they have to be released by hand.
        plane.texture.dispose();
      }
      disposeObject(scene);
      geometry.dispose();
      // dispose() frees GPU objects and leaves the context alive. Only
      // forceContextLoss, which disposeRenderer calls, hands it back.
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
    // `items` is read through the key; `radius`/`opacity` only seed uniforms
    // the frame loop overwrites immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, itemsKey, segments, paint]);

  /* ---- size ------------------------------------------------------------- */

  useEffect(() => {
    const current = stage.current;
    if (!current || width < 1 || height < 1) return;
    current.renderer.setPixelRatio(pixelRatio());
    // `false` — the canvas is sized by CSS at 100%/100%; letting three write
    // inline pixel dimensions makes it fight the flex parent on every resize.
    current.renderer.setSize(width, height, false);
    current.camera.aspect = width / height;
    current.camera.updateProjectionMatrix();
  }, [width, height]);

  /* ---- intro morph ------------------------------------------------------- */

  useEffect(() => {
    if (!ready) return;
    if (reduced) {
      intro.current = 1;
      return;
    }
    intro.current = 0;
    const tween = gsap.to(intro, {
      current: 1,
      duration: INTRO_DURATION,
      delay: INTRO_DELAY,
      ease: 'power3.inOut',
    });
    return () => {
      tween.kill();
    };
  }, [ready, reduced]);

  /* ---- input ------------------------------------------------------------- */

  useEffect(() => {
    const el = host.current;
    if (!el || drive !== 'pointer') return;

    const onWheel = (event: WheelEvent) => {
      // Non-passive on purpose: without preventDefault the drum spins AND the
      // page scrolls under it, which reads as two competing gestures.
      event.preventDefault();
      killSnap();
      target.current += event.deltaY * WHEEL_INDEX_PER_PIXEL;
      scheduleSnap();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [drive, killSnap, scheduleSnap]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const enter = () => {
      hovered.current = true;
    };
    const leave = () => {
      hovered.current = false;
    };
    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointerleave', leave);
    };
  }, []);

  useDrag(host, {
    enabled: drive === 'pointer',
    onDragStart: killSnap,
    onDrag: (state) => {
      target.current -= state.deltaY * DRAG_INDEX_PER_PIXEL;
    },
    onDragEnd: (_state, moved) => {
      if (!moved) {
        const { items: list, onSelect: select } = live.current;
        const index = wrapIndex(Math.round(position.current), list.length);
        const item = list[index];
        if (item) select?.(item, index);
      }
      scheduleSnap();
    },
  });

  useEffect(() => killSnap, [killSnap]);

  /* ---- the frame --------------------------------------------------------- */

  useRaf(
    (dt) => {
      const current = stage.current;
      if (!current) return;
      const {
        radius: baseRadius,
        turns: baseTurns,
        spacing: baseSpacing,
        opacity: alpha,
        drive: mode,
        pixelsPerIndex: perIndex,
        items: list,
        onFocusChange: notify,
      } = live.current;

      const count = current.planes.length;
      if (count === 0) return;

      if (mode === 'page') {
        const instance = lenis.current;
        if (instance) target.current = instance.scroll / Math.max(perIndex, 1);
      }

      const previous = position.current;
      position.current = damp(position.current, target.current, POSITION_SMOOTHING, dt);

      // Index steps per second, smoothed by the same damp that produced the
      // position, so the wave can never lead the geometry it is bending.
      const instant = dt > 0 ? (position.current - previous) / dt : 0;
      velocity.current = damp(velocity.current, instant, 0.002, dt);
      const normalized = clamp(velocity.current / VELOCITY_REFERENCE, -1, 1);

      strength.current = damp(
        strength.current,
        hovered.current && !reduced ? 1 : 0,
        STRENGTH_SMOOTHING,
        dt,
      );

      const s = intro.current;
      const speed = Math.abs(normalized);
      const liveRadius = baseRadius * (1 + RADIUS_VELOCITY_GAIN * speed);
      const liveSpacing = baseSpacing * (1 + SPACING_VELOCITY_GAIN * speed);
      const angularScale = 1 + ANGULAR_VELOCITY_GAIN * speed;
      const deform = reduced
        ? 0
        : clamp(velocity.current * DEFORM_PER_INDEX, -MAX_DEFORM, MAX_DEFORM);

      // The flat-row layout spans the frustum's visible WIDTH at z = 0. Sizing
      // it from window.innerWidth, or from the visible height, leaves the row
      // short on wide viewports and clipped on narrow ones.
      const visibleWidth =
        2 * Math.tan((CAMERA_FOV * Math.PI) / 360) * CAMERA_Z * current.camera.aspect * 0.86;
      const step = visibleWidth / Math.max(count - 1, 1);
      const rowWidth = (count - 1) * step;

      const mx = pointer.current.active ? pointer.current.ndcX : 0;
      const my = pointer.current.active ? pointer.current.ndcY : 0;

      for (let i = 0; i < count; i++) {
        const plane = current.planes[i];
        if (!plane) continue;

        // The one call that makes a finite array behave like an infinite ring:
        // item 0 is one step BEFORE item 18, not eighteen steps after it.
        const offset = wrappedOffset(i, position.current, count);
        const angle = (offset / count) * Math.PI * 2 * baseTurns * angularScale;
        const y = -offset * liveSpacing;

        plane.mesh.position.x = (i * step - rowWidth / 2) * (1 - s);
        plane.mesh.position.y = y * s;
        plane.mesh.scale.setScalar(lerp(0.62, 1, s));

        const u = plane.uniforms;
        u.uSpiralAngle.value = angle;
        u.uRadius.value = liveRadius;
        u.uIntro.value = s;
        u.uDeform.value = deform;
        u.uOpacity.value = alpha;
        u.uMouseStrength.value = strength.current;
        u.uMouseNdc.value.set(mx, my);
        // exp(-d²): 1.000 at the centre, 0.368 one step out, 0.018 two, 0.0001
        // three. Continuous, branchless, and the reason the drum reads as
        // analogue rather than as a list with a selected row.
        u.uFocus.value = lerp(1, gaussian(offset), s);

        // Transparent meshes are sorted by three using the CPU position, which
        // for this drum is (0, y, 0) for every plane. Reconstructing the depth
        // the shader will actually produce and painting back to front is the
        // only way the far side of the ring stays behind the near side.
        const worldZ = liveRadius * Math.cos(angle) * s;
        plane.mesh.renderOrder = Math.round(-worldZ * 1000);
      }

      const nextFocus = wrapIndex(Math.round(position.current), count);
      if (nextFocus !== focusedRef.current) {
        focusedRef.current = nextFocus;
        setFocused(nextFocus);
        const item = list[nextFocus];
        if (item) notify?.(item, nextFocus);
      }

      current.renderer.render(current.scene, current.camera);
    },
    ready && inView && visible,
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes the wheel and pointerenter/pointerleave listeners, kills the intro tween and any pending snap timeout plus its tween, removes every mesh from the scene, disposes each `CanvasTexture` by hand (they sit inside `material.uniforms`, where `disposeObject` cannot reach), runs `disposeObject` for the geometries and materials, disposes the shared geometry, then `disposeRenderer` — `setAnimationLoop(null)`, `dispose()`, `forceContextLoss()` — and removes the canvas from the DOM. The frame loop reads a stage ref that is nulled first, so a queued frame after teardown is a no-op rather than a null context throw.

**Reduced motion.** The intro morph is skipped — `uIntro` is set to 1 on mount, so the drum is simply already assembled. The velocity wave is pinned to 0 and the pointer bulge never engages, so the surface stays flat. Navigation still works and still eases: wheel, drag and the snap-to-index tween are unchanged, because the user asked for less motion, not for a gallery that cannot move.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Scaling `uRadius` from 0 to animate the intro. At radius 0 every vertex of every plane lands on the origin, so the "flat" state is nineteen invisible slivers stacked in one spot. Lerp between two position vectors — `mix(rowPos, ringPos, uIntro)` — and the flat state is a real layout you can hold.
- Leaving `frustumCulled` at its default. The CPU-side geometry is still a flat plane sitting at `mesh.position`; the visible shape is somewhere else entirely. three culls against that stale bounding sphere and planes that are plainly on screen blink out at the edges.
- Trusting three's transparency sort. It orders transparent meshes by their object position, which for this drum is `(0, y, 0)` for every single plane, so the far side of the ring paints over the near side at random. Reconstruct the depth the shader will produce (`radius * cos(angle) * intro`) and set `renderOrder` from it each frame.
- Expecting `disposeObject` to free the plate textures. It scans a material's own properties for anything with `isTexture`; these textures live two levels down inside `material.uniforms`, so it never sees them and nineteen 512x1024 canvases stay resident on the GPU after unmount. They are disposed explicitly from a tracked list.
- Calling `renderer.dispose()` and stopping there. That releases GPU objects but keeps the WebGL context alive; Chromium caps a renderer process at roughly 16 and silently kills the oldest, so a docs page that mounts several of these blanks the ones above it. `disposeRenderer` calls `forceContextLoss`.
- Attaching the wheel listener passively. Without `preventDefault` the drum spins and the host page scrolls at the same time, which reads as two gestures fighting; the listener is registered with `{ passive: false }`.
- Sampling the deformation wave from the already-bent `pos` instead of the original `position`. The ripple then travels with the drum rotation rather than staying pinned to the image, and the effect looks like a rendering fault instead of the picture flexing.
- Sizing the flat-row layout from `window.innerWidth`. The row has to span the frustum's visible width at z = 0, which is `2 * tan(fov/2) * cameraZ * aspect` — the container width in pixels has no fixed relationship to that, so the row overshoots on wide viewports and clips on narrow ones.
- Omitting `#include <colorspace_fragment>` from a `ShaderMaterial`. three only injects output conversion into its own materials, so raw linear values ship into an sRGB framebuffer and the plates render visibly washed out next to the CSS around them.
- Rebuilding the scene when the `items` array identity changes. Any caller who writes the list inline hands over a new array every render, which would tear down nineteen textures and a GL context on every keystroke. The setup effect keys on a string built from id, title and hue.

## Notes

- Textures are drawn at mount to a 512x1024 canvas per item — a hue ramp, hairline bands and a numeral. The bands are not decoration: a smooth gradient hides every deformation the shader applies, so the plate needs structure for the wave and the bulge to bend.
- All nineteen materials are separate `ShaderMaterial` instances because each needs its own uniforms, but three keys its program cache on the shader source, so they share a single compiled program.
- `drive: "page"` opts into a shared refcounted Lenis with `infinite: true`, which is the technique in its original form — the gallery *is* the page. The default `drive: "pointer"` keeps every gesture inside the component's own box.

## Definition of done

On mount the planes start as a flat row facing you and curl into a drum over about 1.6 s. Wheel or drag spins it endlessly in both directions with no seam and no jump at the ends; stop moving and it eases to centre one plane. The centred plane is full colour and the neighbours fade toward grey within two steps. Flick hard and the images ripple, the drum widens, and the ripple runs opposite ways depending on direction. Move the pointer over a plane and a soft lens follows it, magnifying rather than just denting. Unmount from React DevTools and the canvas leaves the DOM with no context-lost warning; mount and unmount twenty times and no context is dropped. With `prefers-reduced-motion: reduce` the drum is already assembled on the first frame and neither the ripple nor the lens ever appears.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
