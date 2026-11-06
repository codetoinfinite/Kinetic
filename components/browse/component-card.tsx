'use client';

import Link from 'next/link';
import { useState } from 'react';

import { CATEGORY_LABEL, type ManifestEntry } from '@/__generated__/manifest';
import { RUNTIME, TIER_TICKS } from '@/components/browse/runtime';
import { PreviewHost } from '@/components/preview/preview-host';
import { cn } from '@/lib/cn';
import type { Motif } from '@/scripts/schema';

/* ==========================================================================
   One tile.
   --------------------------------------------------------------------------
   Three bands — preview, name, provenance — divided by full-bleed hairlines,
   so a wall of 119 of them reads as a table of contents rather than as 119
   identical rectangles. Depth is `.panel` (surface, inner top highlight,
   elevation) plus `.lift` on hover; nothing here rolls its own shadow.

   The live signal. `PreviewHost` sets `data-live` when the GPU budget actually
   grants this preview a slot, which on a 119-tile grid is true for a handful at
   a time. The runtime meter reads that attribute through `:has()` — a live tile
   lights its meter in the category accent. Styling the attribute costs one
   selector; mirroring it into React state would be a second copy of a fact that
   could only ever disagree with the first.

   A stretched link, not a link around the tile. The tile shows a live demo,
   and a demo is allowed to render its own <a> — a link button, a nav, a card
   with a "Read more" — which inside a wrapping <a> is invalid nesting that
   React reports on every mount. So the tile is a plain box and the title's
   link stretches over it with an ::after. Two consequences, both handled here:
   the overlay sits above the preview, so the preview cannot see the pointer
   and is told about hover instead; and the demo is `inert`, because it was
   never meant to be operable from the grid and would otherwise add every one
   of its controls to the page's tab order.
   ========================================================================== */

export interface ComponentCardProps {
  entry: ManifestEntry;
  /**
   * Filtered and searched results have no section heading above them, so the
   * tile has to say which category it came from.
   */
  showCategory?: boolean;
}

export function ComponentCard({ entry, showCategory = false }: ComponentCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      data-category={entry.category}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={cn(
        'rise panel lift group/card relative flex h-full flex-col overflow-hidden rounded-sm',
        // `.lift` declares will-change:transform, which is right for a handful
        // of panels and wrong for 119 — every hint is a standing request for a
        // compositor layer. Hover is early enough: the transform has not begun.
        'will-change-auto hover:will-change-transform',
        // The focus ring belongs to the tile, not to the title text the link
        // wraps. Drawn here because `overflow-hidden` would clip it on the
        // ::after overlay.
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-accent',
      )}
    >
      {/* The motion the grid was missing: the tile's top edge draws itself in
          the category accent, right to left, on hover and on keyboard focus.
          One compositor-only property, on the same 200ms as the lift, so the
          two read as one gesture. */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 z-10 h-px origin-right scale-x-0 bg-accent',
          'transition-transform duration-control ease-out-quart',
          'group-hover/card:origin-left group-hover/card:scale-x-100',
          'group-has-[a:focus-visible]/card:origin-left group-has-[a:focus-visible]/card:scale-x-100',
        )}
      />

      <div inert>
        <PreviewHost
          slug={entry.slug}
          cost={entry.cost}
          motif={entry.motif as Motif}
          kit={entry.kit}
          category={entry.category}
          hovered={hovered}
          // Skip layout and paint for the previews that are off screen, which is
          // most of them. Safe on this element specifically because only imagery
          // lives inside it: Safari's find-in-page cannot see text in a skipped
          // subtree, and every word on the tile is outside this box.
          className="aspect-[16/10] w-full border-b border-line [content-visibility:auto]"
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        {showCategory ? (
          <p className="meta mb-2.5 text-accent">{CATEGORY_LABEL[entry.category]}</p>
        ) : null}

        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[0.9375rem] leading-snug tracking-[-0.011em] text-fg">
            <Link
              href={`/c/${entry.slug}`}
              data-category={entry.category}
              className="after:absolute after:inset-0 focus-visible:outline-none"
            >
              {entry.title}
            </Link>
          </h3>
          <RuntimeMeter cost={entry.cost} />
        </div>

        {/* Clamped, not truncated by length: two lines keeps every tile in a row
            the same shape, and the full blurb is one click away. */}
        <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-relaxed text-muted">
          {entry.blurb}
        </p>

        <div className="-mx-4 mt-auto flex items-center gap-3 border-t border-line px-4 pt-3">
          <p className="meta min-w-0 flex-1 truncate text-faint">
            {entry.deps.length > 0 ? entry.deps.join(' · ') : 'No dependencies'}
          </p>
          <span
            aria-hidden="true"
            className={cn(
              'shrink-0 text-[0.8125rem] leading-none text-faint',
              'transition-[transform,color] duration-control ease-out-quart',
              'group-hover/card:translate-x-0.5 group-hover/card:text-fg',
              'group-has-[a:focus-visible]/card:translate-x-0.5 group-has-[a:focus-visible]/card:text-fg',
            )}
          >
            →
          </span>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Cost as a four-tick ladder plus its short name. Dormant ticks are faint;
   once the budget grants this tile a slot the filled ticks take the category
   accent, so "running" is a colour change on an element that was already
   there rather than a badge that appears and reflows the row.
   -------------------------------------------------------------------------- */
function RuntimeMeter({ cost }: { cost: ManifestEntry['cost'] }) {
  const { short, long, weight } = RUNTIME[cost];

  return (
    <span
      className={cn(
        'meta flex shrink-0 items-center gap-1.5 border border-line px-1.5 py-1',
        'transition-colors duration-control',
        'group-has-data-[live=true]/card:border-accent/40',
      )}
    >
      <span aria-hidden="true" className="flex items-center gap-px">
        {TIER_TICKS.map((tick) => (
          <span
            key={tick}
            className={cn(
              'h-2.5 w-[3px] transition-colors duration-control',
              tick <= weight ? 'bg-faint group-has-data-[live=true]/card:bg-accent' : 'bg-line',
            )}
          />
        ))}
      </span>
      {/* "GL" and "2D" are legible glyphs and unspeakable words, so the tier is
          spelled out for assistive tech instead of read letter by letter. */}
      <span aria-hidden="true">{short}</span>
      <span className="sr-only">{long} runtime</span>
    </span>
  );
}
