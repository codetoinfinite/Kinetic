# Build: Trend Badge

The small change pill beside the big numbers on the BoardUI dashboard KPI cards ("+5.3%", "-2.1%", "0.00%"). The direction comes from the sign of the value after rounding, so a tiny change never shows as a red "-0.0%". Up is lime and down is rose, swapped with invert for metrics where lower is better. A single arrow rotates between up, sideways and down, so a live value turns it smoothly instead of swapping icons. Screen readers hear "Up 5.3% vs last month" instead of a bare "+5.3".

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Up, down or flat change pill for dashboard KPIs: one rotating arrow, a signed percent, lime, rose or grey, in three sizes.

- Category: display
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The value is rounded to the shown decimals first; the sign of that rounded number picks up, down or flat (direction overrides it), and a rounded -0 is folded to 0.
2. Tone reuses the kit Chip colours: CHIP_COLORS.lime for good, CHIP_COLORS.rose for bad and CHIP_COLORS.neutral (tertiary background, secondary text) for flat; invert flips which direction counts as good.
3. The glyph is always RiArrowUpLine, rotated 0, 90 (mirrored under rtl) or 180 degrees with transition-[rotate], and the pill fades its colours with transition-colors, both 200 to 300ms ease-out and off under motion-reduce.
4. Intl.NumberFormat with signDisplay exceptZero prints "+5.3%" and "0.0%"; that visible text is aria-hidden and an sr-only span reads the direction word, the unsigned percent and the optional context.
5. A fixed locale (en-US by default) keeps the server and client text identical, so the badge hydrates cleanly.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `sizes = sm h-5 / md h-6 / lg h-7`
  sm fits table cells, md sits beside body text and lg matches the 28px pills next to the KPI numbers.
- `radius = rounded-md (sm, md), rounded-lg (lg)`
  The reference pills are squared-off rectangles, not full capsules.
- `rotate = 0 / 90 / 180deg, 300ms ease-out`
  One glyph that turns reads as the same metric changing, not a new icon popping in.
- `decimals = 1 by default`
  Matches "+5.3%"; pass 2 for "0.00%" as on the Orders card.

## API

```ts
export function TrendBadge({ value, direction, invert, decimals, size, icon, context, locale, className }: TrendBadgeProps): JSX.Element
```

- `value: number`
  Change in percent, e.g. 5.3 or -2.1.
- `direction: 'up' | 'down' | 'flat'`
  Overrides the direction taken from the rounded value.
- `invert: boolean` — default `false`
  Down is good: down turns lime and up rose.
- `decimals: number` — default `1`
  Fraction digits shown and used for rounding.
- `size: 'sm' | 'md' | 'lg'` — default `'md'`
  Pill height, padding and type size.
- `icon: boolean` — default `true`
  Show the rotating arrow.
- `context: string`
  Appended to the screen-reader text, e.g. "vs last month".
- `locale: string` — default `'en-US'`
  Number formatting locale.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function TrendBadge({
  value,
  direction,
  invert = false,
  decimals = 1,
  size = 'md',
  icon = true,
  context,
  locale = 'en-US',
  className,
}: TrendBadgeProps) {
  // Round first, so -0.04 at one decimal reads "0.0%" and counts as flat
  // instead of showing a red "-0.0%".
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor || 0;
  const dir: TrendDirection = direction ?? (rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat');
  const tone = dir === 'flat' ? TONE.flat : (dir === 'up') !== invert ? TONE.good : TONE.bad;

  const format = (n: number, signDisplay: 'exceptZero' | 'never') =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals, signDisplay }).format(n);
  const s = SIZE[size];

  return (
    <span
      data-direction={dir}
      className={cx(
        'inline-flex shrink-0 items-center whitespace-nowrap tabular-nums',
        'transition-colors duration-200 ease-out motion-reduce:transition-none',
        s.pill,
        tone,
        className,
      )}
    >
      {icon ? (
        <RiArrowUpLine
          aria-hidden
          className={cx(
            'shrink-0 transition-[rotate] duration-300 ease-out motion-reduce:transition-none',
            s.icon,
            ROTATE[dir],
          )}
        />
      ) : null}
      <span aria-hidden>{format(rounded, 'exceptZero')}%</span>
      <span className="sr-only">
        {`${WORD[dir]} ${format(Math.abs(rounded), 'never')}%${context ? ` ${context}` : ''}`}
      </span>
    </span>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Stateless span: no timers, listeners or effects.

**Reduced motion.** Under prefers-reduced-motion the arrow snaps to its new angle and the colours switch at once; nothing else moves.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Pass the change in percent (5.3), not as a ratio (0.053); the badge only formats, it does not multiply.
- Without context the screen-reader text is just "Up 5.3%"; add context ("vs last month") when the comparison period is not read out nearby.
- For cost, churn or latency set invert, or a drop shows rose although it is good news.

## Notes

- icon={false} gives the arrowless pills of the reference KPI cards; the arrow is on by default for tables and lists.
- It renders a plain span with no hooks, so it works in server components.

## Definition of done

The KPI cards show +5.3% lime, -2.1% rose and 0.00% grey; stepping the conversion change from +1.0% down through 0.0% to -0.5% turns its arrow from up to sideways to down and its colour from lime to grey to rose; the churn badge reads -0.6% in lime.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
