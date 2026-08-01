'use client';

import type { ReactNode, Ref } from 'react';

import { CATEGORY_LABEL, type ManifestEntry } from '@/__generated__/manifest';
import { RUNTIME, RUNTIME_ORDER, type RuntimeTier } from '@/components/browse/runtime';
import { cn } from '@/lib/cn';

/* ==========================================================================
   The catalogue's control surface.
   --------------------------------------------------------------------------
   Sticky immediately under the 56px site header, so the controls that decide
   what is on screen never scroll away from the thing they control, and opaque
   enough — tinted backdrop, hairline, cast shadow — that the grid passes
   *beneath* it rather than through it.

   Two facets, two labelled groups. Unlabelled, the row had `WebGL` in it twice
   for no visible reason: once as a category (shader work) and once as a runtime
   tier (this component allocates a GL context). The group headings say which is
   which, `role="group"` says it to assistive tech, and the counts are tinted
   differently per group — a category count wears that category's accent, a
   runtime count stays neutral — so the two `WebGL` chips do not even look alike.

   Every count is cross-filtered: a chip's number is what clicking it would
   actually return, given the other facet and the current search. A count that
   ignores its sibling filter is worse than no count, because it promises
   results the click cannot deliver. Chips that would return nothing are
   disabled — except the active one, which must always be clickable to get back
   out of a dead end.
   ========================================================================== */

type CategoryKey = ManifestEntry['category'];

export interface BrowseToolbarProps {
  ref?: Ref<HTMLDivElement>;
  inputRef?: Ref<HTMLInputElement>;
  query: string;
  onQueryChange: (value: string) => void;
  category: CategoryKey | null;
  onCategoryChange: (value: CategoryKey | null) => void;
  runtime: RuntimeTier | null;
  onRuntimeChange: (value: RuntimeTier | null) => void;
  categories: readonly CategoryKey[];
  categoryCounts: Readonly<Record<string, number>>;
  runtimeCounts: Readonly<Record<string, number>>;
  resultCount: number;
  onClear: () => void;
}

export function BrowseToolbar({
  ref,
  inputRef,
  query,
  onQueryChange,
  category,
  onCategoryChange,
  runtime,
  onRuntimeChange,
  categories,
  categoryCounts,
  runtimeCounts,
  resultCount,
  onClear,
}: BrowseToolbarProps) {
  const dirty = query !== '' || category !== null || runtime !== null;

  return (
    <div
      ref={ref}
      className={cn(
        'sticky top-14 z-30 border-b border-line bg-bg/85 backdrop-blur-xl',
        'shadow-[var(--k-elev-2)]',
      )}
    >
      <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
        {/* -- row one: search, count, reset ------------------------------- */}
        <div className="group/search flex items-center gap-3 border-b border-line py-2.5">
          <svg
            viewBox="0 0 24 24"
            className="size-4 shrink-0 text-faint transition-colors duration-instant group-focus-within/search:text-fg"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>

          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by name, technique or dependency"
            aria-label="Search components"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            // No `outline-hidden` here: the utilities layer would beat the
            // theme's `:focus-visible` rule and this field is the one control on
            // the page a keyboard reaches first. The native WebKit clear
            // affordance is suppressed instead — it is a grey blob that ignores
            // the theme, and the field ships its own.
            className={cn(
              'min-w-0 flex-1 bg-transparent text-[0.9375rem] text-fg',
              'placeholder:text-faint [&::-webkit-search-cancel-button]:hidden',
            )}
          />

          {query !== '' ? (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label="Clear search"
              className="meta shrink-0 rounded-sm px-1.5 py-1 text-faint transition-colors duration-instant hover:bg-surface hover:text-fg"
            >
              ✕
            </button>
          ) : (
            <kbd
              className={cn(
                'meta hidden shrink-0 rounded-sm border border-line px-1.5 py-1 text-faint sm:block',
                'transition-colors duration-instant',
                'group-focus-within/search:border-line-strong group-focus-within/search:text-muted',
              )}
            >
              /
            </kbd>
          )}

          <span aria-hidden="true" className="hidden h-4 w-px shrink-0 bg-line sm:block" />

          {/* Announced politely rather than assertively: the number changes on
              every keystroke, and interrupting the typist to read it back is
              worse than saying nothing.

              The noun is dropped on a phone — at 380px it costs a third of the
              search field, and the number sits next to the grid it counts. It
              is display:none rather than absent, so the label is still there
              for anything reading the DOM. */}
          <p aria-live="polite" className="meta shrink-0 tabular-nums text-faint">
            <span className="text-fg">{resultCount}</span>
            <span className="hidden sm:inline">
              {' '}
              {resultCount === 1 ? 'component' : 'components'}
            </span>
          </p>

          {dirty ? (
            <button
              type="button"
              onClick={onClear}
              className="meta shrink-0 rounded-sm px-2 py-1 text-muted transition-colors duration-instant hover:bg-surface hover:text-fg"
            >
              Reset
            </button>
          ) : null}
        </div>

        {/* -- row two: the two facets -------------------------------------
            One scrolling row on narrow screens, where seven category chips
            would otherwise stack the sticky bar four rows deep; wrapping by
            whole group from `lg` up, so a group heading can never be orphaned
            from its chips. The vertical padding is what keeps focus rings from
            being clipped by the scroll container. */}
        <div
          className={cn(
            'flex flex-nowrap items-center gap-x-8 gap-y-2 overflow-x-auto py-2.5',
            'scrollbar-none lg:flex-wrap lg:overflow-x-visible',
          )}
        >
          <FilterGroup id="browse-facet-category" label="Category">
            <Chip active={category === null} onClick={() => onCategoryChange(null)}>
              All
            </Chip>
            {categories.map((value) => (
              <Chip
                key={value}
                active={category === value}
                accent
                category={value}
                count={categoryCounts[value] ?? 0}
                onClick={() => onCategoryChange(category === value ? null : value)}
              >
                {CATEGORY_LABEL[value]}
              </Chip>
            ))}
          </FilterGroup>

          <FilterGroup id="browse-facet-runtime" label="Runtime">
            {RUNTIME_ORDER.map((value) => (
              <Chip
                key={value}
                active={runtime === value}
                count={runtimeCounts[value] ?? 0}
                onClick={() => onRuntimeChange(runtime === value ? null : value)}
              >
                {RUNTIME[value].long}
              </Chip>
            ))}
          </FilterGroup>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div role="group" aria-labelledby={id} className="flex shrink-0 items-center gap-2.5">
      <span id={id} className="meta shrink-0 text-faint">
        {label}
      </span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   A chip is a toggle, so it says so: `aria-pressed`, a hairline border that
   reads as pressable, and an active state that swaps to the solid accent
   rather than shifting a shade. `data-category` is the filter's public handle
   and belongs to category chips alone — the runtime group must not answer to
   it, or `button[data-category="webgl"]` would be ambiguous again.
   -------------------------------------------------------------------------- */
function Chip({
  active,
  accent = false,
  category,
  count,
  onClick,
  children,
}: {
  active: boolean;
  accent?: boolean;
  category?: string;
  count?: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-category={category}
      aria-pressed={active}
      disabled={count === 0 && !active}
      className={cn(
        'meta flex h-8 shrink-0 items-center gap-1.5 rounded-sm border px-2.5',
        'transition-[background-color,border-color,color] duration-instant ease-out-quart',
        active
          ? 'border-accent bg-accent text-accent-fg'
          : 'border-line text-muted hover:border-line-strong hover:bg-surface hover:text-fg',
        'disabled:pointer-events-none disabled:opacity-40',
      )}
    >
      <span>{children}</span>
      {count !== undefined ? (
        <span
          className={cn(
            'tabular-nums',
            active ? 'text-accent-fg/65' : accent ? 'text-accent' : 'text-faint',
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
