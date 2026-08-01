'use client';

import gsap from 'gsap';
import { Children, isValidElement, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* ==========================================================================
   matchMedia Layout Teardown
   --------------------------------------------------------------------------
   Two layouts, one breakpoint, and a guarantee that crossing it leaves
   nothing behind.

   `gsap.matchMedia()` registers a callback per media query. GSAP records
   every tween and every `gsap.set` made inside that callback, and when the
   query stops matching it *reverts* them — inline styles removed, tweens
   killed, listeners you returned a cleanup for detached. The alternative,
   registering animations once and hoping a CSS breakpoint hides them, leaves
   inline transforms on elements that a phone layout never asked for.

   The desktop branch here does all of its positioning through GSAP rather
   than through Tailwind breakpoint classes, so the breakpoint exists in
   exactly one place: the query string. The base markup is a plain column,
   which is also the mobile layout — nothing to undo, because nothing was
   done.

   Positions are expressed in percentages of the container (`left`, `top`),
   not pixels, so the fan is resize-proof inside its branch and needs no
   measuring pass and no resize listener at all. `x` is left free for the
   pointer parallax, which keeps layout and interaction on separate
   properties instead of fighting over one.
   ========================================================================== */

export interface MatchMediaLayoutTeardownProps {
  /** One card per child. */
  children: ReactNode;
  /** Pixel width at which the fan layout takes over. */
  breakpoint?: number;
  /** Horizontal step per card, as a percentage of the container width. */
  spread?: number;
  /** Vertical arc per step away from centre, as a percentage of container height. */
  arc?: number;
  /** Degrees of tilt per step away from centre. */
  tilt?: number;
  /** Maximum pointer parallax in pixels for the outermost card. */
  parallax?: number;
  className?: string;
  itemClassName?: string;
}

/** Entrance travel in pixels. Short — this is a settle, not an arrival. */
const ENTER_Y = 26;
/** Entrance duration in seconds. */
const ENTER_DURATION = 0.7;
/** Seconds between cards in the entrance stagger. */
const ENTER_STAGGER = 0.06;
/** Pointer parallax follow duration in seconds. */
const PARALLAX_DURATION = 0.6;

export function MatchMediaLayoutTeardown({
  children,
  breakpoint = 768,
  spread = 15,
  arc = 4,
  tilt = 5,
  parallax = 26,
  className,
  itemClassName,
}: MatchMediaLayoutTeardownProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const items = Children.toArray(children);
  const count = items.length;

  // #region critical
  useEffect(() => {
    const root = rootRef.current;
    if (!root || count === 0) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        // Object form: every query is evaluated, and the results arrive as
        // booleans on `self.conditions`. One callback can therefore branch on
        // several axes (width AND motion preference) instead of needing a
        // separate `add` per combination, and GSAP re-runs it whenever ANY of
        // them flips — including the motion query, so a user toggling
        // "reduce motion" at runtime gets the static layout without a reload.
        isDesktop: `(min-width: ${breakpoint}px)`,
        isMobile: `(max-width: ${breakpoint - 1}px)`,
        reduced: '(prefers-reduced-motion: reduce)',
      },
      (self) => {
        // `noUncheckedIndexedAccess` makes every lookup `boolean | undefined`,
        // and `conditions` itself is optional. Default rather than assert.
        const conditions = self.conditions ?? {};
        const isDesktop = conditions.isDesktop ?? false;
        const reduced = conditions.reduced ?? false;

        // Mobile registers nothing at all. The base markup already IS the
        // mobile layout, so there is no work to do and, more importantly,
        // nothing for the revert to have to undo when we come back.
        if (!isDesktop) return;

        const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-mm-card]'));
        const mid = (cards.length - 1) / 2;

        cards.forEach((card, i) => {
          const offset = i - mid;
          const away = Math.abs(offset);
          gsap.set(card, {
            position: 'absolute',
            // Percentages of the CONTAINER, so the fan rescales with the box
            // and no resize listener is needed inside this branch.
            left: `${50 + offset * spread}%`,
            top: `${50 + away * arc}%`,
            xPercent: -50,
            yPercent: -50,
            rotation: offset * tilt,
            zIndex: 100 - Math.round(away * 10),
            transformOrigin: '50% 90%',
          });
        });

        if (reduced) return;

        gsap.from(cards, {
          y: ENTER_Y,
          autoAlpha: 0,
          duration: ENTER_DURATION,
          ease: 'power3.out',
          stagger: ENTER_STAGGER,
        });

        // Parallax lives on `x`; the entrance owns `y` and `autoAlpha`. Two
        // animations on one property means one of them silently loses.
        const setters = cards.map((card) =>
          gsap.quickTo(card, 'x', { duration: PARALLAX_DURATION, ease: 'power3' }),
        );

        const onMove = (e: PointerEvent) => {
          const rect = root.getBoundingClientRect();
          const norm = (e.clientX - rect.left) / rect.width - 0.5;
          setters.forEach((setter, i) => {
            const depth = mid === 0 ? 0 : (i - mid) / mid;
            setter(norm * parallax * depth);
          });
        };
        const onLeave = () => setters.forEach((setter) => setter(0));

        root.addEventListener('pointermove', onMove);
        root.addEventListener('pointerleave', onLeave);

        // A cleanup returned from the callback runs when this branch stops
        // matching, not only on unmount. Without it, the desktop listener
        // survives into the mobile layout and keeps writing transforms to
        // elements that are back in the column.
        return () => {
          root.removeEventListener('pointermove', onMove);
          root.removeEventListener('pointerleave', onLeave);
        };
      },
    );

    // `revert()` restores the inline styles GSAP wrote — including the
    // `position: absolute` — so the base column comes back exactly as
    // authored. `kill()` would stop the tweens but leave the fan frozen in
    // place.
    return () => {
      mm.revert();
    };
  }, [count, breakpoint, spread, arc, tilt, parallax]);
  // #endregion critical

  return (
    <div
      ref={rootRef}
      // Base styles are the mobile layout. Nothing here mentions the
      // breakpoint, because the breakpoint is a JavaScript string above.
      className={cn('relative flex h-full w-full flex-col justify-center gap-3', className)}
    >
      {items.map((child, i) => (
        <div
          key={isValidElement(child) && child.key !== null ? child.key : i}
          data-mm-card
          className={cn('will-change-transform', itemClassName)}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
