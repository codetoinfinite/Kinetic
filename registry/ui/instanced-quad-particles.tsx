'use client';

import { useEffect, useRef, useState } from 'react';
import { Color, Geometry, Mesh, Program, Renderer } from 'ogl';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { clamp } from '@/registry/lib/damp';
import { createRng, randRange } from '@/registry/lib/prng';
import { hasWebGL, loseContext, pixelRatio } from '@/registry/lib/webgl';
import {
  INSTANCED_QUAD_PARTICLES_FRAG,
  INSTANCED_QUAD_PARTICLES_VERT,
} from '@/registry/shaders/instanced-quad-particles';

/* ==========================================================================
   Instanced Quad Particles
   --------------------------------------------------------------------------
   A drifting dust field of up to 1800 particles in ONE draw call, built on ogl
   rather than three because the whole component is a single instanced mesh and
   a scene graph would be dead weight.

   Every particle is a quad, not a `gl_PointSize` sprite. Point sprites are
   capped at 255px on a lot of drivers, cannot be rotated, and are culled as a
   unit the moment their centre crosses the viewport edge — a large sprite
   vanishes while half of it is still visible. Quads have per-particle size,
   spin, softness and tint, and they clip like any other geometry.

   The buffers are allocated ONCE at `maxCount` and the visible population is
   selected with `setInstancedCount`, so resizing the container changes the
   particle count without touching a byte of GPU memory.
   ========================================================================== */

export interface InstancedQuadParticlesProps {
  /** Particles per megapixel of container area. The count is derived, not fixed. */
  density?: number;
  /** Hard ceiling on the population, and the size the buffers are allocated at. */
  maxCount?: number;
  /** Particle size range in CSS pixels, biased toward the small end. */
  sizeRange?: readonly [number, number];
  /** Edge softness, 0..1. 0 is a hard silhouette, 1 is a pure gradient. */
  softness?: number;
  /** Peak spin rate in radians per second. Each particle gets a signed fraction. */
  spin?: number;
  /** Multiplier on the whole drift, including the upward march. */
  speed?: number;
  /** Sideways and vertical wander, in field units (1 = the container). */
  wander?: number;
  /** Overall alpha multiplier. */
  opacity?: number;
  /** First tint. Any value `ogl`'s `Color` accepts. */
  colorA?: string;
  /** Second tint; each particle mixes between the two. */
  colorB?: string;
  /** Opaque clear colour the field is composited onto. */
  background?: string;
  /** Seed for the scatter. Same seed, same field every reload. */
  seed?: number | string;
  className?: string;
}

interface Uniforms {
  /** ogl types `uniforms` as an open record; the index signature keeps it assignable. */
  [name: string]: { value: unknown };
  uResolution: { value: [number, number] };
  uPixelRatio: { value: number };
  uElapsed: { value: number };
  uDrift: { value: number };
  uRise: { value: number };
  uFlowScale: { value: number };
  uWander: { value: number };
  uFadeBand: { value: number };
  uColorA: { value: Color };
  uColorB: { value: Color };
  uSoftness: { value: number };
  uOpacity: { value: number };
}

interface Stage {
  renderer: Renderer;
  geometry: Geometry;
  program: Program;
  mesh: Mesh;
  uniforms: Uniforms;
  resize: (width: number, height: number) => void;
  draw: (elapsed: number) => void;
}

/** Floor on the population. Below this the field reads as a few stray specks. */
const MIN_COUNT = 250;
/** Spatial frequency of the wander sinusoids, in cycles across the field. */
const FLOW_SCALE = 1.4;
/** Field heights per second the population marches upward at `speed` 1. */
const RISE = 0.045;
/** Fraction of the field height the wrap fade occupies at each end. */
const FADE_BAND = 0.12;
/** Size distribution exponent. Above 1 crowds the population into small sizes. */
const SIZE_BIAS = 2.2;
/**
 * Additive fill is the entire cost of this component and it scales with dpr
 * squared. Dust has no fine detail that a third sample per axis would resolve,
 * so the ratio is capped well below 2.
 */
const MAX_DPR = 1.5;
/** `elapsed` for the reduced-motion still and for post-resize redraws. */
const STATIC_ELAPSED = 0;

/** Field-space x range. Wider than 0..1 so wander never bares the side edges. */
const X_MIN = -0.08;
const X_MAX = 1.08;

// #region critical
export function InstancedQuadParticles({
  density = 900,
  maxCount = 1800,
  sizeRange = [5, 28],
  softness = 0.62,
  spin = 0.5,
  speed = 1,
  wander = 0.06,
  opacity = 0.55,
  colorA = '#9fb4cc',
  colorB = '#e8ddc9',
  background = '#07090d',
  seed = 'instanced-quad-particles',
  className,
}: InstancedQuadParticlesProps) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const { width, height } = useResizeObserver(host);
  const size = useRef({ width, height });
  size.current = { width, height };

  const reduced = useReducedMotion();
  const visible = useVisibility();
  const { inView } = useInView(host, { rootMargin: '10%' });
  const ready = width > 1 && height > 1;

  const [minSize = 5, maxSize = 28] = sizeRange;

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    if (!hasWebGL()) {
      setUnsupported(true);
      return;
    }

    // ogl creates its own canvas, and it is appended and removed per effect
    // run. Reusing one React-owned canvas would break under StrictMode: the
    // cleanup force-loses the context, and `getContext` on that same element
    // afterwards hands back the dead one rather than a fresh context.
    const renderer = new Renderer({
      dpr: pixelRatio(MAX_DPR),
      // Opaque, so the field owns every pixel and reads the same on a light or
      // a dark page. Additive blending onto a transparent canvas would have to
      // brighten whatever is behind it, which is the page background, which
      // the GPU cannot see.
      alpha: false,
      // Nothing is sorted and nothing occludes anything, so a depth buffer is
      // memory and a clear per frame for no result.
      depth: false,
      antialias: false,
      // The field is fill-bound, not shader-bound. Asking for the discrete GPU
      // on a laptop costs battery and buys nothing.
      powerPreference: 'low-power',
    });

    const gl = renderer.gl;
    const canvas = gl.canvas;

    const bg = new Color(background);
    gl.clearColor(bg.r, bg.g, bg.b, 1);

    // Four vertices, six indices, shared by every instance.
    const quad = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);
    const index = new Uint16Array([0, 1, 2, 0, 2, 3]);

    const total = Math.max(MIN_COUNT, Math.round(maxCount));
    const origins = new Float32Array(total * 2);
    const params = new Float32Array(total * 4);
    const seeds = new Float32Array(total * 4);

    const rng = createRng(seed);
    const lo = Math.max(1, Math.min(minSize, maxSize));
    const hi = Math.max(lo + 0.5, Math.max(minSize, maxSize));

    for (let i = 0; i < total; i += 1) {
      origins[i * 2] = randRange(rng, X_MIN, X_MAX);
      origins[i * 2 + 1] = rng();

      // Biased toward small: a linear distribution puts a quarter of the
      // population in the largest quarter of the size range, and a hundred
      // 28px blobs is fog rather than dust.
      const sizeT = Math.pow(rng(), SIZE_BIAS);
      params[i * 4] = lo + (hi - lo) * sizeT;
      params[i * 4 + 1] = randRange(rng, -1, 1) * spin;
      // Big particles are dimmer. Alpha per particle rather than per pixel
      // keeps the total light roughly constant as the size scales.
      params[i * 4 + 2] = 1 - 0.78 * sizeT;
      params[i * 4 + 3] = rng();

      seeds[i * 4] = rng() * Math.PI * 2;
      seeds[i * 4 + 1] = rng() * Math.PI * 2;
      seeds[i * 4 + 2] = rng();
      // A third are discs. The rest are shards, and the shards are the only
      // reason per-particle rotation is visible at all.
      seeds[i * 4 + 3] = rng() < 0.34 ? 0 : randRange(rng, 0.55, 1);
    }

    const geometry = new Geometry(gl, {
      index: { data: index },
      position: { size: 2, data: quad },
      aOrigin: { size: 2, data: origins, instanced: 1 },
      aParams: { size: 4, data: params, instanced: 1 },
      aSeed: { size: 4, data: seeds, instanced: 1 },
    });

    const uniforms: Uniforms = {
      uResolution: { value: [1, 1] },
      uPixelRatio: { value: renderer.dpr },
      uElapsed: { value: 0 },
      uDrift: { value: speed },
      uRise: { value: RISE },
      uFlowScale: { value: FLOW_SCALE },
      uWander: { value: wander },
      uFadeBand: { value: FADE_BAND },
      uColorA: { value: new Color(colorA) },
      uColorB: { value: new Color(colorB) },
      uSoftness: { value: clamp(softness, 0, 1) },
      uOpacity: { value: opacity },
    };

    const program = new Program(gl, {
      vertex: INSTANCED_QUAD_PARTICLES_VERT,
      fragment: INSTANCED_QUAD_PARTICLES_FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      // ogl defaults `cullFace` to BACK. The quad's index winding is not
      // guaranteed to face the way the driver expects once it is rotated in
      // the vertex shader, and a culled particle is simply absent.
      cullFace: false,
    });
    // Additive, overriding the source-over that `transparent: true` selected.
    // Order independent, so a thousand overlapping instances need no sort —
    // which is what makes one draw call possible in the first place.
    program.setBlendFunc(gl.ONE, gl.ONE);

    const mesh = new Mesh(gl, { geometry, program });

    el.appendChild(canvas);
    canvas.style.display = 'block';

    const resize = (w: number, h: number) => {
      renderer.setSize(w, h);
      // `setSize` writes literal px into the canvas's inline style, which wins
      // over any class. Re-asserting percentages keeps the element fluid
      // between resize notifications.
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
      uniforms.uPixelRatio.value = renderer.dpr;

      // Population from area, not from a fixed number: the same density looks
      // right in a 320px card and in a 2000px hero. The buffers already hold
      // `total` particles in scattered order, so a prefix of them is still a
      // spatially even field — no rebuild, no reallocation.
      const megapixels = (w * h) / 1_000_000;
      const count = clamp(Math.round(megapixels * density), MIN_COUNT, total);
      geometry.setInstancedCount(count);
    };

    const draw = (elapsed: number) => {
      uniforms.uElapsed.value = elapsed;
      renderer.render({ scene: mesh });
    };

    resize(size.current.width, size.current.height);
    stage.current = { renderer, geometry, program, mesh, uniforms, resize, draw };
    draw(STATIC_ELAPSED);

    return () => {
      stage.current = null;
      // ogl has no `dispose()`: `remove()` on the geometry deletes its VAOs and
      // every buffer, `remove()` on the program deletes the shaders and the
      // program, and only then is the context worth handing back.
      geometry.remove();
      program.remove();
      loseContext(gl);
      canvas.width = 0;
      canvas.height = 0;
      canvas.remove();
    };
  }, [
    ready,
    density,
    maxCount,
    minSize,
    maxSize,
    softness,
    spin,
    speed,
    wander,
    opacity,
    colorA,
    colorB,
    background,
    seed,
  ]);

  // Resize is its own effect: a reflow costs a `setSize` and an instanced-count
  // change, never a buffer rebuild.
  useEffect(() => {
    stage.current?.resize(width, height);
    if (reduced) stage.current?.draw(STATIC_ELAPSED);
  }, [width, height, reduced]);

  useRaf(
    (_dt, elapsed) => stage.current?.draw(elapsed),
    ready && inView && visible && !reduced && !unsupported,
  );
  // #endregion critical

  return (
    <div ref={host} className={cn('relative h-full w-full overflow-hidden', className)}>
      {unsupported ? (
        <div
          aria-hidden
          className="h-full w-full bg-bg"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 20%, var(--k-line-strong) 0.5px, transparent 0), radial-gradient(circle at 70% 60%, var(--k-line) 1px, transparent 0)',
            backgroundSize: '37px 41px, 53px 59px',
          }}
        />
      ) : null}
    </div>
  );
}
