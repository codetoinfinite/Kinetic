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
  BAYER8_DITHER_FRAG,
  BAYER8_DITHER_VERT,
} from '@/registry/shaders/bayer8-ordered-dither';

/* ==========================================================================
   Bit-Math Bayer8 Ordered Dither
   --------------------------------------------------------------------------
   Raw WebGL2. A smooth gradient is reduced to a handful of levels through an
   8x8 ordered-dither matrix that is DERIVED from gl_FragCoord with six integer
   ops — no lookup texture, no 64-float uniform array, no branches. The full
   derivation lives at the top of the shader file.

   Uploading a 8x8 texture would mean a second texture unit, a sampler, a
   GL_NEAREST filter that some drivers still get wrong on non-power-of-two
   viewports, and a resource to dispose. Six integer instructions cost less
   than the texture fetch they replace.
   ========================================================================== */

export interface Bayer8OrderedDitherProps {
  /** Output steps per channel, both ends included. 2 is pure 1-bit. */
  levels?: number;
  /** CSS pixels per dither cell. Scaled by DPR so the texture is stable. */
  cellSize?: number;
  /** Multiplier on the sweep. */
  speed?: number;
  /** Darkest output colour, linear 0..1 RGB. */
  dark?: readonly [number, number, number];
  /** Lightest output colour, linear 0..1 RGB. */
  light?: readonly [number, number, number];
  maxDpr?: number;
  className?: string;
}

// #region critical
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
    const el = host.current;
    if (!el) return;
    if (!hasWebGL()) {
      setSupported(false);
      return;
    }

    /* The canvas is created here, not rendered by React, because the cleanup
       below hands the context back through `WEBGL_lose_context` — and
       `getContext` on an element that has been through that returns the SAME
       dead context, not a new one. Keeping React's element across the cycle
       therefore made the loss permanent. This is not a dev-only StrictMode
       concern: the preview host hides components with `<Activity mode="hidden">`,
       which unmounts effects while keeping the DOM, so scrolling a preview out
       of view and back is exactly that cycle. */
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

    const gpu = build(gl);
    if (!gpu) {
      loseContext(gl);
      setSupported(false);
      return;
    }
    el.append(canvas);
    canvasRef.current = canvas;
    gpuRef.current = gpu;
    setSupported(true);

    // Unhandled, a lost context is a canvas that stays blank for the rest of
    // the page's life with nothing rendered in its place, so swap in the CSS
    // fallback. `preventDefault` is what keeps the loss recoverable at all.
    const onLost = (event: Event): void => {
      event.preventDefault();
      // Detached as well: the fallback renders as a sibling in normal flow,
      // so a canvas left in place would cover it.
      canvas.remove();
      setSupported(false);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      gpuRef.current = null;
      canvasRef.current = null;
      gl.deleteVertexArray(gpu.vao);
      gl.deleteBuffer(gpu.buffer);
      gl.deleteProgram(gpu.program);
      loseContext(gl);
      canvas.remove();
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
  // #endregion critical

  return (
    <div ref={host} className={cn('relative h-full w-full overflow-hidden', className)}>
      {/* The canvas is appended by the effect above, not rendered here. */}
      {!supported && (
        <div
          aria-hidden
          className="h-full w-full bg-bg"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, var(--k-line-strong) 1px, transparent 0), linear-gradient(180deg, var(--k-surface), var(--k-bg))',
            backgroundSize: '4px 4px, 100% 100%',
          }}
        />
      )}

    </div>
  );
}
