'use client';

import { Activity, Suspense, useEffect, useId, useRef, useState } from 'react';

import { PREVIEWS } from '@/__generated__/previews';
import { useInView } from '@/registry/hooks/use-in-view';
import { claim, priority, update } from '@/lib/preview-budget';
import { MotifPoster } from '@/components/preview/motif';
import { PreviewErrorBoundary } from '@/components/preview/preview-error';
import type { Cost, Motif } from '@/scripts/schema';
import { cn } from '@/lib/cn';

/* ==========================================================================
   The one place a preview is allowed to come alive.
   --------------------------------------------------------------------------
   Two mechanisms, and both are load-bearing:

   `everLive` — the subtree is not rendered at all until this preview has been
   granted a slot for the first time. This is not an optimisation. A hidden
   <Activity> still PRE-RENDERS its children, and pre-rendering a React.lazy
   child is enough to trigger the chunk download. Without the gate, scrolling
   past forty cards downloads forty demo chunks and, for the WebGL ones, the
   three.js bundle they each pull in.

   <Activity mode="hidden"> — once it has been live, hiding it destroys the
   subtree's Effects while preserving its state and DOM. That is exactly the
   semantics wanted here: the WebGL cleanup function runs, the GL context is
   released back to the budget, and if the card is granted a slot again the
   scene rebuilds from state that never went away. Unmounting instead would
   lose the state; leaving it mounted would leak the context.
   ========================================================================== */

export interface PreviewHostProps {
  slug: string;
  cost: Cost;
  motif: Motif;
  /**
   * A detail page's own preview outranks everything in the grid behind it,
   * and stays live regardless of hover.
   */
  focused?: boolean;
  className?: string;
}

export function PreviewHost({ slug, cost, motif, focused = false, className }: PreviewHostProps) {
  const ref = useRef<HTMLDivElement>(null);
  const instanceId = useId();
  const { ratio } = useInView(ref, { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '96px' });
  const [hovered, setHovered] = useState(false);
  const [live, setLive] = useState(false);
  const [everLive, setEverLive] = useState(false);

  // `css` previews cost nothing to run and everything to fake — a static
  // poster where a pure-CSS animation would have worked is a worse preview
  // for no saving. They bypass the budget entirely.
  const budgeted = cost !== 'css';

  useEffect(() => {
    if (!budgeted) {
      setLive(true);
      setEverLive(true);
      return;
    }
    return claim({ id: instanceId, cost, weight: 0 }, (granted) => {
      setLive(granted);
      if (granted) setEverLive(true);
    });
  }, [instanceId, cost, budgeted]);

  useEffect(() => {
    if (!budgeted) return;
    update(instanceId, priority(ratio, { hovered, focused }));
  }, [instanceId, ratio, hovered, focused, budgeted]);

  const Demo = PREVIEWS[slug];
  // `slug` is what varies the poster: the motif alone would draw one identical
  // plate for every component in its family (37 of them, for `stack`).
  const poster = <MotifPoster motif={motif} slug={slug} />;

  return (
    <div
      ref={ref}
      data-preview={slug}
      data-live={live}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={cn(
        'relative isolate overflow-hidden bg-bg-subtle',
        // Contain layout and paint so a preview that writes to `transform` or
        // grows a child cannot reflow the grid around it.
        '[contain:layout_paint]',
        className,
      )}
    >
      {/* Poster sits underneath permanently: it covers the gap between a slot
          being granted and the lazy chunk arriving, with no layout shift. */}
      <div
        aria-hidden={live}
        className={cn(
          'absolute inset-0 transition-opacity duration-500',
          live ? 'opacity-0' : 'opacity-100',
        )}
      >
        {poster}
      </div>

      {everLive && Demo !== undefined ? (
        <PreviewErrorBoundary slug={slug} fallback={poster}>
          <Activity mode={live ? 'visible' : 'hidden'}>
            <Suspense fallback={null}>
              <div data-demo={slug} className="absolute inset-0">
                <Demo />
              </div>
            </Suspense>
          </Activity>
        </PreviewErrorBoundary>
      ) : null}
    </div>
  );
}
