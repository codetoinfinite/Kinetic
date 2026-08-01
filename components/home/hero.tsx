import Link from 'next/link';

import { CATEGORY_LABEL, MANIFEST, type ManifestEntry } from '@/__generated__/manifest';
import { FlipBoard, type FlipPanel } from '@/components/home/flip-board';
import { CATEGORIES } from '@/scripts/schema';
import { site } from '@/site.config';

/* ==========================================================================
   Hero.
   --------------------------------------------------------------------------
   A motion library whose front page is a headline next to a screenshot is
   arguing for itself in the wrong medium. This one is a pinned stage carrying a
   split-flap board, and the reader's scroll is the drive shaft: travelling the
   track runs the board through five messages, flap by flap. Nothing here is
   triggered — stop scrolling and the board stops mid-turn, scroll back and it
   runs backwards, because every frame is a function of position rather than of
   an event that fired once.

   Layers, all scrubbed by the same published playhead:

     z-10   the board
     z-20   the scrim, which clears out over the first fifth
     z-30   copy, travel readout, and the strip of real links

   The copy is deliberately four lines, in the bottom-left corner rather than
   over the middle of the screen, because the middle of the screen is where the
   thing being sold is. Everything a reader might otherwise want in prose —
   counts, licence, runtime — is one hairline below in the metadata voice, where
   it costs a glance instead of a paragraph.

   Cost is bounded by the same arbiter every preview uses. The stage takes one
   WebGL context with a `focused` claim, which outranks every card below by
   1000x (lib/preview-budget.ts), so the one thing the reader is looking at is
   never the thing that loses its slot.
   ========================================================================== */

interface Featured {
  slug: string;
  title: string;
  category: ManifestEntry['category'];
  label: string;
}

/**
 * How many entries the link strip carries. Not the whole catalogue: 24 is about
 * as far as anyone drags a horizontal strip, and the full 119 are one click
 * away.
 */
const FEATURED_COUNT = 24;

/**
 * One pass per category, round-robin, so the strip is a tour of the whole
 * library rather than eight variations on WebGL — the manifest is ordered by
 * slug, and taking the first 24 of it would show the letter A.
 *
 * Resolved at module scope: the selection has to be byte-identical in the
 * prerender and on the client, and identical between deploys, which rules out
 * anything random.
 */
const FEATURED: readonly Featured[] = (() => {
  const byCategory = new Map<ManifestEntry['category'], ManifestEntry[]>();
  for (const entry of MANIFEST) {
    const list = byCategory.get(entry.category);
    if (list) list.push(entry);
    else byCategory.set(entry.category, [entry]);
  }

  const picked: Featured[] = [];
  for (let round = 0; picked.length < FEATURED_COUNT; round += 1) {
    let added = 0;
    for (const category of CATEGORIES) {
      const entry = byCategory.get(category)?.[round];
      if (!entry) continue;
      added += 1;
      picked.push({
        slug: entry.slug,
        title: entry.title,
        category: entry.category,
        label: CATEGORY_LABEL[entry.category],
      });
      if (picked.length === FEATURED_COUNT) break;
    }
    // Every category exhausted before the target — impossible at 119 entries,
    // but a manifest trimmed for a test should not hang the build.
    if (added === 0) break;
  }

  return picked;
})();

/**
 * What the board spells, in order. Twelve characters a line, three lines, and
 * every one of these facts is also stated in ordinary prose on this page — the
 * board is `aria-hidden`, so nothing may exist only here.
 *
 * The `category` picks the accent the last line is set in, which is how the
 * board cycles the palette without a colour ever being written down twice.
 */
const PANELS: readonly FlipPanel[] = [
  { category: 'webgl', lines: ['MOTION', 'AS', 'SOURCE'] },
  {
    category: 'scroll',
    lines: [`${MANIFEST.length} PARTS`, `${CATEGORIES.length} FAMILIES`, 'ONE REPO'],
  },
  { category: 'text', lines: ['SHADERS', 'SCROLL', 'TYPE'] },
  { category: 'transition', lines: ['READ IT', 'COPY IT', 'OWN IT'] },
  /* `site.license` is uppercased rather than trusted to be short — the board
     truncates past twelve characters, and 'Apache-2.0' is already ten. */
  { category: 'primitive', lines: [site.license.toUpperCase(), 'NO ACCOUNT', 'NO LOCK-IN'] },
];

/* The four-cell stat table this replaces was the SaaS-template tell: four
   bordered boxes carrying four short strings, half of which are not numbers.
   The facts are worth stating once, in the metadata voice, on a single
   hairline. */
const SPECS: readonly string[] = [
  `${MANIFEST.length} components`,
  `${CATEGORIES.length} categories`,
  'React 19.2+',
  'Tailwind v4',
  site.license,
  'no account',
];

export function Hero() {
  const total = MANIFEST.length;

  return (
    <>
      {/* The track is what the reader actually scrolls; the stage inside it is
          pinned for the whole of it. 340vh gives the board four transitions at
          about 85vh of scroll each — slow enough that the flaps read as
          mechanism rather than as a cut, and short enough that a reader who
          wants the page below is not trapped. */}
      <section data-scrub-track className="relative h-[340vh] border-b border-line">
        {/* `top-16` and the matching height subtraction are the site header's
            own h-16 bar: pinning at top-0 puts the stage *under* it, so the
            bottom 4rem of the stage sat below the fold. */}
        <div className="wash sticky top-16 h-[calc(100dvh-4rem)] overflow-hidden">
          <FlipBoard panels={PANELS} className="absolute inset-0">
            {/* Scrim and copy carry the same class, so they leave together.
                Bottom-up rather than left-to-right: the copy is in the bottom
                corner, so that is the only edge that needs to be dark enough
                to set type on. */}
            <div
              aria-hidden="true"
              className="scrub-lead pointer-events-none absolute inset-0 z-20 bg-linear-to-t from-bg from-5% via-bg/70 via-45% to-transparent"
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
              <div className="scrub-lead pointer-events-auto px-5 pb-24 sm:px-8 sm:pb-28">
                <p className="meta">Motion component registry</p>

                <h1 className="mt-5 text-display-1 text-fg">Motion, as source.</h1>

                <p className="mt-6 max-w-[42ch] text-lead text-muted">
                  {total} motion techniques, written as React you own outright.
                </p>

                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <Link
                    href="/components"
                    className="meta bg-fg px-5 py-3.5 text-bg transition-opacity duration-control ease-out-quart hover:opacity-85"
                  >
                    Browse the catalogue
                  </Link>
                  <Link
                    href="/docs/installation"
                    className="meta border border-line bg-surface px-5 py-3.5 text-muted shadow-[var(--k-highlight)] transition-colors duration-control ease-out-quart hover:border-line-strong hover:text-fg"
                  >
                    Installation
                  </Link>
                </div>
              </div>
            </div>

            {/* Travel readout. A tick sliding down a hairline is the whole of
                it: the reader can see how much of the board is left without a
                number, and it is the same `--k-scrub` driving the flaps. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-5 top-1/2 z-30 hidden h-44 -translate-y-1/2 lg:block"
            >
              <div className="relative h-full w-px bg-line-strong">
                <span className="scrub-marker absolute -left-[3px] h-1.5 w-1.5 -translate-y-1/2 bg-accent" />
              </div>
            </div>

            {/* Real links. Not a fallback and not sr-only — the board is
                `aria-hidden` because it is a picture, and a keyboard reader, a
                crawler and a reader who simply wants to click a name all end up
                here. Appears once travel starts, and is forced open by focus
                (see `.scrub-trail` in globals.css). */}
            <div className="scrub-trail absolute inset-x-0 bottom-12 z-30 border-t border-line bg-bg/70 backdrop-blur-md">
              <h2 className="sr-only">Featured components</h2>
              <ul className="scrollbar-none flex snap-x gap-x-px overflow-x-auto">
                {FEATURED.map((entry) => (
                  <li key={entry.slug} className="snap-start">
                    <Link
                      href={`/c/${entry.slug}`}
                      data-category={entry.category}
                      className="meta block max-w-[13rem] truncate border-l border-line px-3 py-2.5 text-faint transition-colors duration-instant ease-out-quart hover:bg-surface hover:text-fg focus-visible:bg-surface focus-visible:text-fg"
                    >
                      <span className="text-accent">{entry.label}</span> {entry.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </FlipBoard>
        </div>
      </section>

      <div className="border-b border-line">
        <ul className="meta flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-4 sm:px-8">
          {SPECS.map((spec, index) => (
            <li key={spec} className="flex items-center gap-3">
              {index > 0 ? (
                <span aria-hidden="true" className="text-faint">
                  /
                </span>
              ) : null}
              {spec}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
