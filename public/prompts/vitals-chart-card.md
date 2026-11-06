# Build: Vitals Chart Card

One vital sign over a short period, drawn like the medical profile's steps card: a column per reading, each a full-height grey track filled from the bottom. A dashed band marks the normal range, readings outside it turn pink, and an inner tile under the chart spells the range out next to an in-range count. Hovering, focusing or selecting a column swaps the headline for that reading; a "range" variant floats each bar from a low to a high value for blood pressure.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A weekly vital-sign card: track-and-fill columns, a dashed normal-range band, pink out-of-range bars and a period stepper.

- Category: display
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The value axis is `domain` or, when omitted, the min and max of every value, low and normal-range bound padded by 25% of the spread. `pct(v)` maps a value into 0-100% of the plot height and clamps it.
2. Each reading is a `<button>` track (`bg-chart-track`, 10px radius) in a CSS grid of `repeat(n, minmax(0, 1fr))` columns, positioned `absolute inset-0` inside the flex-1 plot box. Its fill is an absolutely positioned span with `bottom` 0 (bars) or `pct(low)` (range) and `height` `pct(value) - bottom`, so a new period animates through a 500ms CSS transition of `height` and `bottom`.
3. `vitalStatus` compares `value` with `normalRange` (and, when `value` is normal, `low` with `lowNormalRange`) and returns low, normal or high. Normal fills use the `color` prop's chart token, anything else uses `bg-chart-3`, and the dashed `bg-chart-7/10` band (one per range) is laid over the tracks with the same `pct` mapping.
4. The active column is the hovered one, else the selected one. Clicking toggles selection (controlled `selectedIndex` or uncontrolled `defaultSelectedIndex`), other fills dim to 40%, and the headline re-keys so the kit `animate-number-fade` replays with that day's value, detail label and a Normal, High or Low chip.
5. Columns use a roving tabindex: Arrow keys, Home and End move focus and preview the reading (a focus that matches `:focus-visible` previews, a mouse focus does not), Enter or Space toggles it, and Escape clears the selection.
6. With no active column the headline shows the `summary` (average, latest, max or min; range readings print as value/low) and the chip reads "n/total in range", lime when every reading is normal and orange otherwise. The optional `period` prop renders a bordered stepper whose arrows call `onPrevious` and `onNext`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `card min height = 330px`
  Matches the medical profile row of cards, so it lines up with Patient Info Card.
- `domain padding = 25% of the data spread`
  Keeps the tallest bar and the normal band clear of the top and bottom of the track.
- `fill transition = 500ms ease-out`
  Long enough to read the change when stepping periods, short enough not to delay hovering.
- `dimmed fill opacity = 40%`
  Keeps the other readings visible while the active one is read.
- `track radius = 10px`
  The rounded column shape of the steps chart.

## API

```ts
export function VitalsChartCard({ title, unit, icon, readings, normalRange, lowNormalRange, domain, variant = "bars", color = "teal", summary = "average", decimals = 0, period, selectedIndex, defaultSelectedIndex = null, onSelectedIndexChange, className }: VitalsChartCardProps): JSX.Element
```

- `title: string`
  Card label, e.g. "Heart rate".
- `unit: string`
  Unit printed after the headline and in the range hint.
- `icon: ComponentType`
  Optional icon before the title.
- `readings: VitalReading[]`
  One column per reading: label, optional detail, value and optional low.
- `normalRange: readonly [number, number]`
  Inclusive normal range for value; drawn as the dashed band.
- `lowNormalRange: readonly [number, number]`
  Inclusive normal range for low in the range variant; draws a second band.
- `domain: readonly [number, number]`
  Value axis floor and ceiling; derived from the data when omitted.
- `variant: "bars" | "range"` — default `"bars"`
  Fill from the floor, or float from low to value.
- `color: "teal" | "lime" | "sky" | "purple" | "blue" | "emerald" | "indigo"` — default `"teal"`
  Chart token for in-range fills.
- `summary: "average" | "latest" | "max" | "min"` — default `"average"`
  Headline when no column is active.
- `decimals: number` — default `0`
  Fraction digits for printed values.
- `period: VitalsPeriod`
  Label plus onPrevious/onNext and disabled flags for the header stepper.
- `selectedIndex: number | null`
  Controlled selected column.
- `defaultSelectedIndex: number | null` — default `null`
  Initial selected column when uncontrolled.
- `onSelectedIndexChange: (index: number | null) => void`
  Called when a column is selected or cleared.
- `className: string`
  Classes on the card.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function VitalsChartCard({
  title,
  unit,
  icon: Icon,
  readings,
  normalRange,
  lowNormalRange,
  domain,
  variant = "bars",
  color = "teal",
  summary = "average",
  decimals = 0,
  period,
  selectedIndex,
  defaultSelectedIndex = null,
  onSelectedIndexChange,
  className,
}: VitalsChartCardProps) {
  const [innerSelected, setInnerSelected] = useState<number | null>(defaultSelectedIndex);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(Math.max(0, readings.length - 1));
  const barRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const isRange = variant === "range";
  const selectedRaw = selectedIndex !== undefined ? selectedIndex : innerSelected;
  const selected = selectedRaw !== null && selectedRaw < readings.length ? selectedRaw : null;
  const hovered = hoverIndex !== null && hoverIndex < readings.length ? hoverIndex : null;
  const activeIndex = hovered ?? selected;
  const active = activeIndex !== null ? readings[activeIndex] : undefined;
  const rovingIndex = Math.min(focusIndex, Math.max(0, readings.length - 1));

  const select = (index: number | null) => {
    if (selectedIndex === undefined) setInnerSelected(index);
    onSelectedIndexChange?.(index);
  };

  const [d0, d1] = domain ?? autoDomain(readings, normalRange, lowNormalRange);
  const span = d1 - d0 || 1;
  const pct = (v: number) => clampPct(((v - d0) / span) * 100);

  const fmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const print = (r: Pick<VitalReading, "value" | "low">) =>
    isRange && r.low !== undefined ? `${fmt.format(r.value)}/${fmt.format(r.low)}` : fmt.format(r.value);

  // Headline when nothing is active: the summary of the whole period.
  let summaryReading: Pick<VitalReading, "value" | "low"> | undefined;
  if (readings.length > 0) {
    if (summary === "latest") summaryReading = readings[readings.length - 1];
    else if (summary === "max") summaryReading = readings.reduce((a, b) => (b.value > a.value ? b : a));
    else if (summary === "min") summaryReading = readings.reduce((a, b) => (b.value < a.value ? b : a));
    else {
      const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
      const lows = readings.flatMap((r) => (r.low === undefined ? [] : [r.low]));
      summaryReading = {
        value: mean(readings.map((r) => r.value)),
        low: lows.length > 0 ? mean(lows) : undefined,
      };
    }
  }

  const statuses = readings.map((r) => vitalStatus(r, normalRange, lowNormalRange));
  const inRange = statuses.filter((s) => s === "normal").length;
  const activeStatus = activeIndex !== null ? statuses[activeIndex] : undefined;
  const chip = activeStatus
    ? STATUS_CHIP[activeStatus]
    : {
        label: `${inRange}/${readings.length} in range`,
        color: inRange === readings.length ? ("lime" as const) : ("orange" as const),
      };

  const headline = active ?? summaryReading;
  const caption = active
    ? (active.detail ?? active.label)
    : `${SUMMARY_LABEL[summary]}${period ? ` · ${period.label}` : ""}`;

  const rangeText = (r: readonly [number, number]) => `${fmt.format(r[0])}–${fmt.format(r[1])}`;
  const normalText =
    isRange && lowNormalRange
      ? `${rangeText(normalRange)}/${rangeText(lowNormalRange)}`
      : `${rangeText(normalRange)} ${unit}`;

  const bands = [normalRange, ...(isRange && lowNormalRange ? [lowNormalRange] : [])];

  const moveFocus = (index: number) => {
    const next = (index + readings.length) % readings.length;
    setFocusIndex(next);
    setHoverIndex(next);
    barRefs.current[next]?.focus();
  };

  const onBarKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") moveFocus(index + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") moveFocus(index - 1);
    else if (event.key === "Home") moveFocus(0);
    else if (event.key === "End") moveFocus(readings.length - 1);
    else if (event.key === "Escape" && selected !== null) select(null);
    else return;
    event.preventDefault();
  };

  return (
    <section
      aria-label={title}
      className={cx(
        "flex min-h-[330px] w-full min-w-0 flex-col gap-4 rounded-[20px] bg-background-secondary-default px-4 pt-4 pb-3",
        className,
      )}
    >
      {/* Header: label, headline figure + unit, caption; period stepper on the right */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-[1_1_9rem] flex-col gap-0.5">
          <p className="flex items-center gap-1.5 text-body-medium text-text-secondary">
            {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
            <span className="truncate">{title}</span>
          </p>
          <p className="flex items-baseline gap-1.5">
            <span
              key={activeIndex ?? "summary"}
              className="animate-number-fade text-title-1-medium whitespace-nowrap text-text-primary tabular-nums motion-reduce:animate-none"
              data-vital-value=""
            >
              {headline ? print(headline) : "–"}
            </span>
            <span className="text-body-2-medium text-text-secondary">{unit}</span>
          </p>
          <p className="truncate text-caption-1-medium text-text-tertiary" data-vital-caption="">
            {caption}
          </p>
        </div>
        {period ? <PeriodStepper period={period} title={title} /> : null}
      </div>

      {/* Plot: one track per reading, fills from the floor (bars) or floats low → value (range) */}
      <div className="flex min-h-[140px] flex-1 flex-col gap-2">
        <div className="relative min-h-0 flex-1">
          <div
            role="group"
            aria-label={`${title} readings`}
            className="absolute inset-0 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, readings.length)}, minmax(0, 1fr))` }}
            onPointerLeave={() => setHoverIndex(null)}
          >
            {readings.map((reading, index) => {
              const status = statuses[index] ?? "normal";
              const bottom = isRange && reading.low !== undefined ? pct(reading.low) : 0;
              const height = Math.max(pct(reading.value) - bottom, 0);
              const isSelected = selected === index;
              const dimmed = activeIndex !== null && activeIndex !== index;
              return (
                <button
                  key={`${reading.label}-${index}`}
                  ref={(node) => {
                    barRefs.current[index] = node;
                  }}
                  type="button"
                  tabIndex={index === rovingIndex ? 0 : -1}
                  aria-pressed={isSelected}
                  aria-label={`${reading.detail ?? reading.label}: ${print(reading)} ${unit}, ${STATUS_CHIP[status].label.toLowerCase()}`}
                  className={cx(
                    "relative h-full min-w-0 cursor-pointer overflow-hidden rounded-[10px] bg-chart-track outline-none",
                    "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background-secondary-default",
                    isSelected && "ring-2 ring-text-primary ring-offset-2 ring-offset-background-secondary-default",
                  )}
                  onPointerEnter={() => setHoverIndex(index)}
                  onFocus={(event) => {
                    setFocusIndex(index);
                    if (event.currentTarget.matches(":focus-visible")) setHoverIndex(index);
                  }}
                  onBlur={() => setHoverIndex((current) => (current === index ? null : current))}
                  onKeyDown={(event) => onBarKeyDown(event, index)}
                  onClick={() => select(isSelected ? null : index)}
                >
                  <span
                    aria-hidden
                    data-status={status}
                    className={cx(
                      "absolute inset-x-0 min-h-1.5 rounded-[10px] transition-[height,bottom,opacity] duration-500 ease-out motion-reduce:transition-none",
                      status === "normal" ? FILL[color] : OUT_OF_RANGE_FILL,
                      dimmed && "opacity-40",
                    )}
                    style={{ bottom: `${bottom}%`, height: `${height}%` }}
                  />
                </button>
              );
            })}
          </div>
          {bands.map((band, i) => (
            <div
              key={i}
              aria-hidden
              className="pointer-events-none absolute inset-x-0 border-y border-dashed border-chart-7-active bg-chart-7/10"
              style={{ bottom: `${pct(band[0])}%`, height: `${Math.max(pct(band[1]) - pct(band[0]), 0)}%` }}
            />
          ))}
        </div>
        <div
          aria-hidden
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, readings.length)}, minmax(0, 1fr))` }}
        >
          {readings.map((reading, index) => (
            <span
              key={`${reading.label}-${index}`}
              className={cx(
                "truncate text-center text-caption-1-medium transition-colors duration-150 ease-out motion-reduce:transition-none",
                activeIndex === index ? "text-text-primary" : "text-text-tertiary",
              )}
            >
              {reading.label}
            </span>
          ))}
        </div>
      </div>

      {/* Normal-range hint */}
      <div className="flex items-center justify-between gap-2 rounded-2lg bg-background-inner-default px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-3.5 shrink-0 rounded-[3px] border border-dashed border-chart-7-active bg-chart-7/15"
          />
          <span className="text-body-regular whitespace-nowrap text-text-secondary">Normal</span>
          <span className="truncate text-body-medium text-text-primary tabular-nums">{normalText}</span>
        </div>
        <Chip variant="caption" color={chip.color} className="shrink-0" data-vital-status="">
          {chip.label}
        </Chip>
      </div>
    </section>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers, listeners or observers; hover state lives in React state and the column refs are plain arrays.

**Reduced motion.** The fill height transition, the label colour fade and the headline fade are removed with motion-reduce:transition-none and motion-reduce:animate-none; values change instantly.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not use pink (`chart-3`) as the card colour: it is reserved for out-of-range readings, so the `color` prop excludes it.
- Do not let a mouse focus preview the column; only keyboard focus (`:focus-visible`) should, or the headline sticks after the pointer leaves.
- Do not size the column grid with h-full inside a flex-1 box whose parent only has a min-height: the percentage resolves to auto and the tracks collapse to zero. Position the grid absolute inset-0 inside the relative plot box instead.

## Notes

- Values print with `Intl.NumberFormat("en-US")` and `decimals` fraction digits; range readings print as "118/76", and the range variant's hint drops the unit ("90–120/60–80") so it fits a third-width card.
- The period stepper is display-only: the parent owns which readings are shown and passes new `readings` plus the period label.

## Definition of done

Clicking a column sets aria-pressed and shows that day's value, detail and status chip in the header; Escape clears it; the previous-period arrow swaps the readings and the label, and readings outside normalRange render with the pink fill.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
