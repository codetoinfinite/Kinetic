'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/* ==========================================================================
   IntersectionObserver, sharing one observer per option set.
   --------------------------------------------------------------------------
   A hundred cards each constructing their own observer is a hundred observers
   the compositor has to service. Keying a shared observer by its options
   collapses that to one per distinct configuration — in practice, two or
   three for the whole site.
   ========================================================================== */

export interface InViewState {
  inView: boolean;
  /** 0-1. The preview slot allocator ranks candidates by this. */
  ratio: number;
}

export interface UseInViewOptions {
  root?: Element | null;
  rootMargin?: string;
  /** Single number or list, same meaning as the native option. */
  threshold?: number | number[];
  /** Stop observing after the first time it becomes visible. */
  once?: boolean;
}

type Entry = {
  observer: IntersectionObserver;
  handlers: Map<Element, (e: IntersectionObserverEntry) => void>;
};

const pools = new Map<string, Entry>();

function poolFor(options: UseInViewOptions): Entry {
  const key = JSON.stringify({
    rootMargin: options.rootMargin ?? '0px',
    threshold: options.threshold ?? 0,
  });
  const existing = pools.get(key);
  if (existing) return existing;

  const handlers = new Map<Element, (e: IntersectionObserverEntry) => void>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) handlers.get(entry.target)?.(entry);
    },
    {
      root: options.root ?? null,
      rootMargin: options.rootMargin ?? '0px',
      threshold: options.threshold ?? 0,
    },
  );
  const created: Entry = { observer, handlers };
  pools.set(key, created);
  return created;
}

export function useInView(
  ref: RefObject<Element | null>,
  options: UseInViewOptions = {},
): InViewState {
  const [state, setState] = useState<InViewState>({ inView: false, ratio: 0 });
  const { root = null, rootMargin = '0px', once = false } = options;
  const thresholdKey = JSON.stringify(options.threshold ?? 0);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (once && done.current) return;

    const pool = poolFor({
      root,
      rootMargin,
      threshold: JSON.parse(thresholdKey) as number | number[],
    });

    const handle = (entry: IntersectionObserverEntry) => {
      setState({ inView: entry.isIntersecting, ratio: entry.intersectionRatio });
      if (once && entry.isIntersecting) {
        done.current = true;
        pool.handlers.delete(el);
        pool.observer.unobserve(el);
      }
    };

    pool.handlers.set(el, handle);
    pool.observer.observe(el);

    return () => {
      pool.handlers.delete(el);
      pool.observer.unobserve(el);
    };
  }, [ref, root, rootMargin, thresholdKey, once]);

  return state;
}
