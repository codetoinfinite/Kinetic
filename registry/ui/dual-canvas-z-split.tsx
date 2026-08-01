'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
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
  DUAL_CANVAS_Z_SPLIT_FRAG,
  DUAL_CANVAS_Z_SPLIT_VERT,
} from '@/registry/shaders/dual-canvas-z-split';

/* ==========================================================================
   Dual-Canvas Depth Split
   --------------------------------------------------------------------------
   Two stacked canvases render the SAME particle system with opposite
   `uZSign`, and the page content sits between them. Particles with negative
   depth pass behind the text, positive ones pass in front, and because size,
   parallax rate, brightness and softness are one continuous ramp across the
   depth axis, the plane where the split happens is invisible. The text does
   not sit on a field; it sits inside one.

   Doing this with one canvas is not possible: the DOM has to interleave, and a
   canvas is a single stacking-context leaf. The cost is two WebGL contexts out
   of the ~16 a Chromium renderer process allows, which is why both are
   released on unmount rather than left to GC.
   ========================================================================== */

export interface DualCanvasZSplitProps {
  /** Content rendered between the two particle layers. */
  children?: ReactNode;
  /** Particles per megapixel of container area. The count is derived, not fixed. */
  density?: number;
  /** Population ceiling, and the size the buffers are allocated at. */
  maxCount?: number;
  /** Fraction of the population placed in FRONT of the content. */
  split?: number;
  /** Disc diameter in CSS pixels at the far and near ends of the depth ramp. */
  sizeRange?: readonly [number, number];
  /** Multiplier on the whole drift. */
  speed?: number;
  /** Sinusoidal wander amplitude in field units, where 1 is the container. */
  wander?: number;
  /** Overall alpha multiplier. The front layer takes a fraction of it. */
  opacity?: number;
  /** First tint. Any value `ogl`'s `Color` accepts. */
  colorA?: string;
  /** Second tint; each particle mixes between the two. */
  colorB?: string;
  /** Opaque clear colour of the BACK canvas. The front canvas is transparent. */
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
  uZSign: { value: number };
  uDrift: { value: number };
  uRise: { value: number };
  uFlowScale: { value: number };
  uWander: { value: number };
  uFadeBand: { value: number };
  uMinSize: { value: number };
  uMaxSize: { value: number };
  uColorA: { value: Color };
  uColorB: { value: Color };
  uOpacity: { value: number };
}

interface Layer {
  renderer: Renderer;
  geometry: Geometry;
  program: Program;
  mesh: Mesh;
  uniforms: Uniforms;
  canvas: HTMLCanvasElement;
}

interface Stage {
  layers: Layer[];
  resize: (width: number, height: number) => void;
  draw: (elapsed: number) => void;
}

interface FieldData {
  quad: Float32Array;
  index: Uint16Array;
  origins: Float32Array;
  depths: Float32Array;
  seeds: Float32Array;
}

/** Floor on the population. Below this the field reads as a few stray specks. */
const MIN_COUNT = 250;
/** Cycles of wander across the field. */
const FLOW_SCALE = 1.3;
/** Field heights per second at `speed` 1, before the per-particle depth factor. */
const RISE = 0.05;
/** Fraction of the field height the wrap fade occupies at each end. */
const FADE_BAND = 0.14;
/**
 * The front layer is deliberately dimmer than the back one. Dust in front of
 * body copy is a legibility cost, and at parity the text reads as fogged.
 */
const FRONT_OPACITY = 0.55;
/** Fill is the whole cost here and it scales with the square of the ratio. */
const MAX_DPR = 1.5;
/** `elapsed` for the reduced-motion still and for post-resize redraws. */
const STATIC_ELAPSED = 0;

/** Field-space x range, wider than the container so wander never bares an edge. */
const X_MIN = -0.08;
const X_MAX = 1.08;
/** Dead zone around the content plane. A particle at depth 0 belongs to neither side. */
const DEPTH_FLOOR = 0.05;

// #region critical
function createLayer(
  host: HTMLElement,
  data: FieldData,
  opts: {
    zSign: number;
    opaque: boolean;
    background: Color;
    colorA: Color;
    colorB: Color;
    speed: number;
    wander: number;
    opacity: number;
    minSize: number;
    maxSize: number;
  },
): Layer {
  const renderer = new Renderer({
    dpr: pixelRatio(MAX_DPR),
    // The back layer owns its pixels, so it is opaque and can blend
    // additively. The front layer sits over live DOM text and must be
    // transparent, which rules additive out — there is nothing on the GPU to
    // add to. It blends premultiplied source-over instead.
    alpha: !opts.opaque,
    premultipliedAlpha: !opts.opaque,
    // Nothing occludes anything in either layer; the depth ORDER is expressed
    // by which canvas a particle lands on, not by a z-buffer.
    depth: false,
    antialias: false,
    powerPreference: 'low-power',
  });

  const gl = renderer.gl;
  const canvas = gl.canvas;

  if (opts.opaque) gl.clearColor(opts.background.r, opts.background.g, opts.background.b, 1);
  else gl.clearColor(0, 0, 0, 0);

  // Each layer needs its own attribute descriptors — ogl writes the buffer
  // handle and the element count into the object it is handed — but the
  // underlying typed arrays are shared, so the two contexts hold identical
  // particles rather than two independent fields.
  const geometry = new Geometry(gl, {
    index: { data: data.index },
    position: { size: 2, data: data.quad },
    aOrigin: { size: 2, data: data.origins, instanced: 1 },
    aDepth: { size: 1, data: data.depths, instanced: 1 },
    aSeed: { size: 4, data: data.seeds, instanced: 1 },
  });

  const uniforms: Uniforms = {
    uResolution: { value: [1, 1] },
    uPixelRatio: { value: renderer.dpr },
    uElapsed: { value: 0 },
    uZSign: { value: opts.zSign },
    uDrift: { value: opts.speed },
    uRise: { value: RISE },
    uFlowScale: { value: FLOW_SCALE },
    uWander: { value: opts.wander },
    uFadeBand: { value: FADE_BAND },
    uMinSize: { value: opts.minSize },
    uMaxSize: { value: opts.maxSize },
    uColorA: { value: opts.colorA },
    uColorB: { value: opts.colorB },
    uOpacity: { value: opts.opacity },
  };

  const program = new Program(gl, {
    vertex: DUAL_CANVAS_Z_SPLIT_VERT,
    fragment: DUAL_CANVAS_Z_SPLIT_FRAG,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    // ogl defaults `cullFace` to BACK, and a culled particle is absent with no
    // error anywhere. Nothing here has a back face worth culling.
    cullFace: false,
  });
  if (opts.opaque) program.setBlendFunc(gl.ONE, gl.ONE);
  else program.setBlendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const mesh = new Mesh(gl, { geometry, program });

  host.appendChild(canvas);
  canvas.style.display = 'block';

  return { renderer, geometry, program, mesh, uniforms, canvas };
}

export function DualCanvasZSplit({
  children,
  density = 850,
  maxCount = 1600,
  split = 0.38,
  sizeRange = [3, 34],
  speed = 1,
  wander = 0.05,
  opacity = 0.6,
  colorA = '#8ea6c4',
  colorB = '#e6d9c4',
  background = '#06080c',
  seed = 'dual-canvas-z-split',
  className,
}: DualCanvasZSplitProps) {
  const host = useRef<HTMLDivElement>(null);
  const backHost = useRef<HTMLDivElement>(null);
  const frontHost = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const { width, height } = useResizeObserver(host);
  const size = useRef({ width, height });
  size.current = { width, height };

  const reduced = useReducedMotion();
  const visible = useVisibility();
  const { inView } = useInView(host, { rootMargin: '10%' });
  const ready = width > 1 && height > 1;

  const [minSize = 3, maxSize = 34] = sizeRange;

  useEffect(() => {
    const back = backHost.current;
    const front = frontHost.current;
    if (!back || !front || !ready) return;

    if (!hasWebGL()) {
      setUnsupported(true);
      return;
    }

    const total = Math.max(MIN_COUNT, Math.round(maxCount));
    const data: FieldData = {
      quad: new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]),
      index: new Uint16Array([0, 1, 2, 0, 2, 3]),
      origins: new Float32Array(total * 2),
      depths: new Float32Array(total),
      seeds: new Float32Array(total * 4),
    };

    const rng = createRng(seed);
    const frontShare = clamp(split, 0, 1);
    const lo = Math.max(1, Math.min(minSize, maxSize));
    const hi = Math.max(lo + 0.5, Math.max(minSize, maxSize));

    for (let i = 0; i < total; i += 1) {
      data.origins[i * 2] = randRange(rng, X_MIN, X_MAX);
      data.origins[i * 2 + 1] = rng();

      // The sign picks the canvas, the magnitude drives size, parallax,
      // brightness and softness. A particle exactly at 0 would be on the
      // content plane and belongs to neither layer, so the range excludes it.
      const inFront = rng() < frontShare;
      data.depths[i] = inFront
        ? randRange(rng, DEPTH_FLOOR, 1)
        : -randRange(rng, DEPTH_FLOOR, 1);

      data.seeds[i * 4] = rng() * Math.PI * 2;
      data.seeds[i * 4 + 1] = rng() * Math.PI * 2;
      data.seeds[i * 4 + 2] = rng();
      // Size jitter on top of the depth ramp. Without it the depth ordering is
      // perfectly legible from size alone, which reads as a diagram.
      data.seeds[i * 4 + 3] = randRange(rng, 0.7, 1.3);
    }

    const colA = new Color(colorA);
    const colB = new Color(colorB);
    const bg = new Color(background);
    const shared = {
      background: bg,
      colorA: colA,
      colorB: colB,
      speed,
      wander,
      minSize: lo,
      maxSize: hi,
    };

    const layers = [
      createLayer(back, data, { ...shared, zSign: -1, opaque: true, opacity }),
      createLayer(front, data, {
        ...shared,
        zSign: 1,
        opaque: false,
        opacity: opacity * FRONT_OPACITY,
      }),
    ];

    const resize = (w: number, h: number) => {
      // Population from area, not a fixed number, so one density reads right in
      // a 320px card and a 2000px hero. The buffers already hold `total`
      // particles in scattered order, so a prefix is still an even field —
      // nothing is reallocated.
      const megapixels = (w * h) / 1_000_000;
      const count = clamp(Math.round(megapixels * density), MIN_COUNT, total);

      for (const layer of layers) {
        layer.renderer.setSize(w, h);
        // `setSize` writes literal px into the canvas's inline style, which
        // beats any class. Re-asserting percentages keeps it fluid.
        layer.canvas.style.width = '100%';
        layer.canvas.style.height = '100%';
        layer.uniforms.uResolution.value = [
          layer.renderer.gl.drawingBufferWidth,
          layer.renderer.gl.drawingBufferHeight,
        ];
        layer.uniforms.uPixelRatio.value = layer.renderer.dpr;
        layer.geometry.setInstancedCount(count);
      }
    };

    const draw = (elapsed: number) => {
      for (const layer of layers) {
        layer.uniforms.uElapsed.value = elapsed;
        layer.renderer.render({ scene: layer.mesh });
      }
    };

    resize(size.current.width, size.current.height);
    stage.current = { layers, resize, draw };
    draw(STATIC_ELAPSED);

    return () => {
      stage.current = null;
      for (const layer of layers) {
        // ogl has no `dispose()`: `remove()` deletes the VAOs and every buffer,
        // then the program and its shaders, and only `WEBGL_lose_context` gives
        // the context itself back. This component holds two of them.
        layer.geometry.remove();
        layer.program.remove();
        loseContext(layer.renderer.gl);
        layer.canvas.width = 0;
        layer.canvas.height = 0;
        layer.canvas.remove();
      }
    };
  }, [
    ready,
    density,
    maxCount,
    split,
    minSize,
    maxSize,
    speed,
    wander,
    opacity,
    colorA,
    colorB,
    background,
    seed,
  ]);

  // Resize is its own effect: a reflow costs two `setSize` calls and an
  // instanced-count change, never a rebuild of the shared buffers.
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
      <div
        ref={backHost}
        aria-hidden
        className="absolute inset-0 z-0"
        style={
          unsupported
            ? {
                backgroundImage:
                  'radial-gradient(circle at 30% 20%, var(--k-line) 1px, transparent 0), radial-gradient(circle at 70% 65%, var(--k-line-strong) 1px, transparent 0)',
                backgroundSize: '43px 47px, 61px 67px',
              }
            : undefined
        }
      />

      {/* The content is a sibling BETWEEN the two canvases. Nothing about it is
          drawn on the GPU, so it stays selectable, focusable and screen-readable
          while particles pass on both sides of it. */}
      <div className="relative z-10 h-full w-full">{children}</div>

      {/* The front canvas covers the content, so it must never take a click. */}
      <div ref={frontHost} aria-hidden className="pointer-events-none absolute inset-0 z-20" />
    </div>
  );
}
