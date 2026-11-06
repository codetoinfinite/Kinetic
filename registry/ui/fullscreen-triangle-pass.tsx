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
  FULLSCREEN_TRIANGLE_FRAG,
  FULLSCREEN_TRIANGLE_VERT,
} from '@/registry/shaders/fullscreen-triangle-pass';

/* ==========================================================================
   Fullscreen Triangle Pass
   --------------------------------------------------------------------------
   Raw WebGL2. No three, no ogl — a framework here would ship 600 KB to draw
   three vertices.

   The geometry is ONE triangle at (-1,-1), (3,-1), (-1,3). It overshoots the
   viewport on two sides and the clipped remainder covers the screen exactly.
   Two triangles would meet along the diagonal, and the GPU shades in 2x2 quads:
   every quad the seam passes through is rasterised by BOTH triangles, so those
   fragments are shaded twice. On a full-screen pass that is a measurable band
   of redundant work down the diagonal, plus one extra vertex, plus a visible
   seam wherever a derivative (`fwidth`, `dFdx`) is taken across it.
   ========================================================================== */

/** Scalar or vec2/vec3/vec4, as a plain array. Matrices are not supported. */
export type UniformValue = number | readonly number[];

export interface FullscreenTrianglePassProps {
  /**
   * GLSL ES 3.00 fragment source. Must begin with `#version 300 es` on the
   * very first line and declare an `out vec4`. Receives `v_uv` (0..1),
   * `u_resolution` (device px), `u_time` (seconds) and `u_pointer` (0..1, y up).
   */
  fragment?: string;
  /** Extra uniforms, pushed every frame. Names must match the declarations. */
  uniforms?: Record<string, UniformValue>;
  /** Multiplier on `u_time`. */
  speed?: number;
  /** Upper bound on device pixel ratio. Fill rate is quadratic in this. */
  maxDpr?: number;
  className?: string;
}

// #region critical
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
    const el = host.current;
    if (!el) return;
    if (!hasWebGL()) {
      setSupported(false);
      return;
    }

    // The canvas is built here rather than rendered by React. Cleanup releases
    // the context through `WEBGL_lose_context`, and a canvas that has been
    // through that never yields another one — `getContext` hands back the same
    // lost object. So the element must not be one React keeps and re-gives to
    // the next effect run: a changed `fragment`, or StrictMode's double invoke,
    // did exactly that and every shader compiled against a dead context, which
    // left the component permanently on its fallback.
    const canvas = document.createElement('canvas');
    canvas.className = 'block h-full w-full';

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

    el.append(canvas);
    canvasRef.current = canvas;
    passRef.current = pass;
    setSupported(true);

    // A dropped context with nobody listening is a pass that never draws again:
    // a blank rectangle, no error, no fallback. Better to concede to the
    // fallback. `preventDefault` is required or the loss is final by spec.
    const onLost = (event: Event): void => {
      event.preventDefault();
      // Detached as well as conceded: the fallback renders as a sibling in
      // normal flow, and a canvas left in place sits on top of it.
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
              'repeating-linear-gradient(0deg, var(--k-line) 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, var(--k-line) 0 1px, transparent 1px 28px)',
          }}
        />
      )}
    </div>
  );
}
