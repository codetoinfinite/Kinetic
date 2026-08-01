# Build: Cover-Fit UV Maths

A shader has no box to crop, so `object-fit: cover` has to happen on the texture coordinates before the sample. The fit is a pure function of two numbers — the texture aspect and the quad aspect — which means the quad can be reshaped on every frame and the crop simply follows, with no re-upload and no CPU work. The frame here cycles from tall to wide continuously, because a cover fit only ever tested at one aspect ratio has not been tested.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

object-fit: cover for a textured quad, solved in UV space so the crop follows a frame that reshapes every frame.

- Category: webgl
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. The sampled window starts at the full texture, `scale = vec2(1.0)`, and is only ever narrowed. If `textureAspect > planeAspect` the texture has surplus width, so `scale.x = planeAspect / textureAspect`; otherwise it has surplus height and `scale.y = textureAspect / planeAspect`. Exactly one axis shrinks and the other reaches both edges of the image.
2. The leftover slack is `1 - scale`, and multiplying it by the focal point places that slack: `offset = (1.0 - scale) * uFocal`. At a focal of 0.5 the sampled window is `[(1-s)/2, (1+s)/2]` — centred — while 0 pins the crop to the left or top edge and 1 to the right or bottom.
3. The final coordinate is `vUv * scale + offset`, which is guaranteed to stay inside [0,1] because scale is never greater than 1 and offset is exactly the remaining room. Nothing has to be clamped and no branch depends on the fragment.
4. Overscan divides the scale further, shrinking the window past a strict fit. That reserve is what a vertex displacement elsewhere in a pipeline eats into: with no reserve, a wave or a bulge pushes a coordinate past the sampled region and the texture's clamped border smears along the edge.
5. The frame is driven by an eased triangle wave with a hold at each end, and its scale is fitted to the viewport by the contain rule — `frameAspect > maxW / maxH ? width-limited : height-limited` — so the tall end of the cycle stays fully on screen rather than running off the top and bottom.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `minAspect / maxAspect = 0.62 / 2.3`
  The range the frame sweeps. Both ends have to sit clearly on opposite sides of the source's own 16:9 so the shader is seen switching which axis it crops; a range that stays on one side of the texture aspect never exercises the other branch at all.
- `period / hold = 8 s / 0.12`
  Twelve percent of the cycle parked at each extreme. Without a hold the frame is only ever momentarily at its widest and the eye never gets to check the crop; past ~0.25 the component spends more time still than moving.
- `fill = 0.84`
  Fraction of the container the frame occupies at its largest. At 1.0 the frame is flush with the edges and its reshaping is invisible because there is no background to reshape against.
- `overscan = 1`
  Exactly 1 is a strict fit and the right default when nothing displaces the geometry. Raise it — 1.12 is the value `cylinder-gallery` uses — only when vertices move after the UV is computed; every increment past 1 is crop permanently thrown away.
- `focal = [0.5, 0.5]`
  Centres the slack on both axes. 0 or 1 pins the crop to an edge, which is what a subject-aware crop wants; anything outside [0,1] pushes the window off the texture and samples the clamped border.
- `texture size = 1200 x 675`
  A deliberately 16:9 source, so both branches of the fit are exercised as the frame sweeps past that ratio. The absolute size only sets sampling quality.
- `grid cell = width / 16`
  Square cells measured in source pixels. They are the test instrument: under a correct cover fit they stay square at every frame aspect, and the moment the maths degrades into a stretch they visibly become rectangles.

## API

```ts
function UvCoverFit(props: { minAspect?: number; maxAspect?: number; period?: number; hold?: number; fill?: number; overscan?: number; focal?: [number, number]; paint?: (ctx: CanvasRenderingContext2D, size: { width: number; height: number }) => void; textureSize?: { width: number; height: number }; className?: string }): JSX.Element
```

- `minAspect: number` — default `0.62`
  Narrowest frame aspect in the cycle (w / h).
- `maxAspect: number` — default `2.3`
  Widest frame aspect in the cycle (w / h).
- `period: number` — default `8`
  Seconds for a full narrow-wide-narrow cycle, holds included.
- `hold: number` — default `0.12`
  Fraction of the cycle spent parked at each extreme.
- `fill: number` — default `0.84`
  Fraction of the container the frame fills at its largest.
- `overscan: number` — default `1`
  Extra zoom on the crop. 1 fits exactly; above 1 keeps margin in reserve.
- `focal: [number, number]` — default `[0.5, 0.5]`
  Where the crop slack goes, per axis. 0.5 centres it.
- `paint: (ctx, size) => void`
  Override the source image. Receives a 2D context for the source canvas.
- `textureSize: { width: number; height: number }` — default `{ width: 1200, height: 675 }`
  Source canvas size. Its ratio is the texture aspect the shader fits.
- `className: string`
  Merged onto the wrapper via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function UvCoverFit({
  minAspect = 0.62,
  maxAspect = 2.3,
  period = 8,
  hold = 0.12,
  fill = 0.84,
  overscan = 1,
  focal = [0.5, 0.5],
  paint,
  textureSize = DEFAULT_TEXTURE,
  className,
}: UvCoverFitProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { threshold: 0 });
  const visible = useVisibility();
  const reduced = useReducedMotion();

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  const elapsed = useRef(0);
  const viewport = useRef({ width: 1, height: 1 });

  const live = useRef({ minAspect, maxAspect, period, hold, fill, overscan, focal });
  live.current = { minAspect, maxAspect, period, hold, fill, overscan, focal };

  const ready = width > 1 && height > 1 && supported;
  const textureWidth = textureSize.width;
  const textureHeight = textureSize.height;

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
    // Orthographic, because nothing here is about perspective. World units map
    // one-to-one to the frame: the quad's scale IS its aspect ratio, with no
    // frustum arithmetic in between.
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
    camera.position.z = 1;

    const canvas = document.createElement('canvas');
    canvas.width = textureWidth;
    canvas.height = textureHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) (paint ?? paintSource)(ctx, { width: textureWidth, height: textureHeight });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    // Clamp, not repeat. If a rounding error ever pushes a UV a hair past 1,
    // repeat wraps the far edge of the image into view as a bright seam;
    // clamp smears the border pixel instead, which is invisible.
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

    const uniforms: CoverUniforms = {
      uTexture: { value: texture },
      uTextureAspect: { value: textureWidth / textureHeight },
      uPlaneAspect: { value: 1 },
      uOverscan: { value: overscan },
      uFocal: { value: new THREE.Vector2(focal[0], focal[1]) },
    };

    // One quad, two triangles. The fit is per-fragment ratio arithmetic, so
    // subdividing would buy nothing at all.
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.ShaderMaterial({
      vertexShader: uvCoverFitVertexShader,
      fragmentShader: uvCoverFitFragmentShader,
      uniforms,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    stage.current = { renderer, scene, camera, mesh, geometry, material, texture, uniforms };

    return () => {
      stage.current = null;
      scene.remove(mesh);
      // Inside `uniforms`, so `disposeObject` will never reach it.
      texture.dispose();
      disposeObject(scene);
      geometry.dispose();
      material.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, textureWidth, textureHeight, paint]);

  useEffect(() => {
    const current = stage.current;
    if (!current || width < 1 || height < 1) return;
    const aspect = width / height;
    current.renderer.setPixelRatio(pixelRatio());
    current.renderer.setSize(width, height, false);
    // Ortho bounds track the container aspect so a world unit is the same
    // number of pixels on both axes. Leave them at +/-1 and the quad is
    // stretched by the viewport, which would fake the exact bug this
    // component exists to avoid.
    current.camera.left = -aspect;
    current.camera.right = aspect;
    current.camera.top = 1;
    current.camera.bottom = -1;
    current.camera.updateProjectionMatrix();
    viewport.current = { width: aspect * 2, height: 2 };
  }, [width, height]);

  useRaf(
    (dt) => {
      const current = stage.current;
      if (!current) return;
      const {
        minAspect: low,
        maxAspect: high,
        period: cycle,
        hold: pause,
        fill: coverage,
        overscan: zoom,
        focal: focalPoint,
      } = live.current;

      if (!reduced) elapsed.current += dt;
      const phase = reduced ? 0.5 : cyclePhase(elapsed.current, Math.max(cycle, 1), pause);
      const frameAspect = lerp(low, high, phase);

      // Contain the frame inside the viewport at the requested aspect. Fitting
      // on width alone means the tall end of the cycle runs off the top and
      // bottom, which hides half the thing being demonstrated.
      const available = viewport.current;
      const maxW = available.width * coverage;
      const maxH = available.height * coverage;
      const frameW = frameAspect > maxW / maxH ? maxW : maxH * frameAspect;
      const frameH = frameAspect > maxW / maxH ? maxW / frameAspect : maxH;

      current.mesh.scale.set(frameW, frameH, 1);
      // The uniform is the QUAD's aspect, not the canvas's. Passing the
      // container aspect here is the classic bug: the crop then ignores the
      // frame and only tracks the browser window.
      current.uniforms.uPlaneAspect.value = frameAspect;
      current.uniforms.uOverscan.value = zoom;
      current.uniforms.uFocal.value.set(focalPoint[0], focalPoint[1]);

      current.renderer.render(current.scene, current.camera);
    },
    ready && inView && visible,
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Removes the quad from the scene, disposes the `CanvasTexture` explicitly because it sits inside `material.uniforms` where `disposeObject` cannot reach it, runs `disposeObject` over the scene, disposes the geometry and material, then calls `disposeRenderer` — `setAnimationLoop(null)`, `dispose()`, `forceContextLoss()` — and removes the canvas from the DOM. The stage ref is nulled before any of it, so a frame already queued by the shared RAF loop returns immediately instead of rendering into a dead context.

**Reduced motion.** The aspect cycle does not advance: elapsed time stops accumulating and the phase is pinned to 0.5, so the frame holds at the midpoint between `minAspect` and `maxAspect` and never reshapes. The cover fit itself still runs every frame and still responds correctly to container resizes — what is removed is the autonomous animation, not the behaviour.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Scaling the short axis up rather than the long axis down. `scale.y = planeAspect / textureAspect` when that ratio exceeds 1 pushes the sampled window past the edge of the texture, and with the default `RepeatWrapping` the far side of the image wraps into view as a bright seam across the frame.
- Passing the container's aspect ratio as `uPlaneAspect`. The uniform has to be the aspect of the QUAD being drawn; hand it the canvas aspect instead and the crop stops tracking the frame entirely and only responds to browser-window resizes.
- Leaving the orthographic camera at the default -1..1 bounds. A world unit is then a different number of pixels horizontally and vertically, so the quad is stretched by the viewport — faking the exact distortion this component exists to prevent. The bounds track the container aspect.
- Applying the offset before the scale. `(vUv + offset) * scale` shrinks the offset along with the coordinate, so the crop drifts toward the origin as the aspect mismatch grows instead of staying centred.
- Leaving `wrapS` / `wrapT` at `RepeatWrapping`. A rounding error of one ulp past 1.0 then wraps to the opposite edge of the image and shows as a one-pixel bright line; `ClampToEdgeWrapping` smears the border pixel instead, which is invisible.
- Testing with a smooth gradient. Every fit looks correct on a gradient. A square grid and a true circle are what make a stretch obvious — the cells go rectangular and the circle goes elliptical.
- Fitting the frame on width alone. The tall end of the aspect cycle then runs off the top and bottom of the container, hiding half of what is being demonstrated. The frame is contained on whichever axis is tighter.
- Omitting `#include <colorspace_fragment>` from the `ShaderMaterial`. three only injects output conversion into its own materials, so raw linear values ship into an sRGB framebuffer and the quad renders visibly washed out.
- Calling `renderer.dispose()` alone on unmount. It frees GPU objects but leaves the WebGL context alive, and Chromium silently kills the oldest context once a renderer process holds about 16 of them. `disposeRenderer` calls `forceContextLoss`.

## Notes

- The fit is per-fragment ratio arithmetic, so the quad is a single unsubdivided `PlaneGeometry(1, 1)`. `cylinder-gallery` runs the same maths per vertex instead, because there it feeds a bend that needs the result before rasterisation.
- The camera is orthographic so that world units map straight onto the frame: the mesh's scale IS its aspect ratio, with no frustum arithmetic sitting between the two.

## Definition of done

The frame reshapes continuously from tall to wide and back, pausing briefly at each extreme. Throughout, the grid cells stay square and the circle stays circular — nothing ever stretches. As the frame passes the source's own 16:9 ratio you can see the crop switch from trimming the top and bottom to trimming the sides, with the centre of the image staying put. Resize the container and the frame stays fully inside it at both ends of its cycle. With `prefers-reduced-motion: reduce` the frame holds at one aspect and does not animate, and the image inside it is still correctly cropped.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
