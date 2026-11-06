# Build: Meter

A labelled rail that shows a quantity within a known range: storage used, seats taken, API quota. It is React Aria's `Meter`, so it is announced as `role="meter"` (a level, not a task heading towards done), and it is drawn on Progress's `ProgressTrack`, sharing the same rail and eased translate fill. A `tone` recolours the fill from semantic tokens so a meter can turn amber or red as it nears its limit.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A level within a known range (storage, seats, quotas) with accent, success, warning and error tones, on React Aria Meter.

- Category: display
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. Map `tone` to a text-colour class in a `sortCx` map: `accent` → `text-accent-500`, `success` → `text-notification-success-foreground`, `warning` → `text-chart-8-active`, `error` → `text-notification-error-foreground`. The fill paints in `currentColor`, so a text class is all it takes.
2. Render `AriaMeter` with every React Aria prop passed through (`value`, `minValue`, `maxValue`, `valueLabel`, `formatOptions`) and `flex w-full flex-col gap-1.5` on the root.
3. Use the render props `{ percentage, valueText }`. When there is a label or the value is shown, render a `flex items-baseline justify-between gap-3` row: the kit `Label` (truncated) and `valueText` in `text-body-medium text-text-secondary tabular-nums`. `showValueLabel` defaults to `label != null`.
4. Render `<ProgressTrack percentage={percentage} size={size} className={tones[tone]} />`: a `bg-border-button-default` rail 4 / 6 / 8px tall whose full-width fill is shifted by `translate` and eases over 500ms on `cubic-bezier(0.22,1,0.36,1)` when the value changes.
5. Render the optional `description` underneath in `text-caption-1-medium text-text-secondary`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `tone tokens = accent-500; success lime-600 (dark lime-300); warning yellow-500 (chart-8-active); error rose-600 (dark rose-300)`
  Semantic tokens rather than palette classes, so the fill keeps its contrast on dark cards, where success and error lighten to the 300 step.
- `track = h-1 / h-1.5 / h-2 (4 / 6 / 8px), default md`
  Shared with ProgressBar so a meter and a progress bar stacked on one card are identical rails.
- `fill easing = 500ms cubic-bezier(0.22, 1, 0.36, 1) on translate`
  Inherited from ProgressTrack: a value change eases in on the compositor instead of animating width.

## API

```ts
type MeterTone = "accent" | "success" | "warning" | "error"
interface MeterProps extends Omit<AriaMeterProps, "children" | "className"> { label?: ReactNode; showValueLabel?: boolean; description?: ReactNode; tone?: MeterTone; size?: ProgressSize; className?: string }
function Meter(props: MeterProps): JSX.Element
```

- `value: number` — default `0`
  Current level (React Aria).
- `minValue / maxValue: number` — default `0 / 100`
  The range the value sits in (React Aria).
- `valueLabel: ReactNode`
  Custom value text instead of the formatted percentage (React Aria).
- `label: ReactNode`
  Label above the rail; also turns the value label on by default.
- `showValueLabel: boolean`
  Show the value at the end of the label row. Defaults to `label != null`.
- `description: ReactNode`
  Helper text under the rail.
- `tone: "accent" | "success" | "warning" | "error"` — default `"accent"`
  Colour of the fill.
- `size: "sm" | "md" | "lg"` — default `"md"`
  4, 6 or 8px rail.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const tones = sortCx({
  accent: "text-accent-500",
  success: "text-notification-success-foreground",
  warning: "text-chart-8-active",
  error: "text-notification-error-foreground",
});

export interface MeterProps extends Omit<AriaMeterProps, "children" | "className"> {
  label?: ReactNode;
  /** Show the formatted value at the end of the label row. Default: shown with a label. */
  showValueLabel?: boolean;
  /** Helper text under the bar. */
  description?: ReactNode;
  /** Colour of the fill. Default `accent`. */
  tone?: MeterTone;
  /** Track thickness: 4, 6 (default), or 8px. */
  size?: ProgressSize;
  className?: string;
}

export function Meter({
  label,
  showValueLabel,
  description,
  tone = "accent",
  size = "md",
  className,
  ...props
}: MeterProps) {
  const showValue = showValueLabel ?? label != null;
  return (
    <AriaMeter {...props} className={cx("flex w-full flex-col gap-1.5", className)}>
      {({ percentage, valueText }) => (
        <>
          {label != null || showValue ? (
            <div className="flex items-baseline justify-between gap-3">
              {label != null ? <Label className="min-w-0 truncate">{label}</Label> : <span />}
              {showValue ? (
                <span className="shrink-0 text-body-medium text-text-secondary tabular-nums">{valueText}</span>
              ) : null}
            </div>
          ) : null}
          <ProgressTrack percentage={percentage} size={size} className={tones[tone]} />
          {description ? <span className="text-caption-1-medium text-text-secondary">{description}</span> : null}
        </>
      )}
    </AriaMeter>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The component is stateless apart from React Aria's render props; there are no listeners or timers.

**Reduced motion.** The fill's 500ms translate transition is removed by ProgressTrack's `motion-reduce:transition-none`, so a new value appears immediately.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not use a Meter for a task in progress (an upload, an import). That is a ProgressBar; Meter is announced as a level and has no indeterminate state.
- Do not pass a raw count without `maxValue`. React Aria assumes 0..100, so `value={19}` for 19 of 20 seats renders as 19% full.
- Do not encode the status only in the tone colour. Put the number or a description next to it ("1 seat left").
- Do not recolour the fill with `bg-*` classes. The fill is `bg-current`; set a text colour (or `tone`) instead.

## Notes

- `valueLabel` (React Aria) replaces the formatted percentage with custom text, e.g. "7.2 of 10 GB".
- Tone thresholds are the caller's decision; the component never switches tone by itself.

## Definition of done

`<Meter label="Seats" value={19} maxValue={20} tone="warning" />` renders "Seats" with "95%" on the right and a 6px rail filled 95% in amber, exposed as `role="meter"` with aria-valuenow 19. `valueLabel="7.2 of 10 GB"` replaces the percentage text. Changing the value eases the fill to its new length over half a second, and the error tone fill is rose in light mode and a lighter rose in dark mode.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
