# Build: Bayer-Quantised Plasma

A full-screen plasma built from sixteen passes of iterated domain warping, then reduced to eleven grey levels through an 8x8 ordered dither matrix. The quantisation is the whole point: a smooth plasma is a screensaver, and the same plasma printed in eleven tones is a texture that type can sit on. The pointer displaces the plasma's own coordinate space so the field leans into the cursor rather than growing a highlight under it.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

An iterated domain-warped plasma crushed to eleven grey levels, so the hero reads as a dot-matrix proof.

- Category: webgl
- Runtime cost: webgl
- Dependencies: none beyond React

## How it works

1. Each of the `iterations` passes rotates the sample point by `rotate` radians, then folds it: `p += warp * sin(p.yx * 1.31 + t + i*0.7) / (1 + i*0.35)`. The `p.yx` swap is what couples the two axes into marbling — with `p.xy` the same code produces stripes.
2. Each pass also accumulates `amp * sin(p.x + p.y + t*0.6)` with `amp` decaying by 0.86, and the sum is divided by the amplitude actually accumulated rather than by a constant, so lowering `iterations` for a weak GPU changes the detail without changing the exposure.
3. The result is remapped to 0..1, pushed through `clamp((lum - 0.5) * contrast + 0.5, 0, 1)`, then multiplied by an elliptical vignette centred at `(0.5, 0.4)` — the optical centre, not the geometric one; at 0.5 a hero reads bottom-heavy.
4. Quantisation happens on a gamma-spaced ramp: `encode = pow(lum, 1/gamma)`, add the dither offset, `round` to one of `levels-1` steps, `decode = pow(q, gamma)`. The reference implementation carried an eleven-entry grey table and found the nearest entry with a branchless ladder of ten mix/step pairs; a monotone ramp collapses that search into encode, round, decode.
5. The dither offset `(bayer8(fragCoord / cell) - 0.5) / (levels - 1)` is added in the ENCODED space. Applied after decoding it would be the wrong physical size in the shadows, where the ramp is compressed, and the dark half of the frame would band anyway.
6. `iterations` is a uniform read against a constant `MAX_ITERATIONS = 48` loop bound with a `break`, so quality can be lowered at runtime without relinking a program or triggering a driver recompile.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `MAX_ITERATIONS = 48`
  Compile-time loop ceiling. A fully dynamic bound is legal in ES 3.00 but stops the compiler bounding register pressure, and some mobile drivers recompile the shader when the uniform changes — a visible hitch at exactly the moment you were trying to avoid one.
- `iterations = 16`
  Runtime pass count. Below about 6 the field is a plain ripple with no interference; past about 24 each extra pass adds detail finer than one dither cell, so it is thrown away by the quantiser and costs a full sin/rot per fragment for nothing.
- `warp = 1.5`
  How far each pass folds the coordinate. Under ~0.5 the passes barely disturb each other and the plasma is concentric; over ~2.5 the folding self-intersects and produces hard creases that survive quantisation as jagged black shapes.
- `amplitude decay = 0.86`
  Per-pass amplitude falloff. At 1.0 the late passes carry as much weight as the first and the field turns to grey mush; below ~0.6 only the first three passes contribute and the iteration count stops mattering.
- `phase offset = float(i) * 0.7`
  Decorrelates the passes. Without it every pass warps in lockstep and sixteen iterations look identical to one.
- `levels = 11`
  Grey steps. Eleven is the count that still reads as print: enough to hold the shape of the plasma, few enough that every transition is visibly dots rather than a ramp. Past ~20 the dither becomes invisible and you have paid for it anyway.
- `gamma = 1.49`
  Exponent the levels are spaced on. At 1.0 the steps are uniform in code and non-uniform to the eye, so the shadows show obvious banding while the highlights look smooth.
- `vignette centre = (0.5, 0.4)`
  The optical centre. Vignetting around the geometric centre makes a hero read as bottom-heavy, because the eye already places the middle of a frame slightly above halfway.
- `cellSize = 2`
  CSS pixels per dither cell, so the 8x8 tile is 16 CSS px. Indexing the matrix by device pixels instead makes the texture twice as coarse on a 1x monitor as on a 2x one.

## API

```ts
function BayerPlasmaHero(props: { iterations?: number; warp?: number; frequency?: number; rotate?: number; contrast?: number; gamma?: number; levels?: number; cellSize?: number; vignette?: number; ink?: readonly [number, number, number]; paper?: readonly [number, number, number]; speed?: number; maxDpr?: number; className?: string }): JSX.Element
```

- `iterations: number` — default `16`
  Plasma warp passes. Clamped to 1..48, the shader's compiled ceiling.
- `warp: number` — default `1.5`
  How far each pass folds the coordinate through its own sine.
- `frequency: number` — default `2.2`
  Base spatial frequency of the plasma.
- `rotate: number` — default `-0.1`
  Radians of rotation applied to the coordinate each pass.
- `contrast: number` — default `1.35`
  Contrast pivoted on mid grey, applied before quantisation.
- `gamma: number` — default `1.49`
  Exponent the output levels are spaced on.
- `levels: number` — default `11`
  Output grey levels, both ends included.
- `cellSize: number` — default `2`
  CSS pixels per dither cell. Multiplied by DPR internally.
- `vignette: number` — default `0.55`
  Strength of the elliptical vignette at the optical centre.
- `ink: readonly [number, number, number]` — default `[0.03, 0.032, 0.038]`
  Darkest output colour, linear 0..1 RGB.
- `paper: readonly [number, number, number]` — default `[0.88, 0.92, 0.9]`
  Lightest output colour, linear 0..1 RGB.
- `speed: number` — default `1`
  Multiplier on plasma evolution.
- `maxDpr: number` — default `2`
  Upper bound on device pixel ratio.
- `className: string`
  Merged onto the host element.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const TRIANGLE = new Float32Array([-1, -1, 3, -1, -1, 3]);
const MAX_ITERATIONS = 48;
const ITERATIONS = 16;
const WARP = 1.5;
const FREQUENCY = 2.2;
const ROTATE = -0.1;
const CONTRAST = 1.35;
const GAMMA = 1.49;
const LEVELS = 11;
const CELL_SIZE = 2;
const VIGNETTE = 0.55;
const INK: readonly [number, number, number] = [0.03, 0.032, 0.038];
const PAPER: readonly [number, number, number] = [0.88, 0.92, 0.9];

interface Gpu {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
  locations: Map<string, WebGLUniformLocation | null>;
}

function build(gl: WebGL2RenderingContext): Gpu | null {
  const compile = (type: number, src: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    console.error('[bayer-plasma-hero]', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  };

  const vert = compile(gl.VERTEX_SHADER, BAYER_PLASMA_VERT);
  const frag = compile(gl.FRAGMENT_SHADER, BAYER_PLASMA_FRAG);
  const program = gl.createProgram();
  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  if (!vert || !frag || !program || !vao || !buffer) return null;

  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[bayer-plasma-hero]', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, TRIANGLE, gl.STATIC_DRAW);
  const attrib = gl.getAttribLocation(program, 'a_pos');
  if (attrib >= 0) {
    gl.enableVertexAttribArray(attrib);
    gl.vertexAttribPointer(attrib, 2, gl.FLOAT, false, 0, 0);
  }
  gl.bindVertexArray(null);

  return { gl, program, vao, buffer, locations: new Map() };
}

function loc(gpu: Gpu, name: string): WebGLUniformLocation | null {
  const cached = gpu.locations.get(name);
  if (cached !== undefined) return cached;
  const found = gpu.gl.getUniformLocation(gpu.program, name);
  gpu.locations.set(name, found);
  return found;
}

export function BayerPlasmaHero({
  iterations = ITERATIONS,
  warp = WARP,
  frequency = FREQUENCY,
  rotate = ROTATE,
  contrast = CONTRAST,
  gamma = GAMMA,
  levels = LEVELS,
  cellSize = CELL_SIZE,
  vignette = VIGNETTE,
  ink = INK,
  paper = PAPER,
  speed = 1,
  maxDpr = 2,
  className,
}: BayerPlasmaHeroProps) {
  const host = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gpuRef = useRef<Gpu | null>(null);
  const dprRef = useRef(1);

  const { width, height } = useResizeObserver(host);
  const reduced = useReducedMotion();
  const visible = useVisibility();
  const pointer = useSmoothPointer({ target: host, smoothing: 0.03 });
  const [supported, setSupported] = useState(true);

  const paramsRef = useRef({
    iterations, warp, frequency, rotate, contrast, gamma,
    levels, cellSize, vignette, ink, paper, speed,
  });
  paramsRef.current = {
    iterations, warp, frequency, rotate, contrast, gamma,
    levels, cellSize, vignette, ink, paper, speed,
  };

  const drawRef = useRef<(elapsed: number) => void>(() => {});
  drawRef.current = (elapsed: number) => {
    const gpu = gpuRef.current;
    if (!gpu) return;
    const { gl } = gpu;
    const q = paramsRef.current;
    const p = pointer.current;

    gl.useProgram(gpu.program);
    gl.uniform2f(loc(gpu, 'u_resolution'), gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(loc(gpu, 'u_time'), elapsed * q.speed);
    gl.uniform2f(loc(gpu, 'u_pointer'), p.nx, 1 - p.ny);
    // Clamped to the shader's compiled ceiling: a value above MAX_ITERATIONS
    // would silently do nothing, which is worse than being clamped.
    gl.uniform1i(
      loc(gpu, 'u_iterations'),
      Math.max(1, Math.min(MAX_ITERATIONS, Math.round(q.iterations))),
    );
    gl.uniform1f(loc(gpu, 'u_warp'), q.warp);
    gl.uniform1f(loc(gpu, 'u_freq'), q.frequency);
    gl.uniform1f(loc(gpu, 'u_rotate'), q.rotate);
    gl.uniform1f(loc(gpu, 'u_contrast'), q.contrast);
    gl.uniform1f(loc(gpu, 'u_gamma'), Math.max(0.05, q.gamma));
    gl.uniform1f(loc(gpu, 'u_levels'), Math.max(2, Math.round(q.levels)));
    gl.uniform1f(loc(gpu, 'u_cell'), Math.max(1, q.cellSize * dprRef.current));
    gl.uniform1f(loc(gpu, 'u_vignette'), q.vignette);
    gl.uniform3f(loc(gpu, 'u_ink'), q.ink[0], q.ink[1], q.ink[2]);
    gl.uniform3f(loc(gpu, 'u_paper'), q.paper[0], q.paper[1], q.paper[2]);

    gl.bindVertexArray(gpu.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!hasWebGL()) {
      setSupported(false);
      return;
    }

    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      setSupported(false);
      return;
    }

    const gpu = build(gl);
    if (!gpu) {
      loseContext(gl);
      setSupported(false);
      return;
    }
    gpuRef.current = gpu;
    setSupported(true);

    return () => {
      gpuRef.current = null;
      gl.deleteVertexArray(gpu.vao);
      gl.deleteBuffer(gpu.buffer);
      gl.deleteProgram(gpu.program);
      loseContext(gl);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gpu = gpuRef.current;
    if (!canvas || !gpu || width === 0 || height === 0) return;

    const dpr = pixelRatio(maxDpr);
    dprRef.current = dpr;
    const w = Math.max(1, Math.round(width * dpr));
    const h = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gpu.gl.viewport(0, 0, w, h);
    // At t = 0 every sine in the warp chain is in phase and the plasma is a
    // near-flat field, so the still frame is taken from a developed moment.
    drawRef.current(reduced ? 7.5 : 0);
  }, [width, height, maxDpr, supported, reduced]);

  const running = supported && visible && !reduced && width > 0 && height > 0;
  useRaf((_dt, elapsed) => drawRef.current(elapsed), running);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Deletes the VAO, vertex buffer and program, then `loseContext(gl)` to hand the context back. The rAF subscription and the pointer listener unsubscribe with their hooks.

**Reduced motion.** No rAF subscription. A single frame is drawn at a fixed `u_time` of 7.5 seconds and redrawn on resize — not at t=0, where every sine in the warp chain is still in phase and the plasma is a nearly flat field. The dithered texture, the vignette and the level structure are all fully present; only the evolution stops.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Dividing the plasma sum by a hard-coded normaliser. Drop from 16 iterations to 8 on a weak GPU and the whole image gets darker, so the low-quality path looks like a different component rather than the same one with less detail.
- Applying the dither offset after decoding the gamma ramp. In the shadows the ramp is compressed, so a fixed offset spans much less than one output step there and the dark half of the frame bands exactly as if there were no dither at all.
- Writing `sin(p.xy * ...)` instead of `sin(p.yx * ...)`. The axes stop being coupled, every pass warps x by a function of x, and the marbling degenerates into diagonal stripes.
- Making the iteration count a `const int`. Every quality level then needs its own compiled program, and switching between them stalls the pipeline; a uniform plus a constant loop bound with `break` costs one comparison per pass.
- Centring the vignette at (0.5, 0.5). It is subtle and it is real — the frame reads as sagging, and the usual reaction is to reduce the vignette strength instead of moving it.
- Rendering at native DPR. This shader is 16 iterations of transcendentals per fragment; at DPR 3 that is 2.25x the fragments of DPR 2 for no perceptible gain, and it is the difference between 60fps and 25 on a phone.
- Leaving the context alive on unmount. Raw GL has no `dispose()` — the VAO, buffer and program are deleted explicitly and `loseContext(gl)` returns the context, or the page starts blanking its oldest canvases after roughly sixteen mounts.

## Notes

- The 8x8 matrix is derived from `gl_FragCoord` with six integer operations rather than sampled from a texture. The derivation is documented in full in `bayer8-ordered-dither`; the function is duplicated here so this component installs standalone.
- The entire look is data: `iterations`, `warp`, `frequency`, `contrast`, `gamma` and `levels` are the only things separating newsprint from oil-slick.

## Definition of done

Every tonal transition is made of visible ordered dots — put your eye close and there is no smooth ramp anywhere in the frame. Set `iterations={6}` and the field simplifies without getting darker. Move the cursor and the plasma shears toward it rather than a bright spot appearing under it. The frame is darkest at the corners and brightest slightly above the middle.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
