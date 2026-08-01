'use client';

import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Compound Group Hover Card
   --------------------------------------------------------------------------
   One pointer entering one box drives four separate changes on three
   different elements: the card lifts, the icon tilts and grows, a colour blob
   in the corner brightens, and the affordance arrow slides in. Each has its
   own duration, easing and delay, so the card resolves as a short sequence
   rather than a single snap.

   Two structural decisions make it possible:

     1. The independent `translate` / `rotate` / `scale` properties are
        animated separately. With `transform` they are one property and
        therefore one duration and one easing — you cannot rotate the icon
        over 320ms and overshoot its scale over 420ms.

     2. The trigger is `:hover, :has(:focus-visible)` on the card. The card is
        not itself focusable; the link inside it is, and `:has()` lets the
        parent respond to the child's focus. Keyboard users get the exact same
        four changes, from one extra selector.
   ========================================================================== */

/** Lets an inline `style` object carry custom properties without a cast. */
type StyleWithVars = CSSProperties & Record<`--${string}`, string | number>;

export interface CompoundGroupHoverProps {
  title: string;
  description: string;
  /** Small label above the title. */
  eyebrow?: string;
  /** Rendered into the tilting badge. An inline SVG or a character. */
  icon?: ReactNode;
  /** Makes the whole card clickable via a stretched pseudo-element. */
  href?: string;
  /** Any CSS colour. Drives the blob, the icon and the arrow. */
  accent?: string;
  /** Text of the affordance link. */
  action?: string;
  className?: string;
}

// #region critical
const HOVER_CARD_CSS = `
.kx-hcard {
  --kx-hcard-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --kx-hcard-overshoot: cubic-bezier(0.34, 1.56, 0.64, 1);

  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid var(--color-line, currentColor);
  border-radius: 12px;
  background-color: var(--color-surface, transparent);

  translate: 0 0;
  transition:
    translate 260ms var(--kx-hcard-ease),
    border-color 260ms linear;
}

.kx-hcard:hover,
.kx-hcard:has(:focus-visible) {
  translate: 0 var(--kx-hcard-lift, -6px);
  border-color: var(--color-line-strong, currentColor);
}

/* Icon: two properties, two curves. The rotation settles cleanly; the scale
   overshoots slightly and comes back, which is what reads as "picked up". */
.kx-hcard-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 9px;
  border: 1px solid var(--color-line, currentColor);
  color: var(--kx-hcard-accent);
  rotate: 0deg;
  scale: 1;
  transition:
    rotate 320ms var(--kx-hcard-ease) 40ms,
    scale 420ms var(--kx-hcard-overshoot) 40ms,
    border-color 260ms linear;
}

.kx-hcard:hover .kx-hcard-icon,
.kx-hcard:has(:focus-visible) .kx-hcard-icon {
  rotate: -6deg;
  scale: 1.1;
  border-color: var(--kx-hcard-accent);
}

/* The blob is blurred ONCE, at paint. Only opacity and scale animate, so the
   hover never re-runs a 2rem blur. Negative z-index puts it above the card
   background and below the card content without a wrapper. */
.kx-hcard-blob {
  position: absolute;
  right: -4rem;
  bottom: -4rem;
  width: 14rem;
  height: 14rem;
  border-radius: 9999px;
  background: radial-gradient(circle, var(--kx-hcard-accent) 0%, transparent 70%);
  filter: blur(2rem);
  opacity: 0.12;
  scale: 1;
  pointer-events: none;
  z-index: -1;
  transition:
    opacity 500ms var(--kx-hcard-ease),
    scale 700ms var(--kx-hcard-ease);
}

.kx-hcard:hover .kx-hcard-blob,
.kx-hcard:has(:focus-visible) .kx-hcard-blob {
  opacity: 0.4;
  scale: 1.15;
}

.kx-hcard-arrow {
  display: inline-block;
  translate: 0 0;
  opacity: 0.4;
  transition:
    translate 300ms var(--kx-hcard-ease) 80ms,
    opacity 220ms linear 80ms;
}

.kx-hcard:hover .kx-hcard-arrow,
.kx-hcard:has(:focus-visible) .kx-hcard-arrow {
  translate: 4px 0;
  opacity: 1;
}

/* Stretched link: the anchor stays the only focusable, screen-reader-visible
   target, and its pseudo-element makes the whole card the hit area. */
.kx-hcard-link {
  color: var(--kx-hcard-accent);
}

.kx-hcard-link::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

/* No motion: keep every change that carries meaning — the border and icon
   brighten, the blob comes up, the arrow reaches full opacity — and drop the
   three that are purely positional. Hover still visibly does something. */
@media (prefers-reduced-motion: reduce) {
  .kx-hcard:hover,
  .kx-hcard:has(:focus-visible) {
    translate: 0 0;
  }
  .kx-hcard:hover .kx-hcard-icon,
  .kx-hcard:has(:focus-visible) .kx-hcard-icon {
    rotate: 0deg;
    scale: 1;
  }
  .kx-hcard:hover .kx-hcard-arrow,
  .kx-hcard:has(:focus-visible) .kx-hcard-arrow {
    translate: 0 0;
  }
  .kx-hcard:hover .kx-hcard-blob,
  .kx-hcard:has(:focus-visible) .kx-hcard-blob {
    scale: 1;
  }
}
`;

export function CompoundGroupHover({
  title,
  description,
  eyebrow,
  icon,
  href,
  accent = 'var(--color-accent, currentColor)',
  action = 'Read more',
  className,
}: CompoundGroupHoverProps) {
  const style: StyleWithVars = { '--kx-hcard-accent': accent };

  return (
    <>
      <style href="kinetic-compound-group-hover" precedence="medium">
        {HOVER_CARD_CSS}
      </style>
      <article className={cn('kx-hcard p-6', className)} style={style}>
        <span className="kx-hcard-blob" aria-hidden="true" />

        {icon ? (
          <span className="kx-hcard-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}

        {eyebrow ? <span className="meta">{eyebrow}</span> : null}

        <h3 className="text-base tracking-tight text-fg">{title}</h3>
        <p className="text-[13px] leading-relaxed text-muted">{description}</p>

        {href ? (
          <a href={href} className="kx-hcard-link mt-auto pt-2 text-xs tracking-tight">
            {action}
            <span className="kx-hcard-arrow ml-1.5" aria-hidden="true">
              &rarr;
            </span>
          </a>
        ) : null}
      </article>
    </>
  );
}
// #endregion critical
