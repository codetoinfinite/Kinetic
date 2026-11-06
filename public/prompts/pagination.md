# Build: Pagination

A controlled page navigator: secondary small `Button`s for Previous and Next at either end, and a row of 32px page cells between them that collapses long ranges to first, last, a window around the current page, and "…" placeholders. The active page borrows the raised secondary-button surface; the rest are ghost cells. A `ResizeObserver` on the nav switches it to an icon-only, zero-sibling layout when its own container is narrow, so it never clips.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Controlled pager with Previous/Next buttons, 32px page cells and ellipsis collapsing that turns compact below a 420px container.

- Category: navigation
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. `paginationRange(current, total, sibling)` builds the item list. If `sibling * 2 + 5` (first, last, current, the siblings on both sides and two dots) is at least `total`, every page is shown. Otherwise it computes `leftSibling = max(current - sibling, 1)` and `rightSibling = min(current + sibling, total)`, and shows left dots only when `leftSibling > 2` and right dots only when `rightSibling < total - 2`.
2. The three collapsed shapes keep the row a constant length: near the start it is `1…(3 + 2·sibling), …, total`; near the end `1, …, (total − 2 − 2·sibling)…total`; in the middle `1, …, leftSibling…rightSibling, …, total`. With the default `siblingCount` of 1 this is always 7 items, so the Next button does not jump sideways as you page.
3. `useIsCompact` returns a callback ref for the `<nav>`. When the nav mounts it measures `offsetWidth` at once (during commit, so the first paint already has the right layout), then observes the border box with a `ResizeObserver`; `isCompact` is `width < 420`, and a width of 0 (hidden, not laid out) is ignored so the last layout stays. The ref's cleanup disconnects the observer when the nav unmounts. In compact mode both arrow buttons become `iconOnly` with the label moved to `aria-label`, and `paginationRange` is called with sibling 0, which trims the row to 5 items.
4. The nav is `flex w-full items-center justify-between gap-2`, so Previous sits flush left, Next flush right and the `<ul>` of cells (`gap-0.5`) floats between them. Previous is disabled on page 1 and Next on the last page, and each calls `onChange(page ∓ 1)`.
5. Each page is a `<button type="button" aria-label="Go to page N">` in a shared `cell` class: `size-8 rounded-lg text-body-medium`, centred. The current page gets `aria-current="page"` and the secondary-button surface (`border border-border-button-default bg-background-primary-default text-text-primary shadow-xs`). Others are `text-text-secondary` with `hover:bg-background-secondary-hover hover:text-text-primary`. Dots are `aria-hidden` `<li>`s in `text-text-tertiary`.
6. The cells deliberately have no transition. Animating background, shadow and colour makes the previously active number visibly fade out on every page change, which reads as a flicker.
7. With `totalPages <= 1` the component returns `null` after its hooks have run. The whole tree passes through `useTemplateCopy()`, which is the identity unless a `TemplateCopyProvider` supplies a translator for the labels.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `COMPACT_WIDTH = 420px`
  The full-label, one-sibling layout starts clipping somewhere between 380 and 420px depending on how many digits `totalPages` has. Switching at the upper end of that range means it never clips.
- `cell = size-8 (32×32), rounded-lg, gap-0.5`
  32px matches the small secondary `Button` height on either side, so the whole row shares one baseline and one height. The 2px gap keeps hover backgrounds from touching.
- `item count = siblingCount × 2 + 5 (7 at the default of 1)`
  First, last, current, the siblings and two dot slots. Keeping the count constant across the three collapsed shapes is what stops the row from changing width while paging.
- `siblingCount default = 1`
  One neighbour each side is enough to step through pages by clicking without overfilling a card footer. Compact mode forces 0.

## API

```ts
function Pagination(props: { page: number; totalPages: number; onChange: (page: number) => void; siblingCount?: number; className?: string; previousLabel?: string; nextLabel?: string; "aria-label"?: string }): JSX.Element | null
```

- `page: number`
  Current page, 1-based. Controlled.
- `totalPages: number`
  Number of pages. At 1 or fewer the component renders nothing.
- `onChange: (page: number) => void`
  Called with the target page from a cell, Previous or Next.
- `siblingCount: number` — default `1`
  Pages shown on each side of the current one. Forced to 0 below a 420px container.
- `previousLabel / nextLabel: string` — default `"Previous" / "Next"`
  Button labels, used as `aria-label` in compact mode.
- `aria-label: string` — default `"Pagination"`
  Accessible name of the `<nav>` landmark.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const DOTS = "dots";

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function paginationRange(
  current: number,
  total: number,
  sibling: number,
): (number | typeof DOTS)[] {
  // first + last + current + 2*sibling + 2 dots
  const totalPageNumbers = sibling * 2 + 5;
  if (totalPageNumbers >= total) return range(1, total);

  const leftSibling = Math.max(current - sibling, 1);
  const rightSibling = Math.min(current + sibling, total);
  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < total - 2;

  if (!showLeftDots && showRightDots) {
    return [...range(1, 3 + 2 * sibling), DOTS, total];
  }
  if (showLeftDots && !showRightDots) {
    return [1, DOTS, ...range(total - (2 + 2 * sibling), total)];
  }
  return [1, DOTS, ...range(leftSibling, rightSibling), DOTS, total];
}

// No transition on the cells: animating background/shadow/color makes the
// previously-active number visibly fade out ("flicker") on every page change.
const cell = "flex size-8 shrink-0 items-center justify-center rounded-lg text-body-medium";

/** Below this nav width, Previous/Next drop their labels and siblingCount
 *  clamps to 0 — the full-label, full-sibling layout starts clipping
 *  somewhere around 380–420px depending on totalPages' digit count. */
const COMPACT_WIDTH = 420;

function useIsCompact() {
  const [isCompact, setIsCompact] = useState(false);

  // A callback ref, so the observer follows the nav itself: it attaches when
  // the nav mounts (also when `totalPages` grows past 1 after a `null` render)
  // and disconnects when the nav unmounts. A mount-only effect would have run
  // once while the nav was absent and never observed it.
  const ref = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const measure = (width: number) => {
      // 0 means hidden or not laid out (display: none, a closed tab or panel).
      // Keep the last layout instead of flipping to compact, which would then
      // paint for a frame when the nav is shown again.
      if (width > 0) setIsCompact(width < COMPACT_WIDTH);
    };
    // Measure now, during commit, so the first paint already has the right
    // layout. The observer's first callback lands after that paint, so on a
    // narrow container the full labels would flash before switching.
    measure(el.offsetWidth);
    // Border box, like offsetWidth, and unaffected by a scaled ancestor.
    const observer = new ResizeObserver(([entry]) => {
      if (entry) measure(entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width);
    });
    observer.observe(el, { box: "border-box" });
    return () => observer.disconnect();
  }, []);

  return [ref, isCompact] as const;
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The `ResizeObserver` on the nav is disconnected by the callback ref's cleanup whenever the nav unmounts (component unmount, or `totalPages` dropping to 1). There are no timers or animation frames.

**Reduced motion.** Nothing animates. The page cells have no transitions by design, and the arrow buttons only have the shared button press, which `Button` already removes under `prefers-reduced-motion: reduce`.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not add `transition-colors` to the page cells. The old active cell then fades out while the new one fades in, which looks like a flicker on every click.
- Do not decide compact mode only in the `ResizeObserver` callback, and do not let a 0 width count. The first callback lands after the first paint, so a narrow pager flashes its full labels, and a hidden pager (0 wide) would flip to compact and flash that when shown again.
- Do not switch to compact mode on a viewport media query. The pager lives in cards and table footers, so it observes its own nav width with a `ResizeObserver`.
- Do not drop the `aria-label` on the icon-only arrows. In compact mode the visible label is gone and the button would otherwise be announced as just "button".
- Do not use the array index as the key for page cells. They are keyed by page number so a cell keeps its identity, and focus, when the window shifts. Only the dots use an index key.
- Do not treat it as uncontrolled. It renders whatever `page` it is given and only reports clicks through `onChange`, so the parent must store the page.

## Notes

- The observer follows the nav, not the component: if `totalPages` starts at 1 (the pager renders `null`) and grows later, the nav attaches and is measured then; dropping back to 1 disconnects it.
- The arrow icons come through `Button`, which mirrors directional glyphs in RTL, so Previous and Next point the reading direction automatically.

## Definition of done

With page 3 of 10 the row reads Previous, 1, 2, 3, 4, 5, …, 10, Next, with 3 raised and bordered. Clicking 4 moves the raised cell instantly with no fade and the row becomes 1, …, 3, 4, 5, …, 10, still seven items. Previous is disabled on page 1 and Next on page 10. Narrowing the container below 420px turns both arrows into icon-only buttons and the row becomes 1, …, 3, …, 10 without clipping. Each page cell announces "Go to page N" and the current one has `aria-current="page"`.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
