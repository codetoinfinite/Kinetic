# Build: Single-Draw Orbit Rings

Five concentric orbits of static path dots, each carrying one brighter dot that travels it. Every dot in the system is a vertex of one `THREE.Points` object, so ring count and dot count cost buffer memory but never a second draw call. The outer rings are dimmer than the inner ones, which reads as depth even though the camera is orthographic and nothing is actually further away.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Concentric rings of dots, one bright marker travelling each ring, all of it in a single draw call.

- Category: webgl
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. Each dot packs its whole identity into one attribute, `aPointData = vec4(kind, ringIndex, angle, dotRadius)`, where `kind` is 0 for a path dot and 1 for the orbiting marker. `position` is zeroed for every vertex and carries no information at all.
2. The vertex shader derives the ring radius as `uBaseRadius * scale * uExtent * 0.5` with `scale = 1.0 - (uRingCount - 1.0 - ringIndex) * 0.1`, so rings step 10% apart with the outermost at full radius, and `uExtent = min(width, height)` keeps the structure inside a preview of any aspect.
3. Path dots sit at `vec2(cos(angle), sin(angle)) * ringRadius`; markers use `angle - PI * 0.5 + uElapsed * uSpeed` instead, so the phase offset baked into the attribute becomes a starting position and the clock does the travelling.
4. Depth is faked with a focal length that no camera uses: `alpha = 0.15 + 0.65 * FOCAL_LENGTH / (FOCAL_LENGTH + ringRadius)` dims a ring in proportion to its size, so wider rings recede.
5. `gl_PointSize` is clamped to a 2px floor and the fragment alpha is then divided by the area that clamping invented — `vAlphaScale = unclamped² / clamped²` — so a dot forced twice as wide comes out four times fainter and the field looks identical at 1x and 3x device pixel ratio.
6. The fragment shader turns each square point sprite into a disc with `1.0 - smoothstep(0.43, 0.5, length(gl_PointCoord - 0.5))` and discards anything fully transparent, so the renderer is created with `antialias: false`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `RING_STEP = 0.1`
  10% radius difference between adjacent rings. Below ~0.06 the rings visually merge into a band at preview size; above ~0.15 the innermost ring collapses to a dot when ringCount is 5.
- `FOCAL_LENGTH = 800.0`
  Not a camera property — the denominator of the alpha falloff. At 800 the outermost ring lands about 30% dimmer than the innermost at typical preview sizes: enough to read as depth, not enough to read as a fade-out. At 200 the outer rings vanish.
- `MIN_POINT_SIZE = 2.0`
  Hardware floor. Below roughly 1px most GPUs rasterise nothing at all, so a 1px dot at DPR 1 would simply be missing on some machines rather than faint.
- `UNCLAMPED_MIN_POINT_SIZE = 1.0`
  The size the dot *would* have had. It is the numerator of the area correction — without a separate constant there is nothing to compare the clamped size against and the compensation cannot be computed.
- `disc edge = smoothstep(0.43, 0.5, d)`
  A soft band 7% of the point radius wide. Narrower and a 2px dot aliases into a square; wider and every dot looks blurred rather than small.
- `baseRadius = 0.75`
  Outermost ring diameter as a fraction of the container short side. At 1.0 the ring touches the edge and the marker clips as it passes; 0.75 leaves a margin the marker can travel through.
- `dotsPerRing = 170`
  Dense enough that the path reads as a continuous line at 320px wide, sparse enough that the innermost ring is not a solid filled circle.
- `speed = 0.3`
  Radians per second — one lap every ~21s. Linear, no easing: a constant angular rate is what makes it read as a mechanism rather than an animation.

## API

```ts
function OrbitRingPoints(props: { ringCount?: number; dotsPerRing?: number; speed?: number; baseRadius?: number; dotRadius?: number; markerRadius?: number; opacity?: number; color?: string; markerColor?: string; seed?: number | string; className?: string }): JSX.Element
```

- `ringCount: number` — default `5`
  Concentric rings. Each gets exactly one travelling marker.
- `dotsPerRing: number` — default `170`
  Static path dots per ring.
- `speed: number` — default `0.3`
  Marker angular speed in radians per second.
- `baseRadius: number` — default `0.75`
  Outermost ring diameter as a fraction of the container short side.
- `dotRadius: number` — default `1`
  Path dot radius in CSS pixels, before pixel-ratio scaling.
- `markerRadius: number` — default `3`
  Marker radius in CSS pixels.
- `opacity: number` — default `1`
  Multiplier applied to every dot in the vertex shader.
- `color: string` — default `'#8a8f98'`
  Path dot colour, any value `THREE.Color` accepts.
- `markerColor: string` — default `'#ffffff'`
  Travelling marker colour.
- `seed: number | string` — default `'orbit-ring-points'`
  Seeds the angular scatter, so the ring is identical on server and client.
- `className: string`
  Merged onto the host element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function OrbitRingPoints({
  ringCount = 5,
  dotsPerRing = 170,
  speed = 0.3,
  baseRadius = 0.75,
  dotRadius = 1,
  markerRadius = 3,
  opacity = 1,
  color = '#8a8f98',
  markerColor = '#ffffff',
  seed = 'orbit-ring-points',
  className,
}: OrbitRingPointsProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const { width, height } = useResizeObserver(host);
  const size = useRef({ width, height });
  size.current = { width, height };

  const reduced = useReducedMotion();
  const ready = width > 0 && height > 0;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    if (!hasWebGL()) {
      setUnsupported(true);
      return;
    }

    // `antialias: false` is deliberate: the fragment shader anti-aliases each
    // disc itself with a smoothstep, so MSAA would pay for a whole extra
    // sample buffer to solve a problem that is already solved.
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    } catch {
      // A context can still be refused between the probe and the construction —
      // the tab may have hit the browser's live-context ceiling in between. three
      // throws rather than returning null, and an uncaught throw here takes the
      // page with it.
      setUnsupported(true);
      return;
    }
    renderer.setPixelRatio(pixelRatio());
    renderer.setClearAlpha(0);

    const scene = new THREE.Scene();
    // Orthographic and 1:1 with CSS pixels, so `gl_PointSize` in the shader is
    // a real pixel count and the ring radii are real pixel radii.
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const rng = createRng(seed);
    const perRing = dotsPerRing + 1; // path dots + one marker
    const total = ringCount * perRing;

    const positions = new Float32Array(total * 3); // stays all zeros
    const pointData = new Float32Array(total * 4);

    let at = 0;
    for (let ring = 0; ring < ringCount; ring += 1) {
      // Sorting the angles is not cosmetic. Points are drawn in buffer order,
      // and an unsorted ring interleaves near and far dots so the alpha blend
      // stipples along the path instead of reading as one continuous line.
      const angles = new Float32Array(dotsPerRing);
      for (let i = 0; i < dotsPerRing; i += 1) angles[i] = rng() * Math.PI * 2;
      angles.sort();

      for (let i = 0; i < dotsPerRing; i += 1) {
        pointData[at] = 0;
        pointData[at + 1] = ring;
        pointData[at + 2] = angles[i] ?? 0;
        pointData[at + 3] = dotRadius;
        at += 4;
      }

      pointData[at] = 1;
      pointData[at + 1] = ring;
      pointData[at + 2] = rng() * Math.PI * 2;
      pointData[at + 3] = markerRadius;
      at += 4;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPointData', new THREE.BufferAttribute(pointData, 4));

    const uniforms: Uniforms = {
      uElapsed: { value: 0 },
      uExtent: { value: 1 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uOpacity: { value: opacity },
      uRingCount: { value: ringCount },
      uSpeed: { value: speed },
      uBaseRadius: { value: baseRadius },
      uColor: { value: new THREE.Color(color) },
      uMarkerColor: { value: new THREE.Color(markerColor) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: ORBIT_RING_POINTS_VERT,
      fragmentShader: ORBIT_RING_POINTS_FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    // Every vertex sits at the origin, so three computes a bounding sphere of
    // radius zero and culls the entire object the moment the camera is not
    // looking straight at (0,0,0). Displacement happens in the shader, which
    // the culler cannot see.
    points.frustumCulled = false;
    scene.add(points);

    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const resize = (w: number, h: number) => {
      renderer.setSize(w, h, false);
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      // Ring radii scale off the SHORT side. Off the height alone, a wide
      // preview leaves the rings floating in a sea of empty space; off the
      // width alone, a tall one clips them.
      uniforms.uExtent.value = Math.min(w, h);
      uniforms.uPixelRatio.value = renderer.getPixelRatio();
    };

    const draw = (elapsed: number) => {
      uniforms.uElapsed.value = elapsed;
      renderer.render(scene, camera);
    };

    resize(size.current.width, size.current.height);
    stage.current = { renderer, scene, camera, uniforms, resize, draw };
    draw(STATIC_ELAPSED);

    return () => {
      stage.current = null;
      // Order matters: release the scene graph's GPU objects while the
      // context is still alive, then hand the context back.
      disposeObject(scene);
      material.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
  }, [
    ready,
    ringCount,
    dotsPerRing,
    speed,
    baseRadius,
    dotRadius,
    markerRadius,
    opacity,
    color,
    markerColor,
    seed,
  ]);

  // Resize is its own effect so a container reflow costs a `setSize` call
  // rather than a full teardown and rebuild of the buffer.
  useEffect(() => {
    stage.current?.resize(width, height);
    if (reduced) stage.current?.draw(STATIC_ELAPSED);
  }, [width, height, reduced]);

  useRaf((_dt, elapsed) => stage.current?.draw(elapsed), ready && !reduced && !unsupported);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Clears the stage ref first so no queued frame can touch a dead renderer, then `disposeObject(scene)` for the geometry, `material.dispose()`, `disposeRenderer(renderer)` for `dispose` + `forceContextLoss` + zeroing the drawing buffer, and finally removes the canvas from the DOM. The rAF subscription is released by `useRaf` on unmount.

**Reduced motion.** The rAF subscription is never opened. One frame is drawn at `uElapsed = 0`, which parks every marker at twelve o'clock on its ring, so the full structure is visible and only the orbiting stops. Resizing still redraws that frame.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Leaving `frustumCulled` at its default. Every vertex sits at the origin, so three computes a bounding sphere of radius zero; the displacement is invisible to the culler and the entire object disappears the moment the camera is not pointed exactly at (0,0,0).
- Not sorting the angles within a ring before writing them into the buffer. Points are blended in buffer order with depth testing off, so an unsorted ring stipples — the path visibly breaks into a dotted texture instead of reading as one line.
- Clamping `gl_PointSize` without correcting the alpha. The clamp is invisible at DPR 3 and doubles the covered area at DPR 1, so the same component looks twice as bright on a cheap monitor as on a retina laptop.
- Turning on `antialias: true` to smooth the dots. The fragment shader already anti-aliases each disc; MSAA then allocates a multisample buffer the size of the canvas to solve nothing.
- Rebuilding the renderer on every resize. The buffer is size-independent — only the camera frustum and `uExtent` change — so a container reflow should cost a `setSize` call, not a teardown that drops and re-acquires a GL context.
- Calling `renderer.dispose()` and stopping there. It frees GPU objects but leaves the context alive; `disposeRenderer` also calls `forceContextLoss`, without which a grid of previews silently blacks out the oldest one at around sixteen contexts.

## Notes

- The camera is orthographic and spans the canvas 1:1 in CSS pixels, so `gl_PointSize` is a real pixel count and ring radii are real pixel radii. That is what makes the pixel-ratio compensation expressible at all.
- Ring count and dots per ring are both free at draw time. A hundred rings is one draw call and one buffer upload.

## Definition of done

Five rings of dots with one brighter dot travelling each, all at the same angular rate, the outer rings visibly dimmer than the inner ones. Resize the container and the rings rescale without flicker or a dropped context. Zoom the browser to 200% and the dots stay the same apparent brightness rather than getting denser. With reduced motion on, the rings render fully and the markers sit still at the top.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
