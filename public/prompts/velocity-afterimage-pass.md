# Build: Velocity Afterimage Pass

A motion trail that stores no history. Two render targets take turns: one holds everything that has happened, the other receives that accumulation multiplied by a decay factor with the current frame composited over it, and next frame they swap roles. Because the trail is a texture rather than a list of past positions, its length is one float — so it can be driven straight from how fast the marks are moving and change continuously without allocating anything. Fast movement smears; slow movement is perfectly crisp.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Marks that smear into a tail when the pointer moves fast and stay crisp when it slows, from two targets swapping roles.

- Category: webgl
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. Three half-float targets are allocated at container size x DPR x `resolutionScale`: `frame` receives only this frame's marks, and `ping`/`pong` alternate as the accumulation. Reading and writing one target in a single pass is undefined in WebGL, which is the only reason there are two.
2. Pass 1 clears `frame` and renders the content scene into it — one lead mark plus `satellites` orbiters, all sharing a single 1x1 `PlaneGeometry` and one 256px canvas-drawn radial falloff texture, so the whole cluster is a handful of draw calls and no per-frame allocation.
3. The lead follows the pointer through `damp(lead.x, pointer.ndcX * aspect, 0.0004, dt)`, and the satellites sit at `lead + (cos, sin)(i/n * 2PI + elapsed * 1.5) * 0.3` around it. The x target is multiplied by aspect because the orthographic frustum is widened to `[-aspect, aspect]` while staying `[-1, 1]` tall.
4. Trail length is measured from the *mark*, not the cursor: `speed = hypot(lead - previousLead) / dt`, normalised by `reference`, clamped to 0..1 and scaled by `maxDamp`. That target is then itself run through `damp(..., 0.003, dt)`, so the tail extends and retracts smoothly instead of popping to full length on the first fast frame.
5. Pass 2 renders a fullscreen quad into whichever target is not the current history, with `uCurrent = frame.texture`, `uHistory = ping.texture` and `uDamp` set to the smoothed speed. The fragment is `float alive = step(uCutoff, history.a); history *= uDamp * alive; gl_FragColor = max(current, history);` — `max` keeps the head at full strength and lets the tail sit underneath it.
6. Pass 3 blits the accumulation to the canvas through a stock `MeshBasicMaterial`, so three performs output colour conversion exactly once and the blend pass stays in linear space. Then `ping` and `pong` are swapped: what was just written becomes next frame's history.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `maxDamp = 0.9`
  Per-frame decay factor at full speed. Must stay below 1: at exactly 1 nothing ever decays and the trail becomes a permanent painted streak across the panel. Above ~0.95 the tail outlives the gesture by seconds and reads as a smudged framebuffer rather than motion.
- `cutoff = 0.06`
  Alpha below which `step()` zeroes a pixel outright. Geometric decay never actually reaches zero — at 0.9 a pixel still holds 0.5% of its value a hundred frames later, and on a half-float target that faint ghost of the very first frame is baked in permanently. Below ~0.02 the ghost is visible on a dark surface; above ~0.15 the tail ends in a hard edge instead of fading.
- `reference = 1.6`
  World units per second that count as full speed. The frustum is 2 units tall, so this is roughly 0.8 container heights per second — a brisk but ordinary hand movement. Set it much higher and only a violent flick produces any trail at all.
- `LEAD_SMOOTHING = 0.0004`
  Fraction of the gap to the pointer still remaining after one second. Tight enough that the lead feels attached to the cursor, loose enough that the mark keeps travelling for a frame or two after the hand stops — which is what gives the tail something to decay from.
- `DAMP_SMOOTHING = 0.003`
  Smoothing on the decay factor itself, deliberately looser than the position smoothing. If the trail length tracked speed instantly, a single dropped frame would spike `dt`, spike the measured speed, and flash a full-length tail out of a stationary mark.
- `ORBIT_RADIUS / ORBIT_SPEED = 0.3 / 1.5`
  Satellites orbit 0.3 world units out at 1.5 rad/s. The radius has to exceed the lead's own 0.34 half-size or the satellites never clear the lead's falloff and the cluster reads as one blob; the speed is what produces a curved tail rather than three parallel straight ones.
- `SPRITE_SIZE = 256`
  One canvas-drawn radial gradient shared by every mark. 256px is above the on-screen size of the largest mark at DPR 2, so it never magnifies into visible steps, and it is small enough that the upload is a single sub-millisecond cost at build time.
- `target type / filter = HalfFloatType, NearestFilter`
  The accumulation is multiplied by a fraction every frame. On the default 8-bit unsigned byte the result quantises into stair-stepped bands down the length of the trail. Nearest rather than linear because the blend samples texel-for-texel from a target of identical size — bilinear filtering would smear the trail sideways a little more on each of the hundreds of passes a pixel survives.

## API

```ts
function VelocityAfterimagePass(props: { maxDamp?: number; cutoff?: number; reference?: number; satellites?: number; hue?: number; resolutionScale?: number; className?: string }): JSX.Element
```

- `maxDamp: number` — default `0.9`
  Longest trail, as the per-frame decay factor. Must stay below 1.
- `cutoff: number` — default `0.06`
  Alpha below which a pixel is cut to nothing instead of decaying forever.
- `reference: number` — default `1.6`
  Mark travel in world units per second that counts as full speed.
- `satellites: number` — default `3`
  Marks orbiting the lead. 0 leaves a single mark.
- `hue: number` — default `196`
  Base hue in degrees. Satellites are offset 26 degrees apart from it.
- `resolutionScale: number` — default `1`
  Render target scale relative to the canvas. Below 1 trades tail sharpness for fill rate.
- `className: string`
  Merged onto the root container via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function VelocityAfterimagePass({
  maxDamp = 0.9,
  cutoff = 0.06,
  reference = 1.6,
  satellites = 3,
  hue = 196,
  resolutionScale = 1,
  className,
}: VelocityAfterimagePassProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { threshold: 0 });
  const visible = useVisibility();
  const reduced = useReducedMotion();
  const pointer = useSmoothPointer({ target: host, smoothing: 0.0005 });

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  const elapsed = useRef(0);
  const dampNow = useRef(0);
  const last = useRef<{ x: number; y: number } | null>(null);
  const lead = useRef({ x: 0, y: 0 });

  const live = useRef({ maxDamp, cutoff, reference });
  live.current = { maxDamp, cutoff, reference };

  const ready = width > 1 && height > 1 && supported;

  /* Sizing is a callback rather than effect-body code because it has to be
     reachable from BOTH effects, which fire on independent triggers. The build
     effect sizes the render targets itself, but it constructs `contentCamera`
     at +/-1 and nothing else ever widened it — that lived only in the effect
     keyed on the observed width and height. So any rebuild without an
     accompanying size change left the camera square inside a non-square
     canvas: the marks render as ellipses, and because the raf loop reads the
     aspect back off `contentCamera.right` the lead mark also tracks the
     pointer at the wrong horizontal scale, drifting further from the cursor
     the further it travels. The build effect re-runs on `satellites`, `hue`
     and `resolutionScale`, so that state persisted until the user happened to
     resize the window. Everything below is derived purely from w and h, and
     `WebGLRenderTarget.setSize` no-ops on unchanged dimensions, so calling it
     from both paths is idempotent. */
  const fitStage = useCallback(
    (w: number, h: number) => {
      const current = stage.current;
      if (!current || w < 1 || h < 1) return;
      const dpr = pixelRatio();
      const aspect = w / h;
      current.renderer.setPixelRatio(dpr);
      current.renderer.setSize(w, h, false);
      current.contentCamera.left = -aspect;
      current.contentCamera.right = aspect;
      current.contentCamera.updateProjectionMatrix();

      const bufferW = Math.max(2, Math.round(w * dpr * resolutionScale));
      const bufferH = Math.max(2, Math.round(h * dpr * resolutionScale));
      for (const target of [current.frame, current.ping, current.pong]) {
        target.setSize(bufferW, bufferH);
        // setSize reallocates the texture, so whatever the history held is now
        // undefined memory. Without an explicit clear, the first frame after a
        // resize can composite garbage that then decays for a second.
        current.renderer.setRenderTarget(target);
        current.renderer.clear();
      }
      current.renderer.setRenderTarget(null);
    },
    [resolutionScale],
  );

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    } catch {
      // A context can still be refused between the probe and the construction —
      // the tab may have hit the browser's live-context ceiling in between. three
      // throws rather than returning null, and an uncaught throw here takes the
      // page with it.
      setSupported(false);
      return;
    }
    const dpr = pixelRatio();
    renderer.setPixelRatio(dpr);
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);

    const bufferW = Math.max(2, Math.round(el.clientWidth * dpr * resolutionScale));
    const bufferH = Math.max(2, Math.round(el.clientHeight * dpr * resolutionScale));

    // Three targets: one for this frame's marks, two that swap as history.
    // Reading and writing the same target in one pass is undefined behaviour
    // in WebGL and shows up as tearing or a black frame depending on driver.
    const frame = makeTarget(bufferW, bufferH);
    const ping = makeTarget(bufferW, bufferH);
    const pong = makeTarget(bufferW, bufferH);

    const sprite = new THREE.CanvasTexture(makeSprite());
    sprite.colorSpace = THREE.SRGBColorSpace;

    const content = new THREE.Scene();
    const contentCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
    contentCamera.position.z = 1;

    const markGeometry = new THREE.PlaneGeometry(1, 1);
    const markMaterials: THREE.MeshBasicMaterial[] = [];

    const makeMark = (size: number, lightness: number, shift: number) => {
      const material = new THREE.MeshBasicMaterial({
        map: sprite,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      });
      material.color.setHSL(((hue + shift) % 360) / 360, 0.72, lightness);
      markMaterials.push(material);
      const mesh = new THREE.Mesh(markGeometry, material);
      mesh.scale.setScalar(size);
      content.add(mesh);
      return mesh;
    };

    const leadMesh = makeMark(LEAD_SIZE, 0.62, 0);
    const orbiters: THREE.Mesh[] = [];
    for (let i = 0; i < Math.max(satellites, 0); i++) {
      orbiters.push(makeMark(SATELLITE_SIZE, 0.5, (i + 1) * 26));
    }

    // Fullscreen quad, reused by both post passes. PlaneGeometry(2, 2) exactly
    // fills a -1..1 orthographic frustum with no scaling in between.
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const blendUniforms: BlendUniforms = {
      uCurrent: { value: frame.texture },
      uHistory: { value: ping.texture },
      uDamp: { value: 0 },
      uCutoff: { value: cutoff },
    };
    const blendMaterial = new THREE.ShaderMaterial({
      vertexShader: velocityAfterimageVertexShader,
      fragmentShader: velocityAfterimageFragmentShader,
      uniforms: blendUniforms,
      depthWrite: false,
      depthTest: false,
    });
    const quadScene = new THREE.Scene();
    quadScene.add(new THREE.Mesh(quadGeometry, blendMaterial));

    // The final blit uses a stock material precisely so three applies its own
    // output colour-space conversion here, and only here.
    const screenMaterial = new THREE.MeshBasicMaterial({
      map: pong.texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    const screenScene = new THREE.Scene();
    screenScene.add(new THREE.Mesh(quadGeometry, screenMaterial));

    const stageValue: Stage = {
      renderer,
      content,
      contentCamera,
      quadScene,
      quadCamera,
      screenScene,
      frame,
      ping,
      pong,
      blendUniforms,
      screenMaterial,
      lead: leadMesh,
      orbiters,
      sprite,
      quadGeometry,
      markGeometry,
      blendMaterial,
      markMaterials,
    };
    stage.current = stageValue;

    // Fit before the first frame. `ready` guarantees the observed box is real,
    // and waiting for the resize effect to widen the camera is a bet that the
    // box will change size again — on a stage that is built once and never
    // reflowed, that bet never pays out. The clear this performs is wanted
    // here too: the three targets are freshly allocated and their contents are
    // undefined until something writes them.
    fitStage(width, height);

    return () => {
      stage.current = null;
      disposeObject(content);
      disposeObject(quadScene);
      disposeObject(screenScene);
      sprite.dispose();
      quadGeometry.dispose();
      markGeometry.dispose();
      blendMaterial.dispose();
      screenMaterial.dispose();
      for (const material of markMaterials) material.dispose();
      // Render targets are not part of any scene graph, so nothing walks them.
      // Each one holds a full-resolution half-float texture and a framebuffer.
      frame.dispose();
      ping.dispose();
      pong.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, satellites, hue, resolutionScale]);

  // Reflow costs a re-fit, never a rebuild. `resolutionScale` stays covered
  // because `fitStage` closes over it, so a new scale gives a new identity.
  useEffect(() => {
    fitStage(width, height);
  }, [fitStage, width, height]);

  useRaf(
    (dt) => {
      const current = stage.current;
      if (!current) return;
      const { maxDamp: longest, cutoff: floor, reference: full } = live.current;

      if (!reduced) elapsed.current += dt;

      const aspect = current.contentCamera.right;
      const targetX = pointer.current.active ? pointer.current.ndcX * aspect : 0;
      const targetY = pointer.current.active ? pointer.current.ndcY : 0;
      lead.current.x = damp(lead.current.x, targetX, LEAD_SMOOTHING, dt);
      lead.current.y = damp(lead.current.y, targetY, LEAD_SMOOTHING, dt);

      // Speed of the mark itself, not of the raw pointer. The mark is what is
      // being smeared, so a trail measured from the cursor would start before
      // the mark moves and keep going after it has stopped.
      const previous = last.current;
      const speed =
        previous && dt > 0
          ? Math.hypot(lead.current.x - previous.x, lead.current.y - previous.y) / dt
          : 0;
      last.current = { x: lead.current.x, y: lead.current.y };

      const wanted = reduced ? 0 : clamp(speed / Math.max(full, 0.0001), 0, 1) * longest;
      dampNow.current = damp(dampNow.current, wanted, DAMP_SMOOTHING, dt);

      current.lead.position.set(lead.current.x, lead.current.y, 0);
      for (let i = 0; i < current.orbiters.length; i++) {
        const orbiter = current.orbiters[i];
        if (!orbiter) continue;
        const phase = (i / current.orbiters.length) * Math.PI * 2 + elapsed.current * ORBIT_SPEED;
        orbiter.position.set(
          lead.current.x + Math.cos(phase) * ORBIT_RADIUS,
          lead.current.y + Math.sin(phase) * ORBIT_RADIUS,
          0,
        );
      }

      // Pass 1 — this frame's marks alone, into their own target.
      current.renderer.setRenderTarget(current.frame);
      current.renderer.clear();
      current.renderer.render(current.content, current.contentCamera);

      // Pass 2 — decayed history plus this frame, into the target that is not
      // currently the history. Reading and writing one target in a single pass
      // is undefined in WebGL, which is the entire reason for the swap.
      current.blendUniforms.uCurrent.value = current.frame.texture;
      current.blendUniforms.uHistory.value = current.ping.texture;
      current.blendUniforms.uDamp.value = dampNow.current;
      current.blendUniforms.uCutoff.value = floor;
      current.renderer.setRenderTarget(current.pong);
      current.renderer.render(current.quadScene, current.quadCamera);

      // Pass 3 — the accumulation to the canvas, through a stock material so
      // three performs output colour conversion exactly once.
      current.renderer.setRenderTarget(null);
      current.screenMaterial.map = current.pong.texture;
      current.renderer.render(current.screenScene, current.quadCamera);

      // Swap. The target just written becomes next frame's history.
      const swap = current.ping;
      current.ping = current.pong;
      current.pong = swap;
    },
    ready && inView && visible,
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nulls the stage handle first so an in-flight frame cannot touch a half-disposed renderer, then `disposeObject` on all three scenes, disposes the sprite texture, both geometries, the blend, screen and every mark material, then explicitly disposes `frame`, `ping` and `pong` — no scene graph reaches them — then `disposeRenderer` (which forces context loss, not just `dispose()`) and removes the canvas element. The rAF subscription is released by `useRaf`.

**Reduced motion.** The orbit clock is not advanced and the decay factor is pinned to 0, so no accumulation survives a frame: the panel shows the crisp mark cluster with the satellites holding their starting angles and no tail behind them, however fast the pointer moves. The marks still follow the pointer, since that is direct response to input rather than self-driven motion.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Blending a target into itself. It is the obvious shape — one history target, read it and write it — and it is undefined behaviour in WebGL: depending on driver you get tearing, a black frame, or a result that looks right on your machine and fails on someone else's.
- Leaving the targets at the default `UnsignedByteType`. Repeated multiplication by 0.9 on 8 bits per channel quantises the tail into visible stair-stepped bands, and the banding is worst on exactly the slow gradients the effect is made of.
- Using `LinearFilter` on the ping-pong pair. Each pass smears the accumulation by a fraction of a texel, and a pixel survives hundreds of passes, so the trail visibly fattens and drifts diagonally away from the path the pointer actually took.
- Decaying with no floor. `history *= 0.9` is a geometric series that never reaches zero, so a permanent ghost of the first frames stays welded into the buffer and the panel is never clean again. The `step(uCutoff, history.a)` factor cuts it instead.
- Compositing with `mix()` or additive blending instead of `max()`. `mix` dims the current frame in proportion to the trail behind it, so the head goes dark exactly when it is moving fastest; additive blows out to white wherever the path crosses itself.
- Applying output colour conversion in the blend pass. Its result goes into another render target that stays in linear working space, so converting there and again on the final blit brightens the accumulation on every pass until the whole panel is white within a second.
- Calling `setSize` on the targets after a resize and rendering straight away. `setSize` reallocates the texture, so the history now points at undefined memory, and the first composited frame is garbage that then decays for a full second.
- Deriving the trail from raw pointer speed. The mark is what is being smeared, and it lags the cursor — so a cursor-driven trail starts before the mark moves and keeps growing after it has stopped.
- Smoothing the decay factor with a per-frame constant (`d += (target - d) * 0.1`). That converges twice as fast at 120Hz, so the same hand speed produces a visibly shorter trail on a high-refresh display.
- Disposing the scene graph and stopping there. Render targets belong to no scene, so nothing walks them — each holds a full-resolution half-float texture plus a framebuffer, and three of them at DPR 2 is tens of megabytes retained per unmount.

## Notes

- Guarded with `hasWebGL()`: where a context cannot be acquired the component renders a single static radial gradient at the configured hue instead of an empty canvas.
- The loop is gated on `useInView` plus `useVisibility`, so an off-screen or backgrounded instance costs no GPU time at all — which matters more here than elsewhere, because this effect pays for three full-resolution passes per frame.
- `resolutionScale` below 1 trades tail sharpness for fill rate. Because the trail is low-frequency by nature, 0.6 is close to free visually and cuts the post-processing cost to roughly a third.

## Definition of done

Move the pointer slowly across the panel and the marks stay crisp with no tail. Flick across it and a smooth curved tail follows the cluster, fading to nothing rather than to a faint permanent ghost. Stop moving and the tail retracts over about a third of a second, leaving the surface clean. Resize the container mid-gesture and no block of garbage appears. Scroll the panel out of view and GPU work stops; unmount and the WebGL context count in about:gpu drops.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
