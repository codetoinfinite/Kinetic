'use client';

import { useRef, useState, type ReactNode, type RefObject } from 'react';
import { useRaf } from '@/registry/hooks/use-raf';
import { clamp } from '@/registry/lib/damp';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Manufactured Scroll Range
   --------------------------------------------------------------------------
   Sometimes the thing you want to scroll through has no height. A ring of
   projects, a WebGL scene, a stack of captions — the content is one screen,
   but the interaction wants to be a page.

   So you manufacture the range: an empty box `count × viewports` screens
   tall, a sticky viewport inside it, and `scrolled / scrollable` as the only
   input. One screen of scroll then means exactly one item, forever, with no
   per-item measurement and nothing to invalidate on resize.

   The component emits two different signals because they have two different
   costs. Continuous progress goes out as CSS custom properties and to an
   `onFrame` callback — sixty times a second, never through React. The
   discrete index goes through state, and only on the frame it actually
   changes, which is a handful of times per page.
   ========================================================================== */

export interface ScrollRangeState {
  /** 0 → 1 across the whole manufactured range. */
  progress: number;
  /** Fractional item position, `progress * count`. */
  position: number;
  /** The item the viewport is showing. */
  index: number;
}

export interface ManufacturedScrollRangeProps {
  /** How many items the range represents. */
  count: number;
  /** Screens of scroll per item. */
  viewports?: number;
  /** Rendered inside the sticky viewport; called again only when `index` changes. */
  children: (state: { index: number; count: number }) => ReactNode;
  /** Per-frame progress, for anything that must not go through React. */
  onFrame?: (state: ScrollRangeState) => void;
  /** Scroll container. Omit to auto-detect the nearest scrollable ancestor. */
  scroller?: RefObject<HTMLElement | null>;
  className?: string;
}

/**
 * Fraction of an item's slot the position must travel past a boundary before
 * the index commits. Without it, a trackpad resting on a boundary flips the
 * index back and forth every frame and React re-renders the viewport at 60 Hz.
 */
const HYSTERESIS = 0.04;

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
export function ManufacturedScrollRange({
  count,
  viewports = 1,
  children,
  onFrame,
  scroller,
  className,
}: ManufacturedScrollRangeProps) {
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);

  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const lastHeight = useRef(0);
  const lastProgress = useRef('');

  useRaf((_dt) => {
    const rootEl = root.current;
    const viewportEl = viewport.current;
    if (!rootEl || !viewportEl || count <= 0) return;

    const host = scroller?.current ?? nearestScroller(rootEl);
    const hostIsRoot = host === document.documentElement;
    const hostTop = hostIsRoot ? 0 : host.getBoundingClientRect().top;
    const hostHeight = hostIsRoot ? window.innerHeight : host.clientHeight;
    if (hostHeight === 0) return;

    // The range is measured in the scroller's own pixels, not `vh`. Inside a
    // scrollable box, viewport units describe a completely different element.
    const total = Math.round(hostHeight * (1 + count * viewports));
    if (total !== lastHeight.current) {
      lastHeight.current = total;
      rootEl.style.height = `${total}px`;
      viewportEl.style.height = `${hostHeight}px`;
    }

    const travel = total - hostHeight;
    const progress = travel > 0 ? clamp((hostTop - rootEl.getBoundingClientRect().top) / travel, 0, 1) : 0;
    const position = progress * count;

    // Continuous value: out as a custom property, never as state. Quantised
    // so an idle scroller stops writing to the DOM entirely.
    const text = progress.toFixed(4);
    if (text !== lastProgress.current) {
      lastProgress.current = text;
      rootEl.style.setProperty('--range-progress', text);
      rootEl.style.setProperty('--range-position', position.toFixed(3));
    }

    // Discrete value: equal slots, `floor` not `round`, so item i owns
    // [i/count, (i+1)/count) and the last item owns the end of the range.
    const candidate = clamp(Math.floor(position), 0, count - 1);
    if (candidate !== indexRef.current) {
      // Distance past the boundary being crossed — going forward that is the
      // candidate's own edge, going back it is the current item's edge.
      const boundary = candidate > indexRef.current ? candidate : indexRef.current;
      if (Math.abs(position - boundary) > HYSTERESIS) {
        indexRef.current = candidate;
        setIndex(candidate);
      }
    }

    onFrame?.({ progress, position, index: indexRef.current });
  });
  // #endregion critical

  return (
    <div ref={root} className={cn('relative w-full', className)}>
      <div ref={viewport} className="sticky top-0 w-full overflow-hidden">
        {children({ index, count })}
      </div>
    </div>
  );
}
