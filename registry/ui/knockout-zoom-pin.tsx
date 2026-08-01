'use client';

import { useRef, type ReactNode, type RefObject } from 'react';
import { useRaf } from '@/registry/hooks/use-raf';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { clamp, damp, lerp } from '@/registry/lib/damp';
import { easeInCubic, easeOutCubic } from '@/registry/lib/easing';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Knockout Zoom Pin
   --------------------------------------------------------------------------
   A word starts so large that only the counters of two letters are on screen,
   and shrinks — as you scroll, not on a timer — until it is a normal
   headline sitting in a normal layout. The letters are a window onto a
   gradient, so the "scene" zooms out with them.

   Two details separate this from the version that ships broken:

   1. The smoothing is exponential in wall-clock time. `smoothed +=
      (target - smoothed) * (1 - exp(-rate * dt))` converges at the same rate
      on a 60 Hz and a 144 Hz display. The per-frame form everyone writes
      instead converges more than twice as fast at 144 Hz.

   2. Nothing is written to the DOM unless it changed. A scale rounded to
      four decimals and a translate rounded to a tenth of a pixel are
      identical for several frames at the top and bottom of the range, and
      re-writing them there is a layout invalidation for no visual result.
   ========================================================================== */

export interface KnockoutZoomPinProps {
  /** The word. Kept on one line — this is a display element, not a paragraph. */
  children: ReactNode;
  /** Content revealed behind the word as it shrinks. */
  behind?: ReactNode;
  /** Scale at progress 0. */
  cover?: number;
  /** Scroll travel of the pin as a multiple of the scroller's height. */
  viewports?: number;
  /** Fraction of the gap left after one second. */
  smoothing?: number;
  /** Final vertical position, as a fraction of the pinned box height. */
  rest?: number;
  /** Scroll container. Omitted, the nearest scrollable ancestor is used. */
  scroller?: RefObject<HTMLElement | null>;
  className?: string;
}

const SCROLLABLE = /(auto|scroll|overlay)/;

function nearestScroller(el: HTMLElement): HTMLElement {
  let node = el.parentElement;
  while (node) {
    if (SCROLLABLE.test(getComputedStyle(node).overflowY)) return node;
    node = node.parentElement;
  }
  return document.documentElement;
}

// #region critical
export function KnockoutZoomPin({
  children,
  behind,
  cover = 7,
  viewports = 1.6,
  smoothing = 0.0067,
  rest = -0.3,
  scroller,
  className,
}: KnockoutZoomPinProps) {
  const section = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const veil = useRef<HTMLDivElement>(null);

  const smoothed = useRef(0);
  const lastTransform = useRef('');
  const lastVeil = useRef('');
  const lastHeights = useRef(0);
  const reduced = useReducedMotion();

  useRaf((dt) => {
    const sectionEl = section.current;
    const pinEl = pin.current;
    const wordEl = word.current;
    if (!sectionEl || !pinEl || !wordEl) return;

    const host = scroller?.current ?? nearestScroller(sectionEl);
    const hostIsRoot = host === document.documentElement;
    const hostTop = hostIsRoot ? 0 : host.getBoundingClientRect().top;
    const hostHeight = hostIsRoot ? window.innerHeight : host.clientHeight;
    if (hostHeight === 0) return;

    // The pin range is manufactured from the scroller's own height, not from
    // `vh`: inside a box, viewport units describe the wrong thing entirely.
    const total = Math.round(hostHeight * (reduced ? 1 : 1 + viewports));
    if (total !== lastHeights.current) {
      lastHeights.current = total;
      sectionEl.style.height = `${total}px`;
      pinEl.style.height = `${hostHeight}px`;
    }

    const rect = sectionEl.getBoundingClientRect();
    const travel = total - hostHeight;
    const target = travel > 0 ? clamp((hostTop - rect.top) / travel, 0, 1) : 1;

    // `damp(x, t, s, dt)` is `x + (t - x) * (1 - s^dt)`; with s = e^-5 that is
    // exactly the `1 - exp(-5 * dt)` constant the technique is named for.
    smoothed.current = reduced ? target : damp(smoothed.current, target, smoothing, dt);
    const L = smoothed.current;

    // Ease-out on the scale: most of the shrink happens early, so the last
    // third of the scroll is a slow settle rather than a continued rush.
    const scale = cover - (cover - 1) * easeOutCubic(L);
    // Ease-IN on the recentre: while the word is huge its position is
    // meaningless, so it must not start travelling until it is nearly small.
    const y = lerp(0, rest * hostHeight, easeInCubic(L));

    const transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
    if (transform !== lastTransform.current) {
      lastTransform.current = transform;
      wordEl.style.transform = transform;
    }

    const veilEl = veil.current;
    if (veilEl) {
      const opacity = easeInCubic(clamp((L - 0.45) / 0.5, 0, 1)).toFixed(3);
      if (opacity !== lastVeil.current) {
        lastVeil.current = opacity;
        veilEl.style.opacity = opacity;
      }
    }
  });
  // #endregion critical

  return (
    <section ref={section} className={cn('relative w-full', className)}>
      {/* A size container so the word can be sized in `cqw` — a fraction of
          the pinned box, not of the window, which is what makes the same
          component work in a 320 px preview and a full-bleed page. */}
      <div
        ref={pin}
        className="sticky top-0 w-full overflow-hidden"
        style={{ containerType: 'inline-size' }}
      >
        <div
          ref={veil}
          className="absolute inset-0 flex items-end justify-start p-6"
          style={{ opacity: 0 }}
        >
          {behind}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            ref={word}
            className="origin-center will-change-transform"
            style={{ transform: 'translate3d(0,0,0) scale(1)' }}
          >
            <span
              className="block whitespace-nowrap text-[13cqw] leading-none font-medium tracking-tight"
              style={{
                // The letters are the window. Everything outside them is the
                // page, so the word reads as cut out of the surface rather
                // than drawn on top of it.
                backgroundImage:
                  'linear-gradient(120deg, color-mix(in oklab, var(--k-accent) 90%, white), color-mix(in oklab, var(--k-accent) 35%, transparent))',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {children}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
