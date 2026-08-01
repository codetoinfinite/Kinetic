'use client';

import gsap from 'gsap';
import { useEffect, useRef, type ReactNode } from 'react';
import { createRng, randRange } from '@/registry/lib/prng';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Pooled Cursor Image Trail
   --------------------------------------------------------------------------
   Two ideas, and the component is worthless without either of them.

   1. THE POOL. A fixed ring of N nodes, created once, reused by index. The
      obvious implementation calls `document.createElement` per spawn and
      removes the node when its tween ends; a fast sweep across a hero then
      allocates a hundred elements, each of which forces a style recalc, a
      layer promotion and a paint at the exact moment the browser is busiest.
      A ring of 22 allocates nothing after mount.

   2. THE DISTANCE GATE. A tile spawns only when the pointer has travelled
      more than `threshold` px since the last spawn. Spawn on every move and a
      flick produces a solid smear; without the gate a slow drift produces
      nothing at all, because "every move" and "enough movement" are not the
      same predicate. This number is the design — it matters more than any
      tween value in the file.

   The tiles are drawn, not loaded. The registry ships no image assets, so a
   handful of gradient plates with an index numeral are painted into offscreen
   canvases at mount and blitted into a pool slot on spawn.
   ========================================================================== */

export interface PooledImageTrailProps {
  children?: ReactNode;
  /** Pixels the pointer must travel before another tile is allowed. */
  threshold?: number;
  /** Ring size. Must outlast one tile lifetime at the fastest spawn rate. */
  poolSize?: number;
  /** How many distinct plates are painted. Keep coprime with `poolSize`. */
  plateCount?: number;
  tileWidth?: number;
  tileHeight?: number;
  /** Seeds the plate choice, so the sequence is identical on every load. */
  seed?: string;
  className?: string;
}

/** Fixed, not `devicePixelRatio`: the plates must be byte-identical per load. */
const PLATE_SCALE = 2;

/**
 * A stand-in for a photograph. Canvas drawing code is the one place a raw
 * colour literal is allowed — there is no cascade to read a token from.
 */
function paintPlate(ctx: CanvasRenderingContext2D, w: number, h: number, index: number): void {
  // Golden-angle hue stepping: consecutive plates are maximally far apart on
  // the wheel, so two tiles alive at once never read as the same picture.
  const hue = (index * 137.508) % 360;

  const base = ctx.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, `hsl(${hue} 44% 20%)`);
  base.addColorStop(0.55, `hsl(${(hue + 26) % 360} 40% 36%)`);
  base.addColorStop(1, `hsl(${(hue + 64) % 360} 32% 13%)`);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  const sheen = ctx.createRadialGradient(w * 0.3, h * 0.22, 0, w * 0.3, h * 0.22, w * 0.85);
  sheen.addColorStop(0, 'rgba(255,255,255,0.24)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.font = `500 ${Math.round(h * 0.15)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(index + 1).padStart(2, '0'), 14, h - 14);
}

// #region critical
const IN_DURATION = 0.22;
const HOLD = 0.1;
const OUT_DURATION = 0.2;
const START_SCALE = 0.92;
const TILT = 7;

export function PooledImageTrail({
  children,
  threshold = 130,
  poolSize = 22,
  plateCount = 17,
  tileWidth = 236,
  tileHeight = 160,
  seed = 'pooled-image-trail',
  className,
}: PooledImageTrailProps) {
  const root = useRef<HTMLDivElement>(null);
  const slots = useRef<Array<HTMLCanvasElement | null>>([]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const nodes: HTMLCanvasElement[] = [];
    for (let i = 0; i < poolSize; i++) {
      const node = slots.current[i];
      if (node) nodes.push(node);
    }
    if (nodes.length === 0) return;

    const bw = tileWidth * PLATE_SCALE;
    const bh = tileHeight * PLATE_SCALE;

    // Paint every plate once, offscreen. A spawn is then a single blit; if the
    // plate were drawn at spawn time the gradient + text work would land on
    // the same frame as the tween start, which is the one frame that must not
    // drop.
    const plates: HTMLCanvasElement[] = [];
    for (let i = 0; i < plateCount; i++) {
      const plate = document.createElement('canvas');
      plate.width = bw;
      plate.height = bh;
      const pctx = plate.getContext('2d');
      if (!pctx) break;
      pctx.scale(PLATE_SCALE, PLATE_SCALE);
      paintPlate(pctx, tileWidth, tileHeight, i);
      plates.push(plate);
    }
    if (plates.length === 0) return;

    const contexts = nodes.map((node) => {
      node.width = bw;
      node.height = bh;
      return node.getContext('2d');
    });

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;

    gsap.set(nodes, { xPercent: 0, yPercent: 0, opacity: 0, force3D: true });

    if (reduced || !fine) {
      // Poster fallback: three plates fanned in the middle, drawn once. The
      // panel is composed rather than empty, and nothing ever moves.
      const shown = Math.min(3, nodes.length, plates.length);
      for (let i = 0; i < shown; i++) {
        const ctx = contexts[i];
        const plate = plates[i % plates.length];
        const node = nodes[i];
        if (!ctx || !plate || !node) continue;
        ctx.drawImage(plate, 0, 0);
        gsap.set(node, {
          x: el.clientWidth / 2 - tileWidth / 2 + (i - 1) * tileWidth * 0.42,
          y: el.clientHeight / 2 - tileHeight / 2 + (i - 1) * 14,
          rotate: (i - 1) * 4,
          opacity: 1,
          zIndex: i,
        });
      }
      return () => {
        gsap.killTweensOf(nodes);
        gsap.set(nodes, { clearProps: 'all' });
      };
    }

    const rng = createRng(seed);
    /** Monotonic. Doubles as the ring index and as the z-index. */
    let spawned = 0;
    /** Where the last tile was dropped. `null` until the first move seeds it. */
    let anchor: { x: number; y: number } | null = null;
    let lastPlate = -1;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // First move seeds the anchor and spawns nothing. Otherwise the initial
      // distance is measured from (0, 0) and entering from the right-hand side
      // of a wide panel drops a tile immediately, before any real movement.
      if (anchor === null) {
        anchor = { x, y };
        return;
      }
      if (Math.hypot(x - anchor.x, y - anchor.y) < threshold) return;
      anchor = { x, y };

      const slot = spawned % nodes.length;
      const node = nodes[slot];
      const ctx = contexts[slot];
      if (!node || !ctx) return;
      spawned++;

      // One-line no-repeat guard. It does not attempt a uniform distribution,
      // because the only thing the eye actually notices is the same picture
      // twice in a row.
      let plateIndex = Math.floor(rng() * plates.length);
      if (plateIndex === lastPlate) plateIndex = (plateIndex + 1) % plates.length;
      lastPlate = plateIndex;
      const plate = plates[plateIndex];
      if (!plate) return;

      ctx.clearRect(0, 0, bw, bh);
      ctx.drawImage(plate, 0, 0);

      // Kill before reuse. A slot recycled while still fading out would carry
      // two competing tweens on `opacity` and visibly flicker.
      gsap.killTweensOf(node);
      gsap.set(node, {
        x: x - tileWidth / 2,
        y: y - tileHeight / 2,
        rotate: randRange(rng, -TILT, TILT),
        scale: START_SCALE,
        opacity: 0,
        // Monotonic z-index: the newest tile always paints over older ones and
        // there is no stacking logic to maintain.
        zIndex: spawned,
      });

      gsap
        .timeline()
        .to(node, { opacity: 1, scale: 1, duration: IN_DURATION, ease: 'power2.out' })
        .to(node, { opacity: 0, duration: OUT_DURATION, ease: 'power2.in' }, `+=${HOLD}`);
    };

    el.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      el.removeEventListener('pointermove', onMove);
      gsap.killTweensOf(nodes);
      gsap.set(nodes, { clearProps: 'all' });
    };
  }, [threshold, poolSize, plateCount, tileWidth, tileHeight, seed]);
  // #endregion critical

  return (
    <div ref={root} className={cn('relative isolate overflow-hidden', className)}>
      <div className="pointer-events-none absolute inset-0 z-0">
        {Array.from({ length: poolSize }, (_, i) => (
          <canvas
            key={i}
            ref={(node) => {
              slots.current[i] = node;
            }}
            // `will-change` up front on all N, so a spawn never pays for layer
            // creation in the middle of its own 220ms entry tween.
            className="absolute left-0 top-0 rounded-md opacity-0 will-change-transform"
            style={{ width: tileWidth, height: tileHeight }}
          />
        ))}
      </div>
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
