'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useSmoothPointer } from '@/registry/hooks/use-smooth-pointer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { hasWebGL, loseContext, pixelRatio } from '@/registry/lib/webgl';
import {
  SPRING_LATTICE_FRAG,
  SPRING_LATTICE_VERT,
} from '@/registry/shaders/spring-lattice-field';

/* ==========================================================================
   Spring Lattice Field
   --------------------------------------------------------------------------
   Raw WebGL2, no framework. The interesting part is the split: a coarse
   damped-spring lattice runs on the CPU (a few thousand cells, trivial), gets
   packed into an RGBA8 texture once per frame, and the GPU reads that texture
   with LINEAR filtering to displace a procedural grid across every fragment.

   The alternative — simulating on the GPU with ping-pong framebuffers — is
   faster in the abstract and worse here: two extra render targets, a readback
   any time you want to know the field state, and float-texture support to feature
   detect. At this lattice size the CPU step is under 0.2 ms and the whole
   simulation stays inspectable in a debugger.
   ========================================================================== */

export interface SpringLatticeFieldProps {
  /** CSS pixels per lattice cell. Lower = finer simulation, quadratic cost. */
  cellSize?: number;
  /** Radius of the pointer's influence, in lattice cells. */
  radius?: number;
  /** Outward push per step from the pointer, in cells/step². */
  radialStrength?: number;
  /** How strongly pointer velocity drags the lattice along with it. */
  flowStrength?: number;
  /** Base colour of the field. Linear 0..1 RGB. */
  ink?: readonly [number, number, number];
  /** Grid line colour, added on top of `ink`. */
  line?: readonly [number, number, number];
  /** Colour added in proportion to cell speed. */
  glow?: readonly [number, number, number];
  /** Upper bound on device pixel ratio. */
  maxDpr?: number;
  className?: string;
}

// #region critical
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

    const pass = createPass(gl);
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
  // #endregion critical

  return (
    <div ref={host} className={cn('relative h-full w-full overflow-hidden', className)}>
      {supported ? (
        <canvas ref={canvasRef} className="block h-full w-full" />
      ) : (
        <div
          aria-hidden
          className="h-full w-full bg-bg"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, var(--k-line) 0 1px, transparent 1px 18px), repeating-linear-gradient(90deg, var(--k-line) 0 1px, transparent 1px 18px)',
          }}
        />
      )}
    </div>
  );
}
