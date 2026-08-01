'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useSmoothPointer } from '@/registry/hooks/use-smooth-pointer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { hasWebGL, loseContext, pixelRatio } from '@/registry/lib/webgl';
import { BAYER_PLASMA_FRAG, BAYER_PLASMA_VERT } from '@/registry/shaders/bayer-plasma-hero';

/* ==========================================================================
   Bayer-Quantised Plasma Hero
   --------------------------------------------------------------------------
   Raw WebGL2 on a single fullscreen triangle. An iterated domain-warped
   plasma is reduced to a small set of grey levels through an 8x8 ordered
   dither matrix derived from gl_FragCoord. The result is a dot-matrix proof of
   itself: newsprint texture instead of a smooth gradient.

   Iteration count is a uniform, not a compile-time constant, so a weak GPU can
   run the same shader at 8 passes instead of 16 without a recompile.
   ========================================================================== */

export interface BayerPlasmaHeroProps {
  /** Plasma warp passes. Clamped to 1..48 — the shader's compiled ceiling. */
  iterations?: number;
  /** How far each pass folds the coordinate through its own sine. */
  warp?: number;
  /** Base spatial frequency of the plasma. */
  frequency?: number;
  /** Radians of rotation applied per pass. */
  rotate?: number;
  /** Contrast pivoted on mid grey, applied before quantisation. */
  contrast?: number;
  /** Ramp exponent the levels are spaced on. */
  gamma?: number;
  /** Number of output grey levels, both ends included. */
  levels?: number;
  /** CSS pixels per dither cell. Scaled by DPR internally. */
  cellSize?: number;
  /** Strength of the elliptical vignette at the optical centre. */
  vignette?: number;
  /** Darkest output colour, linear 0..1 RGB. */
  ink?: readonly [number, number, number];
  /** Lightest output colour, linear 0..1 RGB. */
  paper?: readonly [number, number, number];
  speed?: number;
  maxDpr?: number;
  className?: string;
}

// #region critical
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
              'radial-gradient(circle at 1px 1px, var(--k-line-strong) 1px, transparent 0), radial-gradient(120% 100% at 50% 40%, var(--k-surface) 0%, var(--k-bg) 70%)',
            backgroundSize: '4px 4px, 100% 100%',
          }}
        />
      )}
    </div>
  );
}
