'use client';

import Fuse from 'fuse.js';
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { CATEGORY_BLURB, CATEGORY_LABEL, type ManifestEntry } from '@/__generated__/manifest';
import { BrowseToolbar } from '@/components/browse/browse-toolbar';
import { ComponentCard } from '@/components/browse/component-card';
import { isRuntimeTier, type RuntimeTier } from '@/components/browse/runtime';
import { cn } from '@/lib/cn';

/* ==========================================================================
   Search and filter, entirely on the client.
   --------------------------------------------------------------------------
   The manifest is a few hundred KB of text for ~120 entries and it is static,
   so shipping it once beats a search endpoint: no round trip per keystroke, no
   loading state, and the results update inside the same frame as the input.

   Fuse is built once and only rebuilt if the manifest identity changes, which
   it never does — building it per render would re-tokenise every entry on
   every keystroke, which is precisely the work the index exists to avoid.

   Two presentations of one result set. Unfiltered, the catalogue is drawn as
   seven titled sections, because 119 tiles in an undifferentiated grid is a
   wall with no landmarks — nothing tells the reader where they are or how much
   is left. Once a category is chosen or a query typed, the sections would each
   hold one group or a handful of scattered matches, so the results collapse to
   a single grid and each tile names its own category instead.
   ========================================================================== */

type CategoryKey = ManifestEntry['category'];

const CATEGORIES = Object.keys(CATEGORY_LABEL) as CategoryKey[];

/** Height of the sticky site header; the toolbar hangs off the bottom of it. */
const HEADER_HEIGHT = 56;

export interface ComponentBrowserProps {
  manifest: ManifestEntry[];
  initialCategory: string | null;
  initialRuntime: string | null;
}

export function ComponentBrowser({
  manifest,
  initialCategory,
  initialRuntime,
}: ComponentBrowserProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryKey | null>(() => toCategory(initialCategory));
  const [runtime, setRuntime] = useState<RuntimeTier | null>(() =>
    isRuntimeTier(initialRuntime) ? initialRuntime : null,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Typing stays responsive even when the result set is large: the input is
  // controlled by `query`, the (expensive) grid renders from the deferred copy.
  const deferredQuery = useDeferredValue(query);
  const searching = deferredQuery.trim() !== '';

  const fuse = useMemo(
    () =>
      new Fuse(manifest, {
        keys: [
          { name: 'title', weight: 3 },
          { name: 'tags', weight: 2 },
          { name: 'blurb', weight: 1 },
          { name: 'slug', weight: 1 },
          { name: 'deps', weight: 1 },
        ],
        threshold: 0.34,
        ignoreLocation: true,
      }),
    [manifest],
  );

  // The query is applied first and the two facets second, because the facet
  // counts have to describe what the *other* facet would return: they need the
  // query-filtered set as their common base.
  const searched = useMemo(
    () => (searching ? fuse.search(deferredQuery).map((result) => result.item) : manifest),
    [manifest, fuse, deferredQuery, searching],
  );

  const results = useMemo(
    () =>
      searched.filter(
        (entry) =>
          (category === null || entry.category === category) &&
          (runtime === null || entry.cost === runtime),
      ),
    [searched, category, runtime],
  );

  const categoryCounts = useMemo(
    () => tally(searched, 'category', (entry) => runtime === null || entry.cost === runtime),
    [searched, runtime],
  );

  const runtimeCounts = useMemo(
    () => tally(searched, 'cost', (entry) => category === null || entry.category === category),
    [searched, category],
  );

  // Keep the URL shareable without a navigation. `replaceState` rather than a
  // router push: filtering is not a history entry, and forty back-presses to
  // leave the page is a hostile way to build a filter.
  useEffect(() => {
    const url = new URL(window.location.href);
    for (const [key, value] of [
      ['category', category],
      ['runtime', runtime],
    ] as const) {
      if (value === null) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    window.history.replaceState(null, '', url);
  }, [category, runtime]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === '/' && !isTypingTarget(event.target)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === 'Escape' && document.activeElement === inputRef.current) {
        setQuery('');
        inputRef.current?.blur();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  /* Changing a facet replaces the whole result set, and doing that while the
     viewport is parked four screens down leaves the reader in the middle of a
     list they did not choose. Pull back to the top of the results — but only
     when it has already scrolled out of reach, so a click made from the top of
     the page moves nothing at all. */
  function realign() {
    const container = resultsRef.current;
    if (container === null) return;
    const offset = HEADER_HEIGHT + (toolbarRef.current?.offsetHeight ?? 0);
    const top = container.getBoundingClientRect().top;
    if (top >= offset) return;
    window.scrollTo({ top: window.scrollY + top - offset, behavior: 'instant' });
  }

  function selectCategory(value: CategoryKey | null) {
    setCategory(value);
    realign();
  }

  function selectRuntime(value: RuntimeTier | null) {
    setRuntime(value);
    realign();
  }

  function clearAll() {
    setQuery('');
    setCategory(null);
    setRuntime(null);
    realign();
  }

  // Sections are for browsing; a query or a chosen category is a search, and a
  // search wants one ranked list. A runtime filter alone keeps the sections,
  // since it cuts across every category rather than picking one.
  const grouped = category === null && !searching;

  // Numbered after the empty groups are dropped, not before: a runtime filter
  // can leave three sections standing, and a page whose first heading is "04"
  // reads as a bug rather than as a fact about the catalogue.
  const sections = useMemo(() => {
    if (!grouped) return [];
    return CATEGORIES.map((key) => ({
      key,
      entries: results.filter((entry) => entry.category === key),
    }))
      .filter((section) => section.entries.length > 0)
      .map((section, index) => ({ ...section, ordinal: index + 1 }));
  }, [grouped, results]);

  return (
    <>
      <BrowseToolbar
        ref={toolbarRef}
        inputRef={inputRef}
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={selectCategory}
        runtime={runtime}
        onRuntimeChange={selectRuntime}
        categories={CATEGORIES}
        categoryCounts={categoryCounts}
        runtimeCounts={runtimeCounts}
        resultCount={results.length}
        onClear={clearAll}
      />

      <div ref={resultsRef} className="mx-auto max-w-[100rem] px-5 pt-10 pb-24 sm:px-8">
        {results.length === 0 ? (
          <EmptyState onClear={clearAll} />
        ) : grouped ? (
          sections.map((section) => (
            <section
              key={section.key}
              id={`category-${section.key}`}
              aria-labelledby={`heading-${section.key}`}
              className="scroll-mt-[10rem] pt-14 first:pt-0"
            >
              {/* `.rise` is on the seven section headers and on nothing else. A
                  scroll-scrubbed reveal on all 119 tiles would be 119
                  independent opacity ramps inside one viewport, which is the
                  visual equivalent of static; the headers are the page's
                  structure, so revealing those is what makes the scroll read as
                  authored rather than as decorated. */}
              <div
                data-category={section.key}
                className="rise flex flex-wrap items-baseline gap-x-5 gap-y-2 border-t border-line pt-4"
              >
                <span className="meta tabular-nums text-accent">
                  {String(section.ordinal).padStart(2, '0')}
                </span>
                <h2 id={`heading-${section.key}`} className="text-display-3 text-fg">
                  {CATEGORY_LABEL[section.key]}
                </h2>
                <span className="meta tabular-nums text-faint">{section.entries.length}</span>
                <p className="w-full text-[0.875rem] leading-relaxed text-muted sm:w-auto sm:flex-1">
                  {CATEGORY_BLURB[section.key]}
                </p>
                <button
                  type="button"
                  onClick={() => selectCategory(section.key)}
                  aria-label={`Show only ${CATEGORY_LABEL[section.key]}`}
                  className="meta wipe shrink-0 text-muted transition-colors duration-instant hover:text-fg sm:ml-auto"
                >
                  Show only
                </button>
              </div>

              <Grid>
                {section.entries.map((entry) => (
                  <ComponentCard key={entry.slug} entry={entry} />
                ))}
              </Grid>
            </section>
          ))
        ) : (
          <section aria-labelledby="heading-results">
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-t border-line pt-4">
              <h2 id="heading-results" className="text-display-3 text-fg">
                {searching ? <>Matching “{deferredQuery.trim()}”</> : categoryLabel(category)}
              </h2>
              {!searching && category !== null ? (
                <p className="w-full text-[0.875rem] leading-relaxed text-muted sm:w-auto sm:flex-1">
                  {CATEGORY_BLURB[category]}
                </p>
              ) : null}
            </div>

            <Grid>
              {results.map((entry) => (
                <ComponentCard key={entry.slug} entry={entry} showCategory={category === null} />
              ))}
            </Grid>
          </section>
        )}
      </div>
    </>
  );
}

/* --------------------------------------------------------------------------
   Four columns from `xl`, five on a very wide screen. Tiles carry their own
   aspect ratio, so the column count is the only thing the grid decides.

   `.rise-row` reveals the tiles on scroll. It is worth being precise about what
   that does here, because `animation-timeline: view()` is per element, not per
   container: every tile is scrubbed against its own position, so tiles sharing
   a grid row rise together and each row arrives as the reader reaches it —
   nothing fires all 119 at once, and nothing waits on a script. The class's
   nth-child offsets then stagger the leading row across its columns.

   Failure is the reason this is a class in the theme rather than an animation
   here: the keyframe animates *from* transparent, so the default state is the
   finished one. Firefox (no `animation-timeline` unless the flag is on),
   reduced-motion, and a stylesheet that never loads all land on fully visible
   tiles.
   -------------------------------------------------------------------------- */
function Grid({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        'rise-row mt-6 grid gap-4',
        'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5',
      )}
    >
      {children}
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    // Deliberately not `.rise`. A scroll reveal is for content the reader is
    // travelling towards; this panel appears in place, in response to a
    // keystroke, and a `view()` timeline would hold it at opacity 0 whenever it
    // happens to render below the fold.
    <div className="panel mx-auto max-w-xl rounded-sm px-6 py-14 text-center">
      <p className="meta text-faint">No matches</p>
      <p className="mt-4 text-lead text-fg">Nothing matches that.</p>
      <p className="mx-auto mt-3 max-w-sm text-[0.875rem] leading-relaxed text-muted">
        Search hits titles, tags, blurbs and dependencies — try a technique
        instead of a product name: “scrub”, “dither”, “marquee”, “gsap”.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="meta panel lift mt-7 rounded-sm px-3 py-2 text-fg"
      >
        Reset filters
      </button>
    </div>
  );
}

/* --------------------------------------------------------------------------
   One pass over the entries, counting values of `key` among those that survive
   the *other* facet. Written generically because both facets need it and the
   two implementations must not be able to drift apart.
   -------------------------------------------------------------------------- */
function tally(
  entries: readonly ManifestEntry[],
  key: 'category' | 'cost',
  keep: (entry: ManifestEntry) => boolean,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const entry of entries) {
    if (!keep(entry)) continue;
    counts[entry[key]] = (counts[entry[key]] ?? 0) + 1;
  }
  return counts;
}

function toCategory(value: string | null): CategoryKey | null {
  return value !== null && (CATEGORIES as readonly string[]).includes(value)
    ? (value as CategoryKey)
    : null;
}

function categoryLabel(value: CategoryKey | null): string {
  return value === null ? 'Results' : CATEGORY_LABEL[value];
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}
