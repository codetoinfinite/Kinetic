# Build: Calendar Toolbar

The header row of the calendar template, assembled from kit pieces: the month as a heading with a Today button on the left, and the month stepper, a Day / Week / Month segmented control, a search field and the primary New event button on the right. Month, view and search are each independently controlled or uncontrolled. The row wraps into a second line, then stacks, as its container narrows.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Calendar page header: month title, Today, month stepper, Day/Week/Month segments, event search and a New event button.

- Category: navigation
- Runtime cost: css
- Dependencies: @internationalized/date@^3.12.4, @remixicon/react@^4.9.0

## How it works

1. Month state is a `CalendarDate` normalised with `startOfMonth`. `month` controls it; otherwise `defaultMonth`, then `today`, then the local current date seed internal state. Both the stepper and the Today button write through one `setMonth` that updates internal state and calls `onMonthChange`.
2. The heading defaults to `DateFormatter(locale, { month: "long", year: "numeric", timeZone: "UTC" })` of the month and carries `aria-live="polite"`, so stepping the month is announced. Passing `title={null}` removes it; any other node replaces it.
3. Today sets the month to `startOfMonth(today)` and calls `onToday(today)` so the parent can also select or scroll to the day. `today` is a prop so server-rendered pages can pin it and avoid a hydration mismatch.
4. The view switch is the kit `SegmentedControl` with `selectedKeys={[view]}`. `onSelectionChange` reads the single key out of the Set, ignores anything that is not a known view, then updates internal state and calls `onViewChange`. `views` picks and orders the segments.
5. The search is the kit `SearchField` passed `value`/`defaultValue`/`onChange` straight through, so Escape clears it. Layout is two flex groups in a `flex-wrap` row: from `sm` up the right group is `flex-1 justify-end flex-wrap`. Below `sm` both groups take `w-full` (title and Today pushed apart), and the stepper and search also take `w-full`, so on a phone they each get their own line.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `control height = 36px everywhere`
  Button medium, MonthStepper medium, SearchField medium and the solid SegmentedControl (4px track padding + 28px segment) all land on 36px, so the row reads as one baseline without per-control fixes.
- `stepper width = w-60 (240px) from sm up`
  Narrower than the stepper's 320px default so all five controls fit in one 1100px row, still wide enough that "September 2026" does not truncate.
- `search width = w-52 (208px) from sm up`
  Fits the "Search events" placeholder plus icon and clear button with room for a short query.
- `gaps = 12px between groups, 8px inside the control group`
  The tighter inner gap groups the controls visually, and the wider outer gap separates them from the title.

## API

```ts
type CalendarView = "day" | "week" | "month"
function CalendarToolbar(props: { month?: CalendarDate; defaultMonth?: CalendarDate; onMonthChange?: (month: CalendarDate) => void; today?: CalendarDate; onToday?: (today: CalendarDate) => void; view?: CalendarView; defaultView?: CalendarView; onViewChange?: (view: CalendarView) => void; views?: CalendarView[]; searchValue?: string; defaultSearchValue?: string; onSearchChange?: (value: string) => void; showSearch?: boolean; searchPlaceholder?: string; onNewEvent?: () => void; newEventLabel?: string; title?: ReactNode; actions?: ReactNode; locale?: string; className?: string; ref?: Ref<HTMLDivElement> }): JSX.Element
```

- `month / defaultMonth: CalendarDate`
  Shown month, controlled or uncontrolled.
- `onMonthChange: (month: CalendarDate) => void`
  Called with the first day of the month from the stepper or Today.
- `today: CalendarDate` — default `local today`
  Target of the Today button.
- `onToday: (today: CalendarDate) => void`
  Called after Today moved the month.
- `view / defaultView: "day" | "week" | "month"` — default `"month"`
  Selected segment.
- `onViewChange: (view: CalendarView) => void`
  Called when a segment is chosen.
- `views: CalendarView[]` — default `["day", "week", "month"]`
  Segments to show, in order.
- `searchValue / defaultSearchValue / onSearchChange: string / string / (value: string) => void`
  Search text, controlled or uncontrolled.
- `showSearch: boolean` — default `true`
  Render the search field.
- `onNewEvent: () => void`
  Press handler of the primary button.
- `title: ReactNode` — default `formatted month`
  Left heading; `null` hides it.
- `actions: ReactNode`
  Extra controls before New event.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function CalendarToolbar({
  month: controlledMonth,
  defaultMonth,
  onMonthChange,
  today,
  onToday,
  view: controlledView,
  defaultView = "month",
  onViewChange,
  views = ["day", "week", "month"],
  searchValue,
  defaultSearchValue = "",
  onSearchChange,
  showSearch = true,
  searchPlaceholder = "Search events",
  onNewEvent,
  newEventLabel = "New event",
  title,
  actions,
  locale = "en-US",
  className,
  ref,
}: CalendarToolbarProps) {
  const [uncontrolledMonth, setUncontrolledMonth] = useState<CalendarDate>(() =>
    startOfMonth(defaultMonth ?? today ?? todayIn(getLocalTimeZone())),
  );
  const month = startOfMonth(controlledMonth ?? uncontrolledMonth);
  const setMonth = (next: CalendarDate) => {
    setUncontrolledMonth(next);
    onMonthChange?.(next);
  };

  const [uncontrolledView, setUncontrolledView] = useState<CalendarView>(defaultView);
  const view = controlledView ?? uncontrolledView;

  const titleFormatter = useMemo(
    () => new DateFormatter(locale, { month: "long", year: "numeric", timeZone: "UTC" }),
    [locale],
  );
  const heading = title === undefined ? titleFormatter.format(month.toDate("UTC")) : title;

  const goToday = () => {
    const target = today ?? todayIn(getLocalTimeZone());
    setMonth(startOfMonth(target));
    onToday?.(target);
  };

  return (
    <div ref={ref} className={cx("flex w-full flex-wrap items-center gap-x-3 gap-y-3", className)}>
      <div className="flex w-full min-w-0 items-center justify-between gap-3 sm:w-auto sm:justify-start">
        {heading !== null ? (
          <h2 aria-live="polite" className="truncate text-title-3-medium text-text-primary">
            {heading}
          </h2>
        ) : null}
        <Button variant="secondary" onClick={goToday}>
          Today
        </Button>
      </div>

      <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-1 sm:justify-end">
        <MonthStepper value={month} onChange={setMonth} locale={locale} className="w-full sm:w-60" />
        <SegmentedControl
          aria-label="Calendar view"
          selectedKeys={[view]}
          onSelectionChange={(keys) => {
            const [next] = [...keys];
            if (typeof next !== "string" || !(next in VIEW_LABELS)) return;
            setUncontrolledView(next as CalendarView);
            onViewChange?.(next as CalendarView);
          }}
        >
          {views.map((v) => (
            <SegmentedControlItem key={v} id={v}>
              {VIEW_LABELS[v]}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        {showSearch ? (
          <SearchField
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={searchValue}
            defaultValue={defaultSearchValue}
            onChange={onSearchChange}
            className="w-full min-w-0 sm:w-52"
          />
        ) : null}
        {actions}
        <Button leadingIcon={RiAddLine} onClick={onNewEvent}>
          {newEventLabel}
        </Button>
      </div>
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing of its own. The composed kit components clean up their own effects and observers.

**Reduced motion.** The toolbar adds no motion of its own. The month stepper skips its label slide and the segmented control's thumb follows the kit control's own behaviour.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Reading `onSelectionChange` keys as an array. React Aria passes a `Set<Key>`; spread it before destructuring.
- Defaulting `today` with `new Date()` on the server. Pass a fixed `CalendarDate` when the toolbar is server rendered, or the heading and Today target can disagree between server and client around midnight.
- Letting the segmented control allow an empty selection. The kit control sets `disallowEmptySelection`; keep a view selected or the grid under the toolbar has nothing to render.

## Notes

- Use `actions` for the template's notification and inbox icon buttons; they render just before New event.
- The toolbar only reports state. Filtering events by the search text and switching between grid components is the parent's job.

## Definition of done

With month August 2026, the heading reads "August 2026". Pressing the stepper's next chevron changes the heading to "September 2026"; pressing Today returns it to "August 2026". Choosing "Week" in the segmented control marks it selected and reports `"week"`. Typing "sync" in the search reports the text and Escape clears it. New event calls `onNewEvent`. At 360px wide every control remains visible and nothing scrolls sideways.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
