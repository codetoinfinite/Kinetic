# Build: Fullscreen Triangle Pass

The smallest possible host for a full-screen fragment shader: a raw WebGL2 context, one buffer, one triangle whose vertices sit at (-1,-1), (3,-1) and (-1,3). The clipped triangle covers the viewport exactly, so there is no diagonal seam and no doubly-shaded band where two triangles would meet. Pass any GLSL ES 3.00 fragment source and it runs against `v_uv`, `u_resolution`, `u_time` and `u_pointer`.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

One 3-vertex triangle covers the viewport and runs your fragment shader. No three, no ogl, no seam.

- Category: webgl
- Runtime cost: webgl
- Dependencies: none beyond React

## How it works

1. A single `Float32Array([-1,-1, 3,-1, -1,3])` is uploaded once as `STATIC_DRAW` and bound into a VAO. The vertex shader is `gl_Position = vec4(a_pos, 0.0, 1.0)` — the positions are already in clip space, so there is no model, view or projection matrix anywhere in the component.
2. `v_uv = a_pos * 0.5 + 0.5` gives uv 0..1 at the visible corners and uv 2.0 at the two overshooting vertices; the rasteriser clips the triangle to the viewport and interpolates the varying linearly, so the surviving fragments carry exactly the uv a two-triangle quad would have produced.
3. The context is requested with `antialias: false, depth: false, stencil: false, alpha: false` — a fullscreen pass has no polygon interiors to multisample and no depth to test, and every one of those buffers costs width x height x DPR bytes plus a resolve.
4. Uniform locations are resolved lazily and memoised in a `Map` keyed by name, because `getUniformLocation` is a synchronous driver round-trip and calling it per frame per uniform is the single most common cause of a raw-GL component being slower than a three.js one.
5. `u_pointer` is fed from `useSmoothPointer` with the y axis flipped (`1 - ny`), so the shader receives the same handedness as `gl_FragCoord`.
6. Resize writes `canvas.width/height` at `pixelRatio(maxDpr)` and calls `gl.viewport`, then draws one frame immediately — which is also the only draw that happens under reduced motion.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `TRIANGLE = [-1,-1, 3,-1, -1,3]`
  The minimum overshoot that still guarantees full coverage. With 1.0 instead of 3.0 you get a half-screen triangle; with 5.0 the uv range widens to 0..3 and any shader that assumes uv is 0..1 at the vertices misinterprets its own derivatives.
- `MAX_DPR = 2`
  Fragment count is quadratic in DPR. A fullscreen shader at DPR 3 costs 2.25x what it costs at 2 for no perceptible gain, and it is the usual reason a hero shader stutters on a phone but not on the laptop it was built on.
- `pointer smoothing = 0.002`
  Fraction of the pointer gap remaining after one second. Raw pointer coordinates arrive in 8-16 ms bursts and pushing them straight into a uniform makes the light jitter one pixel per event.

## API

```ts
function FullscreenTrianglePass(props: { fragment?: string; uniforms?: Record<string, number | readonly number[]>; speed?: number; maxDpr?: number; className?: string }): JSX.Element
```

- `fragment: string` — default `FULLSCREEN_TRIANGLE_FRAG`
  GLSL ES 3.00 fragment source. Must open with `#version 300 es` and declare an `out vec4`. Changing it relinks the program.
- `uniforms: Record<string, number | readonly number[]>`
  Extra uniforms pushed every frame. Numbers become `uniform1f`; arrays of length 2/3/4 become `uniform2f`/`3f`/`4f`.
- `speed: number` — default `1`
  Multiplier applied to `u_time`.
- `maxDpr: number` — default `2`
  Upper bound on device pixel ratio.
- `className: string`
  Merged onto the host element.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/* Two vertices outside the viewport, one at the origin corner. Anything larger
   than 3.0 also works; 3.0 is the minimum that guarantees full coverage. */
const TRIANGLE = new Float32Array([-1, -1, 3, -1, -1, 3]);
const MAX_DPR = 2;

interface Pass {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
  locations: Map<string, WebGLUniformLocation | null>;
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // Log rather than throw: a shader that fails to compile should degrade to
    // the static fallback, not take the whole React tree down with it.
    console.error('[fullscreen-triangle-pass]', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createPass(gl: WebGL2RenderingContext, fragment: string): Pass | null {
  const vert = compileShader(gl, gl.VERTEX_SHADER, FULLSCREEN_TRIANGLE_VERT);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!vert || !frag || !program) {
    if (vert) gl.deleteShader(vert);
    if (frag) gl.deleteShader(frag);
    if (program) gl.deleteProgram(program);
    return null;
  }

  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  // Safe to delete immediately after linking — the program holds a reference.
  gl.deleteShader(vert);
  gl.deleteShader(frag);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[fullscreen-triangle-pass]', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  if (!vao || !buffer) {
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

/** Uniform locations are stable for the life of a program — look up once. */
function uniformLocation(pass: Pass, name: string): WebGLUniformLocation | null {
  const cached = pass.locations.get(name);
  if (cached !== undefined) return cached;
  const found = pass.gl.getUniformLocation(pass.program, name);
  pass.locations.set(name, found);
  return found;
}

function setUniform(
  gl: WebGL2RenderingContext,
  location: WebGLUniformLocation | null,
  value: UniformValue,
): void {
  // Null means the uniform was optimised out because the shader never reads
  // it. Silently skipping is correct; calling uniform*f with null is a no-op
  // that some drivers log as an error every frame.
  if (location === null) return;
  if (typeof value === 'number') {
    gl.uniform1f(location, value);
    return;
  }
  const a = value[0] ?? 0;
  const b = value[1] ?? 0;
  const c = value[2] ?? 0;
  const d = value[3] ?? 0;
  if (value.length === 2) gl.uniform2f(location, a, b);
  else if (value.length === 3) gl.uniform3f(location, a, b, c);
  else if (value.length >= 4) gl.uniform4f(location, a, b, c, d);
  else gl.uniform1f(location, a);
}

function disposePass(pass: Pass): void {
  const { gl } = pass;
  gl.deleteVertexArray(pass.vao);
  gl.deleteBuffer(pass.buffer);
  gl.deleteProgram(pass.program);
  // dispose alone leaves the context alive; only the extension hands it back.
  loseContext(gl);
}

export function FullscreenTrianglePass({
  fragment = FULLSCREEN_TRIANGLE_FRAG,
  uniforms,
  speed = 1,
  maxDpr = MAX_DPR,
  className,
}: FullscreenTrianglePassProps) {
  const host = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const passRef = useRef<Pass | null>(null);

  const { width, height } = useResizeObserver(host);
  const reduced = useReducedMotion();
  const visible = useVisibility();
  const pointer = useSmoothPointer({ target: host, smoothing: 0.002 });
  const [supported, setSupported] = useState(true);

  // Held in refs so a changed uniform object never re-creates the program.
  const uniformsRef = useRef(uniforms);
  uniformsRef.current = uniforms;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const drawRef = useRef<(elapsed: number) => void>(() => {});
  drawRef.current = (elapsed: number) => {
    const pass = passRef.current;
    if (!pass) return;
    const { gl } = pass;

    gl.useProgram(pass.program);
    setUniform(gl, uniformLocation(pass, 'u_resolution'), [
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
    ]);
    setUniform(gl, uniformLocation(pass, 'u_time'), elapsed * speedRef.current);
    const p = pointer.current;
    // Flip y: DOM coordinates grow downward, gl_FragCoord grows upward.
    setUniform(gl, uniformLocation(pass, 'u_pointer'), [p.nx, 1 - p.ny]);

    const extra = uniformsRef.current;
    if (extra) {
      for (const name of Object.keys(extra)) {
        const value = extra[name];
        if (value !== undefined) setUniform(gl, uniformLocation(pass, name), value);
      }
    }

    gl.bindVertexArray(pass.vao);
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

    // `antialias: false` — a fullscreen pass has no polygon edges to smooth,
    // so MSAA buys nothing and costs a multisample resolve every frame.
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

    const pass = createPass(gl, fragment);
    if (!pass) {
      loseContext(gl);
      setSupported(false);
      return;
    }
    passRef.current = pass;
    setSupported(true);

    return () => {
      passRef.current = null;
      disposePass(pass);
    };
  }, [fragment]);

  // Resize and the static frame share one effect: whenever the backing store
  // changes we must redraw, and under reduced motion that redraw is the only
  // one that ever happens.
  useEffect(() => {
    const canvas = canvasRef.current;
    const pass = passRef.current;
    if (!canvas || !pass || width === 0 || height === 0) return;

    const dpr = pixelRatio(maxDpr);
    const w = Math.max(1, Math.round(width * dpr));
    const h = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    pass.gl.viewport(0, 0, w, h);
    drawRef.current(0);
  }, [width, height, maxDpr, supported, fragment]);

  const running = supported && visible && !reduced && width > 0 && height > 0;
  useRaf((_dt, elapsed) => drawRef.current(elapsed), running);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Deletes the VAO, the vertex buffer and the program, then calls `loseContext(gl)` to hand the WebGL context back to the browser. The rAF subscription unsubscribes with the hook. The effect is keyed on `fragment`, so a source change tears the old program down before building the new one rather than leaking it.

**Reduced motion.** The rAF subscription never starts. The pass still draws exactly one frame on mount and one on every resize, so you get a fully composed still image rather than a blank canvas — `u_time` is pinned to 0 and the pointer light sits wherever it was seeded.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Putting a newline, a comment, or a leading space before `#version 300 es`. The directive must be the first token in the source or the compile fails with "version directive must occur before anything else", and because the shader source lives in a template literal the offending newline is invisible in the diff.
- Drawing a quad out of two triangles. GPUs shade in 2x2 fragment quads, so every quad the shared diagonal crosses is rasterised by both triangles and those fragments are shaded twice — a band of pure waste down the diagonal. It also breaks `fwidth`/`dFdx` across the seam, which shows up as a visible hairline in any analytic-AA shader.
- Calling `gl.getUniformLocation` inside the render loop. It is a driver round-trip, not a hash lookup; the locations are constant for the life of the program, so resolve them once and cache them.
- Passing a uniform that the shader never reads. `getUniformLocation` returns `null` for anything the compiler optimised out, and `gl.uniform1f(null, x)` is a silent no-op that some drivers log to the console 60 times a second. Skip on null.
- Calling `renderer.dispose()` or just dropping the canvas and assuming the context is released. Only `WEBGL_lose_context.loseContext()` hands it back, and Chromium kills the OLDEST live context when a page exceeds roughly 16 — so a leaked context here makes an unrelated component elsewhere on the page go black.
- Throwing on a shader compile error. A syntax error in a user-supplied fragment then unmounts the entire React subtree; logging the info log and falling back to the static poster keeps the page alive and puts the actual error in the console.

## Notes

- WebGL2 only. GLSL ES 3.00 gives `in`/`out`, integer bit operators and core derivatives without an extension dance; WebGL2 is available in every browser that has shipped since 2021 except pre-15.4 Safari, which the `hasWebGL` guard catches.
- Everything else in the WebGL category that does not use three.js is built on this exact pass — it is the shared floor, not a demo.

## Definition of done

The grid fills the frame edge to edge with no lighter or darker band along either diagonal, and the fine grid brightens under the cursor. Resize the container and the grid stays square with hairlines exactly one pixel wide at any DPR. Unmount and `WEBGL_lose_context` fires — mount and unmount twenty times and the twenty-first still renders instead of going black.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
