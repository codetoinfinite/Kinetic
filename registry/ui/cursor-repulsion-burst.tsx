'use client';

import { useEffect, useRef, useState } from 'react';
import { Color, Geometry, Mesh, Program, Renderer } from 'ogl';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { clamp, damp } from '@/registry/lib/damp';
import { createRng, randRange } from '@/registry/lib/prng';
import { hasWebGL, loseContext, pixelRatio } from '@/registry/lib/webgl';
import {
  CURSOR_REPULSION_BURST_FRAG,
  CURSOR_REPULSION_BURST_VERT,
} from '@/registry/shaders/cursor-repulsion-burst';

/* ==========================================================================
   Cursor Repulsion Burst
   --------------------------------------------------------------------------
   A field of orbiting particles that the pointer pushes out of the way and a
   press detonates. One instanced draw call, three displacements stacked in the
   vertex shader, and all of the state that has to be smooth kept on the CPU.

   The pointer NEVER reaches a uniform directly. The listener records a target
   and the render loop damps toward it with `damp(current, target, smoothing,
   dt)`, which converges at the same rate on a 60Hz and a 120Hz display. Feeding
   raw events straight to `uCursor` puts the repulsion hole exactly where the
   last event landed: on a high-rate trackpad that is a staircase, and after a
   stall it is a jump that shoves the whole field sideways in one frame.

   Bursts live in a pool of THREE slots, round-robin. A single slot means a
   second press restarts the wave from zero, which visibly sucks the first one
   back into the origin; three slots let waves overlap, which is what a person
   clicking twice expects to see.
   ========================================================================== */

export interface CursorRepulsionBurstProps {
  /** Particles per megapixel of container area. The count is derived, not fixed. */
  density?: number;
  /** Hard ceiling on the population, and the size the buffers are allocated at. */
  maxCount?: number;
  /** Particle size range in CSS pixels, biased toward the small end. */
  sizeRange?: readonly [number, number];
  /** Repulsion radius, in field units where 1 is the container HEIGHT. */
  cursorRadius?: number;
  /** Displacement at the centre of the repulsion field, as a fraction of its radius. */
  repel?: number;
  /** Peak burst displacement in field units. */
  burstPush?: number;
  /** How far a shock front travels before it dies, in field units. */
  burstRadius?: number;
  /** Life of one burst in seconds. */
  burstDuration?: number;
  /** Fraction of the pointer gap still remaining after one second. */
  smoothing?: number;
  /** Depth of the orbit-radius breathing, 0..0.5. */
  breathe?: number;
  /** Overall alpha multiplier. */
  opacity?: number;
  /** First tint. Any value `ogl`'s `Color` accepts. */
  colorA?: string;
  /** Second tint; each particle mixes between the two. */
  colorB?: string;
  /** Colour of the shock front. Only particles the front is passing take it. */
  heatColor?: string;
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
  uCursor: { value: [number, number] };
  uCursorPresence: { value: number };
  uCursorRadius: { value: number };
  uRepel: { value: number };
  uBreathe: { value: number };
  /**
   * Three vec4 slots, flat. It MUST be a plain array: ogl walks
   * `uBursts[0]`'s name components and falls back to the whole uniform only
   * when `Array.isArray(value)` is true. A Float32Array fails that test, and
   * the uniform is then silently skipped with a console warning.
   */
  uBursts: { value: number[] };
  uBurstRadius: { value: number };
  uBurstPush: { value: number };
  uBurstBand: { value: number };
  uColorA: { value: Color };
  uColorB: { value: Color };
  uHeatColor: { value: Color };
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

interface BurstSlot {
  x: number;
  y: number;
  /** 0..1 progress. Only meaningful while `active`. */
  t: number;
  active: boolean;
}

// #region critical
/** Floor on the population. Below this the field reads as a few stray specks. */
const MIN_COUNT = 220;
/** Slots in the burst pool. Three overlapping waves is the most anyone produces. */
const BURST_SLOTS = 3;
/** Width of the Gaussian heat band, in field units. */
const BURST_BAND = 0.085;
/** Fraction of the presence gap left after a second. ~200ms in and out. */
const PRESENCE_SMOOTHING = 0.007;
/** Size distribution exponent. Above 1 crowds the population into small sizes. */
const SIZE_BIAS = 1.8;
/**
 * Fill cost scales with dpr squared and these are soft round dots with no fine
 * detail, so a third sample per axis resolves nothing a viewer can see.
 */
const MAX_DPR = 1.5;
/** Field-space bounds. Wider than 0..1 so orbits never bare the edges. */
const HOME_MIN = -0.06;
const HOME_MAX = 1.06;

/** The reduced-motion still: a frozen frame with the pointer and one wave in it. */
const STILL_ELAPSED = 6.5;
const STILL_CURSOR: readonly [number, number] = [0.34, 0.56];
const STILL_BURST: readonly [number, number, number] = [0.66, 0.42, 0.42];

export function CursorRepulsionBurst({
  density = 1100,
  maxCount = 1400,
  sizeRange = [1.6, 5.2],
  cursorRadius = 0.22,
  repel = 0.85,
  burstPush = 0.17,
  burstRadius = 0.55,
  burstDuration = 1.1,
  smoothing = 0.0008,
  breathe = 0.22,
  opacity = 0.9,
  colorA = '#8fb6ff',
  colorB = '#e6ecf7',
  heatColor = '#ff8a3c',
  background = '#06070b',
  seed = 'cursor-repulsion-burst',
  className,
}: CursorRepulsionBurstProps) {
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

  const [minSize = 1.6, maxSize = 5.2] = sizeRange;

  /* Raw pointer target in field space, or null until a real move has happened —
     which is not the same as a pointer resting at the bottom-left corner. */
  const target = useRef<{ x: number; y: number } | null>(null);
  const inside = useRef(false);
  /** The damped follower, seeded at the centre so the first move eases outward. */
  const follow = useRef({ x: 0.5, y: 0.5 });
  const presence = useRef(0);

  const slots = useRef<BurstSlot[]>(
    Array.from({ length: BURST_SLOTS }, () => ({ x: 0.5, y: 0.5, t: 0, active: false })),
  );
  const nextSlot = useRef(0);

  /* Live numbers the loop reads. Changing one must not rebuild the renderer:
     Chromium drops the OLDEST WebGL context past roughly 16 per process, so a
     rebuild per prop change can blank an unrelated canvas elsewhere on the page. */
  const live = useRef({
    cursorRadius,
    repel,
    burstPush,
    burstRadius,
    burstDuration,
    smoothing,
    breathe,
    opacity,
  });
  live.current = {
    cursorRadius,
    repel,
    burstPush,
    burstRadius,
    burstDuration,
    smoothing,
    breathe,
    opacity,
  };

  useEffect(() => {
    const el = host.current;
    if (!el || !ready) return;

    if (!hasWebGL()) {
      setUnsupported(true);
      return;
    }

    /* ogl creates its own canvas, and it is appended and removed per effect
       run. Reusing one React-owned canvas breaks under StrictMode: the first
       cleanup force-loses the context, and `getContext` on that same element
       afterwards returns the dead one rather than a fresh context — the panel
       is then permanently blank in development and fine in production. */
    const renderer = new Renderer({
      dpr: pixelRatio(MAX_DPR),
      // Opaque: the pass is additive, and additive onto a transparent canvas
      // would have to brighten the page behind it, which the GPU cannot see.
      alpha: false,
      // Nothing occludes anything, so a depth buffer is memory plus a clear.
      depth: false,
      antialias: false,
      // Fill-bound, not shader-bound. The discrete GPU buys nothing here.
      powerPreference: 'low-power',
    });

    const gl = renderer.gl;
    const canvas = gl.canvas;

    const bg = new Color(background);
    gl.clearColor(bg.r, bg.g, bg.b, 1);

    const quad = new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]);
    const index = new Uint16Array([0, 1, 2, 0, 2, 3]);

    const total = Math.max(MIN_COUNT, Math.round(maxCount));
    const homes = new Float32Array(total * 2);
    const params = new Float32Array(total * 4);
    const seeds = new Float32Array(total * 4);

    const rng = createRng(seed);
    const lo = Math.max(0.5, Math.min(minSize, maxSize));
    const hi = Math.max(lo + 0.25, Math.max(minSize, maxSize));

    for (let i = 0; i < total; i += 1) {
      homes[i * 2] = randRange(rng, HOME_MIN, HOME_MAX);
      homes[i * 2 + 1] = randRange(rng, HOME_MIN, HOME_MAX);

      // Biased small: a linear distribution puts a quarter of the population in
      // the largest quarter of the range, and the field reads as gravel.
      const sizeT = Math.pow(rng(), SIZE_BIAS);
      params[i * 4] = lo + (hi - lo) * sizeT;
      params[i * 4 + 1] = randRange(rng, 0.004, 0.03);
      // Signed rate with a floor on the magnitude: a particle orbiting at
      // 0.001 rad/s is a particle that is simply not moving.
      params[i * 4 + 2] = (rng() < 0.5 ? -1 : 1) * randRange(rng, 0.12, 0.46);
      // Bigger particles are dimmer, so total light stays roughly constant.
      params[i * 4 + 3] = 0.34 + 0.5 * (1 - sizeT);

      seeds[i * 4] = rng() * Math.PI * 2;
      // Burst magnitude. Per-particle, so the wave has a ragged front rather
      // than a clean expanding circle — a clean circle reads as a UI ripple.
      seeds[i * 4 + 1] = rng();
      seeds[i * 4 + 2] = randRange(rng, 0.35, 1);
      seeds[i * 4 + 3] = rng();
    }

    const geometry = new Geometry(gl, {
      index: { data: index },
      position: { size: 2, data: quad },
      aHome: { size: 2, data: homes, instanced: 1 },
      aParams: { size: 4, data: params, instanced: 1 },
      aSeed: { size: 4, data: seeds, instanced: 1 },
    });

    const uniforms: Uniforms = {
      uResolution: { value: [1, 1] },
      uPixelRatio: { value: renderer.dpr },
      uElapsed: { value: 0 },
      uCursor: { value: [0.5, 0.5] },
      uCursorPresence: { value: 0 },
      uCursorRadius: { value: cursorRadius },
      uRepel: { value: repel },
      uBreathe: { value: clamp(breathe, 0, 0.5) },
      uBursts: { value: new Array<number>(BURST_SLOTS * 4).fill(0) },
      uBurstRadius: { value: burstRadius },
      uBurstPush: { value: burstPush },
      uBurstBand: { value: BURST_BAND },
      uColorA: { value: new Color(colorA) },
      uColorB: { value: new Color(colorB) },
      uHeatColor: { value: new Color(heatColor) },
      uOpacity: { value: opacity },
    };

    const program = new Program(gl, {
      vertex: CURSOR_REPULSION_BURST_VERT,
      fragment: CURSOR_REPULSION_BURST_FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      // ogl culls BACK faces by default and the quad's winding is not
      // guaranteed to face the way the driver expects. A culled particle is
      // not dim — it is absent.
      cullFace: false,
    });
    // Additive, overriding the source-over that `transparent: true` selected.
    // Order independent, so a thousand overlapping instances need no sort,
    // which is what makes one draw call possible at all.
    program.setBlendFunc(gl.ONE, gl.ONE);

    const mesh = new Mesh(gl, { geometry, program });

    el.appendChild(canvas);
    canvas.style.display = 'block';

    /* Listeners on the CANVAS, not the window. A document-level handler
       outlives the renderer it was written for, and the rect it measures is not
       the rect being drawn into — after a scroll the hole sits at an offset
       from the cursor. Passive, because nothing here calls preventDefault and a
       non-passive move handler makes the compositor wait for JS on every event. */
    const toField = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return {
        x: (event.clientX - rect.left) / rect.width,
        // Flipped: field y is up, client y is down.
        y: 1 - (event.clientY - rect.top) / rect.height,
      };
    };

    const onMove = (event: PointerEvent) => {
      const point = toField(event);
      if (!point) return;
      target.current = point;
      inside.current = true;
    };

    const onDown = (event: PointerEvent) => {
      const point = toField(event);
      if (!point) return;
      // A press is also a position: on touch there is no hover, so without this
      // the wave would fire from wherever the pointer last happened to be.
      target.current = point;
      inside.current = true;

      const slot = slots.current[nextSlot.current % BURST_SLOTS];
      if (!slot) return;
      nextSlot.current = (nextSlot.current + 1) % BURST_SLOTS;
      slot.x = point.x;
      slot.y = point.y;
      slot.t = 0;
      slot.active = true;
    };

    const onLeave = () => {
      // Position is left where it is. Tweening it back to the centre drags a
      // visible furrow across the field on the way out.
      inside.current = false;
    };

    canvas.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerdown', onDown, { passive: true });
    canvas.addEventListener('pointerleave', onLeave, { passive: true });
    canvas.addEventListener('pointercancel', onLeave, { passive: true });

    const resize = (w: number, h: number) => {
      renderer.setSize(w, h);
      // `setSize` writes literal px into the canvas's inline style, which wins
      // over any class. Re-asserting percentages keeps it fluid between
      // resize notifications.
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
      uniforms.uPixelRatio.value = renderer.dpr;

      // Population from area, not a fixed number: the same density reads right
      // in a 320px card and a 2000px hero. The buffers already hold `total`
      // particles in scattered order, so a prefix of them is still spatially
      // even — no rebuild, no reallocation, no new GPU memory.
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
    draw(0);

    // A context we are never told about losing leaves a permanently blank panel
    // and no fallback beneath it, so treat the loss as a machine that never had
    // WebGL. `preventDefault` is what buys the chance of a restore at all.
    const onLost = (event: Event): void => {
      event.preventDefault();
      setUnsupported(true);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      stage.current = null;
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointercancel', onLeave);
      // ogl has no `dispose()`: `remove()` on the geometry deletes its VAOs and
      // every buffer, `remove()` on the program deletes the shaders and the
      // program, and only then is the context worth handing back. Dropping the
      // context is the part that matters — the browser's per-process budget is
      // about sixteen, and a lost one takes an unrelated canvas with it.
      geometry.remove();
      program.remove();
      loseContext(gl);
      canvas.width = 0;
      canvas.height = 0;
      canvas.remove();
    };
  }, [ready, density, maxCount, minSize, maxSize, seed]);

  // Colours are pushed into the live uniforms rather than being effect deps, so
  // recolouring never costs a context.
  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    s.uniforms.uColorA.value.set(colorA);
    s.uniforms.uColorB.value.set(colorB);
    s.uniforms.uHeatColor.value.set(heatColor);
    const bg = new Color(background);
    s.renderer.gl.clearColor(bg.r, bg.g, bg.b, 1);
  }, [colorA, colorB, heatColor, background]);

  // Resize is its own effect: a reflow costs a `setSize` and an instanced-count
  // change, never a buffer rebuild.
  useEffect(() => {
    stage.current?.resize(width, height);
  }, [width, height]);

  useRaf(
    (dt, elapsed) => {
      const s = stage.current;
      if (!s) return;
      const cfg = live.current;

      const aim = target.current;
      if (aim) {
        follow.current.x = damp(follow.current.x, aim.x, cfg.smoothing, dt);
        follow.current.y = damp(follow.current.y, aim.y, cfg.smoothing, dt);
      }
      presence.current = damp(
        presence.current,
        inside.current && aim !== null ? 1 : 0,
        PRESENCE_SMOOTHING,
        dt,
      );

      // Bursts advance on wall-clock seconds, not on frames, so a wave lasts
      // `burstDuration` on a 30Hz phone and on a 144Hz monitor alike.
      const flat = s.uniforms.uBursts.value;
      const life = Math.max(cfg.burstDuration, 0.05);
      let i = 0;
      for (const slot of slots.current) {
        if (slot.active) {
          slot.t += dt / life;
          if (slot.t >= 1) {
            slot.t = 1;
            slot.active = false;
          }
        }
        flat[i * 4] = slot.x;
        flat[i * 4 + 1] = slot.y;
        flat[i * 4 + 2] = slot.t;
        flat[i * 4 + 3] = slot.active ? 1 : 0;
        i += 1;
      }

      const u = s.uniforms;
      // Mutated in place. Assigning a fresh tuple allocates two arrays a frame
      // and defeats ogl's redundant-uniform cache, which compares by length
      // first and then element by element against the array it kept.
      u.uCursor.value[0] = follow.current.x;
      u.uCursor.value[1] = follow.current.y;
      u.uCursorPresence.value = presence.current;
      u.uCursorRadius.value = cfg.cursorRadius;
      u.uRepel.value = cfg.repel;
      u.uBurstPush.value = cfg.burstPush;
      u.uBurstRadius.value = cfg.burstRadius;
      u.uBreathe.value = clamp(cfg.breathe, 0, 0.5);
      u.uOpacity.value = cfg.opacity;

      s.draw(elapsed);
    },
    ready && inView && visible && !reduced && !unsupported,
  );

  /* Reduced motion is a composed still, not an empty box: one frame with the
     pointer parked off-centre and a single wave frozen part-way out, so the
     panel shows what the effect produces. The listeners stay attached and their
     target is never consumed, so moving or clicking changes nothing. */
  useEffect(() => {
    const s = stage.current;
    if (!s || !reduced || !ready) return;
    const [cx = 0.34, cy = 0.56] = STILL_CURSOR;
    const [bx = 0.66, by = 0.42, bt = 0.42] = STILL_BURST;
    s.uniforms.uCursor.value[0] = cx;
    s.uniforms.uCursor.value[1] = cy;
    s.uniforms.uCursorPresence.value = 1;
    const flat = s.uniforms.uBursts.value;
    flat.fill(0);
    flat[0] = bx;
    flat[1] = by;
    flat[2] = bt;
    flat[3] = 1;
    s.draw(STILL_ELAPSED);
  }, [reduced, ready, width, height]);
  // #endregion critical

  return (
    <div ref={host} className={cn('relative h-full w-full overflow-hidden bg-bg', className)}>
      {unsupported ? (
        <div
          aria-hidden
          className="h-full w-full bg-bg"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, var(--k-line-strong) 1px, transparent 0), radial-gradient(circle at 50% 50%, var(--k-line) 1px, transparent 0)',
            backgroundSize: '34px 34px, 61px 57px',
            backgroundPosition: '0 0, 17px 21px',
          }}
        />
      ) : null}
    </div>
  );
}
