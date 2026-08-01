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
  DOMAIN_WARPED_FBM_FRAG,
  DOMAIN_WARPED_FBM_VERT,
} from '@/registry/shaders/domain-warped-fbm';

/* ==========================================================================
   Domain-Warped FBM Fog
   --------------------------------------------------------------------------
   Raw WebGL2 on a single fullscreen triangle. Two octaves of value noise are
   sampled twice to build an offset vector, and that offset is fed back into a
   third sample — Iñigo Quílez's domain warp. It is the difference between
   blobs that fade in and out, and a field that looks like it is flowing.

   The whole image lives in a narrow, low band of the value range. That is the
   point: it is a backdrop for type, not a picture.
   ========================================================================== */

export interface DomainWarpedFbmProps {
  /**
   * Noise frequency. Below 1.0 the features are larger than the screen, which
   * is what makes this fog rather than static.
   */
  scale?: number;
  /** How far the first two fbm samples displace the third. */
  warp?: number;
  /** Peak brightness added above the base colour. */
  gain?: number;
  /** Multiplier on the (already very slow) drift. */
  speed?: number;
  /** Base colour, linear 0..1 RGB. Read straight into the shader. */
  base?: readonly [number, number, number];
  /** Colour of the lit part of the fog, linear 0..1 RGB. */
  tint?: readonly [number, number, number];
  maxDpr?: number;
  className?: string;
}

// #region critical
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
              'radial-gradient(120% 90% at 30% 25%, var(--k-surface) 0%, transparent 55%), radial-gradient(90% 80% at 75% 70%, var(--k-bg-subtle) 0%, transparent 60%)',
          }}
        />
      )}
    </div>
  );
}
