'use client';

import { useEffect, useState, type RefObject } from 'react';

/* ==========================================================================
   Element size, from one shared ResizeObserver.
   --------------------------------------------------------------------------
   Sized from the element rather than the window because a preview in a grid
   cell resizes when the grid reflows, not when the viewport does. Reading
   `window.innerWidth` is the reason so many canvas components are correct on
   load and wrong after a sidebar opens.
   ========================================================================== */

export interface Size {
  width: number;
  height: number;
}

type Handler = (size: Size) => void;

let observer: ResizeObserver | null = null;
const handlers = new Map<Element, Handler>();

function ensureObserver(): ResizeObserver | null {
  if (typeof ResizeObserver === 'undefined') return null;
  observer ??= new ResizeObserver((entries) => {
    for (const entry of entries) {
      const box = entry.contentBoxSize?.[0];
      const size: Size = box
        ? { width: box.inlineSize, height: box.blockSize }
        : { width: entry.contentRect.width, height: entry.contentRect.height };
      handlers.get(entry.target)?.(size);
    }
  });
  return observer;
}

export function useResizeObserver(ref: RefObject<Element | null>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    const ro = ensureObserver();
    if (!el || !ro) return;

    // Seed synchronously: waiting for the first observer callback leaves one
    // frame where a canvas is sized 0x0, which some drivers log as an error.
    const rect = el.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });

    handlers.set(el, (next) =>
      setSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next,
      ),
    );
    ro.observe(el);

    return () => {
      handlers.delete(el);
      ro.unobserve(el);
    };
  }, [ref]);

  return size;
}
