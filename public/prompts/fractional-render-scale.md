# Build: Fractional Render Scale

A drifting fog field with a latent grid that develops under the cursor, rendered into a canvas whose backing store is deliberately 0.6x the size of the element it fills. The browser upscales it, and the upscale is invisible because the content was authored for it: no detail finer than a dozen pixels, and the one thing with an edge — the grid — has its line width specified in backing-store pixels rather than CSS pixels. It is a background you can afford, and a demonstration of the cheapest large performance win in WebGL.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A field rendered into a backing store 0.6x its box — 36% of the fragments — with a grid measured in texels so the upscale never shows.

- Category: webgl
- Runtime cost: webgl
- Dependencies: three@^0.185.1

## How it works

1. The scale is applied through the pixel ratio: `renderer.setPixelRatio(pixelRatio(maxDpr) * scale)` followed by `setSize(w, h, false)`. three then sizes the backing store to `floor(w * dpr * scale)` while the canvas keeps `width: 100%` from CSS, so one number controls the ratio and there is no second sizing path to keep in sync.
2. The achieved ratio is measured rather than assumed. `setSize` floors, so `getDrawingBufferSize().x / cssWidth` can differ from `dpr * scale` by up to a pixel; that measured value becomes `uScale`, and every length the shader treats as a CSS pixel is `gl_FragCoord.xy / uScale`.
3. The fog is three sines multiplied and added, then pushed through `smoothstep(-0.15, 1.15, fog)`. It is not trying to be fbm — it is trying to contain no feature smaller than roughly a dozen pixels, which is the precondition for a bilinear upscale being undetectable.
4. The grid is drawn from `abs(fract(cell - 0.5) - 0.5) * pxPerCell`, which is the distance to the nearest line expressed in backing-store pixels, and a `smoothstep(width - 0.5, width + 0.5, d)` ramp across exactly one texel. A line specified this way is `1 / scale` CSS pixels wide after the upscale: softer as the scale drops, never thinner, so it cannot fall through the sampling grid.
5. No `fwidth`. The grid is axis-aligned in screen space, so the derivative of the cell coordinate is a constant the shader already holds — `uScale * uGridSize` backing pixels per cell. Computing it directly is exact, is one multiply, and needs no derivatives extension.
6. The geometry is a single triangle with vertices at (-1,-1), (3,-1) and (-1,3). It covers the viewport with three vertices and no diagonal, so the GPU never shades the seam pixels twice as it does where two triangles of a fullscreen quad meet.
7. The pointer is smoothed by `useSmoothPointer` with `perFrameToSmoothing(0.05)`, which reproduces the source's `x += (target - x) * 0.05` at 60 Hz while staying frame-rate independent, and its `nx`/`ny` are flipped to GL's y-up before reaching the uniform.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `renderScale = 0.6`
  Linear, so the saving is quadratic: 0.36 of the fragments, a 64% cut, about 2.8x less fragment work. A 2560x1440 window drops from 3.7 M fragments a frame to 1.3 M. Below roughly 0.5 the grid lines start to look conspicuously soft against crisp DOM text next to them; above 0.8 there is little left to win.
- `MIN_SCALE = 0.25`
  Floor on the prop. At 0.25 a one-texel line is already four CSS pixels wide — a third of a 44 px cell — and the grid stops reading as a grid and starts reading as a plaid.
- `lineWidth = 1 backing pixel`
  The unit is the whole point. One texel is the finest line the buffer can actually hold; asking for one CSS pixel at 0.6 scale asks for 0.6 of a texel, which the rasteriser answers with a dashed line that crawls as the box resizes.
- `gridSize = 44 CSS pixels`
  Authored in CSS pixels so the grid holds its apparent size when the render scale changes — the entire visual difference between 0.6 and 1.0 should be a slight softening, never a different layout.
- `majorEvery = 5`
  A 220 px major cell. Without a second scale the grid is a flat screen door; with one it acquires depth. Its line is 1.6x the minor width, which survives the upscale as a clear hierarchy where a colour difference alone would not.
- `POINTER_ALPHA = 0.05 per frame at 60 Hz`
  The source chose it to be slower than the eye expects, which reads as viscosity: about 330 ms to close 63% of the gap. Passed through `perFrameToSmoothing` so a 120 Hz display gets the same 330 ms rather than half of it.
- `glow exponent = exp(-d * d * 2.2)`
  A Gaussian on distance normalised by the radius, so `glowRadius` is where the glow has fallen to about 11%. A smoothstep here would put a visible circular edge on a field that has no other edges — the one place the upscale would be caught.
- `grid reveal = 0.18 + 0.82 * glow`
  The grid is mostly latent and the cursor develops it. At full strength everywhere it is a background; appearing under the pointer, it is a surface reacting to being touched. The 0.18 floor keeps the structure legible before the pointer arrives.
- `POINTER_EPSILON = 0.0002`
  Under reduced motion the image is a pure function of the pointer, so frames where it has not moved are skipped entirely. The threshold is well under one pixel of an ordinary box, so no real movement is ever swallowed.

## API

```ts
function FractionalRenderScale(props: { renderScale?: number; maxDpr?: number; gridSize?: number; majorEvery?: number; lineWidth?: number; glowRadius?: number; baseColor?: string; fogColor?: string; lineColor?: string; glowColor?: string; className?: string }): JSX.Element
```

- `renderScale: number` — default `0.6`
  Backing store size relative to the display pixel ratio. Clamped to 0.25..1.
- `maxDpr: number` — default `2`
  Cap on the device pixel ratio before the render scale is applied.
- `gridSize: number` — default `44`
  Grid spacing in CSS pixels. Floored at 4.
- `majorEvery: number` — default `5`
  Every nth line is drawn as a major one, 1.6x the width.
- `lineWidth: number` — default `1`
  Minor line width in backing-store pixels — not CSS pixels. Floored at 0.5.
- `glowRadius: number` — default `240`
  Cursor glow radius in CSS pixels, at which the glow has fallen to about 11%.
- `baseColor: string` — default `'#080b12'`
  Darkest colour of the field.
- `fogColor: string` — default `'#1d3350'`
  Colour the fog lifts toward.
- `lineColor: string` — default `'#8fb6df'`
  Grid line colour.
- `glowColor: string` — default `'#3f7fd0'`
  Additive colour under the pointer.
- `className: string`
  Merged onto the host element via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function FractionalRenderScale({
  renderScale = 0.6,
  maxDpr = 2,
  gridSize = 44,
  majorEvery = 5,
  lineWidth = 1,
  glowRadius = 240,
  baseColor = '#080b12',
  fogColor = '#1d3350',
  lineColor = '#8fb6df',
  glowColor = '#3f7fd0',
  className,
}: FractionalRenderScaleProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  const { width, height } = useResizeObserver(host);
  const { inView } = useInView(host, { threshold: 0 });
  const visible = useVisibility();
  const reduced = useReducedMotion();
  const pointer = useSmoothPointer({ target: host, smoothing: POINTER_SMOOTHING });

  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(hasWebGL()), []);

  /* Read inside resize and draw. Keeping them out of the effect's dependency
     list means dragging a render-scale slider re-sizes the backing store
     rather than tearing down the GL context on every step. */
  const live = useRef({ renderScale, maxDpr, gridSize, majorEvery, lineWidth, glowRadius });
  live.current = { renderScale, maxDpr, gridSize, majorEvery, lineWidth, glowRadius };

  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  const ready = width > 1 && height > 1 && supported;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    const renderer = new THREE.WebGLRenderer({
      // Nothing in the field has a geometric edge, so MSAA has nothing to
      // sample — and at a fractional scale it would be antialiasing the wrong
      // grid anyway.
      antialias: false,
      // Opaque: the shader covers every pixel, and an alpha channel would make
      // the compositor blend the canvas over the page for no reason.
      alpha: false,
      depth: false,
      stencil: false,
      // The entire point of the component. On a laptop with switchable
      // graphics this keeps a decorative background off the discrete GPU.
      powerPreference: 'low-power',
    });
    renderer.setClearColor(0x000000, 1);
    renderer.domElement.style.display = 'block';
    // CSS size is 1x and fixed to the box; the backing store is set separately
    // by setSize(..., false). The gap between the two IS the render scale.
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();

    // One oversized triangle, not a quad. It covers the viewport with three
    // vertices and no diagonal seam for the GPU to shade twice.
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
    );

    const uniforms: Uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uScale: { value: 1 },
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uGridSize: { value: gridSize },
      uMajorEvery: { value: majorEvery },
      uLineWidth: { value: lineWidth },
      uGlowRadius: { value: glowRadius },
      uBaseColor: { value: new THREE.Color(baseColor) },
      uFogColor: { value: new THREE.Color(fogColor) },
      uLineColor: { value: new THREE.Color(lineColor) },
      uGlowColor: { value: new THREE.Color(glowColor) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: FRACTIONAL_SCALE_VERT,
      fragmentShader: FRACTIONAL_SCALE_FRAG,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    // The triangle's vertices sit outside a unit bounding sphere, and there is
    // no camera transform to cull against in the first place.
    mesh.frustumCulled = false;
    scene.add(mesh);

    const buffer = new THREE.Vector2();

    stage.current = {
      resize(w, h) {
        const state = live.current;
        const scale = clamp(state.renderScale, MIN_SCALE, 1);
        // Scale folded into the pixel ratio: three then multiplies it through
        // setSize for the backing store while the CSS size stays whatever the
        // stylesheet says. One number, no second sizing path to keep in sync.
        renderer.setPixelRatio(pixelRatio(state.maxDpr) * scale);
        renderer.setSize(w, h, false);

        renderer.getDrawingBufferSize(buffer);
        const bw = Math.max(1, Math.round(buffer.x));
        const bh = Math.max(1, Math.round(buffer.y));
        uniforms.uResolution.value.set(bw, bh);
        // Measured, not assumed. setSize floors, so the achieved ratio differs
        // from dpr * scale by up to a pixel — and the grid is authored in CSS
        // pixels, which would then drift against the layout.
        uniforms.uScale.value = w > 0 ? bw / w : 1;

        uniforms.uGridSize.value = Math.max(4, state.gridSize);
        uniforms.uMajorEvery.value = Math.max(1, Math.round(state.majorEvery));
        uniforms.uLineWidth.value = Math.max(0.5, state.lineWidth);
        uniforms.uGlowRadius.value = Math.max(1, state.glowRadius);
      },

      draw(time, pointerX, pointerY) {
        uniforms.uTime.value = time;
        uniforms.uPointer.value.set(pointerX, pointerY);
        renderer.render(scene, camera);
      },
    };

    stage.current.resize(el.clientWidth, el.clientHeight);
    stage.current.draw(0, 0.5, 0.5);

    return () => {
      stage.current = null;
      geometry.dispose();
      material.dispose();
      disposeRenderer(renderer);
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, baseColor, fogColor, lineColor, glowColor]);

  useEffect(() => {
    const current = stage.current;
    if (!current || width < 1 || height < 1) return;
    current.resize(width, height);
    // Resizing a canvas clears its drawing buffer. When time is frozen the
    // loop skips every frame in which the pointer has not moved, so the
    // redraw has to happen here or the field stays blank until it does. When
    // time is running the next frame covers it a few milliseconds later.
    if (reduced) {
      const state = pointer.current;
      current.draw(0, state.nx, 1 - state.ny);
      lastPointer.current = { x: state.nx, y: 1 - state.ny };
    }
  }, [
    width,
    height,
    reduced,
    renderScale,
    maxDpr,
    gridSize,
    majorEvery,
    lineWidth,
    glowRadius,
    pointer,
  ]);

  useRaf(
    (_dt, elapsed) => {
      const current = stage.current;
      if (!current) return;

      const state = pointer.current;
      const px = state.nx;
      // GL's y axis points up; the pointer's does not.
      const py = 1 - state.ny;

      // Reduced motion freezes time at 0 rather than stopping the render, so
      // the fog, the vignette and the cursor glow all survive — only the drift
      // is gone. With time constant the image is a pure function of the
      // pointer, so a frame where the pointer has not moved is skippable.
      if (reduced) {
        const last = lastPointer.current;
        if (
          last &&
          Math.abs(px - last.x) < POINTER_EPSILON &&
          Math.abs(py - last.y) < POINTER_EPSILON
        ) {
          return;
        }
      }

      lastPointer.current = { x: px, y: py };
      current.draw(reduced ? 0 : elapsed, px, py);
    },
    ready && inView && visible,
  );
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nulls the stage ref, disposes the triangle geometry and the ShaderMaterial, then calls `disposeRenderer` for `dispose` + `forceContextLoss` + a zeroed drawing buffer, and removes the canvas from the DOM. The canvas is three's own, created inside the effect and appended per effect run, so a StrictMode remount builds a new context instead of reattaching one that was just force-lost. The pointer listener belongs to `useSmoothPointer` and is removed with it; sizing, visibility and the frame loop are all shared subscriptions that release themselves.

**Reduced motion.** The component reads `useReducedMotion` itself and freezes `uTime` at 0 rather than stopping the render. The fog, the vignette, the grid and the cursor glow are all still drawn — none of them depends on time — so what is lost is exactly the drift and nothing else. With time constant the image is a pure function of the pointer, so the loop skips any frame in which the pointer has not moved by more than 0.0002, and a still page costs nothing beyond the empty rAF callback.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Setting only `canvas.width` and forgetting the CSS size, or the reverse. Either mistake produces a canvas that is simply smaller or simply blurrier than intended; the technique is the deliberate gap between the two sizes, and both have to be set on purpose.
- Putting `image-rendering: pixelated` on the canvas — sometimes inherited from a global rule aimed at sprite art. It replaces the bilinear upscale with nearest-neighbour and the entire effect turns into visible blocks.
- Specifying line widths, glow radii or grid spacing in device pixels via raw `gl_FragCoord`. Everything is tuned on one machine and then renders at 0.6 of that size at 0.6 scale, and a third of it again on a 3x phone. Divide by the measured scale and author in CSS pixels.
- Rendering content with fine detail at a fractional scale. Text, hairlines, high-frequency noise and hard-edged shapes all alias the moment the buffer shrinks. This technique is for soft fields, and content and scale have to be chosen together.
- Listening to `window.resize` instead of observing the element. A sidebar opening, a font loading and reflowing, or a flex sibling changing all resize the box with no window event — and `ResizeObserver` also fires once on observe, which handles the initial size with no separate call.
- Forgetting that resizing the canvas clears its drawing buffer. Any component that skips frames — as this one does when time is frozen — goes blank after a resize unless the resize path redraws explicitly.
- Reading `dpr * scale` back as the achieved ratio. `setSize` floors the backing store, so on most box widths the real ratio is slightly lower; using the nominal value makes the grid drift by a pixel against the layout as the window changes.
- Suppressing the render entirely under reduced motion. Time frozen at 0 still gives the fog, the vignette and the cursor glow, because none of them depend on it — a far better degradation than a flat colour, and the accessibility requirement is about motion, not about the image.
- Assuming `antialias: true` helps. There is no geometric edge to sample: the only visible edges come from the fragment shader, MSAA does not see them, and the request costs a multisampled buffer of the same size as everything just saved.

## Notes

- The renderer is created with `powerPreference: "low-power"`. On a laptop with switchable graphics this keeps a decorative background off the discrete GPU, which is worth more battery than the render scale itself.
- `renderScale` and `maxDpr` are read from a ref inside the resize path, so changing them re-sizes the backing store without rebuilding the GL context — a render-scale slider can be dragged live.
- A useful way to see the technique: set `renderScale` to 1 and then to 0.6 and watch the grid rather than the fog. The lines soften very slightly and nothing else about the image changes, while the fragment count falls by two thirds.
- The colours are individual string props rather than an array, so a caller passing literals does not hand the effect a new identity on every render.

## Definition of done

A soft blue fog drifting behind a faint grid, with the grid brightening into a pool under the cursor that trails a third of a second behind it. Open DevTools and the canvas element reports a backing store of 0.6 of its CSS size — the technique is verifiable, not merely claimed — while the image shows no blockiness and the grid lines stay continuous rather than dashed. Resize the window slowly: the grid keeps its 44 px spacing against the layout and never crawls. With reduced motion the fog stops drifting and everything else, cursor glow included, still works.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
