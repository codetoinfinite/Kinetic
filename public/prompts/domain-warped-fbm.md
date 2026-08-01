# Build: Domain-Warped FBM Fog

A full-screen fragment shader on a single triangle. Two octaves of value-noise fbm are sampled twice to build a 2D offset, and that offset is fed back into a third sample — the result flows instead of cross-fading. The pointer enters the warp three times with different weights and a sign flip, so the fog leans toward the cursor without following it.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Slow, low-contrast fog that flows rather than fades, with a faint light that trails the cursor.

- Category: webgl
- Runtime cost: webgl
- Dependencies: none beyond React

## How it works

1. `fbm(p)` sums two octaves of 3D value noise with amplitudes 0.6 and 0.3 and lacunarity 1.93. The third dimension is time, so the field evolves continuously instead of scrolling.
2. The domain warp is `q = vec2(fbm(sp + m*0.20, t), fbm(sp + vec2(2.3,1.1) - m*0.20, t))`, then `n = fbm(sp + q*0.4 + m*0.12, t*0.8) * 0.5 + 0.5`. The `vec2(2.3, 1.1)` offset decorrelates the second channel from the first; without it both return the same number and the warp collapses into a diagonal translation.
3. Both the sample point and the pointer are multiplied by `aspect` on x before use, so the noise stays isotropic and the cursor glow stays circular on a wide screen.
4. `shade = smoothstep(0.25, 0.85, n)` crushes the noise into a soft two-tone field, and the final colour is `base + tint * (gain * shade + lift)` where `lift = (pointerY - 0.5) * 0.03` tilts the whole frame slightly as the cursor moves up and down.
5. The cursor light is `smoothstep(0.85, 0.0, d)` — arguments deliberately reversed to produce a falling ramp, 1 at the cursor and 0 at distance 0.85, without the extra `1.0 -`.
6. A vignette `smoothstep(1.25, 0.5, distance(uv, 0.5))` multiplies the result rather than subtracting from it, so the cursor glow dims with the corners instead of punching through them.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `scale = 0.7`
  Multiplier on the sample coordinate. Below 1.0 the noise features are LARGER than the screen, so you get a handful of slow masses. At 3.0 the same shader is television static.
- `warp = 0.4`
  How far `q` displaces the final sample. Under ~0.15 the warp is invisible and you are looking at plain fbm; over ~0.9 the field folds back on itself and produces hard creases that read as compression artefacts.
- `octaves = 2`
  Textbook fbm uses 4-6. Two is enough because the output goes straight through `smoothstep(0.25, 0.85, n)`, which discards the fine detail anyway. fbm is essentially the whole cost of this shader, so halving the octaves halves the frame time.
- `lacunarity = 1.93`
  Frequency step between octaves. Exactly 2.0 makes the two lattices coincide on every other cell boundary and stamps a faint axis-aligned cross into the field; an off-integer step decorrelates them.
- `amplitude schedule = 0.6 then 0.3`
  Starting below 1.0 keeps the two-octave sum inside roughly -0.9..0.9, so `n * 0.5 + 0.5` lands in 0..1 without clipping and the smoothstep window sits where the data actually is.
- `time scale = 0.03`
  The field advances 0.0005 units per frame at 60 Hz. It has to read as weather, not animation — at 0.3 it becomes a lava lamp and starts competing with the content on top of it.
- `gain = 0.22`
  Peak brightness above the base. The reference site sits at 0.08, which keeps the entire image inside the bottom 17% of the value range so white type sits on it perfectly. 0.22 is the standalone default; drop it toward 0.08 the moment you put text on top.
- `pointer smoothing = 0.02`
  Fraction of the gap left after one second. The pointer displaces a noise domain, so raw values make the whole field jump between pointer events rather than drift.

## API

```ts
function DomainWarpedFbm(props: { scale?: number; warp?: number; gain?: number; speed?: number; base?: readonly [number, number, number]; tint?: readonly [number, number, number]; maxDpr?: number; className?: string }): JSX.Element
```

- `scale: number` — default `0.7`
  Noise frequency. Below 1.0 the features are larger than the screen.
- `warp: number` — default `0.4`
  How far the first two fbm samples displace the third.
- `gain: number` — default `0.22`
  Peak brightness added above the base colour.
- `speed: number` — default `1`
  Multiplier on the drift, which is already very slow.
- `base: readonly [number, number, number]` — default `[0.03, 0.032, 0.042]`
  Base colour, linear 0..1 RGB, straight into the shader.
- `tint: readonly [number, number, number]` — default `[0.86, 0.9, 1]`
  Colour of the lit fog and the cursor glow.
- `maxDpr: number` — default `2`
  Upper bound on device pixel ratio.
- `className: string`
  Merged onto the host element.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const TRIANGLE = new Float32Array([-1, -1, 3, -1, -1, 3]);
const SCALE = 0.7;
const WARP = 0.4;
const GAIN = 0.22;
const BASE: readonly [number, number, number] = [0.03, 0.032, 0.042];
const TINT: readonly [number, number, number] = [0.86, 0.9, 1];

interface Gpu {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
  locations: Map<string, WebGLUniformLocation | null>;
}

/* A local 60-line bootstrap rather than three.js or ogl. This component draws
   three vertices; a framework would be 100x its own weight in dependency. */
function build(gl: WebGL2RenderingContext, vertSrc: string, fragSrc: string): Gpu | null {
  const compile = (type: number, src: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    console.error('[domain-warped-fbm]', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  };

  const vert = compile(gl.VERTEX_SHADER, vertSrc);
  const frag = compile(gl.FRAGMENT_SHADER, fragSrc);
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
    console.error('[domain-warped-fbm]', gl.getProgramInfoLog(program));
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

export function DomainWarpedFbm({
  scale = SCALE,
  warp = WARP,
  gain = GAIN,
  speed = 1,
  base = BASE,
  tint = TINT,
  maxDpr = 2,
  className,
}: DomainWarpedFbmProps) {
  const host = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gpuRef = useRef<Gpu | null>(null);

  const { width, height } = useResizeObserver(host);
  const reduced = useReducedMotion();
  const visible = useVisibility();
  // Heavy smoothing: the pointer drives a warp offset, and an unsmoothed
  // pointer makes the whole field snap between frames rather than drift.
  const pointer = useSmoothPointer({ target: host, smoothing: 0.02 });
  const [supported, setSupported] = useState(true);

  const paramsRef = useRef({ scale, warp, gain, speed, base, tint });
  paramsRef.current = { scale, warp, gain, speed, base, tint };

  const drawRef = useRef<(elapsed: number) => void>(() => {});
  drawRef.current = (elapsed: number) => {
    const gpu = gpuRef.current;
    if (!gpu) return;
    const { gl } = gpu;
    const params = paramsRef.current;
    const p = pointer.current;

    gl.useProgram(gpu.program);
    gl.uniform2f(
      loc(gpu, 'u_resolution'),
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
    );
    gl.uniform1f(loc(gpu, 'u_time'), elapsed * params.speed);
    gl.uniform2f(loc(gpu, 'u_pointer'), p.nx, 1 - p.ny);
    gl.uniform1f(loc(gpu, 'u_scale'), params.scale);
    gl.uniform1f(loc(gpu, 'u_warp'), params.warp);
    gl.uniform1f(loc(gpu, 'u_gain'), params.gain);
    gl.uniform3f(loc(gpu, 'u_base'), params.base[0], params.base[1], params.base[2]);
    gl.uniform3f(loc(gpu, 'u_tint'), params.tint[0], params.tint[1], params.tint[2]);

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

    const gpu = build(gl, DOMAIN_WARPED_FBM_VERT, DOMAIN_WARPED_FBM_FRAG);
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
    const w = Math.max(1, Math.round(width * dpr));
    const h = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gpu.gl.viewport(0, 0, w, h);
    // One frame here covers both the first paint and the reduced-motion path.
    drawRef.current(reduced ? 12 : 0);
  }, [width, height, maxDpr, supported, reduced]);

  const running = supported && visible && !reduced && width > 0 && height > 0;
  useRaf((_dt, elapsed) => drawRef.current(elapsed), running);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Deletes the VAO, the vertex buffer and the program, then `loseContext(gl)`. The rAF subscription and the pointer listener are removed by their hooks.

**Reduced motion.** The rAF loop never subscribes. One frame is drawn at a fixed `u_time` of 12 seconds — far enough into the sequence that the field is fully developed rather than at its symmetric t=0 state — and redrawn on resize. The cursor light does not track.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Aspect-correcting the sample space but not the pointer. The noise looks right and the cursor glow becomes an ellipse that stretches further the wider the window gets — the two must live in the same coordinate system.
- Using the same offset for both warp channels. `fbm(sp)` and `fbm(sp)` are the same number, so `q` becomes a scalar along the diagonal and the "warp" is a plain translation; you get sliding blobs with none of the folding.
- Feeding `sin()` a large argument inside the hash. `fract(sin(dot(p, ...)))` degrades badly once `p` is in the thousands: the noise develops repeating bands, and it fails on mobile GPUs at scales where the desktop still looks fine. Fold the input with `fract()` first.
- Running 5 octaves because that is what the tutorial did. The output is immediately crushed by a smoothstep, so octaves 3-5 cost real milliseconds and change nothing you can see.
- Letting the shader run in a hidden tab. `useVisibility` gates the loop; without it a backgrounded page keeps a GPU-bound fragment shader resident and the laptop fan tells the user about it.
- Relying on `dispose()`-style cleanup. Raw GL has none — the VAO, buffer and program are deleted explicitly and `loseContext(gl)` hands the context back, without which mounting this component twenty times kills the oldest contexts on the page.

## Notes

- Value noise rather than simplex: after `smoothstep(0.25, 0.85, n)` the two are indistinguishable, and value noise is eight hash calls and seven mixes with no permutation polynomial.
- Total brightness at the defaults runs roughly 0.03 to 0.30. Set `gain={0.08}` for the original hero behaviour, where the whole field stays under 0.18 and white type needs no scrim.

## Definition of done

Watch for ten seconds: the masses should visibly fold and stretch, not just brighten and dim in place. Move the cursor and a faint circular light follows it a beat late while the fog around it shears. Resize from 320px to full width and the noise features stay the same shape rather than stretching horizontally.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
