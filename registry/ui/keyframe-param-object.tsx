'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef, type RefObject } from 'react';
import { cn } from '@/lib/cn';
import { useGsap } from '@/registry/hooks/use-gsap';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { useResizeObserver } from '@/registry/hooks/use-resize-observer';

/* ==========================================================================
   Single Param Object Timeline
   --------------------------------------------------------------------------
   The scroll-driven scene as a data table rather than a pile of tweens.

   One plain object owns every animated quantity:

     { scale, spin, driftX, driftY, glow, dissolve }

   Nothing in the DOM is tweened directly. GSAP tweens the object; a single
   `onUpdate` reads it and writes one transform string and two opacities.
   The "film script" is then just an array of `[sectionId, t, partialParams]`
   rows, and adding a beat to the story is adding a row — not wiring another
   element into another timeline.

   The anchoring is the other half. Each row is pinned to a real section:

     anchor = (section.offsetTop + section.offsetHeight * t - view / 2) / total

   which is "when the point `t` through this section reaches the middle of
   the viewport, expressed as a fraction of the whole scroll". That is what
   keeps the beats attached to the copy when the copy reflows — a row placed
   at a hand-tuned `0.42` drifts off its paragraph the moment a line wraps.
   ========================================================================== */

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

/** Every animated quantity in the scene. Nothing else is tweened. */
export interface StageParams {
  scale: number;
  /** Turns, not degrees — 1 is a full revolution. */
  spin: number;
  /** Percent of the mark's own size. */
  driftX: number;
  driftY: number;
  /** 0-1 opacity of the halo behind the mark. */
  glow: number;
  /** 0-1, subtracted from the mark's opacity. */
  dissolve: number;
}

const REST: StageParams = {
  scale: 1,
  spin: 0,
  driftX: 0,
  driftY: 0,
  glow: 0.35,
  dissolve: 0,
};

export interface KeyframeSection {
  id: string;
  label: string;
  title: string;
  body?: string;
  /**
   * Point through this section, 0-1, at which its keyframe lands. 0.5 is the
   * section's own middle passing the middle of the scroller.
   */
  at?: number;
  /** The params this section moves the scene to. Anything omitted holds. */
  to: Partial<StageParams>;
}

export interface KeyframeParamObjectProps {
  sections: KeyframeSection[];
  /** Seconds of catch-up behind the scroll position. */
  scrub?: number;
  scrollerRef?: RefObject<HTMLElement | null>;
  className?: string;
}

// #region critical
export function KeyframeParamObject({
  sections,
  scrub = 0.8,
  scrollerRef,
  className,
}: KeyframeParamObjectProps) {
  const root = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const halo = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Rebuild the anchor table whenever the column reflows: every anchor is a
  // function of offsetTop, and offsetTop changes when a line wraps.
  const { height } = useResizeObserver(root);

  useGsap(
    gsap,
    () => {
      const container = root.current;
      const markEl = mark.current;
      const haloEl = halo.current;
      if (!container || !markEl || !haloEl) return;

      // The one mutable object. Cloned per build so a rebuild starts clean
      // rather than inheriting wherever the last scrub left it.
      const params: StageParams = { ...REST };

      const render = () => {
        markEl.style.transform =
          `translate3d(${params.driftX}%, ${params.driftY}%, 0) ` +
          `rotate(${params.spin * 360}deg) scale(${params.scale})`;
        markEl.style.opacity = String(Math.max(0, 1 - params.dissolve));
        haloEl.style.opacity = String(params.glow);
        haloEl.style.transform = `scale(${1 + params.glow * 0.6})`;
      };

      if (reduced) {
        // Land on the last keyframe: the end of the story, statically.
        for (const section of sections) Object.assign(params, section.to);
        render();
        return;
      }

      const scroller = scrollerRef?.current ?? null;
      const view = scroller ? scroller.clientHeight : window.innerHeight;
      // Scroll distance the trigger actually covers. Guarded against 0, which
      // would make every anchor Infinity and stack the whole story on frame 1.
      const total = Math.max(1, container.offsetHeight - view);

      const anchor = (el: HTMLElement, t: number) =>
        gsap.utils.clamp(0, 1, (el.offsetTop + el.offsetHeight * t - view / 2) / total);

      const rows = sections
        .map((section) => {
          const el = container.querySelector<HTMLElement>(`[data-keyframe="${section.id}"]`);
          return el ? { at: anchor(el, section.at ?? 0.5), to: section.to } : null;
        })
        .filter((row): row is { at: number; to: Partial<StageParams> } => row !== null)
        // Authoring order is document order, but a custom `at` can reorder
        // them; the timeline needs them sorted to compute each row's span.
        .sort((a, b) => a.at - b.at);

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          scroller: scroller ?? undefined,
          start: 'top top',
          end: 'bottom bottom',
          scrub,
          invalidateOnRefresh: true,
        },
        onUpdate: render,
      });

      rows.forEach((row, i) => {
        const next = rows[i + 1];
        // Each row travels until the next one begins, so the scene is always
        // in motion between beats and never sits finished waiting for the
        // next anchor.
        const span = Math.max(0.001, (next ? next.at : 1) - row.at);
        // `ease: 'none'` — under a scrub the ease warps timeline time, so an
        // eased row arrives at its params before or after its own section.
        timeline.to(params, { ...row.to, duration: span, ease: 'none' }, row.at);
      });

      render();
    },
    root,
    [sections, scrub, scrollerRef, reduced, height],
  );
  // #endregion critical

  return (
    <div ref={root} className={cn('relative', className)}>
      {/* Sticky, not fixed: the stage tracks the scroller it lives in and
          stops at the end of the column instead of the end of the page. */}
      <div className="sticky top-0 flex h-[60vh] items-center justify-center overflow-hidden">
        <div
          ref={halo}
          aria-hidden
          className="absolute h-32 w-32 rounded-full bg-accent blur-2xl"
          style={{ opacity: REST.glow }}
        />
        <div
          ref={mark}
          aria-hidden
          className="relative h-24 w-24 rounded-lg border border-line-strong bg-surface will-change-transform"
        >
          <div className="absolute inset-3 rounded border border-accent" />
          <div className="absolute inset-x-3 top-1/2 h-px bg-accent" />
        </div>
      </div>

      <div className="relative -mt-[30vh] flex flex-col gap-[45vh] pb-[30vh]">
        {sections.map((section) => (
          <section key={section.id} data-keyframe={section.id} className="max-w-[34ch]">
            <p className="meta">{section.label}</p>
            <h3 className="mt-1.5 text-base leading-snug tracking-tight text-fg">
              {section.title}
            </h3>
            {section.body !== undefined && (
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{section.body}</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
