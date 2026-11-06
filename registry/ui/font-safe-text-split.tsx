'use client';

import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { isValidElement, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Font-Safe Text Splitting
   --------------------------------------------------------------------------
   This is the component every other split effect depends on being right.

   Splitting into lines is a measurement. The browser lays the text out, you
   read where the line boxes fell, and you wrap each one. Do that before the
   webfont has arrived and you have measured the *fallback* face — which has
   different advance widths, so the lines break in different places. When the
   real font swaps in, the line wrappers do not re-flow: they are now fixed
   boxes containing text that no longer fits them. With `mask: 'lines'` the
   overflow is clipped, so the symptom is a paragraph with words sliced in half
   by an invisible edge, and it only reproduces on a cold cache.

   Three things fix it, and all three are needed:

     1. `await document.fonts.ready` before the first split.
     2. A `loadingdone` listener, because a font requested later — by a lazy
        section, an icon set, a second weight — fires another layout pass.
     3. A debounced re-split on resize, because line breaks are a function of
        container width and nothing else recomputes them.

   The resize guard is width-only. On iOS the URL bar collapsing changes the
   viewport *height* and fires a resize; re-splitting there does nothing but
   destroy and rebuild the DOM mid-scroll, which drops frames on exactly the
   device least able to spare them.

   Every split calls `ScrollTrigger.refresh()` afterwards. The paragraph's
   height changes when lines are wrapped, so every trigger positioned below it
   on the page is now measuring against stale coordinates.
   ========================================================================== */

export interface FontSafeTextSplitProps {
  /** Text or markup to split into lines. */
  children: ReactNode;
  /** SplitText `type`. `'lines'` is what the mask and the re-split are for. */
  type?: string;
  /** Wrap each line in an overflow-hidden box. */
  mask?: boolean;
  /** Percent of a line's height it starts below the mask. */
  y?: number;
  duration?: number;
  stagger?: number;
  /** ScrollTrigger `start` for the reveal. */
  start?: string;
  /** Scroll container, when the text is not in the document scroller. */
  scroller?: Element | null;
  /** ms of quiet after the last resize before re-splitting. */
  debounceMs?: number;
  className?: string;
}

// #region critical
const Y = 110;
const DURATION = 0.9;
const STAGGER = 0.09;
const START = 'top 88%';
const DEBOUNCE_MS = 200;

/**
 * A stable string identity for `children`: the text that will be measured and
 * split, plus the element tags inside it.
 *
 * React builds a fresh node object on every parent render for anything that is
 * not a bare string, so naming `children` in a dependency array actually says
 * "tear the whole lifecycle down and rebuild it whenever the parent renders,
 * for any reason at all". That costs more than a wasted split here. `revealed`
 * is a local of the effect, so a rebuild resets it to false; the `once: true`
 * ScrollTrigger is then recreated on an element already past its start and
 * fires `onEnter` straight away. A paragraph the reader is half way through
 * drops back below the mask and plays its entrance a second time, and the
 * tween that was running is discarded with the context that owned it. A
 * sibling toggling a menu is enough to trigger it.
 *
 * Dropping the dependency outright is not the fix either — the line wrappers
 * would go on describing text that is no longer there. So the node is
 * flattened to the only things a line measurement depends on, and that string
 * is the dependency. Same content, same string, no re-split.
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
    // The tag belongs in the signature. SplitText walks the markup it is given,
    // and an <em>, a <strong> or a <br> moves the line boxes even when the text
    // reads exactly the same.
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

export function FontSafeTextSplit({
  children,
  type = 'lines',
  mask = true,
  y = Y,
  duration = DURATION,
  stagger = STAGGER,
  start = START,
  scroller = null,
  debounceMs = DEBOUNCE_MS,
  className,
}: FontSafeTextSplitProps) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Compared by value, not by identity. The node itself still goes into the
  // tree below — only the effect's notion of "the content changed" is derived
  // from this string. See `childrenSignature` for what listing `children` here
  // costs.
  const contentKey = childrenSignature(children);

  useEffect(() => {
    const el = root.current;
    // Reduced motion never splits. The markup React rendered is the finished
    // state, so the entire font/resize lifecycle below is unnecessary work.
    if (!el || reduced) return;

    gsap.registerPlugin(ScrollTrigger, SplitText);

    let cancelled = false;
    let split: SplitText | null = null;
    let ctx: gsap.Context | null = null;
    let timer = 0;
    // Once the lines have been revealed, a re-split must render them at their
    // final position. Replaying the entrance because the user rotated their
    // phone is the classic symptom of a re-split that forgot it had run.
    let revealed = false;
    // Last measured *width*. Height changes are ignored on purpose.
    let lastWidth = Math.round(el.getBoundingClientRect().width);

    const teardown = () => {
      ctx?.revert();
      ctx = null;
      split?.revert();
      split = null;
    };

    const apply = () => {
      if (cancelled) return;
      teardown();

      const s = new SplitText(el, {
        type,
        mask: mask ? 'lines' : undefined,
        linesClass: 'kinetic-fs-line',
        // SplitText restores the original text for assistive technology.
        // Without it a screen reader announces one fragment per line box.
        aria: 'auto',
      });
      split = s;

      ctx = gsap.context(() => {
        if (revealed) {
          // Already seen. Land the new line boxes in their final state.
          gsap.set(s.lines, { yPercent: 0, opacity: 1 });
          return;
        }
        gsap.from(s.lines, {
          yPercent: y,
          duration,
          stagger,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            scroller: scroller ?? undefined,
            start,
            once: true,
            onEnter: () => {
              revealed = true;
            },
          },
        });
      }, el);

      // Wrapping lines changes this element's height, so every trigger below
      // it on the page is now measuring against stale coordinates.
      ScrollTrigger.refresh();
    };

    // 1. The first split waits for the fonts the document already knows about.
    void document.fonts.ready.then(apply);

    // 2. A font requested later — a lazy section, a second weight, an icon
    //    face — triggers another layout pass that moves the line breaks.
    const onFontsDone = () => apply();
    document.fonts.addEventListener('loadingdone', onFontsDone);

    // 3. Line breaks are a function of container width. Nothing else
    //    recomputes them, so a resize without a re-split leaves the wrappers
    //    describing a layout that no longer exists.
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = Math.round(entry.contentRect.width);
      // Width-only. iOS fires resize when the URL bar collapses, which changes
      // height only; re-splitting there rebuilds the DOM mid-scroll for
      // nothing and drops frames on the device least able to spare them.
      if (width === lastWidth) return;
      lastWidth = width;
      window.clearTimeout(timer);
      timer = window.setTimeout(apply, debounceMs);
    });
    ro.observe(el);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      ro.disconnect();
      document.fonts.removeEventListener('loadingdone', onFontsDone);
      teardown();
    };
  }, [
    contentKey,
    type,
    mask,
    y,
    duration,
    stagger,
    start,
    scroller,
    debounceMs,
    reduced,
  ]);
  // #endregion critical

  return (
    <div ref={root} className={cn('w-full', className)}>
      {children}
    </div>
  );
}
