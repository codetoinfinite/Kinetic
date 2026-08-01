'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';

/* ==========================================================================
   Banded Scrollspy Rail
   --------------------------------------------------------------------------
   Every naive scrollspy has the same bug: with a full-height detection box,
   three sections are intersecting at once on a tall screen and the "active"
   one flickers between them as you scroll. The fix is not debouncing — it is
   shrinking the observation box until only one section can be inside it.

   `rootMargin: "-38% 0px -55% 0px"` leaves a 7%-tall horizontal band across
   the middle of the scroller (100 − 38 − 55 = 7). A section is active only
   while it crosses that band, so the state changes once per boundary and the
   ambiguity is gone by construction rather than by timer.

   No animation library: the indicator is a CSS width transition, the
   detection is one IntersectionObserver, and the retirement of the rail at
   the end of the document is a second one.
   ========================================================================== */

export interface ScrollspySection {
  /** Matches `data-scrollspy="<id>"` on the section element. */
  id: string;
  label: string;
}

export interface BandedScrollspyRailProps {
  sections: ScrollspySection[];
  /** The scroll container holding the sections. Omit for the document. */
  rootRef?: RefObject<HTMLElement | null>;
  /** Percent of the root trimmed from the top to form the band. */
  bandTop?: number;
  /** Percent trimmed from the bottom. `bandTop + bandBottom` must stay under 100. */
  bandBottom?: number;
  /** Section id after which the rail retires. Usually the footer or last section. */
  endId?: string;
  /** Fraction down the root the end marker must pass before the rail hides. */
  hideAt?: number;
  /** Attribute used to find sections inside the root. */
  attribute?: string;
  onActiveChange?: (id: string | null) => void;
  className?: string;
}

// #region critical
const ACTIVE_WIDTH = 32;
const IDLE_WIDTH = 16;
const TRANSITION_MS = 260;

export function BandedScrollspyRail({
  sections,
  rootRef,
  bandTop = 38,
  bandBottom = 55,
  endId,
  hideAt = 0.75,
  attribute = 'data-scrollspy',
  onActiveChange,
  className,
}: BandedScrollspyRailProps) {
  const [active, setActive] = useState<string | null>(null);
  const [retired, setRetired] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const reduced = useReducedMotion();

  // Held in refs so a new array literal or a fresh callback on every parent
  // render does not tear down and rebuild the observers.
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const notify = useRef(onActiveChange);
  notify.current = onActiveChange;

  const order = sections.map((s) => s.id).join('|');

  useEffect(() => {
    const root = rootRef?.current ?? null;
    const scope: ParentNode = root ?? document;

    // Build id -> element by walking the attribute once, rather than running a
    // `[attr="id"]` selector per section: that needs escaping for any id with
    // punctuation in it, and silently matches nothing when the escaping is
    // wrong.
    const elements = new Map<string, Element>();
    for (const el of Array.from(scope.querySelectorAll(`[${attribute}]`))) {
      const id = el.getAttribute(attribute);
      if (id) elements.set(id, el);
    }
    if (elements.size === 0) return;

    const inBand = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute(attribute);
          if (!id) continue;
          if (entry.isIntersecting) inBand.add(id);
          else inBand.delete(id);
        }

        // Resolve in authored order, not entry order: callbacks arrive in
        // whatever order the observer batched them, so picking `entries[0]`
        // makes the active section depend on scroll direction.
        const next = sectionsRef.current.find((s) => inBand.has(s.id))?.id;

        // Nothing in the band — a gap between sections, or a header taller
        // than the band. Hold the last answer instead of blanking the rail,
        // which would read as the nav breaking.
        if (next === undefined) return;

        setActive((prev) => {
          if (prev === next) return prev;
          notify.current?.(next);
          return next;
        });
      },
      {
        root,
        // The band. 100 - bandTop - bandBottom percent of the root's height,
        // centred low enough that a section is "active" while you are reading
        // it rather than while it is still arriving.
        rootMargin: `-${bandTop}% 0px -${bandBottom}% 0px`,
        threshold: 0,
      },
    );

    for (const el of elements.values()) observer.observe(el);

    // Second observer: retire the rail once the end marker has climbed past
    // `hideAt`, so it is not hovering over a footer with nothing left to
    // navigate. Shrinking the bottom margin by (1 - hideAt) makes
    // "intersecting" mean exactly "its top is above hideAt of the root".
    let endObserver: IntersectionObserver | null = null;
    const endEl = endId === undefined ? undefined : elements.get(endId);
    if (endEl) {
      endObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          if (entry) setRetired(entry.isIntersecting);
        },
        { root, rootMargin: `0px 0px -${Math.round((1 - hideAt) * 100)}% 0px`, threshold: 0 },
      );
      endObserver.observe(endEl);
    }

    return () => {
      observer.disconnect();
      endObserver?.disconnect();
    };
  }, [rootRef, attribute, bandTop, bandBottom, endId, hideAt, order]);
  // #endregion critical

  const go = (id: string) => {
    const root = rootRef?.current ?? null;
    const scope: ParentNode = root ?? document;
    const target = Array.from(scope.querySelectorAll(`[${attribute}]`)).find(
      (el) => el.getAttribute(attribute) === id,
    );
    target?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <nav
      aria-label="Sections"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={() => setExpanded(false)}
      className={cn(
        'flex flex-col gap-3',
        retired && 'pointer-events-none',
        className,
      )}
      style={{
        opacity: retired ? 0 : 1,
        transition: reduced ? 'none' : `opacity ${TRANSITION_MS}ms var(--ease-out-quart, ease-out)`,
      }}
    >
      {sections.map((section) => {
        const isActive = section.id === active;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => go(section.id)}
            aria-current={isActive ? 'true' : undefined}
            className="group flex items-center gap-3 text-left"
          >
            <span
              aria-hidden
              className={cn('h-px shrink-0', isActive ? 'bg-fg' : 'bg-faint')}
              style={{
                // Width, not colour alone. A 16 -> 32px size change is legible
                // in peripheral vision while reading; a tint change is not.
                width: isActive ? ACTIVE_WIDTH : IDLE_WIDTH,
                transition: reduced
                  ? 'none'
                  : `width ${TRANSITION_MS}ms var(--ease-out-quart, ease-out), background-color ${TRANSITION_MS}ms linear`,
              }}
            />
            <span
              className={cn(
                'meta whitespace-nowrap',
                isActive ? 'text-fg' : 'text-faint',
              )}
              style={{
                opacity: expanded ? 1 : 0,
                transform: expanded ? 'none' : 'translateX(-4px)',
                transition: reduced
                  ? 'none'
                  : `opacity ${TRANSITION_MS}ms ease-out, transform ${TRANSITION_MS}ms var(--ease-out-quart, ease-out)`,
              }}
            >
              {section.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
