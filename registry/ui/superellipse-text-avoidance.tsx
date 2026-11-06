'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Color, Geometry, Mesh, Program, Renderer } from 'ogl';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { useVisibility } from '@/registry/hooks/use-visibility';
import { clamp, damp } from '@/registry/lib/damp';
import { createRng, randRange, shuffle } from '@/registry/lib/prng';
import { hasWebGL, loseContext, pixelRatio } from '@/registry/lib/webgl';
import {
  SUPERELLIPSE_TEXT_AVOIDANCE_FRAG,
  SUPERELLIPSE_TEXT_AVOIDANCE_VERT,
} from '@/registry/shaders/superellipse-text-avoidance';

/* ==========================================================================
   Superellipse Text Avoidance
   --------------------------------------------------------------------------
   A particle field that flows around the headline rendered on top of it. The
   avoidance region is a 6-norm superellipse fitted to the MEASURED DOM rect of
   the text, so the hole in the field is the shape of the words and follows them
   through a reflow, a font swap or a container resize.

   Three things carry the effect.

   1. THE EXPONENT. A circle around a wide headline clears far more than the
      words occupy; an axis-aligned box creases the field along four straight
      lines at its corners. A 6-norm is square enough to match a text block and
      still differentiable everywhere.

   2. THE REMAP, NOT A CLAMP. Interior particles are not pinned onto the shell —
      that maps an area onto a curve and stacks everything into one dense line.
      Radii inside the band are compressed into it, so the interior becomes a
      rim and the field stays continuous where it meets the untouched lattice.

   3. THE RECT IS MEASURED, NEVER PASSED. A hand-tuned rect is wrong on the
      first font swap and wrong again on the first narrow viewport. The text is
      real DOM, and a ResizeObserver plus `document.fonts.ready` keeps four
      numbers in a uniform in step with it.
   ========================================================================== */

export interface SuperellipseTextAvoidanceProps {
  /** The headline. Real DOM, rendered above the field and measured for the rect. */
  children?: ReactNode;
  /** Particles per megapixel of container area. The count is derived, not fixed. */
  density?: number;
  /** Hard ceiling on the population, and the size the buffers are allocated at. */
  maxCount?: number;
  /** Particle size range in CSS pixels, biased toward the small end. */
  sizeRange?: readonly [number, number];
  /** Superellipse exponent. 2 is a circle, 6 a squircle, high values a box. */
  exponent?: number;
  /** Clear margin around the text rect, in units of the container HEIGHT. */
  margin?: number;
  /** Width of the band the interior is compressed into. The whole feel. */
  whip?: number;
  /** Pointer avoidance radius, in units of the container height. 0 disables it. */
  pointerRadius?: number;
  /** Whip band for the pointer disc. */
  pointerWhip?: number;
  /** Fraction of the pointer gap still remaining after one second. */
  smoothing?: number;
  /** Overall alpha multiplier. */
  opacity?: number;
  /** First tint. Any value ogl's Color accepts. */
  colorA?: string;
  /** Second tint; each particle mixes between the two. */
  colorB?: string;
  /** Tint for displaced particles, which is what makes the shape legible. */
  glowColor?: string;
  /** Opaque clear colour the additive field is composited onto. */
  background?: string;
  /** Seed for the scatter. Same seed, same field on every reload. */
  seed?: number | string;
  className?: string;
  /** Merged onto the text layer. */
  textClassName?: string;
}

interface Uniforms {
  /** ogl types `uniforms` as an open record; the index signature keeps it assignable. */
  [name: string]: { value: unknown };
  uResolution: { value: [number, number] };
  uPixelRatio: { value: number };
  uElapsed: { value: number };
  /** Measured text box in uv space: cx, cy, halfX, halfY — already padded. */
  uRect: { value: [number, number, number, number] };
  uRectPresence: { value: number };
  uExponent: { value: number };
  uWhip: { value: number };
  uPointer: { value: [number, number] };
  uPointerPresence: { value: number };
  uPointerRadius: { value: number };
  uPointerWhip: { value: number };
  uColorA: { value: Color };
  uColorB: { value: Color };
  uGlowColor: { value: Color };
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

// #region critical
/** Floor on the population. Below this the field reads as a few stray specks. */
const MIN_COUNT = 260;
/**
 * Width of the band interior particles are compressed into, in normalised
 * superellipse units. The catalogue's WHIP_DISC. Small values throw particles
 * out hard and stack them on the outline; large ones bend the field around from
 * a distance and the text stops looking like the cause.
 */
const WHIP_DISC = 0.3;
/** Fraction of the presence gap left after a second. ~200ms in and out. */
const PRESENCE_SMOOTHING = 0.007;
/** Size distribution exponent. Above 1 crowds the population into small sizes. */
const SIZE_BIAS = 1.7;
/** Fill scales with dpr squared, and these are soft dots with no fine detail. */
const MAX_DPR = 1.5;
/** Lattice bounds. Wider than 0..1 so drift never bares the edges. */
const HOME_MIN = -0.05;
const HOME_MAX = 1.05;
/** Jitter as a fraction of a lattice cell. Past ~0.5 cells overlap and clump. */
const CELL_JITTER = 0.42;
/** The reduced-motion still: one frame with the pointer parked off to one side. */
const STILL_ELAPSED = 4.2;
const STILL_POINTER: readonly [number, number] = [0.3, 0.34];

export function SuperellipseTextAvoidance({
  children,
  density = 900,
  maxCount = 1600,
  sizeRange = [1.4, 4.4],
  exponent = 6,
  margin = 0.06,
  whip = WHIP_DISC,
  pointerRadius = 0.16,
  pointerWhip = 0.45,
  smoothing = 0.0008,
  opacity = 0.92,
  colorA = '#9ec6ff',
  colorB = '#eef2fb',
  glowColor = '#ffd9a0',
  background = '#07080d',
  seed = 'superellipse-text-avoidance',
  className,
  textClassName,
}: SuperellipseTextAvoidanceProps) {
  const host = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const { width, height } = useResizeObserver(host);
  const textSize = useResizeObserver(text);
  const size = useRef({ width, height });
  size.current = { width, height };

  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const visible = useVisibility();
  const { inView } = useInView(host, { rootMargin: '10%' });
  const ready = width > 1 && height > 1;

  const [minSize = 1.4, maxSize = 4.4] = sizeRange;

  /* Raw pointer target in field space, or null until a real move — which is not
     the same as a pointer resting at the bottom-left corner. */
  const target = useRef<{ x: number; y: number } | null>(null);
  const inside = useRef(false);
  const follow = useRef({ x: 0.5, y: 0.5 });
  const presence = useRef(0);

  /* Live numbers the loop reads. Changing one must not rebuild the renderer:
     Chromium drops the OLDEST WebGL context past roughly 16 per process, so a
     rebuild per prop change can blank an unrelated canvas on the same page. */
  const live = useRef({ exponent, margin, whip, pointerRadius, pointerWhip, smoothing, opacity });
  live.current = { exponent, margin, whip, pointerRadius, pointerWhip, smoothing, opacity };

  /**
   * Reads the text box out of the DOM and writes it into `uRect` as uv centre
   * plus padded half-extents. No React state: a measurement that re-renders is
   * a measurement that can re-measure itself in a loop.
   */
  const measure = () => {
    const s = stage.current;
    const hostEl = host.current;
    const textEl = text.current;
    if (!s || !hostEl || !textEl) return;

    const hostBox = hostEl.getBoundingClientRect();
    if (hostBox.width < 1 || hostBox.height < 1) return;
    const textBox = textEl.getBoundingClientRect();

    if (textBox.width < 1 || textBox.height < 1) {
      // No children, or the text has not laid out yet. Presence 0 rather than a
      // zero-size rect, which would be a singularity at the centre of the field.
      s.uniforms.uRectPresence.value = 0;
      return;
    }

    const aspect = hostBox.width / hostBox.height;
    /* The margin is specified in HEIGHT units and divided by the aspect ratio
       for x, so the clear ring is the same number of pixels on all four sides.
       Adding the same uv figure to both halves pads a wide container far more
       at the ends of the line than above and below it. */
    const padX = live.current.margin / Math.max(aspect, 0.0001);
    const padY = live.current.margin;

    s.uniforms.uRect.value[0] = (textBox.left - hostBox.left + textBox.width * 0.5) / hostBox.width;
    // Flipped: field y is up, client y is down.
    s.uniforms.uRect.value[1] =
      1 - (textBox.top - hostBox.top + textBox.height * 0.5) / hostBox.height;
    s.uniforms.uRect.value[2] = textBox.width * 0.5 / hostBox.width + padX;
    s.uniforms.uRect.value[3] = textBox.height * 0.5 / hostBox.height + padY;
    s.uniforms.uRectPresence.value = 1;

    // The live loop picks this up next frame; a paused one has to be told.
    if (reducedRef.current) s.draw(STILL_ELAPSED);
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
       cleanup force-loses the context, and `getContext` on that element
       afterwards hands back the dead one rather than a fresh context — the
       panel is then permanently blank in development and fine in production. */
    const renderer = new Renderer({
      dpr: pixelRatio(MAX_DPR),
      // Opaque: the pass is additive, and additive onto a transparent canvas
      // would have to brighten the page behind it, which the GPU cannot see.
      alpha: false,
      // Nothing occludes anything, so a depth buffer is memory plus a clear.
      depth: false,
      antialias: false,
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

    /* A STRATIFIED scatter, not `rng()` twice. Uniform random has clumps and
       voids at this population, and once the avoidance opens a real hole those
       accidental voids read as more holes — the shape of the field stops being
       legible. A jittered lattice is even everywhere and still looks organic.
       Cells are then SHUFFLED, because the instanced count is a prefix of these
       buffers: in lattice order a smaller count would draw the top rows only. */
    const aspect = Math.max(size.current.width, 1) / Math.max(size.current.height, 1);
    const cols = Math.max(2, Math.round(Math.sqrt(total * aspect)));
    const rows = Math.max(2, Math.ceil(total / cols));
    const cells: Array<[number, number]> = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        cells.push([(c + 0.5) / cols, (r + 0.5) / rows]);
      }
    }
    shuffle(rng, cells);

    const spanX = HOME_MAX - HOME_MIN;
    const spanY = HOME_MAX - HOME_MIN;

    for (let i = 0; i < total; i += 1) {
      const cell = cells[i % cells.length] ?? [0.5, 0.5];
      const [cellX = 0.5, cellY = 0.5] = cell;
      homes[i * 2] = HOME_MIN + (cellX + randRange(rng, -CELL_JITTER, CELL_JITTER) / cols) * spanX;
      homes[i * 2 + 1] =
        HOME_MIN + (cellY + randRange(rng, -CELL_JITTER, CELL_JITTER) / rows) * spanY;

      // Biased small: a linear distribution puts a quarter of the population in
      // the largest quarter of the range and the field reads as gravel.
      const sizeT = Math.pow(rng(), SIZE_BIAS);
      params[i * 4] = Math.max(0.5, minSize) + Math.max(maxSize - minSize, 0.25) * sizeT;
      // Drift radius and rate. Small, because this field is a texture the text
      // sits in — a fast one competes with the headline for attention.
      params[i * 4 + 1] = randRange(rng, 0.002, 0.014);
      params[i * 4 + 2] = (rng() < 0.5 ? -1 : 1) * randRange(rng, 0.08, 0.32);
      // Bigger particles are dimmer, so total light stays roughly constant.
      params[i * 4 + 3] = 0.32 + 0.5 * (1 - sizeT);

      seeds[i * 4] = rng() * Math.PI * 2;
      seeds[i * 4 + 1] = randRange(rng, 0.3, 1);
      seeds[i * 4 + 2] = rng();
      seeds[i * 4 + 3] = 0;
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
      uRect: { value: [0.5, 0.5, 0.001, 0.001] },
      uRectPresence: { value: 0 },
      uExponent: { value: clamp(exponent, 2, 16) },
      uWhip: { value: Math.max(whip, 0.02) },
      uPointer: { value: [0.5, 0.5] },
      uPointerPresence: { value: 0 },
      uPointerRadius: { value: Math.max(pointerRadius, 0) },
      uPointerWhip: { value: Math.max(pointerWhip, 0.02) },
      uColorA: { value: new Color(colorA) },
      uColorB: { value: new Color(colorB) },
      uGlowColor: { value: new Color(glowColor) },
      uOpacity: { value: opacity },
    };

    const program = new Program(gl, {
      vertex: SUPERELLIPSE_TEXT_AVOIDANCE_VERT,
      fragment: SUPERELLIPSE_TEXT_AVOIDANCE_FRAG,
      uniforms,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      // ogl culls BACK faces by default and the quad's winding is not
      // guaranteed to face the way the driver expects. A culled particle is not
      // dim — it is absent.
      cullFace: false,
    });
    // Additive, overriding the source-over that `transparent: true` selected.
    // Order independent, so a thousand overlapping instances need no sort.
    program.setBlendFunc(gl.ONE, gl.ONE);

    const mesh = new Mesh(gl, { geometry, program });

    el.insertBefore(canvas, el.firstChild);
    canvas.style.display = 'block';

    /* Listeners on the CANVAS, not the window. A document-level handler
       outlives the renderer it was written for, and the rect it measures is not
       the rect being drawn into — after a scroll the hole sits at an offset
       from the cursor. Passive, because nothing here calls preventDefault and a
       non-passive move handler makes the compositor wait for JS on every event. */
    const onMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      target.current = {
        x: (event.clientX - rect.left) / rect.width,
        y: 1 - (event.clientY - rect.top) / rect.height,
      };
      inside.current = true;
    };
    const onLeave = () => {
      // Position is left where it is. Tweening it back to the centre drags a
      // visible furrow across the field on the way out.
      inside.current = false;
    };

    canvas.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerleave', onLeave, { passive: true });
    canvas.addEventListener('pointercancel', onLeave, { passive: true });

    const resize = (w: number, h: number) => {
      renderer.setSize(w, h);
      // `setSize` writes literal px into the canvas's inline style, which wins
      // over any class. Re-asserting percentages keeps it fluid between resize
      // notifications.
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
      uniforms.uPixelRatio.value = renderer.dpr;

      // Population from area, not a fixed number: the same density reads right
      // in a 320px card and a 2000px hero. The buffers already hold `total`
      // particles in shuffled order, so a prefix of them is still spatially
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
    measure();
    draw(0);

    /* A webfont swap changes the text box after the first measurement, and
       nothing about a font swap resizes the element's border box on every
       engine — so the ResizeObserver alone is not enough. */
    let cancelled = false;
    if (typeof document !== 'undefined' && 'fonts' in document) {
      void document.fonts.ready.then(() => {
        if (!cancelled) measure();
      });
    }

    // Nothing repaints a lost context of its own accord: unhandled, the panel
    // sits blank behind the text indefinitely with no fallback, so the loss is
    // folded into the unsupported path. `preventDefault` keeps a restore legal.
    const onLost = (event: Event): void => {
      event.preventDefault();
      setUnsupported(true);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      cancelled = true;
      stage.current = null;
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointercancel', onLeave);
      // ogl has no `dispose()`: `remove()` on the geometry deletes its VAOs and
      // every buffer, `remove()` on the program deletes the shaders and the
      // program, and only then is the context worth handing back. Dropping the
      // context is the part that matters — the per-process budget is about
      // sixteen, and exceeding it kills someone else's oldest context.
      geometry.remove();
      program.remove();
      loseContext(gl);
      canvas.width = 0;
      canvas.height = 0;
      canvas.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, density, maxCount, minSize, maxSize, seed]);

  // Colours go into the live uniforms rather than being effect deps, so
  // recolouring never costs a context.
  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    s.uniforms.uColorA.value.set(colorA);
    s.uniforms.uColorB.value.set(colorB);
    s.uniforms.uGlowColor.value.set(glowColor);
    const bg = new Color(background);
    s.renderer.gl.clearColor(bg.r, bg.g, bg.b, 1);
  }, [colorA, colorB, glowColor, background]);

  // Resize is its own effect: a reflow costs a `setSize`, an instanced-count
  // change and a re-measure, never a buffer rebuild.
  useEffect(() => {
    stage.current?.resize(width, height);
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  // The text box changes on its own too — wrapping to a new line, a font swap,
  // or different children entirely.
  useEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textSize.width, textSize.height, margin, children]);

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

      const u = s.uniforms;
      // Mutated in place. Assigning a fresh tuple allocates an array a frame and
      // defeats ogl's redundant-uniform cache, which compares by length first
      // and then element by element against the array it kept.
      u.uPointer.value[0] = follow.current.x;
      u.uPointer.value[1] = follow.current.y;
      u.uPointerPresence.value = presence.current;
      u.uPointerRadius.value = Math.max(cfg.pointerRadius, 0);
      u.uPointerWhip.value = Math.max(cfg.pointerWhip, 0.02);
      u.uExponent.value = clamp(cfg.exponent, 2, 16);
      u.uWhip.value = Math.max(cfg.whip, 0.02);
      u.uOpacity.value = cfg.opacity;

      s.draw(elapsed);
    },
    ready && inView && visible && !reduced && !unsupported,
  );

  /* Reduced motion is a composed still, not an empty box: one frame with the
     text rect fully avoided and the pointer parked off to one side, so the
     shape of the field is exactly what a moving version would show. The
     listeners stay attached and their target is never consumed. */
  useEffect(() => {
    const s = stage.current;
    if (!s || !reduced || !ready) return;
    const [px = 0.3, py = 0.34] = STILL_POINTER;
    s.uniforms.uPointer.value[0] = px;
    s.uniforms.uPointer.value[1] = py;
    s.uniforms.uPointerPresence.value = 1;
    s.draw(STILL_ELAPSED);
  }, [reduced, ready, width, height]);
  // #endregion critical

  return (
    <div ref={host} className={cn('relative h-full w-full overflow-hidden bg-bg', className)}>
      {unsupported ? (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 50%, var(--k-line-strong) 1px, transparent 0)',
            backgroundSize: '30px 30px',
          }}
        />
      ) : null}

      {/* Pointer-transparent, so the pointer listeners on the canvas underneath
          still see moves across the headline. Anything interactive belongs
          outside this layer. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
        <div ref={text} className={cn('max-w-[22ch] text-center', textClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
}
