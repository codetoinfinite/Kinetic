'use client';

import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import { createRng } from '@/registry/lib/prng';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Hover List Image Trail
   --------------------------------------------------------------------------
   A list where hovering a row stacks a plate into a column beside it, and the
   column follows the pointer vertically. Two things are worth stealing here.

   1. The masked-reveal pair. Every spawn is TWO elements animated in opposite
      directions on the same tween: a wrapper slides up from +100%, and the
      canvas inside it slides down from -100%. The wrapper clips, so the two
      cancel out to a plate that is uncovered in place rather than one that
      flies in. It is the difference between a card arriving and a card being
      developed.

   2. The cull, not a pool. This deliberately allocates a node per hover — the
      opposite of `pooled-image-trail`, which reuses a fixed ring. That is
      affordable ONLY because hover entry is bounded by how fast a human can
      cross rows, roughly ten a second at worst, where a pointermove trail is
      bounded by the display refresh rate. The 20-child cull is what turns
      "unbounded over a session" into "bounded at all times": every spawn drops
      the oldest node if the stack is full, so the DOM has a hard ceiling
      whatever the user does.

   Read the two components together. The choice between pooling and culling is
   about the event's arrival rate, not about taste.
   ========================================================================== */

export interface TrailRow {
  id: string;
  label: string;
  meta?: string;
}

export interface HoverListImageTrailProps {
  rows: TrailRow[];
  /** Plate size in CSS px. */
  tileWidth?: number;
  tileHeight?: number;
  /** Seconds of catch-up on the vertical follow. */
  followDuration?: number;
  /** Deterministic plate colours. */
  seed?: string;
  className?: string;
}

// #region critical
const PLATE_SCALE = 2;
/** Hard ceiling on live plates. Every spawn past this drops the oldest. */
const MAX_PLATES = 20;
const REVEAL_DURATION = 0.6;

/**
 * Plates are painted once into offscreen canvases and blitted on spawn. No
 * image assets, and — more importantly — no gradient, text or shadow work on
 * the frame where a tween starts, which is exactly the frame that cannot
 * afford it.
 */
function paintPlate(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  index: number,
  seed: string,
) {
  // Seeded, never `Math.random()`: the plate colours must be identical on the
  // server and the client, and identical across reloads so a visual diff of
  // this component means something.
  const rng = createRng(`${seed}-${index}`);
  // Golden-angle hue walk: consecutive plates are always far apart in hue, so
  // a fast scan down the list never stacks two similar colours.
  const hue = (index * 137.508 + rng() * 18) % 360;

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, `hsl(${hue} 46% 26%)`);
  bg.addColorStop(1, `hsl(${(hue + 44) % 360} 52% 13%)`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // A soft off-centre sheen so the plate has a light direction rather than
  // reading as a flat swatch.
  const sheen = ctx.createRadialGradient(w * 0.3, h * 0.22, 0, w * 0.3, h * 0.22, h * 1.15);
  sheen.addColorStop(0, 'rgba(255,255,255,0.22)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = `500 ${Math.round(h * 0.19)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(index + 1).padStart(2, '0'), w * 0.07, h * 0.88);
}

export function HoverListImageTrail({
  rows,
  tileWidth = 168,
  tileHeight = 116,
  followDuration = 0.5,
  seed = 'hover-list-image-trail',
  className,
}: HoverListImageTrailProps) {
  const root = useRef<HTMLDivElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const plates = useRef<HTMLCanvasElement[]>([]);

  // Paint one plate per row, once. Re-running only when the geometry or the
  // row count actually changes — not on every render.
  useEffect(() => {
    const bw = tileWidth * PLATE_SCALE;
    const bh = tileHeight * PLATE_SCALE;
    const made: HTMLCanvasElement[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = bw;
      canvas.height = bh;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.scale(PLATE_SCALE, PLATE_SCALE);
      paintPlate(ctx, tileWidth, tileHeight, i, seed);
      made.push(canvas);
    }

    plates.current = made;
    return () => {
      // Plain canvases: nothing was allocated through `createObjectURL`, so
      // there is nothing to revoke. Dropping the references is the disposal.
      plates.current = [];
    };
  }, [rows.length, tileWidth, tileHeight, seed]);

  useEffect(() => {
    const el = root.current;
    const stack = column.current;
    if (!el || !stack) return;

    // A trail that follows a cursor has no meaning without a cursor. On touch
    // `pointerenter` fires on tap, so every tap would stack a plate under the
    // finger and leave it there.
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    /* Centring the column on the pointer once, so the follow tween writes a
       raw `y` and never has to subtract half a height it does not know. */
    gsap.set(stack, { yPercent: -50 });
    const yTo = gsap.quickTo(stack, 'y', { duration: followDuration, ease: 'power4' });

    let seeded = false;
    let order = 0;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const y = e.clientY - rect.top;
      if (seeded) {
        yTo(y);
      } else {
        seeded = true;
        // Second argument is quickTo's START value, so the column teleports on
        // entry instead of sweeping down the list from wherever it was left.
        yTo(y, y);
      }
    };

    const onLeave = () => {
      seeded = false;
    };

    const spawn = (index: number) => {
      const plate = plates.current[index];
      if (!plate) return;

      /* The wrapper is the mask. `overflow: hidden` plus a fixed size is what
         makes the opposite-direction pair read as a reveal instead of two
         elements sliding past each other. */
      const wrap = document.createElement('div');
      wrap.style.position = 'absolute';
      wrap.style.left = '0';
      wrap.style.top = '0';
      wrap.style.width = `${tileWidth}px`;
      wrap.style.height = `${tileHeight}px`;
      wrap.style.overflow = 'hidden';
      wrap.style.borderRadius = '4px';
      wrap.style.willChange = 'transform';
      // Monotonic, never reset: a later plate is always above an earlier one,
      // with no possibility of two plates tying and flickering.
      order += 1;
      wrap.style.zIndex = String(order);

      const canvas = document.createElement('canvas');
      canvas.width = plate.width;
      canvas.height = plate.height;
      canvas.style.width = `${tileWidth}px`;
      canvas.style.height = `${tileHeight}px`;
      canvas.style.display = 'block';
      canvas.style.willChange = 'transform';
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      // One blit. All the expensive drawing happened at mount.
      ctx.drawImage(plate, 0, 0);

      wrap.appendChild(canvas);
      stack.appendChild(wrap);

      /* The masked-reveal pair: wrapper up from +100%, canvas down from -100%,
         on the same duration and ease so they cancel exactly. Any mismatch in
         either and the plate visibly slides inside its own frame. */
      gsap.fromTo(
        wrap,
        { yPercent: 100 },
        { yPercent: 0, duration: REVEAL_DURATION, ease: 'expo.inOut', overwrite: 'auto' },
      );
      gsap.fromTo(
        canvas,
        { yPercent: -100 },
        { yPercent: 0, duration: REVEAL_DURATION, ease: 'expo.inOut', overwrite: 'auto' },
      );

      /* The cull. Not a nicety — without it the stack grows for as long as the
         page is open, and a user idly running the pointer up and down the list
         builds thousands of composited layers. Killing tweens before removal
         stops GSAP writing to a node React and the DOM have both let go of. */
      while (stack.children.length > MAX_PLATES) {
        const oldest = stack.firstElementChild;
        if (!oldest) break;
        gsap.killTweensOf(oldest);
        gsap.killTweensOf(oldest.firstElementChild);
        oldest.remove();
      }
    };

    const onOver = (e: Event) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const row = target.closest('[data-trail-row]');
      if (!row) return;
      /* `pointerover` bubbles and fires again for every descendant crossed
         inside the same row, so the spawn is gated on actually changing rows
         rather than on the event firing. `relatedTarget` still inside the row
         means the pointer never left it. */
      const from = (e as PointerEvent).relatedTarget;
      if (from instanceof Node && row.contains(from)) return;
      const index = Number(row.getAttribute('data-trail-row'));
      if (!Number.isInteger(index)) return;
      spawn(index);
    };

    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointerover', onOver);

    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointerover', onOver);
      gsap.killTweensOf(stack);
      // Every live plate is a node this effect created and React does not know
      // about, so this effect has to remove them itself.
      while (stack.firstElementChild) {
        const child = stack.firstElementChild;
        gsap.killTweensOf(child);
        gsap.killTweensOf(child.firstElementChild);
        child.remove();
      }
      gsap.set(stack, { clearProps: 'all' });
    };
  }, [followDuration, tileWidth, tileHeight]);
  // #endregion critical

  return (
    <div ref={root} className={cn('relative isolate h-full w-full overflow-hidden bg-bg', className)}>
      <ul className="relative z-10 flex h-full flex-col justify-center gap-px px-6 sm:px-8">
        {rows.map((row, i) => (
          <li key={row.id} data-trail-row={i}>
            <a
              href="#"
              className="flex items-baseline gap-4 border-b border-line py-3 text-fg transition-colors hover:text-accent"
            >
              <span className="font-mono text-[11px] text-faint">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="flex-1 text-lg tracking-tight">{row.label}</span>
              {row.meta ? (
                <span className="font-mono text-[11px] text-faint">{row.meta}</span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>

      {/* The column. `pointer-events-none` so plates never intercept the moves
          that are driving them, and no `overflow` of its own — the wrappers do
          the clipping, one per plate. */}
      <div
        ref={column}
        aria-hidden
        className="pointer-events-none absolute left-[62%] top-0 z-20"
        style={{ width: tileWidth, height: tileHeight }}
      />
    </div>
  );
}
