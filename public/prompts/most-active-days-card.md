# Build: Most Active Days Card

A grey dashboard card with the visible month's step total, a month pill with previous and next arrows, and a fixed-height white panel that scrolls through all twelve months of the year. Every day is a numbered cell with a 26px stack of three concentric progress rings; days after "today" show faded empty tracks and cannot be picked. Scrolling updates the pill and the total to the month in view, the arrows scroll smoothly to the neighbouring month, and picking a day (click or arrow keys) reports it so a paired Activity Rings Card can show that day.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A scrolling year calendar where each day is a mini activity ring, with a month pill that follows the scroll and selectable days.

- Category: display
- Runtime cost: dom
- Dependencies: @internationalized/date@^3.12.4, @remixicon/react@^4.9.0

## How it works

1. One memoised pass builds the year: for each month, `getDaysInMonth` gives the day count, each `CalendarDate` gets its data from `getActivity` (default `sampleDayActivity`, seeded by `createRng(date.toString())` so every date is stable across renders and server/client), and each month sums `steps` for days on or before `today` into its total.
2. Each month is a section with a sticky 44px heading ("Jul") over a 7-column grid of day buttons that simply runs 1–7, 8–14 and so on, like the reference, rather than aligning to weekdays. A cell is 42×74px: the number above `MiniActivityRings`, an SVG where each ring is a tinted track (ring colour mixed 22% into `--color-chart-track`) plus a `pathLength={100}` arc with `stroke-dasharray: pct 100`, rotated -90° to start at twelve o'clock.
3. Scroll-spy: the scroller's `onScroll` schedules one `requestAnimationFrame`, which picks the last month section whose `offsetTop` is at or above `scrollTop + 35%` of the viewport (or December once the scroll is at the end). That month names the pill and its total; both are keyed spans, so `.animate-number-fade` replays as the label walks along.
4. The arrows call `scrollTo({ top: section.offsetTop })` on the scroller (smooth, or instant under reduced motion) and let the spy update the label as the scroll passes. On mount, and again whenever `height` changes, an isomorphic layout effect sets `scrollTop` to the focused day's month (the selection, else `today`) and reveals that day before paint.
5. Selection is controlled (`selected` + `onSelectedChange`) or uncontrolled (`defaultSelected`, else `today`). Day buttons use a roving tabindex: arrow keys move ±1 or ±7 days, Home and End go to the month's first and last day, Page Up and Page Down move a month, clamped to January 1 and `today`; the focused button is revealed inside the scroller (never the page) below the sticky heading. Enter or Space picks it.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `RING_SIZE / RING_STROKE / RING_GAP = 26px / 2.75px / 1px`
  Three rings fit in a day cell with a visible hole in the middle and still read as separate bands at a glance.
- `HEADING_H = 44px`
  Height of the sticky month heading; a revealed day is kept below it so keyboard focus never hides under "Jul".
- `SPY_LINE = 0.35`
  The pill switches once the next month's heading is a third of the way up the panel, so the label changes while that month is clearly arriving rather than at the very top.
- `height = 232px`
  Shows two full weeks of cells and the start of a third, which hints that the panel scrolls.

## API

```ts
function MostActiveDaysCard(props?: MostActiveDaysCardProps): JSX.Element
function MiniActivityRings(props: { rings: ActivityRing[]; empty?: boolean; size?: number; className?: string }): JSX.Element
function sampleDayActivity(date: CalendarDate): DayActivity
type DayActivity = { steps: number; rings: ActivityRing[] }
```

- `title: string` — default `"Most active days"`
  Header label.
- `totalLabel: string` — default `"total steps"`
  Unit after the month total.
- `year: number` — default `today.year`
  Year on show; all twelve months scroll in one column.
- `today: CalendarDate` — default `parseDate("2026-07-10")`
  Later days are empty and disabled, and totals stop here.
- `getActivity: (date: CalendarDate) => DayActivity` — default `sampleDayActivity`
  Steps and ring values per day.
- `selected: CalendarDate | null`
  Controlled selected day.
- `defaultSelected: CalendarDate | null` — default `today`
  Uncontrolled initial selection.
- `onSelectedChange: (date: CalendarDate) => void`
  Called when a day is picked by click, Enter or Space.
- `height: number` — default `232`
  Height of the scrolling calendar in px.
- `className: string`
  Merged onto the card section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// Scroll the calendar so `el` sits fully below the sticky month heading.
const reveal = (el: HTMLElement, behavior: ScrollBehavior) => {
  const scroller = scrollerRef.current;
  if (!scroller) return;
  const top = el.offsetTop - HEADING_H;
  const bottom = el.offsetTop + el.offsetHeight + 8;
  if (top < scroller.scrollTop) scroller.scrollTo({ top, behavior });
  else if (bottom > scroller.scrollTop + scroller.clientHeight)
    scroller.scrollTo({ top: bottom - scroller.clientHeight, behavior });
};

// Scroll-spy: the month whose top has passed SPY_LINE of the viewport names the pill.
const spy = () => {
  const scroller = scrollerRef.current;
  if (!scroller) return;
  const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
  const line = scroller.scrollTop + scroller.clientHeight * SPY_LINE;
  let month = 1;
  monthRefs.current.forEach((section, i) => {
    if (section && section.offsetTop <= line) month = i + 1;
  });
  setVisibleMonth(atEnd ? 12 : month);
};

const onScroll = () => {
  cancelAnimationFrame(spyFrame.current);
  spyFrame.current = requestAnimationFrame(spy);
};

const goToMonth = (month: number) => {
  const section = monthRefs.current[month - 1];
  const scroller = scrollerRef.current;
  if (!section || !scroller) return;
  scroller.scrollTo({ top: section.offsetTop, behavior: reduced ? "auto" : "smooth" });
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The pending scroll-spy animation frame is cancelled on every new scroll event and on unmount. Scrolling, clicks and keys use React event props, so there are no listeners to remove.

**Reduced motion.** With `prefers-reduced-motion: reduce`, the month arrows and keyboard reveal scroll instantly instead of smoothly, the pill label and total no longer fade in (`motion-reduce:animate-none`), and the cell hover and selection border changes are instant.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Using `scrollIntoView` to reveal the focused day. In a preview frame or a scrolled page it also scrolls every ancestor; setting `scrollTop` on the panel only moves the calendar.
- Setting the pill label straight from the arrow click. The spy would then flip it back for a few frames while the smooth scroll is still short of the line; letting the spy own the label keeps it in step with what is on screen.
- Passing a fresh `CalendarDate` for `today` each render rebuilds the whole year. The memo is keyed on `today.toString()` so equal dates reuse it.

## Notes

- Exports `MostActiveDaysCard`, `MiniActivityRings`, `sampleDayActivity`, `formatLongDate` and the `DayActivity` type (`{ steps, rings: ActivityRing[] }`). The rings use the `ActivityRing` shape from the Activity Rings Card, so a day's rings can be passed straight to it.
- The demo pairs the two cards: the selected day drives the Activity Rings Card's title ("Activity for July 10, 2026") and rings, which glide to the new values. On screens under 640px the demo stacks the cards and passes a 168px calendar `height` and a 120px ring `size` so both fit.

## Definition of done

The default card reads "Most active days", "39,919 total steps" and a pill showing "July", with the panel opened on July: days 1–10 have three-colour mini rings, 11–31 are faded empty tracks and disabled, and the 10th has a grey outline. Clicking the next arrow scrolls smoothly to August and the pill then reads "August" with a total of 0; scrolling back up changes it to "July" again. Clicking July 3 outlines it and fires `onSelectedChange` (in the demo the Activity card title becomes "Activity for July 3, 2026" and its rings move); with July 3 focused, Arrow Right moves focus to July 4 and Arrow Down to July 10, but not past it.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
