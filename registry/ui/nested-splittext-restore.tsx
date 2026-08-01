'use client';

import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useInView } from '@/registry/hooks/use-in-view';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Nested Split With True Restore
   --------------------------------------------------------------------------
   Splitting text destroys the markup inside it. A paragraph containing an
   <em> and an <a> goes into SplitText as semantic HTML and comes out as a
   flat pile of <div>s — the emphasis is gone, the link is gone, and the
   screen reader has lost the only structure it had. `revert()` is supposed to
   undo that, and it does, but only back to the string SplitText itself
   captured. Do any pre-processing before constructing it — as nested splitting
   requires — and `revert()` faithfully restores your *intermediate* markup.

   So the restore is captured first and reapplied last:

     const originalHTML = el.innerHTML;   // before anything touches the DOM
     ...nested pre-pass, split, animate...
     split.revert();
     el.innerHTML = originalHTML;         // the actual guarantee

   The acceptance criterion is exact: after teardown, `el.innerHTML` is
   byte-identical to what it was before the split. Not "looks the same" —
   identical, tags, attributes, whitespace and all.

   The nested pre-pass is the part most implementations get wrong. Splitting a
   container whose children are block elements gives lines that have lost the
   children's tags. Instead each child is split into lines on its own, and each
   line is re-emitted inside a *shallow clone of that child* — same tag, same
   classes, no content — so a heading's line is still a heading.
   ========================================================================== */

export interface NestedSplitRestoreProps {
  /** Markup to split. Element children are preserved through the pre-pass. */
  children: ReactNode;
  /** SplitText `type`. Lines are what the mask and the reveal use. */
  type?: string;
  /** Wrap each line in an overflow-hidden box so it rises out of nothing. */
  mask?: boolean;
  /** Run the per-child pre-pass. Off for a single flat paragraph. */
  nested?: boolean;
  /** Percent of a line's height it starts below the mask. */
  y?: number;
  duration?: number;
  stagger?: number;
  delay?: number;
  startOnView?: boolean;
  className?: string;
}

// #region critical
const Y = 110;
const DURATION = 0.9;
const STAGGER = 0.08;
const VIEW_THRESHOLD = 0.25;

/**
 * Replace each element child of `host` with one shallow clone per visual line.
 * Text nodes sitting directly under `host` are left alone — they have no tag
 * to preserve, so the outer split handles them correctly already.
 */
function flattenChildrenToLines(host: HTMLElement): void {
  for (const child of Array.from(host.children)) {
    if (!(child instanceof HTMLElement)) continue;

    const inner = new SplitText(child, { type: 'lines' });
    // Read the line markup while the split is live, then put the child back
    // exactly as it was. Reading after revert would read the un-split child.
    const lines = inner.lines.map((line) => line.innerHTML);
    inner.revert();

    for (const markup of lines) {
      // cloneNode(false) — the tag and every attribute, none of the content.
      // cloneNode(true) would duplicate the child's entire text into each line.
      const clone = child.cloneNode(false);
      if (!(clone instanceof HTMLElement)) continue;
      clone.innerHTML = markup;
      host.insertBefore(clone, child);
    }
    host.removeChild(child);
  }
}

export function NestedSplitRestore({
  children,
  type = 'lines',
  mask = true,
  nested = true,
  y = Y,
  duration = DURATION,
  stagger = STAGGER,
  delay = 0,
  startOnView = true,
  className,
}: NestedSplitRestoreProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { inView } = useInView(root, { threshold: VIEW_THRESHOLD, once: true });

  useEffect(() => {
    const el = root.current;
    // Reduced motion never splits at all. The markup React rendered is the
    // finished state, and leaving it untouched is both the accessible answer
    // and the fast one.
    if (!el || reduced) return;
    if (startOnView && !inView) return;

    gsap.registerPlugin(SplitText);

    // Captured before the pre-pass, not after. This string is the contract.
    const originalHTML = el.innerHTML;

    let cancelled = false;
    let split: SplitText | null = null;
    let ctx: gsap.Context | null = null;

    const build = () => {
      if (cancelled) return;

      if (nested) flattenChildrenToLines(el);

      const s = new SplitText(el, {
        type,
        mask: mask ? 'lines' : undefined,
        linesClass: 'kinetic-split-line',
        // SplitText restores the original text to the accessibility tree
        // itself; without this the reveal is read out one line per node.
        aria: 'auto',
      });
      split = s;

      ctx = gsap.context(() => {
        gsap.from(s.lines, {
          yPercent: y,
          duration,
          stagger,
          delay,
          ease: 'power3.out',
        });
      }, el);
    };

    // Measuring line boxes before the webfont arrives measures the fallback,
    // so the lines break in the wrong places and never re-flow. See
    // `font-safe-text-split` for the full resize and late-font lifecycle.
    void document.fonts.ready.then(build);

    return () => {
      cancelled = true;
      // Order matters. The context reverts the tween's inline styles while the
      // split nodes still exist; reverting the split first would leave those
      // styles orphaned on nodes GSAP can no longer find.
      ctx?.revert();
      split?.revert();
      // The true restore. Only writes when something actually differs, so the
      // no-pre-pass case hands React back the very nodes it created.
      if (el.innerHTML !== originalHTML) el.innerHTML = originalHTML;
    };
  }, [
    children,
    type,
    mask,
    nested,
    y,
    duration,
    stagger,
    delay,
    startOnView,
    inView,
    reduced,
  ]);
  // #endregion critical

  return (
    <div ref={root} className={cn('w-full', className)}>
      {children}
    </div>
  );
}
