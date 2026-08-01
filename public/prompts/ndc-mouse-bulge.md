# Build: In-Shader Mouse Bulge

The pointer is a screen-space quantity and the mesh is a world-space one, so something has to convert between them. Instead of unprojecting the pointer on the CPU with a raycaster, every vertex projects ITSELF once, compares its own normalised device position against the pointer, and displaces by the result. Each vertex gets an exact distance, the cost is one extra matrix multiply per vertex, and nothing about it depends on the CPU knowing the mesh's real shape.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A soft lens that follows the cursor, measured by projecting every vertex to screen space instead of raycasting.

- Category: webgl
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. The vertex shader runs `projectionMatrix * modelViewMatrix * vec4(pos, 1.0)` twice. The first is a probe: dividing its xy by w gives this vertex's own NDC position, which is the only common space the pointer and the geometry both live in.
2. NDC spans -1..1 on both axes whatever the viewport is, so a raw distance is stretched by the aspect ratio. The x component of the delta is multiplied by `uAspect` before the length is taken, which is what keeps the lens circular on a 16:9 canvas instead of an ellipse 1.78 times too wide.
3. The weight is `exp(-dot(delta, delta) * falloff)`. A Gaussian never actually reaches zero, so there is no radius at which the deformation visibly stops, and its derivative is continuous, so the sheen has no hard edge either — a smoothstep would give both a visible boundary ring.
4. The vertex is lifted by `bulge * uLift` and the weight is passed to the fragment shader, which pushes the centred UV outward by `centered * vBulge * uMagnify`. Lift alone is a bump; lift plus UV magnification is a lens, and that is the difference between a dent in the surface and glass sitting on top of it.
5. The second projection is the one that ships the vertex, evaluated after the displacement the first one made possible. The extra matrix multiply per vertex is the entire cost of the technique.
6. The strength uniform is damped toward the pointer's active state rather than switched, so the lens fades in on enter and out on leave instead of appearing at, and vanishing from, the last known position.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `falloff = 5`
  Tightness of the Gaussian in aspect-corrected NDC units, where the full viewport is 2 wide. At 5 the lens is roughly a third of the height across. Below ~2 it swells to cover the whole plane and reads as a global warp; above ~15 it collapses to a pinpoint that the vertex grid cannot resolve smoothly.
- `lift = 0.5`
  World units the crown rises, against a plane about 2.5 units tall at a camera distance of 3. Above ~1.2 the crown passes the camera's near plane and the lens punches a hole through itself when the cursor is centred.
- `magnify = 0.12`
  UV displacement at the crown. This is what makes it a lens rather than a bump. Above ~0.3 the magnification outruns the geometry, the texture visibly slides across the surface, and the illusion of glass breaks into a smear.
- `sheen = 0.18`
  Extra brightness at the crown. Small on purpose: the eye reads a slight highlight as curvature, and anything past ~0.4 reads as a blown-out light source instead.
- `segments = 128`
  The bulge is per-vertex, so the mesh density is the resolution of the lens. At 16 the Gaussian resolves into a faceted pyramid chasing the cursor; past ~192 the extra vertices land inside a single pixel of the highlight.
- `STRENGTH_SMOOTHING = 0.0008`
  Fraction of the gap left after one second, so the lens fades in over roughly a fifth of a second. Instant switching leaves the lens visible at the last known position for one frame after the cursor leaves, which flickers.
- `pointer smoothing = 0.0008`
  Matches the strength smoothing so the lens grows and moves at the same rate. A pointer smoothed much harder than the strength arrives late and the lens appears to be dragged; much softer and it inherits every jitter in the raw pointer stream.
- `CAMERA_FOV / CAMERA_Z = 45 / 3`
  Sets how much perspective the lift reads against. At a narrow FOV the raised crown barely changes size and the bulge looks flat; at a wide one the plane's own edges keystone enough to compete with the effect.

## API

```ts
function NdcMouseBulge(props: { strength?: number; falloff?: number; lift?: number; magnify?: number; sheen?: number; segments?: number; paint?: (ctx: CanvasRenderingContext2D, size: { width: number; height: number }) => void; className?: string }): JSX.Element
```

- `strength: number` — default `1`
  Peak displacement weight. 0 disables the effect.
- `falloff: number` — default `5`
  Gaussian tightness. Higher is a smaller, sharper lens.
- `lift: number` — default `0.5`
  World units the crown of the bulge rises toward the camera.
- `magnify: number` — default `0.12`
  How far the lens magnifies at the crown, in UV units.
- `sheen: number` — default `0.18`
  Extra brightness at the crown.
- `segments: number` — default `128`
  Plane subdivisions per axis. The resolution of the lens.
- `paint: (ctx, size) => void`
  Override the surface. Receives a 2D context for a 1024x1024 canvas.
- `className: string`
  Merged onto the wrapper via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function NdcMouseBulge({
  strength = 1,
  falloff = 5,
  lift = 0.5,
  magnify = 0.12,
  sheen = 0.18,
  segments = 128,
  paint,
  className,
}: NdcMouseBulgeProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { threshold: 0 });
  const visible = useVisibility();
  const reduced = useReducedMotion();
  // Already in NDC, which is exactly the space the shader compares in — no
  // conversion, no cached bounding rect to go stale on scroll.
  const pointer = useSmoothPointer({ target: host, smoothing: 0.0008 });

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  const engaged = useRef(0);

  const live = useRef({ strength, falloff, lift, magnify, sheen });
  live.current = { strength, falloff, lift, magnify, sheen };

  const ready = width > 1 && height > 1 && supported;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
    camera.position.z = CAMERA_Z;

    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    const ctx = canvas.getContext('2d');
    if (ctx) (paint ?? paintSurface)(ctx, { width: TEXTURE_SIZE, height: TEXTURE_SIZE });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

    const uniforms: BulgeUniforms = {
      uTexture: { value: texture },
      uMouseNdc: { value: new THREE.Vector2(0, 0) },
      uAspect: { value: 1 },
      uStrength: { value: 0 },
      uFalloff: { value: falloff },
      uLift: { value: lift },
      uMagnify: { value: magnify },
      uSheen: { value: sheen },
    };

    // Dense. The bulge is evaluated per vertex, so the lens can only be as
    // round as the mesh is fine: at 16 segments the Gaussian resolves into a
    // faceted pyramid that follows the cursor.
    const geometry = new THREE.PlaneGeometry(1, 1, segments, segments);
    const material = new THREE.ShaderMaterial({
      vertexShader: ndcMouseBulgeVertexShader,
      fragmentShader: ndcMouseBulgeFragmentShader,
      uniforms,
    });
    const mesh = new THREE.Mesh(geometry, material);
    // The lift happens after the bounding sphere was computed; leaving culling
    // on lets three blank a plane that is filling the viewport.
    mesh.frustumCulled = false;
    scene.add(mesh);

    stage.current = { renderer, scene, camera, mesh, geometry, material, texture, uniforms };

    return () => {
      stage.current = null;
      scene.remove(mesh);
      // Inside `uniforms`, where `disposeObject` cannot see it.
      texture.dispose();
      disposeObject(scene);
      geometry.dispose();
      material.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, segments, paint]);

  useEffect(() => {
    const current = stage.current;
    if (!current || width < 1 || height < 1) return;
    const aspect = width / height;
    current.renderer.setPixelRatio(pixelRatio());
    current.renderer.setSize(width, height, false);
    current.camera.aspect = aspect;
    current.camera.updateProjectionMatrix();

    // Cover the frustum exactly at z = 0. Derived from the camera, because the
    // visible extent at this distance has no fixed relationship to the pixel
    // width of the container.
    const visibleHeight = 2 * Math.tan((CAMERA_FOV * Math.PI) / 360) * CAMERA_Z;
    current.mesh.scale.set(visibleHeight * aspect, visibleHeight, 1);
    // The shader corrects its screen-space distance with this, so a stale
    // value turns the lens into an ellipse the moment the container reshapes.
    current.uniforms.uAspect.value = aspect;
  }, [width, height]);

  useRaf(
    (dt) => {
      const current = stage.current;
      if (!current) return;
      const { strength: peak, falloff: tightness, lift: rise, magnify: zoom, sheen: light } =
        live.current;

      // Fade the whole effect in and out with the pointer rather than snapping
      // it. Snapping leaves a lens sitting at the last known position for one
      // frame after the cursor leaves, which flickers.
      const wanted = pointer.current.active && !reduced ? peak : 0;
      engaged.current = damp(engaged.current, wanted, STRENGTH_SMOOTHING, dt);

      current.uniforms.uMouseNdc.value.set(pointer.current.ndcX, pointer.current.ndcY);
      current.uniforms.uStrength.value = engaged.current;
      current.uniforms.uFalloff.value = tightness;
      current.uniforms.uLift.value = rise;
      current.uniforms.uMagnify.value = zoom;
      current.uniforms.uSheen.value = light;

      current.renderer.render(current.scene, current.camera);
    },
    ready && inView && visible,
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes the mesh from the scene, disposes the `CanvasTexture` explicitly because it sits inside `material.uniforms` beyond `disposeObject`'s reach, runs `disposeObject` over the scene, disposes the geometry and material, then `disposeRenderer` — `setAnimationLoop(null)`, `dispose()`, `forceContextLoss()` — and removes the canvas from the DOM. The stage ref is nulled first so a frame already queued on the shared RAF loop exits before touching anything. `useSmoothPointer` removes its own listeners on unmount.

**Reduced motion.** The strength target is held at 0, so no vertex is ever displaced, the UV is never magnified and no sheen appears — the surface is a completely static image that ignores the pointer. The value is still damped to zero rather than assigned, so a lens that is on screen when the preference changes retracts smoothly instead of popping flat.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Comparing raw NDC distances. NDC is -1..1 on both axes regardless of the viewport, so on a 16:9 canvas the falloff is 1.78 times wider than it is tall and the lens is a visible ellipse. The x component of the delta is weighted by the aspect before the length is taken.
- Raycasting the pointer against the plane instead. It costs a matrix inversion per frame, returns exactly one hit point, and — decisively — it intersects the CPU-side geometry, which this shader has already moved. Once anything displaces vertices, the raycast answers a question about a surface that is not on screen.
- Projecting once and reusing `gl_Position`. The probe has to happen before the displacement and the final projection has to happen after it, so the two cannot be shared. Displacing after computing `gl_Position` simply has no effect at all.
- Using a linear or smoothstep falloff. Both reach exactly zero at a finite radius, which draws a visible ring on the surface where the deformation stops. The Gaussian is asymptotic and leaves no boundary.
- Lifting the vertex without magnifying the UV. The result is a bump, not a lens — the surface moves but the image printed on it does not, so it reads as a dent in a rigid sheet rather than glass laid over it.
- Leaving `frustumCulled` on. The lift happens after the bounding sphere was computed, so three can decide a plane that is filling the viewport is off screen and blank it.
- Sizing the plane from the container's pixel dimensions. The plane has to cover the frustum at z = 0, which is `2 * tan(fov/2) * distance` tall; a pixel width has no fixed relationship to that and the plane ends up short of the edges or overscaled.
- Forgetting to update `uAspect` on resize. The lens silently turns elliptical the moment the container reshapes, and because it still follows the cursor correctly the bug looks like a design decision.
- Calling `renderer.dispose()` alone on unmount. GPU objects are freed but the WebGL context survives, and Chromium drops the oldest once a renderer process holds about 16. `disposeRenderer` calls `forceContextLoss`.

## Notes

- `useSmoothPointer` already exposes `ndcX` / `ndcY`, so the pointer reaches the uniform without a single conversion and without a cached bounding rect that could go stale on scroll.
- This is the same two-projections-per-vertex trick `cylinder-gallery` uses; there it has to be in-shader, because the CPU geometry is a flat plane and the visible drum exists only on the GPU.

## Definition of done

Move the cursor over the surface and a round highlight follows it, swelling the lattice cells underneath rather than merely brightening them. The highlight is circular at any container aspect — resize from square to wide and it stays round. It has no visible outer edge or ring where the effect stops. Leave the surface and the lens retracts over about a fifth of a second rather than vanishing. Nothing changes when the cursor moves outside the component. With `prefers-reduced-motion: reduce` the surface is completely inert and the cursor has no effect at all.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
