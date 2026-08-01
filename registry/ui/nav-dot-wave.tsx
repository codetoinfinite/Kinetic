'use client';

import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Nav Dot Wave
   --------------------------------------------------------------------------
   One keyframe block, N elements, no JavaScript. Each item carries its own
   index as an inline custom property and the stylesheet turns that index into
   a delay:

       animation-delay: calc(var(--i) * var(--kx-dot-stagger));

   That single line is the whole technique. The index is data, the delay is
   derived from it in CSS, and adding a nav item requires no change anywhere.

   The keyframe is deliberately mostly flat — the dot rests for 40% of every
   cycle and only lifts between 0% and 60%, peaking at 30%. That long rest is
   what makes a staggered set read as a crest travelling along the row rather
   than as a row of dots vibrating.
   ========================================================================== */

/** Lets an inline `style` object carry custom properties without a cast. */
type StyleWithVars = CSSProperties & Record<`--${string}`, string | number>;

export interface NavDotWaveItem {
  label: string;
  href?: string;
}

export interface NavDotWaveProps {
  items: readonly NavDotWaveItem[];
  /** Index of the current page. Its dot grows and takes the accent colour. */
  activeIndex?: number;
  /** Milliseconds between one dot's phase and the next. */
  staggerMs?: number;
  /** Full cycle of a single dot, in milliseconds. */
  durationMs?: number;
  /** Peak lift in pixels. */
  lift?: number;
  /** Dot diameter in pixels. */
  size?: number;
  /** Runs the crest right-to-left by negating the stagger. */
  reverse?: boolean;
  className?: string;
}

// #region critical
const DOT_WAVE_CSS = `
/* 0% is the RESTING pose, not the lifted one. That matters: a positive
   animation-delay holds the element at its 0% pose until the delay expires,
   so if 0% were the lift, every dot would sit visibly raised for its share of
   the stagger on first paint and the row would settle rather than start. */
@keyframes kx-dotwave {
  0%, 60%, 100% { opacity: 0.45; translate: 0 0; }
  30%           { opacity: 1;    translate: 0 var(--kx-dot-lift, -3px); }
}

/* The current item never dims — it is a location marker, and a marker that
   fades to 45% twice a second is a marker you cannot trust. */
@keyframes kx-dotwave-active {
  0%, 60%, 100% { opacity: 1; translate: 0 0; }
  30%           { opacity: 1; translate: 0 var(--kx-dot-lift, -3px); }
}

.kx-dotwave-list {
  display: flex;
  align-items: center;
  gap: var(--kx-dot-gap, 1.5rem);
  list-style: none;
  margin: 0;
  padding: 0;
}

.kx-dotwave-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-muted, currentColor);
  transition: color 200ms linear;
}

.kx-dotwave-link:hover,
.kx-dotwave-item[data-active="true"] .kx-dotwave-link {
  color: var(--color-fg, currentColor);
}

.kx-dotwave-dot {
  width: var(--kx-dot-size, 5px);
  height: var(--kx-dot-size, 5px);
  border-radius: 9999px;
  background-color: currentColor;
  flex: none;
  scale: 1;

  animation: kx-dotwave var(--kx-dot-duration, 1400ms) ease-in-out infinite;
  animation-delay: calc(var(--i, 0) * var(--kx-dot-stagger, 60ms));

  /* 'translate' and 'opacity', not 'transform' — the scale below belongs to
     the active state and has to survive independently of the wave. */
  will-change: translate, opacity;
  transition: scale 260ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.kx-dotwave-item[data-active="true"] .kx-dotwave-dot {
  animation-name: kx-dotwave-active;
  background-color: var(--color-accent, currentColor);
  scale: 1.6;
}

/* No motion: the crest is decoration, so it goes. Everything that carries
   information stays — the current item keeps its accent colour and its larger
   dot, the rest keep their dimmed one. */
@media (prefers-reduced-motion: reduce) {
  .kx-dotwave-dot {
    animation: none;
    opacity: 0.45;
    will-change: auto;
  }
  .kx-dotwave-item[data-active="true"] .kx-dotwave-dot {
    opacity: 1;
  }
}
`;

export function NavDotWave({
  items,
  activeIndex = 0,
  staggerMs = 60,
  durationMs = 1400,
  lift = 3,
  size = 5,
  reverse = false,
  className,
}: NavDotWaveProps) {
  const rootStyle: StyleWithVars = {
    '--kx-dot-stagger': `${reverse ? -staggerMs : staggerMs}ms`,
    '--kx-dot-duration': `${durationMs}ms`,
    '--kx-dot-lift': `${-lift}px`,
    '--kx-dot-size': `${size}px`,
  };

  return (
    <>
      <style href="kinetic-nav-dot-wave" precedence="medium">
        {DOT_WAVE_CSS}
      </style>
      <nav className={cn('kx-dotwave', className)} style={rootStyle}>
        <ul className="kx-dotwave-list">
          {items.map((item, i) => {
            // The index is the only per-item data the stylesheet needs. Every
            // timing decision is derived from it in CSS.
            const itemStyle: StyleWithVars = { '--i': i };
            const active = i === activeIndex;
            return (
              <li
                key={item.label}
                className="kx-dotwave-item"
                data-active={active ? 'true' : 'false'}
                style={itemStyle}
              >
                <a
                  href={item.href ?? '#'}
                  className="kx-dotwave-link text-xs tracking-tight"
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="kx-dotwave-dot" aria-hidden="true" />
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
// #endregion critical
