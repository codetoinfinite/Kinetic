'use client';

import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Stroke-To-Fill Hover Rows
   --------------------------------------------------------------------------
   An index of large type where every row is an outline with a ghost of fill,
   and the hovered row *becomes solid*: the stroke drops to zero width, the
   fill goes to full, and the whole row steps 12 px to the right. The row does
   not light up — it materialises.

   Two properties do the work, and they are separate for a reason:

     -webkit-text-stroke-width   1px -> 0
     -webkit-text-fill-color     16% of currentColor -> currentColor

   `-webkit-text-fill-color` overrides `color` for the glyph interior only,
   which is what lets the outline stay `currentColor` while the inside is
   nearly transparent. Doing it with `color` alone is impossible: `color` is
   also what `currentColor` resolves to, so fading the fill fades the stroke
   with it and the row simply dims.

   The ghost fill is `color-mix(in oklch, currentColor 16%, transparent)`
   rather than a literal rgba. It inherits whatever the surrounding text colour
   is, so the same component is correct on a dark page and a light one, and
   mixing in oklch keeps the 16% step perceptually even instead of clumping
   toward black the way sRGB alpha does.

   Cost is CSS. Nothing runs on hover but the compositor.
   ========================================================================== */

// #region critical
const ROWS_CSS = `
.kinetic-sf-title {
  -webkit-text-stroke: var(--kx-sf-stroke, 1px) currentColor;
  -webkit-text-fill-color: color-mix(in oklch, currentColor var(--kx-sf-ghost, 16%), transparent);
  transition:
    -webkit-text-fill-color 380ms cubic-bezier(0.16, 1, 0.3, 1),
    -webkit-text-stroke-width 380ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 380ms cubic-bezier(0.16, 1, 0.3, 1);
  transform: translate3d(0, 0, 0);
}
/* :focus-visible alongside :hover, always. A keyboard user tabbing an index
   of ten rows otherwise sees ten identical outlines and no current position. */
.kinetic-sf-row:hover .kinetic-sf-title,
.kinetic-sf-row:focus-visible .kinetic-sf-title {
  -webkit-text-fill-color: currentColor;
  -webkit-text-stroke-width: 0px;
  transform: translate3d(var(--kx-sf-nudge, 12px), 0, 0);
}
/* Everything that is not the hovered row recedes. Scoped to the list's own
   hover so the resting state is all rows equal, not all rows dimmed. */
.kinetic-sf-list:hover .kinetic-sf-row:not(:hover) {
  opacity: 0.45;
}
.kinetic-sf-row {
  transition: opacity 380ms cubic-bezier(0.16, 1, 0.3, 1);
}
@media (prefers-reduced-motion: reduce) {
  /* The stroke-to-fill swap is a state change, not motion, and it stays. The
     12 px lateral travel is motion, and it goes. */
  .kinetic-sf-row:hover .kinetic-sf-title,
  .kinetic-sf-row:focus-visible .kinetic-sf-title {
    transform: none;
  }
}
`;

export interface StrokeToFillItem {
  label: string;
  /** Right-hand metadata: a year, a category, a count. */
  meta?: ReactNode;
  href?: string;
}

export interface StrokeToFillRowsProps {
  items: StrokeToFillItem[];
  /** Outline thickness in px at rest. */
  strokeWidth?: number;
  /** Resting fill, as a percentage of `currentColor`. */
  ghost?: number;
  /** Pixels the hovered row steps right. */
  nudge?: number;
  className?: string;
  onSelect?: (item: StrokeToFillItem, index: number) => void;
}

const STROKE_WIDTH = 1;
const GHOST = 16;
const NUDGE = 12;

export function StrokeToFillRows({
  items,
  strokeWidth = STROKE_WIDTH,
  ghost = GHOST,
  nudge = NUDGE,
  className,
  onSelect,
}: StrokeToFillRowsProps) {
  return (
    <>
      <style href="kinetic-stroke-to-fill" precedence="medium">
        {ROWS_CSS}
      </style>
      <ul
        className={cn('kinetic-sf-list w-full', className)}
        style={
          {
            '--kx-sf-stroke': `${strokeWidth}px`,
            '--kx-sf-ghost': `${ghost}%`,
            '--kx-sf-nudge': `${nudge}px`,
          } as CSSProperties
        }
      >
        {items.map((item, i) => {
          const inner = (
            <>
              <span className="kinetic-sf-title block text-[clamp(28px,5.5vw,72px)] leading-[1.06] tracking-[-0.03em]">
                {item.label}
              </span>
              {item.meta ? (
                <span className="meta shrink-0 pt-[0.35em]">{item.meta}</span>
              ) : null}
            </>
          );

          return (
            <li key={`${item.label}-${i}`} className="border-b border-line">
              {item.href ? (
                <a
                  href={item.href}
                  className="kinetic-sf-row flex w-full items-start justify-between gap-6 py-[0.35em] text-left outline-none"
                >
                  {inner}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect?.(item, i)}
                  className="kinetic-sf-row flex w-full items-start justify-between gap-6 py-[0.35em] text-left outline-none"
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
// #endregion critical
