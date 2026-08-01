# Build: Bit-Math Bayer8 Dither

Ordered dithering with the threshold matrix computed from the fragment coordinate instead of sampled from a texture. Six integer operations reproduce the classic 8x8 Bayer matrix exactly, which turns a banding-prone gradient into a stable newsprint texture that holds at any zoom and costs less than the texture fetch it replaces.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A smooth gradient crushed to five levels through an 8x8 ordered matrix derived from six integer ops.

- Category: webgl
- Runtime cost: webgl
- Dependencies: none beyond React

## How it works

1. The Bayer matrix is defined recursively as `M2 = [[0,2],[3,1]]` and `M2n(x,y) = 4*Mn(x mod n, y mod n) + M2(x div n, y div n)`. Writing M2 in binary (0=00, 2=10, 3=11, 1=01) collapses it to the closed form `M2(a,b) = 2*(a^b) + b`.
2. Unrolling that recursion three times gives `M8(x,y) = 16*M2(x0,y0) + 4*M2(x1,y1) + M2(x2,y2)` where xN is bit N of x, and substituting the closed form yields the whole matrix as one expression: `32*(x0^y0) + 16*y0 + 8*(x1^y1) + 4*y1 + 2*(x2^y2) + y2`.
3. Read as bits that is the low three bits of `x ^ y` and of `y`, interleaved and reversed — the LEAST significant coordinate bit drives the MOST significant threshold bit, which is precisely what makes the pattern maximally dispersed instead of clustered. In GLSL it is `int x = c.x & 7; int y = c.y & 7;` followed by those six terms, divided by 64.
4. `gl_FragCoord.xy` is divided by `cellSize * dpr` before the matrix lookup, so the dither cell is a fixed physical size and the texture does not get four times finer on a retina display.
5. Quantisation is `floor(clamp(c + (threshold - 0.5) / steps, 0, 1) * steps + 0.5) / steps` with `steps = levels - 1`. Centring the threshold on zero and scaling it to exactly one output step is what makes the perturbation cancel out on average.
6. A `pow(g, 1.35)` gamma is applied before quantisation, because the output levels are evenly spaced in the encoded value while the eye is not — quantising the linear value alone dumps all the visible banding into the shadows.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `divisor = 64.0`
  The matrix holds 0..63, so dividing by 64 keeps the thresholds in [0, 1). Dividing by 63 puts the top cell at exactly 1.0, which pushes one cell in every 8x8 tile a full step brighter and stamps a visible dot grid across flat areas.
- `levels = 5`
  Output steps per channel. At 2 it is a pure 1-bit print and the gradient becomes texture only. Above about 12 the eye can no longer see the individual steps and the dither is doing nothing but adding noise — use it to fix banding, not as a look.
- `cellSize = 2`
  CSS pixels per dither cell, so the 8x8 tile is 16 CSS px. At 1 the pattern is at the Nyquist limit of most displays and shimmers when the page scrolls; above about 6 it stops reading as print texture and starts reading as a deliberate checkerboard.
- `threshold scale = (t - 0.5) / (levels - 1)`
  The perturbation must span exactly one output step. Larger and the dither adds contrast of its own — flat areas visibly sparkle. Smaller and it cannot push a value across a level boundary, so the bands survive untouched.
- `gamma = 1.35`
  Applied before quantisation. Without it the evenly spaced levels bunch perceptually in the highlights and spread in the shadows, so the dark half of the frame shows obvious steps while the bright half looks smooth.

## API

```ts
function Bayer8OrderedDither(props: { levels?: number; cellSize?: number; speed?: number; dark?: readonly [number, number, number]; light?: readonly [number, number, number]; maxDpr?: number; className?: string }): JSX.Element
```

- `levels: number` — default `5`
  Output steps per channel, both ends included. 2 is pure 1-bit.
- `cellSize: number` — default `2`
  CSS pixels per dither cell. Multiplied by DPR internally.
- `speed: number` — default `1`
  Multiplier on the sweep that animates the underlying gradient.
- `dark: readonly [number, number, number]` — default `[0.035, 0.038, 0.045]`
  Darkest output colour, linear 0..1 RGB.
- `light: readonly [number, number, number]` — default `[0.9, 0.94, 0.92]`
  Lightest output colour, linear 0..1 RGB.
- `maxDpr: number` — default `2`
  Upper bound on device pixel ratio.
- `className: string`
  Merged onto the host element.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const TRIANGLE = new Float32Array([-1, -1, 3, -1, -1, 3]);
const LEVELS = 5;
const CELL_SIZE = 2;
const DARK: readonly [number, number, number] = [0.035, 0.038, 0.045];
const LIGHT: readonly [number, number, number] = [0.9, 0.94, 0.92];

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
    console.error('[bayer8-ordered-dither]', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  };

  const vert = compile(gl.VERTEX_SHADER, BAYER8_DITHER_VERT);
  const frag = compile(gl.FRAGMENT_SHADER, BAYER8_DITHER_FRAG);
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
    console.error('[bayer8-ordered-dither]', gl.getProgramInfoLog(program));
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

export function Bayer8OrderedDither({
  levels = LEVELS,
  cellSize = CELL_SIZE,
  speed = 1,
  dark = DARK,
  light = LIGHT,
  maxDpr = 2,
  className,
}: Bayer8OrderedDitherProps) {
  const host = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gpuRef = useRef<Gpu | null>(null);
  const dprRef = useRef(1);

  const { width, height } = useResizeObserver(host);
  const reduced = useReducedMotion();
  const visible = useVisibility();
  const pointer = useSmoothPointer({ target: host, smoothing: 0.004 });
  const [supported, setSupported] = useState(true);

  const paramsRef = useRef({ levels, cellSize, speed, dark, light });
  paramsRef.current = { levels, cellSize, speed, dark, light };

  const drawRef = useRef<(elapsed: number) => void>(() => {});
  drawRef.current = (elapsed: number) => {
    const gpu = gpuRef.current;
    if (!gpu) return;
    const { gl } = gpu;
    const params = paramsRef.current;
    const p = pointer.current;

    gl.useProgram(gpu.program);
    gl.uniform2f(loc(gpu, 'u_resolution'), gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(loc(gpu, 'u_time'), elapsed * params.speed);
    gl.uniform2f(loc(gpu, 'u_pointer'), p.nx, 1 - p.ny);
    gl.uniform1f(loc(gpu, 'u_levels'), Math.max(2, Math.round(params.levels)));
    // Cell size is authored in CSS pixels and converted here, so the dither
    // grain is the same physical size on a 1x monitor and a 3x phone.
    gl.uniform1f(loc(gpu, 'u_cell'), Math.max(1, params.cellSize * dprRef.current));
    gl.uniform3f(loc(gpu, 'u_dark'), params.dark[0], params.dark[1], params.dark[2]);
    gl.uniform3f(loc(gpu, 'u_light'), params.light[0], params.light[1], params.light[2]);

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
    drawRef.current(0);
  }, [width, height, maxDpr, supported, reduced]);

  const running = supported && visible && !reduced && width > 0 && height > 0;
  useRaf((_dt, elapsed) => drawRef.current(elapsed), running);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Deletes the VAO, vertex buffer and program, then `loseContext(gl)`. The rAF subscription and pointer listener are removed by their hooks.

**Reduced motion.** The rAF loop never subscribes; the sweep is frozen at t=0 and the pointer light sits at its seeded centre. One frame is drawn on mount and on every resize, so the dithered gradient is fully rendered — the texture is the point, and it is static.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Uploading the matrix as an 8x8 texture. It needs a texture unit, a sampler uniform, GL_NEAREST filtering and CLAMP wrapping set correctly on a non-power-of-two-safe path, and a resource to dispose — all to replace six integer instructions that are cheaper than the fetch.
- Dividing the matrix by 63 instead of 64. The top cell lands on exactly 1.0, that one cell per tile is pushed a full level brighter than its neighbours, and flat regions grow a faint regular dot grid that only shows up on a real screen.
- Comparing against the raw matrix value with `step(0.0, x)`. The matrix contains a genuine zero cell, so the comparison passes there even when it should not, and every 8x8 tile gets one stuck pixel. Bias the comparison by about 0.001 if you use a threshold form rather than the quantise form here.
- Indexing the matrix with `gl_FragCoord` directly. The cell then measures one device pixel, so the same component looks twice as coarse on a 1x monitor as on a 2x one. Divide by `cellSize * dpr` and the texture is stable.
- Quantising the linear value with no gamma. The steps are uniform in code and non-uniform to the eye, so the shadows band visibly while the highlights look fine and the fix gets misdiagnosed as "not enough levels".
- Leaving the raw GL objects behind on unmount. There is no `dispose()` here — the VAO, buffer and program are deleted by hand and `loseContext(gl)` returns the context, without which a page that mounts this repeatedly starts blanking its oldest canvases.

## Notes

- The alternative implementation, a nested `mix`/`step` ladder, is branchless and works on WebGL1. This one needs WebGL2 for integer bit operators but is roughly half the instruction count.
- The same six lines dither any signal — swap the gradient in `main` for a scene texture and this becomes a post-process.

## Definition of done

The gradient shows no smooth ramp anywhere — every transition is a field of ordered dots resolving between five flat levels. Zoom the browser to 200% and the dot pitch doubles with the page instead of staying at one device pixel. Screenshot two consecutive frames with the pointer still: the dot pattern is byte-identical, because the matrix depends only on position.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
