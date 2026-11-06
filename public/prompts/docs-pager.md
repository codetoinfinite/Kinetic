# Build: Docs Pager

Two bordered cards that close a documentation page, pointing to the page before and the page after. The previous card sits left with a back arrow, the next card sits right with its text end-aligned, and each shows the page title over a short tertiary description. On hover the card fills and its arrow nudges toward where it leads.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Previous / next cards for the foot of a docs page: arrow and title on top, a one-line summary below, mirrored for RTL.

- Category: navigation
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The nav is a one-column grid that becomes two columns from `sm`. The next card always takes `sm:col-start-2`, so on the first page (no previous) it still sits on the right instead of sliding into the empty left slot.
2. Each card is an `<a rel="prev|next">` when the link has an `href`, otherwise a `<button>` that only calls `onNavigate(direction, link)`, which suits client routers and demos. The direction is read out through a visible label (`showLabels`) or an `sr-only` "Previous:" / "Next:" prefix, so the title and description stay part of the accessible name.
3. The arrow uses `directionalIconClass` (`rtl:rotate-180`) and the hover nudge flips sign under `rtl:`, so in a right-to-left document the previous card points right and moves right. Because Tailwind v4 writes `translate` and `rotate` as separate properties, the nudge and the mirror compose without overriding each other.
4. In button mode the pager re-renders in place. When the clicked card disappears (the first or last page was reached), an effect keyed on the two titles sees focus on `<body>` and moves it to the card that remains, so keyboard users are not dropped to the top of the document.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `card = rounded-xl, 1px border, px-4 py-3.5, shadow-xs`
  Matches the reference pager: a quiet bordered card that reads as part of the page rather than a primary button.
- `arrow nudge = 2px (translate-x-0.5), 200ms ease-out`
  Enough to hint at direction on hover without moving the title text.
- `type = title body-medium primary, description caption-1 tertiary`
  Same hierarchy as the reference: page name first, a muted one-liner under it.

## API

```ts
function DocsPager(props: { prev?: DocsPagerLink | null; next?: DocsPagerLink | null; onNavigate?: (direction: "prev" | "next", link: DocsPagerLink) => void; showLabels?: boolean; prevLabel?: string; nextLabel?: string; "aria-label"?: string; className?: string }): JSX.Element | null
type DocsPagerLink = { title: string; description?: ReactNode; href?: string }
```

- `prev / next: DocsPagerLink | null`
  `{ title, description?, href? }` for each neighbour; omit one at the ends of a section.
- `onNavigate: (direction: "prev" | "next", link: DocsPagerLink) => void`
  Called on click; the only effect when the link has no `href`.
- `showLabels: boolean` — default `false`
  Shows "Previous" / "Next" above the titles instead of keeping them screen-reader only.
- `prevLabel / nextLabel: string` — default `"Previous" / "Next"`
  Direction words, visible or `sr-only`.
- `aria-label: string` — default `"Previous and next page"`
  Name of the wrapping `<nav>`.
- `className: string`
  Merged onto the grid.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// In button mode the pager re-renders in place with new neighbours. When the
// card that was clicked disappears (first or last page reached), focus would
// fall to <body>; hand it to the card that is still there instead.
useEffect(() => {
  const side = pendingFocus.current;
  if (!side) return;
  pendingFocus.current = null;
  const active = document.activeElement;
  if (active && active !== document.body && active.isConnected) return;
  const other: DocsPagerDirection = side === "prev" ? "next" : "prev";
  (refs.current[side] ?? refs.current[other])?.focus();
}, [prev?.title, next?.title]);

const card = (direction: DocsPagerDirection, link: DocsPagerLink) => {
  const isPrev = direction === "prev";
  const Arrow = isPrev ? RiArrowLeftLine : RiArrowRightLine;
  const label = isPrev ? prevLabel : nextLabel;
  const className = cx(
    "group flex min-w-0 flex-col gap-1 rounded-xl border border-border-button-default bg-background-primary-default px-4 py-3.5 shadow-xs outline-none",
    "transition-[background-color,border-color] duration-150 ease-out motion-reduce:transition-none",
    "hover:border-border-button-hover hover:bg-background-secondary-hover",
    "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary-default",
    isPrev ? "items-start text-start" : "items-end text-end sm:col-start-2",
  );
  const content = (
    <>
      {showLabels ? (
        <span className="text-caption-1-regular text-text-tertiary">{label}</span>
      ) : (
        <span className="sr-only">{label}: </span>
      )}
      <span className={cx("flex max-w-full items-center gap-1.5 text-body-medium text-text-primary", !isPrev && "flex-row-reverse")}>
        <Arrow
          aria-hidden
          className={cx(
            "size-4 shrink-0 text-foreground-icon-secondary transition-transform duration-200 ease-out motion-reduce:transition-none",
            "group-hover:text-foreground-icon-primary",
            isPrev
              ? "group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5"
              : "group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5",
            directionalIconClass(Arrow),
          )}
        />
        <span className="truncate">{link.title}</span>
      </span>
      {link.description ? (
        <span className="max-w-full truncate text-caption-1-regular text-text-tertiary">{link.description}</span>
      ) : null}
    </>
  );
  const setRef = (node: HTMLElement | null) => {
    refs.current[direction] = node;
  };
  const handle = () => {
    pendingFocus.current = direction;
    onNavigate?.(direction, link);
  };
  return link.href ? (
    <a key={direction} ref={setRef} href={link.href} rel={direction} onClick={handle} className={className}>
      {content}
    </a>
  ) : (
    <button key={direction} ref={setRef} type="button" onClick={handle} className={cx(className, "cursor-pointer")}>
      {content}
    </button>
  );
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to release: there are no timers, listeners or observers. The focus hand-off is a one-shot effect that reads `document.activeElement`.

**Reduced motion.** The hover arrow nudge and the card colour transitions carry `motion-reduce:transition-none`; the arrow still shifts 2px but without animating.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Letting the next card fall into the first grid column when there is no previous page. Readers expect "next" on the right; pin it with `col-start-2`.
- Putting `aria-label="Next page"` on the card. It replaces the title and description for screen readers; prefix an `sr-only` label instead.
- Mirroring the arrow with a `rotate-180` class that also sets `transform`, then adding a hover translate on the same property. One wins and the other is lost; keep them on separate properties.
- Re-rendering a pager whose clicked card unmounts without moving focus. Focus falls back to `<body>` and the next Tab starts from the top of the page.

## Notes

- Pass `href` from your router's page list; `rel="prev"` / `rel="next"` also helps crawlers and reader modes.
- The component renders nothing when both links are missing, so it can sit in a layout unconditionally.

## Definition of done

The demo opens on Line Chart Card with "Heatmap Chart" on the left and "Most Active Days" on the right. Clicking Next twice reaches Sankey Flow (6 of 6), the right card disappears and focus moves to the remaining Previous card. Clicking Previous walks back; on Area Chart Card (1 of 6) only the Next card shows and it stays on the right.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
