# Build: Docs Sidebar Nav

The left rail of a documentation site: a rounded floating panel with a brand slot, a pill filter, and grouped page links drawn on a thin tree rail. Group headers fold their lists with a height transition, the current page sits on a grey fill, and New/Pro pills flag pages. Typing in the filter narrows every group at once, opens all groups and highlights the matched letters.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Floating docs sidebar with collapsible groups, tree rails, New/Pro badges, an active page and a ⌘K filter that highlights matches.

- Category: navigation
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. Data is an array of groups, each with items `{ id, label, icon?, badge?, href?, disabled?, keywords? }`. Active page, collapsed group ids and filter text are each controlled-or-uncontrolled through a small `useControllable` helper, so the nav works stand-alone or wired to a router.
2. `filterDocsNav(groups, query)` lower-cases the query; a group whose own label matches is kept whole, otherwise only items whose label or `keywords` contain the query survive, and empty groups drop out. While a query is active every surviving group is forced open and its header renders as a plain label instead of a toggle, so a match can never hide inside a folded group.
3. Each group panel is a CSS grid that transitions `grid-template-rows` between `0fr` and `1fr` (with opacity) over 200ms. The inner list has `min-h-0 overflow-hidden`, so the fold animates to the real content height without measuring. A folded panel gets `inert`, which removes its links from the tab order and from the accessibility tree.
4. Every row is a `<button>` (or an `<a>` when `href` is given) with `aria-current="page"` on the active one. The tree rail is two absolutely positioned spans per row painted after the button: a 8px "corner" with `border-s border-b rounded-es-[6px]` from the row top to its middle, and, for all but the last row, a straight line from the middle to the next row. Because they come after the row they stay visible over the active fill.
5. Keyboard: ArrowUp/ArrowDown/Home/End on the nav move focus across the filter, group headers and rows (anything with `data-docs-nav-focus` that is not inside an `inert` panel or disabled). Escape in the filter clears it. With `hotkey`, a window `keydown` listener focuses and selects the filter on ⌘K / Ctrl+K and is removed on unmount.
6. On mount, if the active row is outside the list viewport, the list scroller's `scrollTop` is adjusted to centre it (rect maths on the scroller, never `scrollIntoView`, so the page itself never jumps). The list fades out over its last 32px with a mask and pads 32px at the bottom so the last row can scroll clear of the fade.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `rail inset = start-[13px], 8px corner, rounded-es-[6px]`
  Puts the rail under the group label's first letter column and leaves room for the 16px icon at 33px, matching the reference spacing where icons start 33px from the list edge and plain labels 32px.
- `row height / gap = h-8 with gap-0.5 (34px pitch)`
  The reference rows sit 34px apart with a 32px tall active fill; the 2px gap keeps neighbouring hover fills from touching.
- `fold duration = 200ms ease-out on grid-template-rows + opacity`
  Long enough to read as a fold, short enough that toggling several groups in a row never queues up visible motion.
- `bottom fade = mask-b-from-[calc(100%-32px)] with pb-8`
  The fade signals more content below; the matching 32px of padding lets the last row scroll fully out of the faded band.
- `panel width = w-[260px], rounded-3xl, shadow-sidebar`
  Same floating panel recipe as the kit dashboard sidebar so the two read as one system.

## API

```ts
function DocsSidebarNav(props: { groups: DocsNavGroup[]; value?: string | null; defaultValue?: string | null; onValueChange?: (id: string, item: DocsNavItem) => void; collapsedGroups?: string[]; defaultCollapsedGroups?: string[]; onCollapsedGroupsChange?: (ids: string[]) => void; query?: string; defaultQuery?: string; onQueryChange?: (query: string) => void; showFilter?: boolean; filterPlaceholder?: string; filterLabel?: string; hotkey?: boolean; hotkeyLabel?: string; header?: ReactNode; footer?: ReactNode; emptyMessage?: (query: string) => ReactNode; "aria-label"?: string; className?: string }): JSX.Element
function filterDocsNav(groups: DocsNavGroup[], query: string): DocsNavGroup[]
```

- `groups: DocsNavGroup[]`
  Sections of `{ id, label, items }`; each item is `{ id, label, icon?, badge?: "new" | "pro", href?, disabled?, keywords? }`.
- `value / defaultValue: string | null` — default `null`
  Id of the active page. Gets the grey fill and `aria-current="page"`.
- `onValueChange: (id: string, item: DocsNavItem) => void`
  Called when a row is activated.
- `collapsedGroups / defaultCollapsedGroups: string[]` — default `[]`
  Ids of folded groups.
- `onCollapsedGroupsChange: (ids: string[]) => void`
  Called with the next folded ids when a header is toggled.
- `query / defaultQuery: string` — default `""`
  Filter text. Non-empty text filters rows, opens all groups and highlights matches.
- `onQueryChange: (query: string) => void`
  Called as the filter changes or is cleared.
- `showFilter: boolean` — default `true`
  Renders the pill filter input.
- `hotkey: boolean` — default `false`
  Focuses the filter on ⌘K / Ctrl+K and shows `hotkeyLabel` in the pill.
- `header / footer: ReactNode`
  Brand row above the filter and a pinned row below the list.
- `emptyMessage: (query: string) => ReactNode` — default `No pages match “…”`
  Shown when the filter leaves nothing.
- `className: string`
  Merged onto the panel; set the height here so the list can scroll.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/** Keeps groups whose label matches whole; otherwise keeps only matching items. Empty groups drop out. */
export function filterDocsNav(groups: DocsNavGroup[], rawQuery: string): DocsNavGroup[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return groups;
  const out: DocsNavGroup[] = [];
  for (const group of groups) {
    if (group.label.toLowerCase().includes(query)) {
      out.push(group);
      continue;
    }
    const items = group.items.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        (item.keywords ?? []).some((word) => word.toLowerCase().includes(query)),
    );
    if (items.length > 0) out.push({ ...group, items });
  }
  return out;
}

interface GroupSectionProps {
  group: DocsNavGroup;
  open: boolean;
  filtering: boolean;
  query: string;
  activeId: string | null;
  onToggle: (id: string) => void;
  onSelect: (item: DocsNavItem) => void;
}

function GroupSection({ group, open, filtering, query, activeId, onToggle, onSelect }: GroupSectionProps) {
  const panelId = useId();
  const headerClass = "flex h-7 w-full items-center justify-between rounded-lg pr-2.5 pl-2.5 text-caption-1-medium tracking-[0.04em] text-text-tertiary uppercase";

  return (
    <li className="flex flex-col">
      {filtering ? (
        <div className={headerClass}>{group.label}</div>
      ) : (
        <button
          type="button"
          data-docs-nav-focus=""
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => onToggle(group.id)}
          className={cx(
            headerClass,
            "cursor-pointer outline-none hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-inset",
          )}
        >
          <span>{group.label}</span>
          <RiArrowDownSLine
            aria-hidden
            className={cx(
              "size-4 transition-transform duration-200 ease-out motion-reduce:transition-none",
              !open && "-rotate-90 rtl:rotate-90",
            )}
          />
        </button>
      )}

      {/* 0fr -> 1fr animates to the content's real height without measuring it. */}
      <div
        id={panelId}
        inert={!open}
        className={cx(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <ul className="flex min-h-0 flex-col gap-0.5 overflow-hidden pt-1">
          {group.items.map((item, index) => {
            const last = index === group.items.length - 1;
            const active = item.id === activeId;
            const Icon = item.icon;
            const badge = item.badge ? badgeStyles[item.badge] : null;
            const rowClass = cx(
              "flex h-8 w-full items-center gap-2 rounded-lg pr-2.5 text-start text-body-medium outline-none",
              "transition-colors duration-150 ease-out motion-reduce:transition-none",
              "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-inset",
              Icon ? "ps-[33px]" : "ps-8",
              item.disabled
                ? "cursor-not-allowed text-text-disabled"
                : active
                  ? "bg-background-tertiary-default text-text-primary"
                  : "cursor-pointer text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary",
            );
            const content = (
              <>
                {Icon ? (
                  <Icon
                    aria-hidden
                    className={cx("size-4 shrink-0", active ? "text-foreground-icon-primary" : "text-foreground-icon-secondary")}
                  />
                ) : null}
                <span className="min-w-0 flex-1 truncate">
                  <Highlight text={item.label} query={query} />
                </span>
                {badge ? (
                  <span
                    className={cx(
                      "rounded-[4px] px-1.5 py-px text-caption-2-semibold tracking-[0.02em] uppercase",
                      badge.className,
                    )}
                  >
                    {badge.label}
                  </span>
                ) : null}
              </>
            );

            return (
              <li key={item.id} className="relative">
                {item.href && !item.disabled ? (
                  <a
                    href={item.href}
                    data-docs-nav-focus=""
                    aria-current={active ? "page" : undefined}
                    onClick={() => onSelect(item)}
                    className={rowClass}
                  >
                    {content}
                  </a>
                ) : (
                  <button
                    type="button"
                    data-docs-nav-focus=""
                    disabled={item.disabled}
                    aria-current={active ? "page" : undefined}
                    onClick={() => onSelect(item)}
                    className={rowClass}
                  >
                    {content}
                  </button>
                )}
                {/* Tree rail: drawn after the row so it stays visible over the active fill. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute start-[13px] top-0 h-1/2 w-2 rounded-es-[6px] border-b border-s border-border-checkbox-default"
                />
                {last ? null : (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute start-[13px] top-1/2 -bottom-0.5 border-s border-border-checkbox-default"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </li>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The optional ⌘K `keydown` listener is attached to `window` in an effect and removed on unmount or when `hotkey` turns off. The mount-time scroll correction is a one-shot read with nothing to release.

**Reduced motion.** The group fold, chevron rotation and row colour transitions all carry `motion-reduce:transition-none`, so groups open and close instantly and the chevron flips without turning. Nothing else moves.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Animating `height` from 0 to `auto` instead of the `0fr`/`1fr` grid trick. `auto` does not interpolate, so the fold snaps; measuring heights in JS breaks when badges or wrapping labels change the content.
- Hiding a collapsed panel with only `overflow-hidden`. Its links stay focusable and Tab lands inside an invisible list. The panel must be `inert` while closed.
- Keeping collapsed groups collapsed while filtering. A match inside a folded group looks like "no results"; the filter forces every surviving group open.
- Calling `scrollIntoView` to reveal the active row. It scrolls every scrollable ancestor, including the page, so a docs page would jump on load.
- Drawing the rail before the row button. The active row's fill then paints over it and the tree looks broken at the current page.

## Notes

- `filterDocsNav` is exported so a command palette can reuse the same matching rules as the sidebar.
- The hotkey is opt-in because a host app may already own ⌘K for its own command palette.

## Definition of done

Typography is active with a grey fill and `aria-current="page"`. Clicking "Base" folds that group (its header gets `aria-expanded="false"`) and clicking again unfolds it. Typing "car" into the filter leaves Carousel and Line Chart Card with "car" highlighted, opening the folded Charts group; Escape clears it and the full list returns. Pressing ⌘K focuses the filter. Clicking Badge moves the active fill to Badge and the side panel heading reads Badge. The disabled Sankey Flow row cannot be activated.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
