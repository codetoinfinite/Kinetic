# Build: Multipass Offscreen Composite

A hero field built the way a compositor builds one: a background ramp and three additive gradient fills are accumulated into an offscreen target, a bright-pass and blur run into a second target at half size, and a final pass adds them together with a vignette and a dither. The canvas is written exactly once, by the last pass. It is a small piece of art in its own right and a complete, disposable template for any offscreen chain.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Four passes into two render targets — ramp, additive fills, half-size bloom — and one composite that writes the canvas once.

- Category: webgl
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. Passes 1 and 2 share one target. `renderer.autoClear = false` is set at construction, the scene target is cleared explicitly once with `renderer.clear(true, false, false)`, and the ramp and the fills are then rendered back to back. The absence of a clear between those two renders is the entire composite.
2. The ramp is a clip-space quad. Each fragment projects onto the ramp axis with `dot(uv - 0.5, dir) / (abs(dir.x) + abs(dir.y)) + 0.5`; the divisor is the largest that projection can reach inside the unit square, so the ramp reaches its end colour exactly at the far corner for any angle rather than saturating early.
3. The fills are three `PlaneGeometry(1, 1)` meshes in one rotated group, each drawn with a Gaussian falloff `exp(-d * d * uSoftness)` and `AdditiveBlending`. They travel around ellipses of different radii at speeds of 0.05, -0.08 and 0.11 revolutions per second, so the arrangement takes about 200 seconds to return to its start.
4. Both targets are `HalfFloatType`. Three additive fills overlap well past 1.0, and on an unsigned-byte target that overlap clips flat before the bright-pass runs — the bloom would then be told the image is uniformly hot wherever any two fills cross.
5. Pass 3 renders into a target at `bloomScale` (0.5) of the scene target. The bright-pass is a soft knee, `smoothstep(uThreshold, uThreshold + 0.25, luma)`, and the blur is a 3x3 tent with weights 4 / 2 / 1 normalised by 16. Its offsets are measured in the half-size target's texels, so the blur reaches twice as far across the image for the same nine taps.
6. Pass 4 reads both targets, adds `bloom * uBloomStrength`, multiplies by a vignette measured in a square space so it stays circular in a wide box, and adds triangular-PDF dither — the difference of two hashes, about 1/255 — to break the 8-bit banding a smooth ramp otherwise shows as hard contour lines.
7. Resizing calls `setSize` on both targets and rewrites `uResolution` and the bloom `uTexel`. Nothing is reallocated, and because no pass reads its own previous contents there is no clear-and-settle: the next frame redraws all four passes from scratch.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `renderer.autoClear = false`
  The one line that makes multipass possible in three. Left at its default, every `render()` clears its target first, so pass 2 wipes pass 1 and the layering silently collapses into whatever was drawn last — with no error and no warning.
- `bloomScale = 0.5`
  Quarter the pixels for the blur pass, and the tent's texel-sized offsets cover twice the distance. Below about 0.35 the half-resolution grid becomes visible as a soft blockiness in the upsample; at 1.0 the pass costs four times as much for a tighter, less useful glow.
- `BLOOM_RADIUS = 1.4`
  Tap spacing in bloom-target texels, so 2.8 scene pixels. Above roughly 2 the nine taps no longer overlap and the tent starts sampling a sparse grid, which shows up as a faint cross-shaped ringing around bright cores.
- `bloomThreshold = 0.34`
  Luma where the bright-pass starts. The ramp peaks near 0.18, so this sits above the background and below the fills: the glow comes from the lights, not from the whole frame. Drop it under the ramp and the bloom becomes a flat wash that just raises exposure.
- `knee width = 0.25`
  The smoothstep span above the threshold. With a hard step, a pixel pops into the bright set the instant it crosses the cut, so the bloom boundary crawls as the fills drift — the most common giveaway of a hand-rolled bloom.
- `DISC_SOFTNESS = 3.1`
  The k in `exp(-d*d*k)`, which puts the fill at 4.5% of peak at the edge of its own quad. Much lower and the Gaussian is still bright where the geometry stops, giving a visible square edge; much higher and the fill shrinks to a hard dot inside an oversized quad.
- `DITHER = 0.004`
  One 8-bit code. The ramp crosses only a few hundred codes over a thousand pixels, and without a sub-LSB perturbation that gradient bands into visible contour lines on any display. Larger values are perceptible as noise rather than as smoothness.
- `REVEAL_START / REVEAL_SPAN = 0.7 / 0.2`
  The source ties the fills to scroll with exactly this ramp: nothing until 70% of the progress, full by 90%, held after. The dead zone is deliberate — the ramp establishes the space first, and the light arrives as a separate event.
- `DISC_SQUASH / PLANE_TILT = 0.62 / -0.19 rad`
  The fills are round in their own plane; squashing them and rotating their shared group is what makes three moving blobs read as one ellipse seen at an angle instead of three unrelated circles.
- `STATIC_ELAPSED = 6.2 s`
  The frame drawn when motion is suppressed. At t = 0 all three fills sit at their starting phases; six seconds in, the composition is spread out and reads as a designed still rather than as a default state.
- `maxDpr = 2`
  Four full-screen passes are already 2.5 screens of fragments per frame (1 + 1 + 0.25 + 1). At a 3x backing store that is over twenty million fragment invocations per frame on a phone, for no visible gain over 2x.

## API

```ts
function MultipassOffscreenComposite(props: { reveal?: number; bloomStrength?: number; bloomThreshold?: number; bloomScale?: number; vignette?: number; drift?: number; rampAngle?: number; rampColors?: readonly [string, string, string]; fillColors?: readonly [string, string, string]; maxDpr?: number; className?: string }): JSX.Element
```

- `reveal: number` — default `1`
  Progress 0..1. The fills fade in between 0.7 and 0.9 and hold; the ramp is always drawn.
- `bloomStrength: number` — default `0.85`
  How much of the blurred bright-pass is added back in the composite.
- `bloomThreshold: number` — default `0.34`
  Luminance where the bright-pass begins to contribute, with a 0.25 knee above it.
- `bloomScale: number` — default `0.5`
  Bloom target size relative to the scene target. Changing it rebuilds both targets.
- `vignette: number` — default `0.38`
  Corner darkening in the composite, 0..1.
- `drift: number` — default `1`
  Multiplier on the fills' orbital speeds. 0 freezes them without stopping the passes.
- `rampAngle: number` — default `141`
  Ramp direction in degrees, counter-clockwise from +x.
- `rampColors: readonly [string, string, string]` — default `['#0a0f1a', '#16283c', '#070a12']`
  Start, bend and end stops of the background ramp.
- `fillColors: readonly [string, string, string]` — default `['#3f7ae0', '#2fd0b4', '#a866f0']`
  Colours of the three additive fills, largest first.
- `maxDpr: number` — default `2`
  Backing-store cap. Both targets follow the drawing buffer.
- `className: string`
  Merged onto the host element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function MultipassOffscreenComposite({
  reveal = 1,
  bloomStrength = 0.85,
  bloomThreshold = 0.34,
  bloomScale = 0.5,
  vignette = 0.38,
  drift = 1,
  rampAngle = 141,
  rampColors = RAMP_COLORS,
  fillColors = FILL_COLORS,
  maxDpr = 2,
  className,
}: MultipassOffscreenCompositeProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { threshold: 0 });
  const visible = useVisibility();
  const reduced = useReducedMotion();

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  /* Everything that only feeds a uniform lives here and is read inside the
     draw loop. None of it belongs in the effect's dependency list: rebuilding
     two render targets because a vignette changed by 0.01 would drop frames. */
  const live = useRef({ reveal, bloomStrength, bloomThreshold, vignette, drift });
  live.current = { reveal, bloomStrength, bloomThreshold, vignette, drift };

  const ready = width > 1 && height > 1 && supported;

  /* Joined, not spread. Array props are compared by identity, so an inline
     literal would be a new value every render and the effect would thrash. */
  const colorKey = `${rampColors.join('|')}/${fillColors.join('|')}`;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        // Opaque. Pass 4 covers every pixel with alpha 1, so an alpha channel
        // would only cost bandwidth and force the compositor to blend.
        alpha: false,
        depth: false,
        stencil: false,
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
    renderer.setSize(el.clientWidth, el.clientHeight, false);
    renderer.setClearColor(0x000000, 1);
    // The single most important line in the file. See the header.
    renderer.autoClear = false;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);

    const buffer = new THREE.Vector2();
    renderer.getDrawingBufferSize(buffer);
    const bufferW = Math.max(2, Math.round(buffer.x));
    const bufferH = Math.max(2, Math.round(buffer.y));
    const bloomW = Math.max(2, Math.round(bufferW * bloomScale));
    const bloomH = Math.max(2, Math.round(bufferH * bloomScale));

    const sceneTarget = makeTarget(bufferW, bufferH);
    const bloomTarget = makeTarget(bloomW, bloomH);

    // Two cameras. The flat one is for the clip-space quads, whose vertex
    // shader ignores both matrices; the ortho one gives the fills a stable
    // -aspect..aspect x -1..1 space to move in.
    const flatCamera = new THREE.Camera();
    const contentCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
    contentCamera.position.z = 1;

    const flatGeometry = new THREE.PlaneGeometry(2, 2);
    const discGeometry = new THREE.PlaneGeometry(1, 1);

    const [rampA = '#000000', rampB = '#000000', rampC = '#000000'] = rampColors;
    const rampUniforms: RampUniforms = {
      uResolution: { value: new THREE.Vector2(bufferW, bufferH) },
      uAngle: { value: (rampAngle * Math.PI) / 180 },
      uColorA: { value: new THREE.Color(rampA) },
      uColorB: { value: new THREE.Color(rampB) },
      uColorC: { value: new THREE.Color(rampC) },
    };
    const rampMaterial = new THREE.ShaderMaterial({
      vertexShader: MULTIPASS_FLAT_VERT,
      fragmentShader: MULTIPASS_RAMP_FRAG,
      uniforms: rampUniforms,
      depthTest: false,
      depthWrite: false,
    });
    const rampScene = new THREE.Scene();
    const rampQuad = new THREE.Mesh(flatGeometry, rampMaterial);
    rampQuad.frustumCulled = false;
    rampScene.add(rampQuad);

    const fillScene = new THREE.Scene();
    // One group, rotated once: the fills share a plane, and tilting the group
    // is what makes their paths read as one ellipse seen at an angle rather
    // than three unrelated circles.
    const fillGroup = new THREE.Group();
    fillGroup.rotation.z = PLANE_TILT;
    fillScene.add(fillGroup);

    const discMaterials: THREE.ShaderMaterial[] = [];
    const discMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < DISCS.length; i++) {
      const spec = DISCS[i];
      if (!spec) continue;
      const uniforms: DiscUniforms = {
        uColor: { value: new THREE.Color(fillColors[i] ?? '#ffffff') },
        uIntensity: { value: 0 },
        uSoftness: { value: DISC_SOFTNESS },
      };
      const material = new THREE.ShaderMaterial({
        vertexShader: MULTIPASS_DISC_VERT,
        fragmentShader: MULTIPASS_DISC_FRAG,
        uniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(discGeometry, material);
      mesh.scale.set(spec.size, spec.size * DISC_SQUASH, 1);
      mesh.frustumCulled = false;
      fillGroup.add(mesh);
      discMaterials.push(material);
      discMeshes.push(mesh);
    }

    const bloomUniforms: BloomUniforms = {
      uSource: { value: sceneTarget.texture },
      uTexel: { value: new THREE.Vector2(1 / bloomW, 1 / bloomH) },
      uThreshold: { value: bloomThreshold },
      uRadius: { value: BLOOM_RADIUS },
    };
    const bloomMaterial = new THREE.ShaderMaterial({
      vertexShader: MULTIPASS_FLAT_VERT,
      fragmentShader: MULTIPASS_BLOOM_FRAG,
      uniforms: bloomUniforms,
      depthTest: false,
      depthWrite: false,
    });
    const bloomScene = new THREE.Scene();
    const bloomQuad = new THREE.Mesh(flatGeometry, bloomMaterial);
    bloomQuad.frustumCulled = false;
    bloomScene.add(bloomQuad);

    const compositeUniforms: CompositeUniforms = {
      uScene: { value: sceneTarget.texture },
      uBloom: { value: bloomTarget.texture },
      uResolution: { value: new THREE.Vector2(bufferW, bufferH) },
      uBloomStrength: { value: bloomStrength },
      uVignette: { value: vignette },
      uDither: { value: DITHER },
    };
    const compositeMaterial = new THREE.ShaderMaterial({
      vertexShader: MULTIPASS_FLAT_VERT,
      fragmentShader: MULTIPASS_COMPOSITE_FRAG,
      uniforms: compositeUniforms,
      depthTest: false,
      depthWrite: false,
    });
    const compositeScene = new THREE.Scene();
    const compositeQuad = new THREE.Mesh(flatGeometry, compositeMaterial);
    compositeQuad.frustumCulled = false;
    compositeScene.add(compositeQuad);

    stage.current = {
      resize(w, h) {
        renderer.setPixelRatio(pixelRatio(maxDpr));
        renderer.setSize(w, h, false);
        renderer.getDrawingBufferSize(buffer);
        const bw = Math.max(2, Math.round(buffer.x));
        const bh = Math.max(2, Math.round(buffer.y));

        const aspect = w / h;
        contentCamera.left = -aspect;
        contentCamera.right = aspect;
        contentCamera.updateProjectionMatrix();

        // setSize, never new. Allocating a pair of half-float targets is a
        // synchronous driver call; doing it from a ResizeObserver during a
        // window drag is how a smooth resize turns into a slideshow — and the
        // old targets would leak unless every one of them were disposed.
        sceneTarget.setSize(bw, bh);
        rampUniforms.uResolution.value.set(bw, bh);
        compositeUniforms.uResolution.value.set(bw, bh);

        const sw = Math.max(2, Math.round(bw * bloomScale));
        const sh = Math.max(2, Math.round(bh * bloomScale));
        bloomTarget.setSize(sw, sh);
        // Texel size is per target, and this one is not the canvas. Leaving it
        // at the old size makes the blur radius drift with the window.
        bloomUniforms.uTexel.value.set(1 / sw, 1 / sh);
      },

      draw(elapsed) {
        const state = live.current;

        // The source ties the fills to scroll with exactly this ramp.
        const fade = clamp((state.reveal - REVEAL_START) / REVEAL_SPAN, 0, 1);

        for (let i = 0; i < discMeshes.length; i++) {
          const mesh = discMeshes[i];
          const spec = DISCS[i];
          const material = discMaterials[i];
          if (!mesh || !spec || !material) continue;
          const angle = spec.phase + elapsed * spec.speed * state.drift * Math.PI * 2;
          mesh.position.set(Math.cos(angle) * spec.radius, Math.sin(angle) * spec.radius, 0);
          const intensity = material.uniforms.uIntensity;
          if (intensity) intensity.value = spec.intensity * fade;
        }

        // Passes 1 and 2 — one clear, two renders. The absence of a clear
        // between them IS the composite.
        renderer.setRenderTarget(sceneTarget);
        renderer.clear(true, false, false);
        renderer.render(rampScene, flatCamera);
        renderer.render(fillScene, contentCamera);

        // Pass 3 — bright-pass and blur at bloomScale. Nothing accumulates, so
        // this target never needs to survive a frame.
        bloomUniforms.uThreshold.value = state.bloomThreshold;
        renderer.setRenderTarget(bloomTarget);
        renderer.clear(true, false, false);
        renderer.render(bloomScene, flatCamera);

        // Pass 4 — the only write to the canvas.
        compositeUniforms.uBloomStrength.value = state.bloomStrength;
        compositeUniforms.uVignette.value = state.vignette;
        renderer.setRenderTarget(null);
        renderer.clear(true, false, false);
        renderer.render(compositeScene, flatCamera);
      },
    };

    stage.current.resize(el.clientWidth, el.clientHeight);
    stage.current.draw(0);

    return () => {
      stage.current = null;
      // Explicit, not disposeObject over the scenes: flatGeometry is shared by
      // three of them, and a traversal would dispose it three times.
      flatGeometry.dispose();
      discGeometry.dispose();
      rampMaterial.dispose();
      bloomMaterial.dispose();
      compositeMaterial.dispose();
      for (const material of discMaterials) material.dispose();
      // Both targets. Nothing walks a render target for you — each holds a
      // half-float texture and a framebuffer object.
      sceneTarget.dispose();
      bloomTarget.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, colorKey, rampAngle, bloomScale, maxDpr]);

  useEffect(() => {
    const current = stage.current;
    if (!current || width < 1 || height < 1) return;
    current.resize(width, height);
    // No pass reads its own previous contents, so a resized target needs no
    // clear-and-settle — but a still frame does need redrawing, since resizing
    // a target discards what it held.
    if (reduced) current.draw(STATIC_ELAPSED);
  }, [width, height, reduced]);

  useRaf(
    (_dt, elapsed) => {
      stage.current?.draw(elapsed);
    },
    ready && inView && visible && !reduced,
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nulls the stage ref, disposes both `PlaneGeometry` instances, all six materials, and — separately, because nothing traverses them — both render targets. Then `disposeRenderer` performs `dispose` + `forceContextLoss` + a zeroed drawing buffer, and the canvas is removed from the DOM. The canvas is created inside the effect by three and appended per effect run, so a StrictMode remount builds a fresh context rather than reattaching the one that was just force-lost. `useRaf` releases its own subscription; the component adds no listeners of its own.

**Reduced motion.** The component reads `useReducedMotion` itself and never subscribes to rAF when it is set. All four passes still run, once, at a fixed elapsed of 6.2 seconds, and again after any resize — so the artwork is complete, correctly exposed and fully bloomed, it simply does not drift. A hero background is composition first and motion second; deleting it under reduced motion would leave a hole in the page, and freezing it at t = 0 would show an arrangement nobody designed.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Leaving `autoClear` at its default and wondering why only the last pass appears. Nothing errors; the ramp is simply gone, and the usual next move — reordering the renders — makes it worse.
- Setting `autoClear = false` and then forgetting to clear at all. The first target accumulates frame over frame, so the fills smear into permanent trails that look almost intentional for about two seconds.
- Recreating render targets in the resize handler. Allocating a pair of half-float framebuffers is a synchronous driver call; doing it on every ResizeObserver callback turns a window drag into a slideshow, and every previous pair leaks unless it is explicitly disposed.
- Disposing the renderer but not the targets. Render targets are not part of any scene graph, so nothing traverses them — each surviving one holds a full-resolution half-float texture plus a framebuffer object until the tab is closed.
- Using an 8-bit target for anything that feeds a bright-pass. Additive overlap clips at 1.0, so the bloom sees a plateau instead of a peak and the glow spreads uniformly across the crossing region.
- Premultiplying alpha in a shader that uses three's `AdditiveBlending`. That blend is already `(SrcAlpha, One)`, so multiplying in the shader squares the alpha and the fills all but vanish — then get "fixed" by tripling the intensity, which clips the cores.
- Reusing one `uTexel` or `uResolution` uniform across passes that render into differently sized targets. Everything looks right at one window size and the blur radius drifts as the window changes.
- Reading a colour buffer while it is still bound as the render target. It is undefined behaviour in WebGL and shows as tearing, black, or a correct image depending on the driver — which is why the bright-pass needs an offscreen target and cannot run on the canvas.
- Letting three convert colour space in the middle of the chain. Its output conversion is injected into built-in materials only, so a chain that mixes `ShaderMaterial` and `MeshBasicMaterial` converts at some passes and not others; this component uses `ShaderMaterial` everywhere and converts nowhere.

## Notes

- The renderer is created with `alpha: false`. Pass 4 covers every pixel at full alpha, so an alpha channel would only cost bandwidth and force the compositor to blend the canvas over the page.
- `reveal` is deliberately a plain number rather than an internal scroll listener. Drive it from whatever already tracks progress — `useInView`'s ratio, a scroll library, or a constant — and the component stays a renderer.
- The array props are compared through a joined string key, so passing an inline `[a, b, c]` literal does not tear down the GL stack on every render. Values that only feed a uniform (`reveal`, `bloomStrength`, `vignette`, `drift`) are read from a ref inside the draw loop and never appear in a dependency list.
- Geometries are disposed by hand rather than through `disposeObject` over each scene: the clip-space quad is shared by three scenes, and a traversal would dispose it three times.
- To extend the chain, add a target and a pass — the structure does not change. The costly mistakes are all in the two rules this file already follows: clear deliberately, and resize rather than reallocate.

## Definition of done

Three soft coloured lights drift across a dark angled ramp with a halo that is clearly wider and softer than the lights themselves, corners falling off, and no banding anywhere in the gradient — tilt a laptop screen and the ramp stays smooth. Resize the window continuously: the image tracks the box with no stutter, no flash of black, and the halo keeps the same apparent width. Set `reveal` to 0.5 and only the ramp is visible; sweep it to 1 and the lights come up over the last third. With reduced motion the full composition, bloom included, is present and still.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
