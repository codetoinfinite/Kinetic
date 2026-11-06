# Build: Spring Lattice Field

A grid that behaves like a stretched sheet. A coarse lattice of damped springs runs on the CPU, is packed into an RGBA8 texture once per frame, and the fragment shader reads that texture with LINEAR filtering to displace its own sample coordinate. The pointer pushes cells outward and drags them along with its velocity; diffusion between neighbours turns each push into a wave that spreads and settles.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A CPU damped-spring lattice uploaded as a texture each frame, displacing a procedural grid the cursor can push around.

- Category: webgl
- Runtime cost: webgl
- Dependencies: none beyond React

## How it works

1. The lattice is `round(width / cellSize)` by `round(height / cellSize)` cells, sized in CSS pixels rather than device pixels so the simulation is identical on a retina display instead of running four times as many cells.
2. Each step, cells within `radius` of the pointer receive two impulses: a radial one along `(cell - pointer) / |cell - pointer|` scaled by `radialStrength`, and a flow one along the pointer's own velocity scaled by `flowStrength`. Both are weighted by `t*t*(3-2t)` where `t = 1 - dist/radius` — a smoothstep falloff, C1 at both ends, so the disturbance has no visible rim.
3. Then `vel = (vel - disp * returnStiffness) * velocityDamping` and `nextDisp = disp + vel + (neighbourAverage - disp) * diffusion`. The diffusion term is what makes it a sheet rather than a field of independent springs: a local push propagates outward as a wave instead of staying put.
4. The integration writes into a scratch buffer, not in place. In place, the +x and +y neighbours would already hold the new value when a cell reads them, and the wave would visibly drift toward the lattice origin.
5. Displacement is packed into the texture as `d / DISP_MAX * 0.5 + 0.5` in RG, with cell speed in B. Speed, not displacement, drives the glow — so the field lights up while it is moving and goes dark once it settles, which is what reads as elastic rather than as a permanent dent.
6. The shader adds `disp / gridDimensions` to its uv before drawing an `fwidth`-normalised grid, so lines stay one pixel wide even where the field is stretching them, and `u_density` is set to the lattice row count so the drawn lines land on cell boundaries.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `STEP = 1 / 60`
  Fixed simulation timestep. Every other physics constant is expressed per step — `velocityDamping = 0.93` only means "keep 93% per 1/60 s" if the step is always 1/60 s. Integrating per frame instead makes the field stiffer on a 60 Hz laptop than on a 120 Hz phone.
- `MAX_SUBSTEPS = 4`
  Catch-up ceiling. Returning to a backgrounded tab otherwise tries to simulate the whole elapsed time in one frame and the page locks up for seconds. The leftover accumulator is discarded when the ceiling is hit, or the debt compounds and the simulation runs saturated forever.
- `returnStiffness = 0.018`
  Spring constant per step. Above ~0.05 the lattice snaps back before the wave can spread and it reads as rubber sheeting; below ~0.006 disturbances take several seconds to clear and the grid looks permanently dented.
- `velocityDamping = 0.93`
  Velocity retained per step. At 1.0 the lattice never loses energy and rings forever; below ~0.85 the push is absorbed within a few cells and nothing propagates.
- `diffusion = 0.22`
  Fraction of the way each cell moves toward its neighbours' average per step. This is the wave speed. Past 0.25 the explicit scheme goes unstable and the lattice fills with checkerboard noise; near 0 the cells decouple and the grid dimples pointwise.
- `radius = 5.5`
  Pointer influence, in cells. Expressed in cells rather than pixels so the physics is unchanged at any `cellSize`. Under ~3 the cursor pokes a hole; past ~10 it lifts the whole panel and the motion loses its centre.
- `radialStrength = 0.02`
  Sustained outward push per step. Equilibrium displacement is roughly `radialStrength / returnStiffness` ≈ 1.1 cells — enough for the grid to visibly part around a resting cursor without approaching the encode range.
- `flowStrength = 0.08`
  Drag along the pointer velocity. A transient impulse peaks at about `impulse / (1 - velocityDamping)` ≈ 14x, so this is roughly ten times smaller than the radial constant for a comparable displacement. Raise it and fast swipes clip the encode range.
- `MAX_POINTER_SPEED = 45`
  Cells per second. A pointer that teleports across the element — tab switch, window drag, the first event after a long pause — otherwise injects one enormous impulse and the whole lattice snaps in a single step.
- `DISP_MAX = 2.5`
  Encode range in cells. Displacement is clamped to it before packing into 8 bits; an unclamped value wraps the byte and the cell flips to the opposite sign, which reads as a hard pop exactly where the motion is strongest.
- `cellSize = 18`
  CSS pixels per cell. Cost is quadratic: at 6 a 1440x900 panel is 36,000 cells and the step stops fitting in a frame. Above ~30 the lattice is coarse enough that LINEAR interpolation between cells becomes visible as flat facets.

## API

```ts
function SpringLatticeField(props: { cellSize?: number; radius?: number; radialStrength?: number; flowStrength?: number; ink?: readonly [number, number, number]; line?: readonly [number, number, number]; glow?: readonly [number, number, number]; maxDpr?: number; className?: string }): JSX.Element
```

- `cellSize: number` — default `18`
  CSS pixels per lattice cell. Cost is quadratic in this.
- `radius: number` — default `5.5`
  Pointer influence radius, in lattice cells.
- `radialStrength: number` — default `0.02`
  Outward push per fixed step, in cells/step².
- `flowStrength: number` — default `0.08`
  How strongly pointer velocity drags cells along with it.
- `ink: readonly [number, number, number]` — default `[0.035, 0.038, 0.048]`
  Base field colour, linear 0..1 RGB.
- `line: readonly [number, number, number]` — default `[0.16, 0.17, 0.2]`
  Grid line colour, added on top of ink.
- `glow: readonly [number, number, number]` — default `[0.35, 0.62, 0.95]`
  Colour added in proportion to cell speed.
- `maxDpr: number` — default `2`
  Upper bound on device pixel ratio.
- `className: string`
  Merged onto the host element.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const TRIANGLE = new Float32Array([-1, -1, 3, -1, -1, 3]);
const MAX_DPR = 2;

/* The simulation runs on a fixed timestep. Every constant below is tuned per
   STEP — `velocityDamping = 0.93` means "keep 93% of the velocity after 1/60 of
   a second", and it only means that if the step is always 1/60 of a second. A
   per-frame integration would make the field stiffer on a 60 Hz laptop than on
   a 120 Hz phone, which is the exact failure mode the frame-rate independence
   rule exists to prevent. Everything here is in LATTICE CELLS, not pixels, so
   the physics is identical at any cellSize. */
const STEP = 1 / 60;
/* Ceiling on catch-up steps per frame. Without it, returning to a backgrounded
   tab tries to simulate the whole elapsed time in one frame and the page hangs;
   with it, the field simply resumes from where it was. */
const MAX_SUBSTEPS = 4;

const RETURN_STIFFNESS = 0.018;
const VELOCITY_DAMPING = 0.93;
const DIFFUSION = 0.22;
/* Pointer speed cap, cells/second. A pointer teleporting across the element
   (tab switch, window drag) otherwise injects one enormous impulse and the
   lattice snaps past the encode range in a single step. */
const MAX_POINTER_SPEED = 45;
/* Encode range in cells. Displacement is packed into 8 bits as
   `d / DISP_MAX * 0.5 + 0.5`, so anything beyond this must be clamped — an
   unclamped value wraps the byte and the cell flips to the opposite sign,
   which reads as a hard pop. */
const DISP_MAX = 2.5;
/* Maps cell speed (cells/step) into the 0..1 glow channel. */
const ENERGY_SCALE = 6;

const MIN_CELLS = 8;
const MAX_CELLS = 80;

interface Lattice {
  cols: number;
  rows: number;
  /** Interleaved x,y displacement per cell, in cells. */
  disp: Float32Array;
  /** Interleaved x,y velocity per cell, in cells/step. */
  vel: Float32Array;
  /** Scratch buffer — diffusion must read the whole previous state. */
  next: Float32Array;
  /** RGBA8 upload staging. */
  pixels: Uint8Array;
}

function createLattice(cols: number, rows: number): Lattice {
  const cells = cols * rows;
  return {
    cols,
    rows,
    disp: new Float32Array(cells * 2),
    vel: new Float32Array(cells * 2),
    next: new Float32Array(cells * 2),
    pixels: new Uint8Array(cells * 4),
  };
}

/* One fixed-timestep step. Pointer position is in cell coordinates; pointer
   velocity is in cells/second and is converted here, so the caller does not
   have to know the step length. */
function stepLattice(
  lattice: Lattice,
  pointerX: number,
  pointerY: number,
  pointerVX: number,
  pointerVY: number,
  active: boolean,
  radius: number,
  radialStrength: number,
  flowStrength: number,
): void {
  const { cols, rows, disp, vel, next } = lattice;

  if (active) {
    // Only the cells inside the radius can be touched, so bound the loop
    // instead of testing every cell. At radius 5.5 that is ~120 cells out of
    // a couple of thousand.
    const minX = Math.max(0, Math.floor(pointerX - radius));
    const maxX = Math.min(cols - 1, Math.ceil(pointerX + radius));
    const minY = Math.max(0, Math.floor(pointerY - radius));
    const maxY = Math.min(rows - 1, Math.ceil(pointerY + radius));
    const flowX = pointerVX * STEP * flowStrength;
    const flowY = pointerVY * STEP * flowStrength;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - pointerX;
        const dy = y - pointerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        /* Smoothstep falloff, not linear. A linear falloff has a corner at the
           radius: cells cross the boundary with non-zero force and the edge of
           the disturbance is a visible circle. `t*t*(3-2t)` is C1 at both ends,
           so the influence dies out with zero slope and no rim appears. */
        const t = 1 - dist / radius;
        const shaped = t * t * (3 - 2 * t);

        // At dist 0 the direction is undefined; pushing nothing is correct.
        const inv = dist > 1e-4 ? 1 / dist : 0;
        const i = (y * cols + x) * 2;
        vel[i] = (vel[i] ?? 0) + dx * inv * shaped * radialStrength + flowX * shaped;
        vel[i + 1] =
          (vel[i + 1] ?? 0) + dy * inv * shaped * radialStrength + flowY * shaped;
      }
    }
  }

  // Spring toward rest, then bleed energy. Damping applied AFTER the spring
  // term keeps the system unconditionally stable at these constants.
  for (let i = 0; i < vel.length; i++) {
    vel[i] = ((vel[i] ?? 0) - (disp[i] ?? 0) * RETURN_STIFFNESS) * VELOCITY_DAMPING;
  }

  /* Integrate and diffuse in one pass into `next`. Diffusion is what makes the
     lattice behave like a sheet rather than a field of independent springs:
     each cell is pulled `DIFFUSION` of the way toward its four neighbours'
     average, so a local push propagates outward as a wave. Writing in place
     would make the result depend on iteration order — the +x and +y neighbours
     would already be updated, and the wave would drift toward the origin. */
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 2;
      for (let c = 0; c < 2; c++) {
        const self = disp[i + c] ?? 0;
        // Edges mirror themselves: a free boundary. Clamping them to zero
        // instead pins the border and every wave reflects off it.
        const left = x > 0 ? disp[i - 2 + c] ?? self : self;
        const right = x < cols - 1 ? disp[i + 2 + c] ?? self : self;
        const up = y > 0 ? disp[i - cols * 2 + c] ?? self : self;
        const down = y < rows - 1 ? disp[i + cols * 2 + c] ?? self : self;
        const avg = (left + right + up + down) * 0.25;
        next[i + c] = self + (vel[i + c] ?? 0) + (avg - self) * DIFFUSION;
      }
    }
  }

  disp.set(next);
}

/** Pack displacement into RG and speed into B. Returns total energy. */
function encodeLattice(lattice: Lattice): number {
  const { disp, vel, pixels } = lattice;
  const cells = lattice.cols * lattice.rows;
  let total = 0;

  for (let c = 0; c < cells; c++) {
    const i = c * 2;
    const dx = disp[i] ?? 0;
    const dy = disp[i + 1] ?? 0;
    const vx = vel[i] ?? 0;
    const vy = vel[i + 1] ?? 0;
    const speed = Math.sqrt(vx * vx + vy * vy);
    total += speed;

    const o = c * 4;
    pixels[o] = encodeSigned(dx);
    pixels[o + 1] = encodeSigned(dy);
    pixels[o + 2] = Math.min(255, Math.round(speed * ENERGY_SCALE * 255));
    pixels[o + 3] = 255;
  }

  return total;
}

function encodeSigned(value: number): number {
  const n = value / DISP_MAX;
  const clamped = n < -1 ? -1 : n > 1 ? 1 : n;
  return Math.round((clamped * 0.5 + 0.5) * 255);
}

interface Pass {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  vao: WebGLVertexArrayObject;
  buffer: WebGLBuffer;
  texture: WebGLTexture;
  locations: Map<string, WebGLUniformLocation | null>;
  /** Allocated texture dimensions, so resize can tell reallocation from upload. */
  texCols: number;
  texRows: number;
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
    console.error('[spring-lattice-field]', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createPass(gl: WebGL2RenderingContext): Pass | null {
  const vert = compileShader(gl, gl.VERTEX_SHADER, SPRING_LATTICE_VERT);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, SPRING_LATTICE_FRAG);
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
  gl.deleteShader(vert);
  gl.deleteShader(frag);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[spring-lattice-field]', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  if (!vao || !buffer || !texture) {
    gl.deleteProgram(program);
    if (vao) gl.deleteVertexArray(vao);
    if (buffer) gl.deleteBuffer(buffer);
    if (texture) gl.deleteTexture(texture);
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

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  /* LINEAR is load-bearing, not a default: it is what turns a 40x24 simulation
     into a smooth field across two million fragments. CLAMP_TO_EDGE because
     REPEAT would sample the opposite edge of the lattice at the border and
     stamp a seam there. */
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return {
    gl,
    program,
    vao,
    buffer,
    texture,
    locations: new Map(),
    texCols: 0,
    texRows: 0,
  };
}

function uniformLocation(pass: Pass, name: string): WebGLUniformLocation | null {
  const cached = pass.locations.get(name);
  if (cached !== undefined) return cached;
  const found = pass.gl.getUniformLocation(pass.program, name);
  pass.locations.set(name, found);
  return found;
}

function setVec3(
  gl: WebGL2RenderingContext,
  location: WebGLUniformLocation | null,
  v: readonly [number, number, number],
): void {
  if (location === null) return;
  gl.uniform3f(location, v[0], v[1], v[2]);
}

function disposePass(pass: Pass): void {
  const { gl } = pass;
  gl.deleteVertexArray(pass.vao);
  gl.deleteBuffer(pass.buffer);
  gl.deleteTexture(pass.texture);
  gl.deleteProgram(pass.program);
  loseContext(gl);
}

export function SpringLatticeField({
  cellSize = 18,
  radius = 5.5,
  radialStrength = 0.02,
  flowStrength = 0.08,
  ink = [0.035, 0.038, 0.048],
  line = [0.16, 0.17, 0.2],
  glow = [0.35, 0.62, 0.95],
  maxDpr = MAX_DPR,
  className,
}: SpringLatticeFieldProps) {
  const host = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const passRef = useRef<Pass | null>(null);
  const latticeRef = useRef<Lattice | null>(null);
  const accumulator = useRef(0);
  const prevPointer = useRef<{ x: number; y: number } | null>(null);

  const { width, height } = useResizeObserver(host);
  const reduced = useReducedMotion();
  const visible = useVisibility();
  // Light smoothing only. Heavy smoothing would blunt the velocity signal the
  // flow push is built from, and the lattice would stop reacting to flicks.
  const pointer = useSmoothPointer({ target: host, smoothing: 0.004 });
  const [supported, setSupported] = useState(true);

  const params = useRef({ radius, radialStrength, flowStrength, ink, line, glow });
  params.current = { radius, radialStrength, flowStrength, ink, line, glow };

  const drawRef = useRef<() => void>(() => {});
  drawRef.current = () => {
    const pass = passRef.current;
    const lattice = latticeRef.current;
    if (!pass || !lattice) return;
    const { gl } = pass;
    const p = params.current;

    gl.useProgram(pass.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pass.texture);

    if (pass.texCols !== lattice.cols || pass.texRows !== lattice.rows) {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        lattice.cols,
        lattice.rows,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        lattice.pixels,
      );
      pass.texCols = lattice.cols;
      pass.texRows = lattice.rows;
    } else {
      // texSubImage2D, not texImage2D: re-specifying the texture every frame
      // makes the driver re-validate and often reallocate it, which shows up as
      // a steadily climbing GPU memory graph.
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        lattice.cols,
        lattice.rows,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        lattice.pixels,
      );
    }

    const uField = uniformLocation(pass, 'u_field');
    if (uField !== null) gl.uniform1i(uField, 0);

    const uRes = uniformLocation(pass, 'u_resolution');
    if (uRes !== null) {
      gl.uniform2f(uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
    const uGrid = uniformLocation(pass, 'u_grid');
    if (uGrid !== null) gl.uniform2f(uGrid, lattice.cols, lattice.rows);
    const uDisp = uniformLocation(pass, 'u_dispMax');
    if (uDisp !== null) gl.uniform1f(uDisp, DISP_MAX);
    /* Grid density is tied to the lattice row count so the drawn lines land on
       cell boundaries. Decoupling them makes the displacement look like it is
       sliding underneath the grid rather than moving it. */
    const uDensity = uniformLocation(pass, 'u_density');
    if (uDensity !== null) gl.uniform1f(uDensity, lattice.rows);

    setVec3(gl, uniformLocation(pass, 'u_ink'), p.ink);
    setVec3(gl, uniformLocation(pass, 'u_line'), p.line);
    setVec3(gl, uniformLocation(pass, 'u_glow'), p.glow);

    gl.bindVertexArray(pass.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  };

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    if (!hasWebGL()) {
      setSupported(false);
      return;
    }

    // Built here rather than rendered by React, because cleanup hands the
    // context back through `WEBGL_lose_context` and a canvas that has been
    // through that never yields another one — `getContext` returns the same
    // lost object. StrictMode's double invoke re-gave React's element to the
    // second run, whose `createPass` then compiled against a dead context and
    // demoted the component to its fallback for good.
    const canvas = document.createElement('canvas');
    canvas.className = 'block h-full w-full';

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

    const pass = createPass(gl);
    if (!pass) {
      loseContext(gl);
      setSupported(false);
      return;
    }
    el.append(canvas);
    canvasRef.current = canvas;
    passRef.current = pass;
    setSupported(true);

    // Left unhandled the lattice simply vanishes — a blank canvas that never
    // recovers and never falls back — so a loss demotes the component to its
    // static stand-in. `preventDefault` keeps a later restore possible.
    const onLost = (event: Event): void => {
      event.preventDefault();
      // Detached too: the fallback renders as a sibling in normal flow, and a
      // canvas left in place would sit on top of it.
      canvas.remove();
      setSupported(false);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      passRef.current = null;
      canvasRef.current = null;
      disposePass(pass);
      canvas.remove();
    };
  }, []);

  // Resize rebuilds the lattice and redraws. Under reduced motion this is the
  // only draw that ever happens, and it shows the field at rest.
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

    // Lattice resolution is in CSS pixels, deliberately: the simulation should
    // feel the same on a retina display, not run four times as many cells.
    const cols = Math.min(MAX_CELLS, Math.max(MIN_CELLS, Math.round(width / cellSize)));
    const rows = Math.min(MAX_CELLS, Math.max(MIN_CELLS, Math.round(height / cellSize)));
    const current = latticeRef.current;
    if (!current || current.cols !== cols || current.rows !== rows) {
      latticeRef.current = createLattice(cols, rows);
      encodeLattice(latticeRef.current);
      prevPointer.current = null;
      accumulator.current = 0;
    }

    drawRef.current();
  }, [width, height, cellSize, maxDpr, supported]);

  const running = supported && visible && !reduced && width > 0 && height > 0;

  useRaf((dt) => {
    const lattice = latticeRef.current;
    if (!lattice) return;
    const p = params.current;
    const state = pointer.current;

    const px = state.nx * lattice.cols;
    const py = state.ny * lattice.rows;

    // Velocity from the change in position, in cells/second, then capped.
    let vx = 0;
    let vy = 0;
    const prev = prevPointer.current;
    if (prev && dt > 0) {
      vx = (px - prev.x) / dt;
      vy = (py - prev.y) / dt;
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > MAX_POINTER_SPEED) {
        const k = MAX_POINTER_SPEED / speed;
        vx *= k;
        vy *= k;
      }
    }
    prevPointer.current = { x: px, y: py };

    accumulator.current += dt;
    let steps = 0;
    while (accumulator.current >= STEP && steps < MAX_SUBSTEPS) {
      stepLattice(
        lattice,
        px,
        py,
        vx,
        vy,
        state.active,
        p.radius,
        p.radialStrength,
        p.flowStrength,
      );
      accumulator.current -= STEP;
      steps++;
    }
    // Hit the ceiling: throw the backlog away rather than carrying a debt that
    // can never be paid off, which would leave the simulation permanently
    // saturated and running MAX_SUBSTEPS every frame.
    if (steps === MAX_SUBSTEPS) accumulator.current = 0;

    if (steps > 0) {
      encodeLattice(lattice);
      drawRef.current();
    }
  }, running);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Deletes the VAO, vertex buffer, field texture and program, then `loseContext(gl)`. The typed arrays are dropped with the lattice ref. The rAF subscription, resize observer and pointer listener unsubscribe with their hooks.

**Reduced motion.** No rAF subscription, so the lattice never steps and the pointer never disturbs it. One frame is drawn on mount and on resize showing the field at rest: the full grid, the vignette, no displacement and no glow. The component is a static grid, not a blank panel.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Integrating per frame instead of on a fixed accumulator. The constants above are tuned per 1/60 s; run them per frame and the same component is noticeably stiffer at 60 fps than at 120, and unstable under a frame spike. This is the one place the tuned constants and the frame-rate independence rule collide, and the accumulator is the resolution.
- Carrying the accumulator forward after hitting `MAX_SUBSTEPS`. The debt can never be repaid, so the simulation runs four substeps every frame from then on and quietly costs four times what it should.
- Diffusing in place. Cells read their +x and +y neighbours after those neighbours have already been updated, so the wave propagates faster in one diagonal than the other and visibly drifts toward the lattice origin.
- Setting the field texture to NEAREST. The lattice itself becomes visible as hard blocky steps — at `cellSize` 18 that is a grid of 18 px squares sliding under the drawn grid.
- Calling `texImage2D` every frame instead of `texSubImage2D`. Re-specifying the texture makes the driver re-validate and frequently reallocate it; the symptom is a GPU memory graph that climbs for as long as the page is open.
- Failing to clamp before encoding. Displacement past `DISP_MAX` wraps the unsigned byte, so a cell being pushed hard right suddenly reads as pushed hard left, and the field pops.
- Sizing the lattice in device pixels. A retina display quietly runs four times the cells for identical visual output, and the component drops frames only on the machines its author is least likely to be testing on.
- Heavy pointer smoothing. The flow push is built from the derivative of the pointer position, and over-smoothing flattens that derivative — the lattice stops responding to flicks while still responding to slow drags, which reads as lag rather than as smoothing.
- Leaving the context alive on unmount. Raw GL has no `dispose()`; the VAO, buffer, texture and program are deleted explicitly and `loseContext(gl)` hands the context back, or the page starts blanking its oldest canvases after roughly sixteen mounts.

## Notes

- The simulation could run on the GPU with ping-pong framebuffers, and at this lattice size it would be slower overall: two extra render targets, a readback whenever anything else needs the field state, and float-texture support to feature detect. A few thousand cells on the CPU cost under 0.2 ms and stay inspectable in a debugger.
- Resizing rebuilds the lattice from rest. Interpolating the old state into the new dimensions is possible but the disturbance is gone within a second of a resize anyway.

## Definition of done

Rest the cursor on the field and the grid parts around it by roughly one cell and holds there. Move it and a wave spreads outward through the lines and settles within about a second. Swipe fast and the lines are dragged along the swipe direction, glowing while they move and going dark once they stop. Grid lines stay one pixel wide even where they are most stretched. Throttle the CPU to 6x and the wave still travels at the same speed, just at fewer frames.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
