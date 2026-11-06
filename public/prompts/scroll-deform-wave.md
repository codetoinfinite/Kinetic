# Build: Scroll Deformation Wave

Signed, smoothed scroll velocity drives a single scalar, and that scalar scales two sine displacements in the vertex shader. Because the velocity keeps its sign, scrolling up bends the surface the opposite way from scrolling down, which is the direction cue that makes the effect read as momentum rather than as noise. Everything else — the wave shape, the shading, the crop — is a pure function of that one number.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

An image that ripples with scroll speed and bends the other way on the way back, from two sine terms.

- Category: webgl
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. The depth term is `pos.z += sin(position.y * frequency + phase) * deform * amplitude`, and the shear term is `pos.y += sin(position.x * frequency) * deform * shear`. Both are sampled from `position` — the original flat attribute — not from the running `pos`.
2. That distinction is the whole technique. Sampling `position` fixes the wave to the picture, so a given pixel always sits at the same point on the sine and the image appears to flex. Sampling the already-displaced `pos` would make each term feed the next, so the wave travels through the surface and reads as a glitch.
3. The phase constant breaks the symmetry. Without it, `sin(y * f)` is odd about the plane's centre line and the top and bottom halves mirror each other exactly, which looks like a crease rather than a wave.
4. The slope, not the height, drives the shading: `vBend = cos(position.y * frequency + phase) * deform` is the analytic derivative of the depth term, so crests brighten and troughs darken with one cosine and no recomputed vertex normals.
5. `useScrollVelocity` supplies a two-stage smoothed signal — a low-pass on the raw delta, then a damped approach — and the component damps once more on top of it with a 0.0025 smoothing factor, so the ripple eases out for a beat after the scroll stops instead of snapping flat.
6. The fragment shader cover-fits the source into the quad and divides the sampled window by an overscan factor, which is what keeps the displaced vertices from sampling past the texture edge at the crest of every wave.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `amplitude = 0.07`
  World units of depth at full deflection, against a plane roughly 2.5 units tall. Below ~0.02 the ripple is lost in the perspective foreshortening; above ~0.2 the crests swing far enough toward the camera to cross the near plane and punch holes in the image.
- `shear = 0.04`
  Deliberately about half the amplitude. Its only job is to break the perfectly horizontal banding so the surface reads as cloth; raise it toward the amplitude and the two waves beat against each other into a visible moire.
- `frequency = 3`
  Radians per world unit, so roughly one and a half crests across the visible plane. Below ~1.5 there is less than a full wave on screen and the image just tilts; above ~8 the crests fall closer together than the vertex spacing and the wave aliases into flicker.
- `phase = 100`
  An arbitrary large offset whose only purpose is to be nowhere near a multiple of pi. At phase 0 the sine is odd about the plane's centre, the halves mirror, and the ripple looks like a fold down the middle.
- `maxDeform = 1.5`
  Ceiling on the signed scalar, so a trackpad flick cannot drive the displacement past the point where the surface self-intersects. Everything downstream multiplies by this, so it is the one number that bounds the entire effect.
- `reference = 900 px/s`
  Scroll speed that counts as full deflection. The hook defaults to 1500, which is tuned for whole-page parallax; a component-sized scroller rarely reaches it, so the wave would never appear.
- `DEFORM_SMOOTHING = 0.0025`
  Fraction of the gap remaining after one second. Slower and the wave lags visibly behind the scroll; much faster and it snaps flat the instant scrolling stops, losing the ease-out that makes it feel like momentum.
- `overscan = 1.12`
  Twelve percent crop held in reserve. At exactly 1.0 the displaced vertices sample past the edge of the texture at every crest and the clamped border pixel smears across the top and bottom of the image.
- `segments = 96`
  The wave is evaluated per vertex, so subdivision is its resolution. Below ~32 the sine renders as a polyline and the shading term steps in visible bands; above ~160 the vertices land inside a single pixel and only cost transform time.
- `shade = 0.22`
  How far the slope term swings brightness. At 0 the ripple is nearly invisible on a busy image; above ~0.5 the crests blow out to white and read as a lighting bug rather than as a surface.

## API

```ts
function ScrollDeformWave(props: { scrollTarget?: HTMLElement | null; amplitude?: number; shear?: number; frequency?: number; phase?: number; maxDeform?: number; reference?: number; shade?: number; overscan?: number; segments?: number; paint?: (ctx: CanvasRenderingContext2D, size: { width: number; height: number }) => void; className?: string }): JSX.Element
```

- `scrollTarget: HTMLElement | null` — default `null`
  Element whose scrollTop drives the wave. null reads window.scrollY.
- `amplitude: number` — default `0.07`
  Depth of the ripple in world units at full deflection.
- `shear: number` — default `0.04`
  Vertical shear, which breaks up the horizontal banding.
- `frequency: number` — default `3`
  Spatial frequency of the sine, in radians per world unit.
- `phase: number` — default `100`
  Phase offset, so the wave is not symmetric about the plane centre.
- `maxDeform: number` — default `1.5`
  Clamp on the signed deform scalar.
- `reference: number` — default `900`
  Pixels per second of scroll that count as full deflection.
- `shade: number` — default `0.22`
  How far the slope term brightens crests and darkens troughs.
- `overscan: number` — default `1.12`
  Crop held in reserve so displaced vertices never sample past the edge.
- `segments: number` — default `96`
  Plane subdivisions per axis. The resolution of the wave.
- `paint: (ctx, size) => void`
  Override the image. Receives a 2D context for a 1024x1024 canvas.
- `className: string`
  Merged onto the wrapper via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function ScrollDeformWave({
  scrollTarget = null,
  amplitude = 0.07,
  shear = 0.04,
  frequency = 3,
  phase = 100,
  maxDeform = 1.5,
  reference = 900,
  shade = 0.22,
  overscan = 1.12,
  segments = 96,
  paint,
  className,
}: ScrollDeformWaveProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { threshold: 0 });
  const visible = useVisibility();
  const reduced = useReducedMotion();

  // Signed and already smoothed. Raw scroll deltas are spiky enough that
  // feeding them straight into a geometry parameter produces visible stutter.
  const scroll = useScrollVelocity({ reference, target: scrollTarget });

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  const deform = useRef(0);

  const live = useRef({ amplitude, shear, frequency, phase, maxDeform, shade, overscan });
  live.current = { amplitude, shear, frequency, phase, maxDeform, shade, overscan };

  const ready = width > 1 && height > 1 && supported;

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
    camera.position.z = CAMERA_Z;

    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_WIDTH;
    canvas.height = TEXTURE_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (ctx) (paint ?? paintImage)(ctx, { width: TEXTURE_WIDTH, height: TEXTURE_HEIGHT });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

    const uniforms: WaveUniforms = {
      uTexture: { value: texture },
      uTextureAspect: { value: TEXTURE_WIDTH / TEXTURE_HEIGHT },
      uPlaneAspect: { value: 1 },
      uOverscan: { value: overscan },
      uShade: { value: shade },
      uDeform: { value: 0 },
      uFrequency: { value: frequency },
      uPhase: { value: phase },
      uAmplitude: { value: amplitude },
      uShear: { value: shear },
    };

    // A unit plane, rescaled on resize rather than rebuilt. The wave is
    // measured in world units, so the plane keeps a fixed subdivision and the
    // mesh scale carries the aspect.
    const geometry = new THREE.PlaneGeometry(1, 1, segments, segments);
    const material = new THREE.ShaderMaterial({
      vertexShader: scrollDeformWaveVertexShader,
      fragmentShader: scrollDeformWaveFragmentShader,
      uniforms,
      transparent: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    // The bend happens after the bounding sphere was computed, so a plane at
    // the edge of the frustum blinks out mid-ripple if this stays on.
    mesh.frustumCulled = false;
    scene.add(mesh);

    stage.current = { renderer, scene, camera, mesh, geometry, material, texture, uniforms };

    return () => {
      stage.current = null;
      scene.remove(mesh);
      // Lives inside `uniforms`, which `disposeObject` never walks.
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

    // Cover the frustum exactly at z = 0, in world units derived from the
    // camera — not from `window.innerWidth`, which has no fixed relationship
    // to the visible extent at this distance.
    const visibleHeight = 2 * Math.tan((CAMERA_FOV * Math.PI) / 360) * CAMERA_Z;
    current.mesh.scale.set(visibleHeight * aspect, visibleHeight, 1);
    // The shader fits the texture into the QUAD, so this is the quad's aspect.
    current.uniforms.uPlaneAspect.value = aspect;
  }, [width, height]);

  useRaf(
    (dt) => {
      const current = stage.current;
      if (!current) return;
      const {
        amplitude: depth,
        shear: skew,
        frequency: freq,
        phase: offset,
        maxDeform: limit,
        shade: light,
        overscan: zoom,
      } = live.current;

      // Signed on purpose. Taking the magnitude would make scrolling up and
      // scrolling down produce an identical wave, and the direction cue — the
      // surface bending the other way — is most of the effect.
      const target = reduced ? 0 : clamp(scroll.current.normalized, -1, 1) * limit;
      deform.current = damp(deform.current, target, DEFORM_SMOOTHING, dt);

      current.uniforms.uDeform.value = deform.current;
      current.uniforms.uAmplitude.value = depth;
      current.uniforms.uShear.value = skew;
      current.uniforms.uFrequency.value = freq;
      current.uniforms.uPhase.value = offset;
      current.uniforms.uShade.value = light;
      current.uniforms.uOverscan.value = zoom;

      current.renderer.render(current.scene, current.camera);
    },
    ready && inView && visible,
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes the mesh from the scene, disposes the `CanvasTexture` by hand because it lives inside `material.uniforms` where `disposeObject` does not look, runs `disposeObject` over the scene, disposes the geometry and the material, then `disposeRenderer` for `setAnimationLoop(null)` / `dispose()` / `forceContextLoss()`, and removes the canvas element. The stage ref is nulled first so a queued frame is a no-op. `useScrollVelocity` unsubscribes with the shared RAF loop it was registered on.

**Reduced motion.** The deform scalar is forced to 0 regardless of scroll velocity, and it is still damped there, so a component that is mid-ripple when the preference changes eases flat rather than snapping. The image then stays perfectly still while scrolling — the cover fit and the resize handling continue to work, but no vertex is ever displaced and no shading swing occurs.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Sampling the wave from the running `pos` instead of the original `position`. Each term then feeds the next, the ripple travels through the surface as it deforms rather than staying pinned to the image, and the effect looks like a rendering fault instead of the photograph flexing.
- Taking the magnitude of the velocity. `abs(velocity)` makes scrolling up and scrolling down produce an identical wave, which throws away the direction cue that carries most of the effect. The scalar stays signed all the way into the uniform.
- Using a phase of 0. `sin(y * f)` is odd about the plane's centre, so the top and bottom halves mirror each other exactly and the ripple reads as a crease down the middle rather than a wave.
- Feeding raw scroll deltas into the uniform. A wheel emits discrete steps and a trackpad emits bursts; either drives the geometry into visible stutter. The signal is low-passed, damped, and damped again before it reaches the shader.
- Leaving `frustumCulled` on. The bounding sphere was computed for the flat plane, so when the component sits at the edge of the viewport three culls it against geometry the shader has already moved and the image blinks out mid-ripple.
- Fitting the plane with `window.innerWidth`. The plane has to cover the camera's frustum at z = 0, which is `2 * tan(fov/2) * distance` tall — a pixel width has no fixed relationship to that, so the image ends up letterboxed or overscaled depending on the viewport.
- Skipping the overscan. Displaced vertices sample outside [0,1] at the crest of every wave, and the texture's clamped border smears along the top and bottom edges exactly when the wave is at its most visible.
- Passing a ref to `scrollTarget`. The hook takes an `HTMLElement | null`, not a ref object, so a scroller inside the component has to be captured with a callback ref into state before it can be handed over — a plain ref would still be null on the render that matters.
- Calling `renderer.dispose()` alone. That frees GPU objects and leaves the context alive; a page with several WebGL components then hits Chromium's per-process cap and the oldest canvases go blank. `disposeRenderer` calls `forceContextLoss`.

## Notes

- `scrollTarget` defaults to `null`, which reads `window.scrollY`. Pass the scrolling element when the component lives inside its own `overflow-y-auto` container, as the demo does.
- The plane is a unit quad rescaled on resize rather than rebuilt, so a container resize never reallocates a 96x96 vertex buffer.

## Definition of done

Scroll the container and the image ripples in horizontal bands, with the crests catching a little more light than the troughs. Scroll the other way and the bands bow the opposite direction. Stop and the surface eases flat over about half a second rather than snapping. Flick hard and the ripple deepens but never folds through itself or shows a smeared edge. The image keeps its own proportions at any container aspect, and scrolling the page while the component is off screen costs nothing because the loop is gated on visibility. With `prefers-reduced-motion: reduce` the image is completely still at every scroll speed.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
