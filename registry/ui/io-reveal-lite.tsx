'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type RefObject,
} from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   IntersectionObserver Reveal — the lightweight sibling
   --------------------------------------------------------------------------
   One element, one reveal, no stylesheet, no animation library, no rAF. The
   transition is an inline string built once from four numbers; the observer is
   shared across every instance that asks for the same root and the same box,
   so two hundred of these cost one IntersectionObserver rather than two
   hundred.

   That sharing is the entire reason to reach for this instead of a GSAP
   reveal. A GSAP system gives you scrubbing, timelines, and per-element
   control you can measure against a container animation. This gives you a
   fade-and-rise for the price of an attribute, and it is the right choice for
   the ninety per cent of a page where that is all the reveal needs to be.

   Sharing has one rule: the pool key must include the root. Keying only on
   `rootMargin` and `threshold` means the first instance to mount decides which
   container everyone measures against, and every later instance in a different
   scroll panel silently reports "in view" from the start.
   ========================================================================== */

export interface IoRevealProps {
  children: ReactNode;
  /**
   * Scroll container the observer measures against. Omit and the component
   * walks up to the nearest scrollable ancestor, so it works unchanged inside
   * a card, a modal, or the document.
   */
  scroller?: RefObject<HTMLElement | null>;
  /** Seconds of delay. This is how you stagger: give siblings 0, 0.08, 0.16. */
  delay?: number;
  /** Seconds of travel and fade. */
  duration?: number;
  /** Starting offset in px. Positive means it rises into place. */
  distance?: number;
  /** Any CSS timing function. */
  ease?: string;
  /** Fraction of the element that must be visible before it fires. */
  threshold?: number;
  /** Observation box inset. The negative bottom means "genuinely in view". */
  rootMargin?: string;
  /** Reveal once and stop observing, or re-hide on the way out. */
  repeat?: boolean;
  /** Element to render. `span` for inline content, `li` inside a list. */
  as?: ElementType;
  className?: string;
}

const DURATION = 0.7;
const DISTANCE = 28;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const THRESHOLD = 0.15;
const ROOT_MARGIN = '0px 0px -8% 0px';

// #region critical
/* --------------------------------------------------------------------------
   The shared observer pool.

   Keyed by root element first, then by the option string. `null` is a legal
   key in a Map, which is what lets "the viewport" share a bucket with itself
   without a sentinel value. Each bucket refcounts its targets and the
   observer is disconnected when the last one leaves, so a route change does
   not leave observers watching detached nodes.
   -------------------------------------------------------------------------- */
type Handler = (entry: IntersectionObserverEntry) => void;

interface Bucket {
  observer: IntersectionObserver;
  handlers: Map<Element, Handler>;
}

const pools = new Map<Element | null, Map<string, Bucket>>();

function bucketFor(root: Element | null, rootMargin: string, threshold: number): Bucket {
  let byOptions = pools.get(root);
  if (!byOptions) {
    byOptions = new Map<string, Bucket>();
    pools.set(root, byOptions);
  }
  const key = `${rootMargin}|${threshold}`;
  const existing = byOptions.get(key);
  if (existing) return existing;

  const handlers = new Map<Element, Handler>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) handlers.get(entry.target)?.(entry);
    },
    { root, rootMargin, threshold },
  );
  const bucket: Bucket = { observer, handlers };
  byOptions.set(key, bucket);
  return bucket;
}

function release(root: Element | null, rootMargin: string, threshold: number): void {
  const byOptions = pools.get(root);
  if (!byOptions) return;
  const key = `${rootMargin}|${threshold}`;
  const bucket = byOptions.get(key);
  if (!bucket || bucket.handlers.size > 0) return;
  bucket.observer.disconnect();
  byOptions.delete(key);
  if (byOptions.size === 0) pools.delete(root);
}

/**
 * Nearest ancestor that actually scrolls. An `overflow: auto` element that has
 * not overflowed yet still counts: it is the container this reveal will live
 * inside once content arrives. Returning `null` means the viewport, which is
 * the value IntersectionObserver's `root` already uses for that.
 */
function nearestScrollParent(node: Element | null): Element | null {
  let el = node?.parentElement ?? null;
  while (el) {
    const { overflowY, overflowX } = getComputedStyle(el);
    if (/(auto|scroll|overlay)/.test(overflowY + overflowX)) return el;
    el = el.parentElement;
  }
  return null;
}

export function IoReveal({
  children,
  scroller,
  delay = 0,
  duration = DURATION,
  distance = DISTANCE,
  ease = EASE,
  threshold = THRESHOLD,
  rootMargin = ROOT_MARGIN,
  repeat = false,
  as,
  className,
}: IoRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    if (typeof IntersectionObserver === 'undefined') {
      // A missing API degrades to visible content, never to a blank page.
      setRevealed(true);
      return;
    }

    const root = scroller ? scroller.current : nearestScrollParent(el);
    const bucket = bucketFor(root, rootMargin, threshold);

    const handle: Handler = (entry) => {
      if (entry.isIntersecting) {
        setRevealed(true);
        if (!repeat) {
          bucket.handlers.delete(el);
          bucket.observer.unobserve(el);
        }
      } else if (repeat) {
        setRevealed(false);
      }
    };

    bucket.handlers.set(el, handle);
    bucket.observer.observe(el);

    return () => {
      bucket.handlers.delete(el);
      bucket.observer.unobserve(el);
      // Refcounted: the observer only dies with its last target. Disconnecting
      // per instance would tear the shared observer out from under every other
      // reveal in the same container.
      release(root, rootMargin, threshold);
    };
  }, [scroller, rootMargin, threshold, repeat, reduced]);

  /* Reduced motion is a different render, not a faster one: no transition
     property is emitted at all, and the element is at its resolved end state
     from the first paint. */
  const style: CSSProperties = reduced
    ? {}
    : {
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translate3d(0, 0, 0)' : `translate3d(0, ${distance}px, 0)`,
        // One string, two properties, one shared delay. Written inline on
        // purpose: this variant ships no stylesheet, so there is nothing for a
        // consumer's CSS to load and nothing to hoist.
        transition: `opacity ${duration}s ${ease} ${delay}s, transform ${duration}s ${ease} ${delay}s`,
        willChange: revealed ? undefined : 'opacity, transform',
      };
  // #endregion critical

  const Tag = (as ?? 'div') as ElementType;

  return (
    <Tag ref={ref} data-kx-revealed={reduced || revealed ? '' : undefined} style={style} className={cn(className)}>
      {children}
    </Tag>
  );
}
