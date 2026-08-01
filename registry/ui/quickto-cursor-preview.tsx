'use client';

import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { cn } from '@/lib/cn';

/* ==========================================================================
   quickTo Cursor Preview
   --------------------------------------------------------------------------
   A hover list with a preview panel that drifts after the pointer.

   `gsap.quickTo` is the whole reason this is cheap. It builds ONE tween per
   property and mutates its end value on each call, so a `pointermove` handler
   firing 60-120 times a second allocates nothing after the first frame. The
   naive `gsap.to()` version allocates and garbage-collects a tween object per
   event, and each new tween fights the last for the same property.

   `duration: 1` is a very long follow for a cursor element — a full second of
   catch-up — and that is the design. The panel reads as a heavy object being
   dragged through the page rather than as a tooltip pinned to the pointer.
   ========================================================================== */

export interface PreviewItem {
  id: string;
  title: string;
  /** Right-aligned metadata: discipline, year, client. */
  meta?: string;
}

export interface QuickToCursorPreviewProps {
  items: PreviewItem[];
  /** Seconds of catch-up. 1 is the point; 0.2 turns it into a tooltip. */
  duration?: number;
  panelWidth?: number;
  panelHeight?: number;
  className?: string;
}

/** Canvas drawing code is the one place a raw colour literal belongs. */
function paintPlate(ctx: CanvasRenderingContext2D, w: number, h: number, index: number): void {
  const hue = (index * 137.508 + 24) % 360;

  const base = ctx.createLinearGradient(0, h, w, 0);
  base.addColorStop(0, `hsl(${hue} 42% 15%)`);
  base.addColorStop(0.6, `hsl(${(hue + 24) % 360} 38% 34%)`);
  base.addColorStop(1, `hsl(${(hue + 58) % 360} 46% 52%)`);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // A few horizon bands so the plate reads as a picture rather than a swatch.
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let i = 0; i < 4; i++) {
    const y = h * (0.42 + i * 0.11);
    ctx.fillRect(0, y, w, h * 0.035);
  }

  const sheen = ctx.createRadialGradient(w * 0.72, h * 0.2, 0, w * 0.72, h * 0.2, w * 0.9);
  sheen.addColorStop(0, 'rgba(255,255,255,0.26)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `500 ${Math.round(h * 0.13)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(index + 1).padStart(2, '0'), 14, h - 14);
}

// #region critical
const PLATE_SCALE = 2;
const FADE_DURATION = 0.35;
const DOCK_INSET = 20;

/**
 * True when the panel must NOT follow: no fine pointer (a `pointermove` on
 * touch only exists during a drag, so the panel would live under the finger
 * that is dragging it), or reduced motion (a full second of drift is precisely
 * what that user opted out of). One predicate, so the two effects below can
 * never disagree about which mode the component is in.
 */
function docked(): boolean {
  return (
    !window.matchMedia('(pointer: fine)').matches ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function QuickToCursorPreview({
  items,
  duration = 1,
  panelWidth = 260,
  panelHeight = 180,
  className,
}: QuickToCursorPreviewProps) {
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLCanvasElement>(null);
  const plates = useRef<HTMLCanvasElement[]>([]);

  /* Hovered row is React state because it changes a handful of times a
     second. Panel position is never state — it changes 120 times a second and
     a re-render per pointermove would dwarf the animation itself. */
  const [hovered, setHovered] = useState<number | null>(null);
  const { width, height } = useResizeObserver(root);

  const count = items.length;

  /* Paint every plate once. Drawing at hover time would put a gradient fill,
     four band rects and a text layout on the same frame as the fade-in. */
  useEffect(() => {
    const bw = panelWidth * PLATE_SCALE;
    const bh = panelHeight * PLATE_SCALE;
    const built: HTMLCanvasElement[] = [];
    for (let i = 0; i < count; i++) {
      const plate = document.createElement('canvas');
      plate.width = bw;
      plate.height = bh;
      const ctx = plate.getContext('2d');
      if (!ctx) break;
      ctx.scale(PLATE_SCALE, PLATE_SCALE);
      paintPlate(ctx, panelWidth, panelHeight, i);
      built.push(plate);
    }
    plates.current = built;

    const canvas = surface.current;
    if (canvas) {
      canvas.width = bw;
      canvas.height = bh;
    }
    return () => {
      plates.current = [];
    };
  }, [count, panelWidth, panelHeight]);

  /* Centre the panel on its own coordinates ONCE, at mount. Doing it with a
     negative margin or `left: -130px` instead means the offset and the
     transform fight, and the panel sits half a width off. */
  useEffect(() => {
    const box = panel.current;
    if (!box) return;
    gsap.set(box, { xPercent: -50, yPercent: -50, autoAlpha: 0, scale: 0.94 });
    return () => {
      gsap.killTweensOf(box);
      gsap.set(box, { clearProps: 'all' });
    };
  }, []);

  /* With no fine pointer — or with reduced motion, where a second of drift is
     exactly what the user opted out of — the panel docks to the right edge and
     only cross-fades as rows change. */
  useEffect(() => {
    const box = panel.current;
    if (!box || width === 0 || height === 0) return;
    if (!docked()) return;
    gsap.set(box, {
      x: Math.max(width - panelWidth / 2 - DOCK_INSET, panelWidth / 2),
      y: height / 2,
    });
  }, [width, height, panelWidth]);

  useEffect(() => {
    const el = root.current;
    const box = panel.current;
    if (!el || !box || docked()) return;

    // ONE tween per property, reused for the lifetime of the component.
    const xTo = gsap.quickTo(box, 'x', { duration, ease: 'power3' });
    const yTo = gsap.quickTo(box, 'y', { duration, ease: 'power3' });
    let seeded = false;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (seeded) {
        xTo(x);
        yTo(y);
        return;
      }
      // Second argument is quickTo's `start` value: it snaps rather than
      // easing. Without it the panel sails in from wherever it was left,
      // taking a full second to cross the list on every re-entry.
      seeded = true;
      xTo(x, x);
      yTo(y, y);
    };

    const onLeave = () => {
      seeded = false;
    };

    el.addEventListener('pointermove', onMove, { passive: true });
    el.addEventListener('pointerleave', onLeave);

    /* Deliberately NOT clearing props here. `xPercent`, `yPercent` and
       `autoAlpha` belong to the mount effect; wiping them whenever `duration`
       changes would un-centre the panel and pop it to full opacity mid-hover.
       Teardown of those lives in the effect that set them. */
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      gsap.killTweensOf(box);
    };
  }, [duration]);

  /* Visibility and content follow the hovered row, not the pointer. */
  useEffect(() => {
    const box = panel.current;
    const canvas = surface.current;
    if (!box || !canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (hovered !== null) {
      const plate = plates.current[hovered];
      const ctx = canvas.getContext('2d');
      if (plate && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(plate, 0, 0);
      }
    }

    gsap.to(box, {
      autoAlpha: hovered === null ? 0 : 1,
      scale: hovered === null ? 0.94 : 1,
      duration: reduced ? 0 : FADE_DURATION,
      ease: 'power3.out',
      // Only the fade is overwritten; the quickTo tweens own x and y and must
      // keep running underneath, which is exactly what 'auto' guarantees.
      overwrite: 'auto',
    });
  }, [hovered]);
  // #endregion critical

  return (
    <div ref={root} className={cn('relative isolate h-full w-full overflow-hidden', className)}>
      <ul className="relative z-10 flex h-full w-full flex-col justify-center">
        {items.map((item, i) => (
          <li
            key={item.id}
            onPointerEnter={() => setHovered(i)}
            onPointerLeave={() => setHovered((prev) => (prev === i ? null : prev))}
            className="border-t border-line last:border-b"
          >
            <div className="flex items-baseline justify-between gap-4 px-6 py-3 sm:px-8 sm:py-4">
              <span
                className="text-2xl tracking-tight transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] sm:text-4xl"
                style={{
                  color: hovered === i ? 'var(--k-fg)' : 'transparent',
                  WebkitTextStroke: hovered === i ? '0px transparent' : '1px var(--k-line-strong)',
                  transform: hovered === i ? 'translateX(12px)' : 'translateX(0px)',
                }}
              >
                {item.title}
              </span>
              {item.meta ? <span className="meta shrink-0">{item.meta}</span> : null}
            </div>
          </li>
        ))}
      </ul>

      <div
        ref={panel}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-20 overflow-hidden rounded-lg border border-line-strong opacity-0 will-change-transform"
        style={{ width: panelWidth, height: panelHeight }}
      >
        <canvas ref={surface} className="block h-full w-full" />
      </div>
    </div>
  );
}
