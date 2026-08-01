'use client';

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { clamp } from '@/registry/lib/damp';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Perspective Coverflow Scroller
   --------------------------------------------------------------------------
   Real 3D, driven by a real scrollbar. The browser owns the position: momentum,
   rubber-banding, trackpad physics, shift+wheel, keyboard paging and snapping
   are all native. This component never animates the scroll — it only reads
   `scrollLeft` and writes a transform per panel.

   That is the architectural difference from a JS-position carousel. There is
   no tween, no rAF loop that runs while idle, and no state to desynchronise:
   if the panel positions are right for a given `scrollLeft`, they are right
   for every `scrollLeft`.
   ========================================================================== */

export interface PerspectiveCoverflowScrollerProps {
  /** One panel per child. Each is wrapped in a snap-aligned cell. */
  children: ReactNode;
  /** Per-element perspective in px. Lower = more extreme foreshortening. */
  perspective?: number;
  /** Degrees of `rotateY` at the clamp. */
  rotation?: number;
  /** Pixels of `translateZ` at the clamp. Always negative in effect. */
  depth?: number;
  /** How much a panel shrinks at one half-width from centre. */
  scaleFalloff?: number;
  /** How much a panel fades at one half-width from centre. */
  opacityFalloff?: number;
  /** Clamp on the normalised offset. Past this, panels stop turning further. */
  maxOffset?: number;
  /** Which panel is centred on mount. Defaults to the middle of the set. */
  initialIndex?: number;
  className?: string;
  /** Applied to each snap cell — size the panels here. */
  panelClassName?: string;
  'aria-label'?: string;
}

const SNAP_ALIGN_CENTER = 'center';

export function PerspectiveCoverflowScroller({
  children,
  perspective = 1300,
  rotation = 40,
  depth = 130,
  scaleFalloff = 0.12,
  opacityFalloff = 0.35,
  maxOffset = 1.2,
  initialIndex,
  className,
  panelClassName,
  'aria-label': ariaLabel = 'Gallery',
}: PerspectiveCoverflowScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<Array<HTMLDivElement | null>>([]);
  /** Layout centre of each panel, in track coordinates. Scroll-independent. */
  const centresRef = useRef<number[]>([]);
  const centredRef = useRef(false);

  const reduced = useReducedMotion();
  const size = useResizeObserver(scrollerRef);

  const items = Children.toArray(children);
  const count = items.length;

  // #region critical
  /**
   * Cache each panel's layout centre and pad the track so the first and last
   * panel can reach the middle of the viewport.
   *
   * `offsetLeft`/`offsetWidth` are *layout* values: unaffected by `scrollLeft`
   * and, critically, unaffected by the transforms this component writes.
   * Reading `getBoundingClientRect()` in the scroll handler instead would feed
   * each panel's own `scale()` back into the next frame's offset.
   */
  const measure = useCallback(() => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!scroller || !track) return;

    const panels = panelsRef.current;
    const first = panels[0];
    const last = panels[count - 1];

    // Half a viewport minus half a panel. The source of this technique used a
    // fixed `24vw`, which is wrong for any panel that is not ~52vw wide and
    // wrong for every container that is not the viewport.
    if (first) {
      track.style.paddingLeft = `${Math.max(0, (scroller.clientWidth - first.offsetWidth) / 2)}px`;
    }
    if (last) {
      track.style.paddingRight = `${Math.max(0, (scroller.clientWidth - last.offsetWidth) / 2)}px`;
    }

    // Read after the padding write: the padding moves every offsetLeft.
    centresRef.current = panels.map((panel) =>
      panel ? panel.offsetLeft + panel.offsetWidth / 2 : 0,
    );
  }, [count]);

  /** Write one transform per panel from the current scroll position. */
  const update = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const half = scroller.clientWidth / 2 || 1;
    const scroll = scroller.scrollLeft;
    const panels = panelsRef.current;
    const centres = centresRef.current;

    for (let i = 0; i < panels.length; i += 1) {
      const panel = panels[i];
      const centre = centres[i];
      if (!panel || centre === undefined) continue;

      if (reduced) {
        panel.style.transform = '';
        panel.style.opacity = '';
        continue;
      }

      // Signed, normalised distance from the viewport centre: -1 = one half
      // width to the left, +1 = one half width to the right.
      const r = clamp((centre - scroll - half) / half, -maxOffset, maxOffset);
      const away = Math.abs(r);

      // Perspective lives *in the transform*, not on the parent. A shared
      // parent perspective gives every panel the same vanishing point, so
      // edge panels skew as well as rotate; per-element perspective turns each
      // panel about its own centre, which is the coverflow look.
      panel.style.transform =
        `perspective(${perspective}px) ` +
        `translateZ(${(-depth * away).toFixed(1)}px) ` +
        `rotateY(${(-rotation * r).toFixed(2)}deg) ` +
        `scale(${(1 - scaleFalloff * Math.min(away, 1)).toFixed(3)})`;

      // Two different clamps on purpose: scale bottoms out at 1, opacity keeps
      // going to `maxOffset`. Distant panels stay proportionate while fading.
      panel.style.opacity = (1 - opacityFalloff * Math.min(away, maxOffset)).toFixed(2);
    }
  }, [reduced, perspective, rotation, depth, scaleFalloff, opacityFalloff, maxOffset]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    measure();

    // Start centred on a panel, not on the midpoint of the scroll range: with
    // an even count the midpoint falls in the gap between two panels and the
    // component opens looking like nothing is selected.
    if (!centredRef.current && count > 0) {
      const target = initialIndex ?? Math.floor((count - 1) / 2);
      const centre = centresRef.current[clamp(Math.round(target), 0, count - 1)];
      if (centre !== undefined) {
        scroller.scrollLeft = centre - scroller.clientWidth / 2;
      }
      centredRef.current = true;
    }

    update();

    let frame = 0;
    const onScroll = () => {
      // Coalesce: a trackpad fires `scroll` far more often than the compositor
      // paints, and each handler run writes N transforms.
      if (frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      scroller.removeEventListener('scroll', onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [measure, update, count, initialIndex]);
  // #endregion critical

  // The track's content box changes when a web font swaps or a child resizes,
  // and neither fires `scroll` or a window `resize`. Observing the track is the
  // deterministic replacement for the usual "recompute at 300 ms and 1000 ms".
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      measure();
      update();
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure, update]);

  useEffect(() => {
    measure();
    update();
  }, [measure, update, size.width, size.height]);

  return (
    <div
      ref={scrollerRef}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      className={cn(
        'h-full w-full overflow-x-auto overflow-y-hidden',
        '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        'focus-visible:outline-none',
        className,
      )}
      style={{ scrollSnapType: 'x proximity' }}
    >
      <div ref={trackRef} className="flex h-full w-max items-center gap-4 md:gap-8">
        {items.map((child, i) => (
          <div
            key={isValidElement(child) && child.key !== null ? child.key : i}
            ref={(node) => {
              panelsRef.current[i] = node;
            }}
            className={cn('shrink-0 will-change-transform', panelClassName)}
            style={{ scrollSnapAlign: SNAP_ALIGN_CENTER }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
