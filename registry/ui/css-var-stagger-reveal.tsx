'use client';

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { cn } from '@/lib/cn';

/* ==========================================================================
   CSS Variable Stagger Reveal
   --------------------------------------------------------------------------
   The cheapest reveal system that is still tunable by a designer.

   JavaScript does exactly two things: it writes `--kx-reveal-index` on each
   target once, and it flips `data-kx-revealed` on a group when the group
   enters the scroll container. Nothing else. No tween, no rAF, no per-element
   inline transition string.

   Everything a designer would want to change — delay per index, duration,
   travel distance, easing — is a custom property. That means retuning the
   choreography is a CSS edit, not a JS edit, and it means the whole system is
   overridable from a stylesheet the component has never heard of. The
   equivalent GSAP stagger hides those numbers inside a call site nobody
   outside the component can reach.

   The delay is one calc:  --kx-reveal-index * --kx-reveal-step.
   ========================================================================== */

/** Lets an inline `style` object carry custom properties without a cast. */
type StyleWithVars = CSSProperties & Record<`--${string}`, string | number>;

export interface CssVarStaggerRevealProps {
  children: ReactNode;
  /**
   * The scroll container the observer measures against. Omit and the
   * component walks up from itself to the nearest scrollable ancestor, which
   * is what makes it work unchanged inside a card, a modal or the document.
   */
  scroller?: RefObject<HTMLElement | null>;
  /** Milliseconds of delay per index step. Written as `--kx-reveal-step`. */
  stepMs?: number;
  /** Transition duration in ms. Written as `--kx-reveal-duration`. */
  durationMs?: number;
  /** Starting offset, any CSS length. Written as `--kx-reveal-distance`. */
  distance?: string;
  /** Transition timing function. Written as `--kx-reveal-ease`. */
  ease?: string;
  /** Fraction of a group that must be visible before it reveals. */
  threshold?: number;
  /** Shrinks the observation box. Negative bottom = "genuinely in view". */
  rootMargin?: string;
  /** Re-hide groups that leave the container again. */
  repeat?: boolean;
  className?: string;
}

const REVEAL_SELECTOR = '[data-reveal]';
const GROUP_SELECTOR = '[data-reveal-group]';

/* Hoisted into <head> once per document by React 19's `<style href precedence>`
   de-duplication, so fifty reveal scopes ship one rule set. */
const REVEAL_CSS = `
[data-kx-reveal-scope] [data-reveal] {
  --kx-reveal-delay: calc(var(--kx-reveal-index, 0) * var(--kx-reveal-step, 90ms));
  opacity: 0;
  transform: translate3d(0, var(--kx-reveal-distance, 28px), 0);
  transition:
    opacity var(--kx-reveal-duration, 700ms) var(--kx-reveal-ease, cubic-bezier(0.22, 1, 0.36, 1)) var(--kx-reveal-delay),
    transform var(--kx-reveal-duration, 700ms) var(--kx-reveal-ease, cubic-bezier(0.22, 1, 0.36, 1)) var(--kx-reveal-delay);
}

/* Three selectors because the revealed marker can land in three places: on a
   declared group inside the scope, on the scope element itself when the
   subtree declares no groups, or on a target that is its own group. Omitting
   the second is the classic silent failure — a scope with no declared
   data-reveal-group children never reveals anything. */
[data-kx-reveal-scope] [data-kx-revealed] [data-reveal],
[data-kx-reveal-scope][data-kx-revealed] [data-reveal],
[data-kx-reveal-scope] [data-reveal][data-kx-revealed] {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

/* The hidden start state is written by CSS, so it applies before hydration.
   If scripting never runs, nothing would ever reveal it — this is the one
   query that turns a progressive enhancement into a blank page otherwise. */
@media (scripting: none) {
  [data-kx-reveal-scope] [data-reveal] {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

/* Reduced motion resolves to the END state, not to a zero-duration version of
   the start state. There is no travel and no delay chain to sit through. */
@media (prefers-reduced-motion: reduce) {
  [data-kx-reveal-scope] [data-reveal] {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
`;

// #region critical
/**
 * Nearest ancestor that actually scrolls. `overflow: auto` on an element that
 * has not overflowed yet still counts — it is the container the reveal will
 * live inside once content arrives, and testing `scrollHeight > clientHeight`
 * on mount would pick the document instead and fire everything at once.
 *
 * Returns `null` for "the viewport", which is the IntersectionObserver
 * `root` value that means the document.
 */
function nearestScrollParent(node: Element | null): Element | null {
  let el = node?.parentElement ?? null;
  while (el) {
    const { overflowY, overflowX } = getComputedStyle(el);
    const scrollable = /(auto|scroll|overlay)/.test(overflowY + overflowX);
    if (scrollable) return el;
    el = el.parentElement;
  }
  return null;
}

export function CssVarStaggerReveal({
  children,
  scroller,
  stepMs = 90,
  durationMs = 700,
  distance = '28px',
  ease = 'cubic-bezier(0.22, 1, 0.36, 1)',
  threshold = 0.15,
  rootMargin = '0px 0px -8% 0px',
  repeat = false,
  className,
}: CssVarStaggerRevealProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rootEl = root.current;
    if (!rootEl) return;

    const groups = Array.from(rootEl.querySelectorAll<HTMLElement>(GROUP_SELECTOR));
    // A subtree with no declared groups is one group: the scope itself.
    const scopes: HTMLElement[] = groups.length > 0 ? groups : [rootEl];

    // Index is per group, not per document. Two sibling groups both start
    // their stagger at zero, so the second one does not inherit a delay the
    // reader never sees the beginning of.
    for (const group of scopes) {
      const targets = group.querySelectorAll<HTMLElement>(REVEAL_SELECTOR);
      targets.forEach((target, i) => {
        target.style.setProperty('--kx-reveal-index', String(i));
      });
    }

    const reveal = (group: HTMLElement) => {
      group.dataset.kxRevealed = 'true';
    };

    // No observer available: reveal rather than leave the content at
    // opacity 0 forever. A missing API must degrade to visible content.
    if (typeof IntersectionObserver === 'undefined') {
      for (const group of scopes) reveal(group);
      return;
    }

    // `undefined` from the prop means "find it"; `null` from the walk means
    // "the document", which is what IntersectionObserver's root expects.
    const container = scroller ? scroller.current : nearestScrollParent(rootEl);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target;
          if (!(target instanceof HTMLElement)) continue;
          if (entry.isIntersecting) {
            reveal(target);
            // One-shot is the default: stop watching immediately so a long
            // page is not still servicing a hundred settled groups.
            if (!repeat) observer.unobserve(target);
          } else if (repeat) {
            delete target.dataset.kxRevealed;
          }
        }
      },
      { root: container ?? null, rootMargin, threshold },
    );

    for (const group of scopes) observer.observe(group);
    return () => observer.disconnect();
  }, [scroller, threshold, rootMargin, repeat]);
  // #endregion critical

  const style: StyleWithVars = {
    '--kx-reveal-step': `${stepMs}ms`,
    '--kx-reveal-duration': `${durationMs}ms`,
    '--kx-reveal-distance': distance,
    '--kx-reveal-ease': ease,
  };

  return (
    <div ref={root} data-kx-reveal-scope="" style={style} className={cn(className)}>
      <style href="kinetic-css-var-stagger-reveal" precedence="medium">
        {REVEAL_CSS}
      </style>
      {children}
    </div>
  );
}
