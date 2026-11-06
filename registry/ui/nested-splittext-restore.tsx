'use client';

import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { isValidElement, useEffect, useRef, type ReactNode } from 'react';
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

/**
 * A stable string identity for `children`: the text that will be split, plus
 * the element tags the pre-pass above re-emits around every line.
 *
 * React builds a fresh node object on every parent render for anything that is
 * not a bare string, so naming `children` in a dependency array actually says
 * "re-run whenever the parent renders, for any reason at all". Here that is
 * destructive rather than merely wasteful. The cleanup reverts the split and
 * writes `originalHTML` back; the next run re-splits and calls `gsap.from`
 * again; and because `useInView` is `once: true` the gate is still open, so it
 * happens immediately. A reader half way down the paragraph watches it drop
 * back below the mask and rise a second time, and whatever tween was in flight
 * is thrown away with the context that owned it. A sibling toggling a menu is
 * enough to trigger it.
 *
 * Dropping the dependency outright is not the fix either — the split would
 * then describe a paragraph that is no longer on screen. So the node is
 * flattened to the only things the split actually depends on, and that string
 * is the dependency. Same content, same string, no re-run.
 */
function childrenSignature(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') {
    return String(node);
  }
  if (Array.isArray(node)) {
    // A separator that cannot occur in text, so ['ab', 'c'] and ['a', 'bc'] do
    // not collapse onto the same key.
    return (node as ReactNode[]).map(childrenSignature).join('\u0001');
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    // The tag belongs in the signature: `flattenChildrenToLines` clones it
    // around each line, so <h2>Same words</h2> and <p>Same words</p> are two
    // different splits of identical text.
    const { type } = node;
    const tag =
      typeof type === 'string'
        ? type
        : (type as { displayName?: string; name?: string }).displayName ||
          (type as { name?: string }).name ||
          'component';
    return `<${tag}>${childrenSignature(node.props.children)}`;
  }
  // Iterables, portals and promises have no cheap textual identity. A constant
  // under-reports a change, which is the safe direction: the alternative is a
  // fresh value every render, i.e. exactly the bug this function exists to
  // remove.
  return '';
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
  // Compared by value, not by identity. The node itself still goes into the
  // tree below — only the effect's notion of "the content changed" is derived
  // from this string. See `childrenSignature` for what listing `children` here
  // costs.
  const contentKey = childrenSignature(children);

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
    contentKey,
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
