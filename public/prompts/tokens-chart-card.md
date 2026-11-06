# Build: Tokens Chart Card

The usage card of an AI profile. A grey card shows "Tokens", the period total such as "667.7M tokens" with a purple trend chip, and a full-bleed chart of daily usage: a straight-jointed purple line over a faint purple area. Days with no usage leave the line and run along the baseline as a dashed grey segment. A segmented switch changes the period, and hovering or arrowing through the chart reads out single days.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Daily token usage as a sharp purple line over a soft area, idle days dashed on the baseline, with a period switch and day scrubbing.

- Category: display
- Runtime cost: dom
- Dependencies: recharts@^3.10.1

## How it works

1. Recharts `ComposedChart` with hidden axes inside a `ResponsiveContainer`, flush with the card edges. The area uses `type="linear"` with a miter join, so peaks stay sharp like the reference rather than smoothed into hills. The fill is a vertical gradient of `--color-chart-5` from 28% to 2% opacity, its id from `useId`.
2. Each day is split into two series. `line` holds the value on busy days and on zero days that touch a busy day; `idle` holds 0 on zero days only. Recharts breaks a series at `null`, so the solid line drops to the baseline at the start of an idle run, the dashed `idle` line carries the run, and the solid line climbs out at its end.
3. The chart wrapper is a `role="slider"` over the day index. The mouse sets the active day from `activeTooltipIndex` (the Tooltip renders nothing); the keyboard uses ArrowLeft and ArrowRight, Home, End and Escape. `aria-valuetext` reads "Dec 3: 24.1M tokens" or the period total, and Recharts' own accessibility layer is turned off so there is one focus stop, not two.
4. The active day is drawn with a dashed `ReferenceLine` and a `ReferenceDot` ringed in the card colour, both driven by state, so mouse and keyboard look identical. While a day is active the caption shows its date, the headline its value, and the trend chip hides.
5. The period total rolls with the kit `useCountUp` hook (480ms) when the period changes; the rolling text is `aria-hidden` with a visually hidden copy of the final value. The period switch is the kit SegmentedControl; the card works controlled (`period`) or uncontrolled (`defaultPeriod`).

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `chart height = 176px (h-44), 8px top margin, y domain 0 to 112% of the max`
  The tallest peak keeps a little air under the header, and the baseline sits just above the date captions.
- `line = 1.75px, linear, miter join; area 28% to 2% chart-5`
  Thin and sharp so 90 days still read as individual days; the faint area gives the line weight without hiding the dashed baseline.
- `idle segment = 1.25px dashed 4 4 in text-tertiary`
  Quieter than the data line but darker than the grid colours, so a gap reads as "no runs" and not as missing data.
- `count-up = 480ms`
  Long enough to read as a new period, short enough to finish before the line has drawn in.

## API

```ts
function TokensChartCard(props: TokensChartCardProps): JSX.Element
interface TokensChartCardProps extends Omit<HTMLAttributes<HTMLElement>, "children"> { title?: string; periods: TokenPeriod[]; period?: string; defaultPeriod?: string; onPeriodChange?: (id: string) => void; unit?: string; endLabel?: string; formatValue?: (value: number) => string; ref?: Ref<HTMLElement> }
interface TokenPeriod { id: string; label: string; points: { label: string; value: number }[]; trend?: number }
```

- `title: string` — default `"Tokens"`
  Caption above the headline when no day is active.
- `periods: TokenPeriod[]`
  Each period: id, switch label, daily points and an optional trend.
- `period: string`
  Controlled period id.
- `defaultPeriod: string` — default `first period`
  Initial period when uncontrolled.
- `onPeriodChange: (id: string) => void`
  Called when the switch changes period.
- `unit: string` — default `"tokens"`
  Word after the figure and in the chart label.
- `endLabel: string` — default `"Today"`
  Caption under the last day.
- `formatValue: (value: number) => string` — default `compact, e.g. "667.7M"`
  Formats totals and day values.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// Split each day into the solid series and the dashed idle series. A zero day
// stays on the solid line only where it meets a busy day, so the line drops
// to the baseline and the dashed run takes over between idle days.
const rows = useMemo<ChartRow[]>(
  () =>
    points.map((p, i) => {
      const prev = points[i - 1]?.value ?? 0;
      const next = points[i + 1]?.value ?? 0;
      const idle = p.value === 0;
      return {
        key: i,
        value: p.value,
        line: !idle || prev > 0 || next > 0 ? p.value : null,
        idle: idle ? 0 : null,
      };
    }),
  [points],
);

const selectPeriod = (id: string) => {
  setActiveIndex(null);
  if (period === undefined) setInnerPeriod(id);
  onPeriodChange?.(id);
};

// The chart is a slider over days: arrows step, Home/End jump, Escape resets.
const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
  const last = points.length - 1;
  if (last < 0) return;
  let next: number | null | undefined;
  if (e.key === "ArrowLeft") next = activeIndex === null ? last : Math.max(0, activeIndex - 1);
  else if (e.key === "ArrowRight") next = activeIndex === null ? 0 : Math.min(last, activeIndex + 1);
  else if (e.key === "Home") next = 0;
  else if (e.key === "End") next = last;
  else if (e.key === "Escape") next = null;
  if (next === undefined) return;
  e.preventDefault();
  setActiveIndex(next);
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** ResponsiveContainer disconnects its resize observer on unmount, and the count-up hook cancels its animation frame. The card adds no timers or listeners of its own.

**Reduced motion.** With prefers-reduced-motion the line and area appear without the Recharts draw-in animation, and the headline shows the new total immediately instead of rolling. The segmented switch thumb keeps its short slide from the kit.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Plotting idle days as normal zeros. The line then dives into a long trough that looks like a crash; splitting into a solid and a dashed series says "nothing ran" instead.
- Using `monotone` curves for spiky daily data. Smoothing overshoots below zero around sharp peaks and hides the day-to-day rhythm; use straight segments.
- Leaving Recharts' accessibility layer on next to your own keyboard handling. The SVG becomes a second, silent focus stop with its own tooltip state.
- Animating the area on every hover. Only data changes should animate; the active day is drawn with reference marks, which never re-run the line animation.

## Notes

- Pass one period to hide the switch. Feed `onPeriodChange` to fetch a longer range on demand.
- Change `unit` and `formatValue` to chart requests, images or minutes instead of tokens.

## Definition of done

The card shows "Tokens", "667.7M tokens" with a purple "+9.4%" chip and a purple line that drops to a dashed baseline for eight idle days. Hovering a day shows its date and value with a dot and a dashed cursor; focusing the chart and pressing ArrowLeft selects the last day (Dec 14, 33.8M tokens). Choosing 7D shows "198.1M tokens" and a rose "−4.3%" chip; 90D shows a denser line. Light and dark both read well, and at 360px the switch wraps under the headline.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
