import Link from 'next/link';

import { CATEGORY_LABEL, MANIFEST, type ManifestEntry } from '@/__generated__/manifest';
import { PreviewHost } from '@/components/preview/preview-host';
import { cn } from '@/lib/cn';
import type { Category, Cost, Motif } from '@/scripts/schema';

/* ==========================================================================
   Featured spreads.
   --------------------------------------------------------------------------
   Seven items — one per category, so no family of technique is missing from
   the first screen after the hero. They used to be seven cells of a mosaic,
   which is the layout every component library on the internet already has, and
   at seven cells it is also the layout that gives each piece of work a 300px
   window and two lines of type.

   These are spreads instead: one item per band, running the full width of the
   viewport, alternating which side the work sits on, separated by a single
   hairline and nothing else. It is the magazine grammar — a plate, a caption
   set beside it, generous margins, and the reader's eye crossing the gutter on
   every turn. It costs vertical space, which is the cheapest thing on a page,
   and buys each preview a frame large enough to actually watch.

   Three motions, all scroll-position driven, none of them triggered:

     `.plate`   the frame opens from its top edge and settles out of a slight
                overscale as the band arrives, so the preview is uncovered
                rather than dropped in. It clips with `overflow-clip`, never
                `overflow-hidden`: `hidden` creates a scroll container, and a
                `view()` timeline binds to its nearest scroll container, so a
                reveal inside a hidden clipper would have a timeline that never
                advances.
     `.slide`   the ordinal enters from the gutter as its band arrives.
     `.draw`    the rule under it draws left to right, once, in place.

   Hover is `.spread` — one accent hairline wiping across the bottom of the
   whole band, right to left on the way out, which is the only hover state a
   band this size needs.
   ========================================================================== */

interface Tile {
  category: Category;
  /**
   * Preferred representative, by slug. Every one of these runs on a clock or on
   * hover rather than on scroll position: a scroll-driven component inside a
   * fixed frame is a still image until someone finds its inner scroller. Falls
   * back to the category's first entry if the slug is ever renamed, so this
   * list can go stale without going wrong.
   */
  slug: string;
  frame: string;
}

/* Cost mix is deliberate. Exactly one tile is `webgl`, which — with the hero
   holding the other slot — fits the budget of two live contexts with nothing
   left over to thrash (lib/preview-budget.ts). Four are `css` and bypass the
   budget entirely, so most of the page is moving the moment it is on screen
   rather than waiting to be granted a slot. */
const TILES: readonly Tile[] = [
  { category: 'webgl', slug: 'domain-warped-fbm', frame: 'h-[62vh] min-h-[24rem]' },
  { category: 'text', slug: 'asymmetric-typewriter', frame: 'h-[22rem] xl:h-[30rem]' },
  { category: 'scroll', slug: 'banded-scrollspy-rail', frame: 'h-[24rem] xl:h-[34rem]' },
  { category: 'cursor', slug: 'blend-difference-cursor', frame: 'h-[22rem] xl:h-[28rem]' },
  { category: 'primitive', slug: 'conic-property-border', frame: 'h-[24rem] xl:h-[32rem]' },
  { category: 'transition', slug: 'delayed-unmount-loader', frame: 'h-[22rem] xl:h-[30rem]' },
  { category: 'layout', slug: 'auto-advance-filmstrip', frame: 'h-[24rem] xl:h-[34rem]' },
];

// Mirrors the badge on the browse card. Two characters of mono is also the
// honest answer to "why is that one not moving" — a GL tile may be holding a
// poster because the budget is full.
const COST_LABEL: Record<Cost, string> = {
  css: 'CSS',
  dom: 'DOM',
  canvas2d: '2D',
  webgl: 'GL',
};

interface ResolvedTile extends Tile {
  entry: ManifestEntry;
}

// Resolved at module scope: the selection is identical in every build, and a
// category that has no entry at all drops out rather than rendering a hole.
const RESOLVED: readonly ResolvedTile[] = TILES.map((tile) => {
  const entry =
    MANIFEST.find((item) => item.category === tile.category && item.slug === tile.slug) ??
    MANIFEST.find((item) => item.category === tile.category);
  return entry === undefined ? undefined : { ...tile, entry };
}).filter((tile): tile is ResolvedTile => tile !== undefined);

function deps(entry: ManifestEntry): string {
  return entry.deps.length > 0 ? entry.deps.join(' · ') : 'no dependencies';
}

/**
 * The frame and its parallax layer.
 *
 * The inner layer is taller than the frame and offset upward by half the
 * overhang, because the CSS only animates between ±6.5% — with no
 * `animation-timeline` support the layer holds its start position, and the
 * markup has to be the thing that keeps it centred so that path is not visibly
 * cropped.
 *
 * `aria-hidden` and out of the tab order: the title beside it is a link to the
 * same page, and shipping the same destination twice per band is three extra
 * stops for a keyboard reader and nothing for anyone.
 */
function Plate({ tile, className }: { tile: ResolvedTile; className?: string }) {
  const { entry } = tile;

  return (
    <Link
      href={`/c/${entry.slug}`}
      aria-hidden="true"
      tabIndex={-1}
      className={cn(
        'plate relative block overflow-clip bg-bg-subtle',
        tile.frame,
        className,
      )}
    >
      <PreviewHost
        slug={entry.slug}
        cost={entry.cost}
        motif={entry.motif as Motif}
        className="absolute inset-0 h-full w-full"
      />
    </Link>
  );
}

/** Ordinal, rule, category — the constant head of every caption. */
function Caption({ tile, index }: { tile: ResolvedTile; index: number }) {
  return (
    <>
      <p className="slide font-mono text-display-1 leading-none text-faint">
        {String(index + 1).padStart(2, '0')}
      </p>
      <div aria-hidden="true" className="draw mt-7 h-px w-full bg-line-strong" />
      <p className="meta mt-7 text-accent">{CATEGORY_LABEL[tile.entry.category]}</p>
    </>
  );
}

/* The opening band. Full-bleed plate, caption in a rule below it rather than
   beside it: it establishes the page's full width before the alternation
   starts, so the six that follow read as a rhythm rather than as a list that
   happens to zigzag. */
function LeadSpread({ tile }: { tile: ResolvedTile }) {
  const { entry } = tile;

  return (
    <li data-category={entry.category} className="spread group border-t border-line">
      <Plate tile={tile} className="w-full" />

      <div className="grid gap-y-8 px-5 py-14 sm:px-8 sm:py-16 xl:grid-cols-12 xl:items-start xl:gap-x-16">
        <div className="xl:col-span-3">
          <Caption tile={tile} index={0} />
        </div>

        <h3 className="text-display-2 text-fg xl:col-span-6">
          <Link href={`/c/${entry.slug}`} className="wipe">
            {entry.title}
          </Link>
          <span
            aria-hidden="true"
            className="ml-4 inline-block text-muted transition-transform duration-control ease-out-quart group-hover:translate-x-2"
          >
            →
          </span>
        </h3>

        <div className="xl:col-span-3">
          <p className="max-w-[40ch] text-[0.9375rem] leading-relaxed text-muted">{entry.blurb}</p>
          <p className="meta mt-6 text-faint">
            {COST_LABEL[entry.cost]} / {deps(entry)}
          </p>
        </div>
      </div>
    </li>
  );
}

/* The alternating bands. `flip` swaps the two columns with `order` rather than
   with a second set of column starts, so the source order stays plate-then-
   caption at every breakpoint and the stacked layout below xl needs no rules of
   its own. */
function Spread({ tile, index }: { tile: ResolvedTile; index: number }) {
  const { entry } = tile;
  const flip = index % 2 === 0;

  return (
    <li data-category={entry.category} className="spread group border-t border-line">
      <div className="grid gap-y-10 px-5 py-20 sm:px-8 sm:py-28 xl:grid-cols-12 xl:items-center xl:gap-x-20 xl:py-32">
        <Plate tile={tile} className={cn('xl:col-span-7', flip && 'xl:order-2')} />

        <div className={cn('xl:col-span-5', flip && 'xl:order-1')}>
          <Caption tile={tile} index={index} />

          <h3 className="mt-5 text-display-2 text-fg">
            <Link href={`/c/${entry.slug}`} className="wipe">
              {entry.title}
            </Link>
            <span
              aria-hidden="true"
              className="ml-4 inline-block text-muted transition-transform duration-control ease-out-quart group-hover:translate-x-2"
            >
              →
            </span>
          </h3>

          <p className="mt-6 max-w-[42ch] text-lead text-muted">{entry.blurb}</p>

          <p className="meta mt-10 text-faint">
            {COST_LABEL[entry.cost]} / {deps(entry)}
          </p>
        </div>
      </div>
    </li>
  );
}

export function FeaturedSpreads() {
  const [lead, ...rest] = RESOLVED;

  return (
    <section className="border-b border-line">
      <div className="rise flex flex-wrap items-end justify-between gap-x-10 gap-y-6 px-5 pt-24 pb-16 sm:px-8 sm:pt-32 sm:pb-20">
        <div>
          <p className="meta">The catalogue</p>
          <h2 className="mt-5 max-w-[20ch] text-display-1 text-fg">
            One technique from every family, running.
          </h2>
        </div>
        <Link href="/components" className="wipe meta shrink-0 text-fg">
          All {MANIFEST.length} components →
        </Link>
      </div>

      <ol>
        {lead === undefined ? null : <LeadSpread tile={lead} />}
        {rest.map((tile, index) => (
          <Spread key={tile.entry.slug} tile={tile} index={index + 1} />
        ))}
      </ol>
    </section>
  );
}
