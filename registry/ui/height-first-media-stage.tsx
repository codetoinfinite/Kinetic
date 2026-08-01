'use client';

import {
  Children,
  isValidElement,
  useCallback,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { wrapIndex } from '@/registry/lib/wrap';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Height-First Media Stage
   --------------------------------------------------------------------------
   Almost every media stage on the web is sized width-first: a full-width box
   with an aspect ratio, and whatever height falls out of that. On a short
   laptop in landscape, a 16:9 full-width hero is taller than the viewport, so
   the thing you built to be seen at a glance has to be scrolled.

   This one inverts the constraint. The height is authored, the width is
   derived from it through `aspect-ratio`, and `max-width: 100%` is the only
   escape hatch. The stage therefore always fits vertically, and on a narrow
   screen it gives up height rather than overflowing.

   The cross-fade is a plain `opacity` transition on stacked layers — every
   layer stays mounted, so there is no decode flash on the way in and no
   layout work at all. The only JavaScript is the index.
   ========================================================================== */

export interface HeightFirstMediaStageProps {
  /** One media layer per child. All layers stay mounted and stacked. */
  children: ReactNode;
  /**
   * Authored height as a CSS length. Width is derived from it — never set one
   * here. `dvh` tracks the visible viewport; see the notes on `dvh` vs `vh`.
   */
  height?: string;
  /** Ratio the derived width follows, as a CSS `aspect-ratio` value. */
  aspectRatio?: string;
  /** Cross-fade duration in ms. */
  duration?: number;
  /** Re-keyed on every index change so its entrance keyframe replays. */
  caption?: (index: number) => ReactNode;
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  className?: string;
  'aria-label'?: string;
}

// #region critical
/**
 * Scoped stylesheet. React 19 hoists and deduplicates it by `href`, so the
 * keyframe exists once no matter how many stages are mounted and nothing has
 * to be added to a global sheet.
 *
 * The class exists only so a `key` change can restart it: React unmounts the
 * old caption node and mounts a new one, the animation has never run on that
 * node, so it plays from 0%. Toggling a class on a persistent node would not
 * work — the animation would have to be removed for a frame first.
 */
const STAGE_CSS = `
@keyframes k-hfms-in {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

.k-hfms-in {
  animation: k-hfms-in 500ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* The caption's content is the information; its arrival is decoration. */
@media (prefers-reduced-motion: reduce) {
  .k-hfms-in { animation: none; }
}
`;
// #endregion critical

export function HeightFirstMediaStage({
  children,
  height = 'min(80dvh, 100%)',
  aspectRatio = '3 / 2',
  duration = 500,
  caption,
  index,
  defaultIndex = 0,
  onIndexChange,
  className,
  'aria-label': ariaLabel = 'Media stage',
}: HeightFirstMediaStageProps) {
  const layers = Children.toArray(children);
  const count = layers.length;
  const reduced = useReducedMotion();

  const [internal, setInternal] = useState(defaultIndex);
  const current = index ?? internal;

  const go = useCallback(
    (next: number) => {
      const resolved = wrapIndex(next, Math.max(1, count));
      if (index === undefined) setInternal(resolved);
      onIndexChange?.(resolved);
    },
    [count, index, onIndexChange],
  );

  // #region critical
  const stageStyle: CSSProperties = {
    // Height is authored; width is whatever the ratio makes of it.
    height,
    aspectRatio,
    // The one concession to width. When the box would be wider than its
    // container, this clamps it and the ratio pulls the HEIGHT down to match —
    // the stage gives up size rather than overflowing sideways.
    maxWidth: '100%',
  };
  // #endregion critical

  return (
    <>
      <style href="kinetic-height-first-media-stage" precedence="medium">
        {STAGE_CSS}
      </style>
      <div className={cn('flex h-full w-full items-center justify-center', className)}>
        <figure
          className="relative overflow-hidden rounded-md"
          style={stageStyle}
          role="group"
          aria-roledescription="carousel"
          aria-label={ariaLabel}
        >
          {layers.map((layer, i) => (
            <div
              key={isValidElement(layer) && layer.key !== null ? layer.key : i}
              aria-hidden={i !== current}
              className="absolute inset-0"
              style={{
                opacity: i === current ? 1 : 0,
                // Linear, not eased: two layers cross-fading with an eased
                // curve on each dip in combined luminance halfway through and
                // the stage flashes darker mid-transition.
                transition: reduced ? 'none' : `opacity ${duration}ms linear`,
                pointerEvents: i === current ? undefined : 'none',
              }}
            >
              {layer}
            </div>
          ))}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
            {/* `key={current}` is the whole trick: a new node means the
                entrance keyframe has never run here, so it replays. */}
            <div key={current} className="k-hfms-in min-w-0">
              {caption?.(current)}
            </div>
            <span className="shrink-0 font-mono text-[0.625rem] tracking-[0.16em] text-white/70">
              {String(current + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </span>
          </div>

          <div className="absolute right-3 top-3 flex gap-2">
            <button
              type="button"
              onClick={() => go(current - 1)}
              aria-label="Previous"
              className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/45"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="none">
                <path d="M14.5 5.5 8 12l6.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go(current + 1)}
              aria-label="Next"
              className="grid h-8 w-8 place-items-center rounded-full border border-white/25 bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/45"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="none">
                <path d="M9.5 5.5 16 12l-6.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
              </svg>
            </button>
          </div>
        </figure>
      </div>
    </>
  );
}
