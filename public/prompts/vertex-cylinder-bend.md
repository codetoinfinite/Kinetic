# Build: Vertex Shader Cylinder Bend

The bend on its own, with no gallery attached. A flat `PlaneGeometry` is fed to a vertex shader that reads each vertex's x coordinate as an arc parameter and re-emits it on the surface of a cylinder. Because curvature is a uniform rather than a mesh, the same buffer is flat, bowed or nearly closed between two frames — no `CylinderGeometry`, no rebuild, no re-upload.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A flat plane wrapped around a cylinder on the GPU, with the curvature living in a uniform you can animate.

- Category: webgl
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. Curl is defined as radians of bend per world unit of plane width, so the radius is its reciprocal: `radius = 1.0 / curl`. A 3-unit plane at curl 0.62 wraps 1.86 rad of a circle of radius 1.61, and the arc length is still exactly 3 units — the banner bends without appearing to shrink.
2. `angle = uSpin + position.x * curl`, then `pos.x = radius * sin(angle)` and `pos.z = radius * cos(angle) - radius`. The trailing `- radius` pins the arc's midpoint at z = 0 so tightening the curl bends the ends away instead of lunging the whole banner at the camera.
3. The vertical bow is `pos.y = sin(position.y * k) / k`, which tends to `position.y` as k tends to 0 and becomes a full sine bow at k = 1. Normalising by k is what keeps the plane the same height at every bow depth.
4. The surface normal is available in closed form: differentiating the position gives tangents `(cos a, 0, -sin a)` and `(0, 1, 0)`, whose cross product is `(sin a, 0, cos a)`. Its z component — `cos(angle)` — is how squarely the patch faces the camera, so the shading term costs one cosine and no `normalMatrix`.
5. On resize the camera is moved rather than the plane resized: `distance = max(width / fit / (2 tan(fov/2) aspect), height / fit / (2 tan(fov/2)))`. The plane's world width is the yardstick `curl` is measured in, so it must never change with the viewport.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `PLANE_WIDTH / PLANE_HEIGHT = 3 / 1.4`
  Fixed world units on purpose. Curl is radians per world unit, so a plane that resized with the viewport would bend through a different total angle on every device — the same `curl` prop would mean something different on a phone.
- `curl = 0.62`
  Times the 3-unit width, this is 1.86 rad — about 106 degrees of arc. Under ~0.25 the bend is indistinguishable from a perspective skew; over ~1.6 the far edges pass 90 degrees from the camera, present zero pixels of width, and the banner appears to have been cut off.
- `curlSwing = 0.22`
  Amplitude of the idle breathing. Large enough that the curvature is visibly a live value rather than a baked mesh; large enough to pass 1.6 total and the ends would clip away at the peak of every cycle.
- `barrel = 0.3`
  k in `sin(k*y)/k`. At 0 the top and bottom edges are dead straight and the surface reads as a rolled poster; past ~1.2 the bow overtakes the curl and the plane looks like a saddle rather than a cylinder.
- `segments = 96`
  Subdivisions across the bend — the resolution of the curve, since it is evaluated per vertex. Below ~24 the arc becomes a visible polyline and the shading term steps in bands; above ~192 the extra vertices land inside a single pixel.
- `PlaneGeometry y-segments = 16`
  The cylinder bend is a function of x alone, so rows would be pure waste — except the barrel bow, which needs enough rows to curve rather than kink at the midline.
- `FIT = 0.86`
  Fraction of the frustum the banner fills. At 1.0 the receding edges touch the viewport border and the curl has nowhere to read against; below ~0.7 the component is mostly empty space.
- `shade = 0.55`
  How far the facing term is allowed to darken the edges. At 0 the bend reads as a flat trapezoid — a perspective mistake rather than a curve. At 1 the edges go fully black and the banner appears to end early.

## API

```ts
function VertexCylinderBend(props: { curl?: number; curlSwing?: number; parallax?: number; barrel?: number; shade?: number; segments?: number; period?: number; paint?: (ctx: CanvasRenderingContext2D, size: { width: number; height: number }) => void; className?: string }): JSX.Element
```

- `curl: number` — default `0.62`
  Radians of bend per world unit of plane width. 0 is flat.
- `curlSwing: number` — default `0.22`
  Peak extra curl added by the idle breathing cycle.
- `parallax: number` — default `0.34`
  Radians the banner rocks around the drum axis at full pointer travel.
- `barrel: number` — default `0.3`
  Vertical bow. 0 leaves the edges straight, ~1 is a full sine.
- `shade: number` — default `0.55`
  How far the facing term darkens the receding edges.
- `segments: number` — default `96`
  Subdivisions across the bend. This is the resolution of the curve.
- `period: number` — default `9`
  Seconds per breathing cycle.
- `paint: (ctx, size) => void`
  Override the banner face. Receives a 2D context for a 1024x512 canvas.
- `className: string`
  Merged onto the wrapper via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function VertexCylinderBend({
  curl = 0.62,
  curlSwing = 0.22,
  parallax = 0.34,
  barrel = 0.3,
  shade = 0.55,
  segments = 96,
  period = 9,
  paint,
  className,
}: VertexCylinderBendProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { threshold: 0 });
  const visible = useVisibility();
  const reduced = useReducedMotion();
  const pointer = useSmoothPointer({ target: host, smoothing: 0.002 });

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  const elapsed = useRef(0);
  const spin = useRef(0);
  const curlNow = useRef(curl);

  const live = useRef({ curl, curlSwing, parallax, barrel, shade, period });
  live.current = { curl, curlSwing, parallax, barrel, shade, period };

  const ready = width > 1 && height > 1 && supported;

  /* Fitting the camera is a callback rather than effect-body code because it
     has to be reachable from BOTH effects, which fire on independent triggers.
     The camera is constructed with a placeholder aspect of 1 and the default
     position z of 0 — inside the plane — and everything that corrects that
     lived only in the effect keyed on the observed width and height. So any
     rebuild without an accompanying size change left a camera sitting in the
     middle of its own geometry: the build effect re-runs on `segments` and
     `paint`, and a caller passing an inline `paint` arrow rebuilds the stage
     on every parent render, at which point the banner stayed broken until the
     user happened to resize the window. Everything below is derived purely
     from w and h, so calling it from both paths is idempotent. */
  const fitCamera = useCallback((w: number, h: number) => {
    const current = stage.current;
    if (!current || w < 1 || h < 1) return;
    const aspect = w / h;
    current.renderer.setPixelRatio(pixelRatio());
    current.renderer.setSize(w, h, false);
    current.camera.aspect = aspect;

    // Contain-fit by moving the camera, not by resizing the plane: the plane's
    // world width is what `curl` is measured against, so it has to stay fixed.
    // Take the larger of the two required distances or the banner is cropped
    // on whichever axis is tighter.
    const tanHalf = Math.tan((CAMERA_FOV * Math.PI) / 360);
    const forWidth = PLANE_WIDTH / FIT / (2 * tanHalf * aspect);
    const forHeight = PLANE_HEIGHT / FIT / (2 * tanHalf);
    current.camera.position.z = Math.max(forWidth, forHeight);
    current.camera.updateProjectionMatrix();
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      // A context can still be refused between the probe and the construction —
      // the tab may have hit the browser's live-context ceiling in between. three
      // throws rather than returning null, and an uncaught throw here takes the
      // page with it.
      setSupported(false);
      return;
    }
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);

    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_WIDTH;
    canvas.height = TEXTURE_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (ctx) (paint ?? paintBanner)(ctx, { width: TEXTURE_WIDTH, height: TEXTURE_HEIGHT });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

    const uniforms: BendUniforms = {
      uTexture: { value: texture },
      uCurl: { value: curl },
      uSpin: { value: 0 },
      uBarrel: { value: barrel },
      uShade: { value: shade },
    };

    // Segments only along x. The bend is a function of x alone, so vertical
    // subdivision buys nothing but vertices — except the barrel bow, which
    // needs a handful of rows to curve at all.
    const geometry = new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT, segments, 16);
    const material = new THREE.ShaderMaterial({
      vertexShader: vertexCylinderBendVertexShader,
      fragmentShader: vertexCylinderBendFragmentShader,
      uniforms,
      transparent: true,
      // The bend turns the far edges away from the camera, so without
      // DoubleSide a hard curl punches holes through the ends of the banner.
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    // The CPU bounding sphere describes a flat plane that the shader has
    // already moved. Culling against it blanks the banner at shallow angles.
    mesh.frustumCulled = false;
    scene.add(mesh);

    stage.current = { renderer, scene, camera, geometry, material, texture, uniforms };

    // Fit before the first frame. `ready` guarantees the observed box is real,
    // and waiting for the resize effect to do it is a bet that the box will
    // change size again — on a stage that is built once and never reflowed,
    // that bet never pays out and the first frame is also the last wrong one.
    fitCamera(width, height);

    return () => {
      stage.current = null;
      scene.remove(mesh);
      // The texture is inside `uniforms`, where disposeObject cannot see it.
      texture.dispose();
      disposeObject(scene);
      geometry.dispose();
      material.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, segments, paint]);

  // Reflow costs a re-fit, never a rebuild. The guard against a stage that
  // does not exist yet now lives inside `fitCamera`.
  useEffect(() => {
    fitCamera(width, height);
  }, [fitCamera, width, height]);

  useRaf(
    (dt) => {
      const current = stage.current;
      if (!current) return;
      const { curl: base, curlSwing: swing, parallax: sway, barrel: bow, shade: dark, period: cycle } =
        live.current;

      elapsed.current += dt;

      // Breathing curl. The whole reason the bend lives in a uniform is that
      // it can move; holding it at one value hides the technique.
      const target = reduced ? base : base + swing * Math.sin((elapsed.current * Math.PI * 2) / Math.max(cycle, 0.5));
      curlNow.current = damp(curlNow.current, target, CURL_SMOOTHING, dt);

      // Pointer rocks the banner around the drum axis. This survives reduced
      // motion because it is a direct response to input, not autonomous motion.
      // ndcX, not nx: ndc is -1..1 about the centre, so the banner rocks
      // symmetrically. nx is 0..1, which would bias every rock to one side.
      const aim = pointer.current.active ? pointer.current.ndcX * sway : 0;
      spin.current = damp(spin.current, aim, SPIN_SMOOTHING, dt);

      current.uniforms.uCurl.value = curlNow.current;
      current.uniforms.uSpin.value = spin.current;
      current.uniforms.uBarrel.value = bow;
      current.uniforms.uShade.value = dark;
      current.renderer.render(current.scene, current.camera);
    },
    ready && inView && visible,
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes the mesh from the scene, disposes the `CanvasTexture` explicitly (it lives inside `material.uniforms`, out of `disposeObject`'s reach), runs `disposeObject` over the scene, disposes the geometry and material, then `disposeRenderer` for `setAnimationLoop(null)` / `dispose()` / `forceContextLoss()`, and removes the canvas from the DOM. The stage ref is nulled first, so any frame already queued returns immediately instead of touching a lost context.

**Reduced motion.** The breathing cycle is dropped: `uCurl` holds at the `curl` prop and never oscillates, so nothing moves on its own. The pointer rock is kept, because it is a direct one-to-one response to the user's own input rather than autonomous motion, and removing it would leave a component that ignores the cursor entirely.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Dividing by `curl` without a guard. The flat case is curl 0, which is an infinite radius: `1.0 / 0.0` in GLSL yields infinity, every vertex becomes NaN, and the mesh vanishes with no error anywhere. The shader clamps to 0.0001 and approaches flat instead.
- Omitting the `- radius` term from `pos.z`. The arc is then centred on the cylinder's axis rather than on the origin, so raising the curl walks the entire banner toward the camera and it appears to lunge every time the curvature changes.
- Bowing with a bare `sin(position.y)`. That silently rescales the plane — a 1.4-tall plane becomes 1.29 tall — so animating the bow makes the banner pulse in size. Normalising by k (`sin(k*y)/k`) keeps the height fixed at every depth.
- Leaving `frustumCulled` on. The bounding sphere describes the flat plane the shader has already moved, so at a hard curl three decides the banner is off screen and blanks it while it is plainly in view.
- Keeping the default `FrontSide`. The bend turns the far edges past 90 degrees from the camera, and single-sided faces punch clean holes through the ends of the banner at high curl.
- Resizing the plane geometry to fit the container. `curl` is radians per world unit, so a viewport-sized plane bends through a different total angle on every device and the prop stops meaning anything. Move the camera instead — and fit on the larger of the two required distances, or the banner is cropped on whichever axis is tighter.
- Texturing it with a smooth gradient. The bend is then almost invisible, because there is no structure for the foreshortening to compress. Evenly spaced vertical rules bunch toward the receding edges and make the curvature legible.
- Calling `renderer.dispose()` and stopping there. That frees GPU objects but keeps the WebGL context; Chromium caps a renderer process at roughly 16 and silently kills the oldest. `disposeRenderer` calls `forceContextLoss`.

## Notes

- This is the primitive that `cylinder-gallery` instantiates nineteen times. Isolated here so the arc maths can be read without the layout, focus and picking code around it.
- The normal is derived analytically rather than by recomputing vertex normals on the CPU, so `geometry.computeVertexNormals()` is never called and the buffer stays untouched after upload.

## Definition of done

The banner is visibly a section of a cylinder, not a skewed rectangle: the vertical rules bunch together toward both ends and the ends are darker than the middle. Over about nine seconds the curvature tightens and relaxes and the banner never changes size while it does. Move the cursor left and right and the whole arc rocks around its axis, following with a slight lag. Resize the container from wide to narrow and the banner stays fully in frame with the same amount of bend. With `prefers-reduced-motion: reduce` the curvature is frozen but the cursor rock still works.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
