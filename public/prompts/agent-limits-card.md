# Build: Agent Limits Card

A usage card for an agent session. The top row reads used / capacity with a percent, over a thin bar split into one coloured segment per token bucket. Opening the row grows the card to list each bucket with its tokens and share, free space, deferred buckets that do not count, and collapsible member lists. Below it, each plan limit shows its reset time, percent used and a progress bar, and the plan heading links to plan settings.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

An agent budget card: a context window bar split by token bucket, an expandable breakdown, and plan limits with reset times.

- Category: display
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. summarizeContext sums only non-deferred buckets, so deferred tools are listed with a dash but never move the bar, the total or free space; segment widths divide by max(capacity, used) so an overflowing window still ends at the bar edge.
2. Bucket colours come from the chart tokens in a fixed order (blue, purple, pink, yellow, green, sky, teal, lime, indigo); the counter skips deferred buckets, which take the neutral chart colour, and a bucket can pass its own colour.
3. The breakdown and every group list open with a grid-template-rows 0fr → 1fr transition on a wrapper with min-h-0 overflow-hidden, so the card grows to its natural height without measuring; closed content is inert and turns visibility-hidden once the close transition ends.
4. Hovering a bar segment or a breakdown row fades every other segment and row, linking the two views.
5. Each limit is a role="meter" with aria-valuetext carrying the reset copy; its bar switches to the warning tone at 75% and the error tone at 90%.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `WARN_AT = 0.75`
  A limit three-quarters used is worth a glance; the bar turns the warning colour.
- `DANGER_AT = 0.9`
  Past 90% the bar and the percent switch to the error colour.
- `BUCKET_PALETTE = chart-6, 5, 3, 8, 7, 4, 1, 2, 9`
  Neighbouring buckets get colours far apart on the wheel, so thin segments stay distinguishable.

## API

```ts
<AgentLimitsCard context={{ capacity: 1_000_000, buckets, groups }} plan="Max (5x)" limits={[{ label: "5-hour limit", used: 0.38, resets: "Resets in 2 hr 46 min" }]} planHref="/settings/plan" />
```

- `context: { capacity: number; buckets: ContextBucket[]; groups?: ContextGroup[] }`
  Window size, token buckets ({ label, tokens, color?, deferred? }) and collapsible member groups.
- `plan: string`
  Plan name shown after the limits title.
- `limits: PlanLimit[]` — default `[]`
  Rows of { label, used (0–1), resets }.
- `planHref: string`
  Makes the plan heading a link.
- `onManagePlan: () => void`
  Makes the plan heading a button when there is no planHref.
- `expanded / defaultExpanded / onExpandedChange: boolean / boolean / (open: boolean) => void` — default `false`
  Controlled or uncontrolled breakdown.
- `maxBreakdownHeight: number`
  Caps the breakdown height in px; longer lists scroll inside the card.
- `contextTitle / limitsTitle: string` — default `"Context window" / "Plan usage limits"`
  Section headings.
- `className: string`
  Classes on the card.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
/**
 * Splits the window into what counts and what does not. Deferred buckets are
 * listed but never summed, so they cannot push the bar past the window. If
 * the counted tokens overflow the capacity, segment widths scale by the
 * larger number so the bar still ends at its right edge.
 */
export function summarizeContext({ capacity, buckets }: ContextUsage) {
  const safeCap = Math.max(1, capacity);
  let used = 0;
  for (const bucket of buckets) if (!bucket.deferred) used += Math.max(0, bucket.tokens);
  const scale = Math.max(safeCap, used);
  let paletteIndex = 0;
  const views: BucketView[] = buckets.map((bucket) => {
    const auto = bucket.deferred ? DEFERRED_COLOR : BUCKET_PALETTE[paletteIndex++ % BUCKET_PALETTE.length]!;
    const tokens = Math.max(0, bucket.tokens);
    return {
      ...bucket,
      color: bucket.color ?? auto,
      share: bucket.deferred ? null : (tokens / safeCap) * 100,
      width: bucket.deferred ? 0 : (tokens / scale) * 100,
    };
  });
  const free = Math.max(0, safeCap - used);
  return { views, used, free, percent: Math.round((used / safeCap) * 100) };
}

/** Clamps a limit share and picks its tone. */
export function limitTone(used: number) {
  const value = Math.min(1, Math.max(0, used));
  const tone = value >= DANGER_AT ? "danger" : value >= WARN_AT ? "warning" : "normal";
  return { value, tone } as const;
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers, listeners or observers; all motion is CSS transitions on state changes.

**Reduced motion.** The breakdown and group lists open and close instantly, chevrons snap, and bar segments and limit fills jump to their new widths without transitions.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Deferred buckets are excluded from the used total; pass them for the listing only, not as part of the capacity maths.
- With maxBreakdownHeight the breakdown scrolls, so focus rings inside it are inset to avoid being clipped.
- Share percentages use the capacity even when the window overflows, so they can add up past 100%.

## Notes

- Pass planHref for a link or onManagePlan for a button; with neither, the plan heading is plain text.
- formatTokens and summarizeContext are exported for use in tooltips or server summaries.

## Definition of done

The header reads 820k / 1M (82%); clicking it reveals Messages 520k 52.0%, the deferred rows with a dash and Free space 180k 18.0%; opening MCP tools lists its four members; the plan heading calls onManagePlan; sending a message widens the Messages segment and raises the 5-hour limit.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
