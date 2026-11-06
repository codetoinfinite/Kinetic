# Build: Plan Usage Card

A compact usage tile for a subscription: the plan name in the header, one row per limit (a 5-hour window, weekly caps) with its label, when it resets and the share used, a 4px meter under each row, and a footer with the renewal date and an Upgrade button. Meters change colour as they fill so the limit that will stop you first stands out. `bare` drops the surface so the same rows can sit under a context-window card in one "Agent limits" tile.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A plan's rolling limits as thin meters with reset times, turning amber then red as they fill, plus renewal date and upgrade.

- Category: display
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1, @remixicon/react@^4.9.0

## How it works

1. Clamp each limit's `used` to 0–100 and round it; pick a tone from two thresholds: `accent` below `warnAt` (70), `warning` from 70, `error` from `criticalAt` (90).
2. Render every row as a react-aria `Meter` with `aria-label` = the limit label and a `valueLabel` that reads "38% used, Resets in 2 hr 46 min", so screen readers get the number and the reset together while the visible row splits them into label, muted reset text and a tabular percentage.
3. Draw the bar with the kit `ProgressTrack` at size `sm` (4px). Its fill paints `bg-current`, so the tone is just a text colour class on the track; the fill slides with a 500ms transform transition when usage changes.
4. Colour the percentage figure with the same tone once it leaves `accent`, with a 300ms colour transition, so amber and red show in the number as well as the bar.
5. Render the footer only when `renews` or `onUpgrade` is given: a hairline top border, the renewal text on the left and a primary `xs` Button with a trailing arrow on the right. Omitting `onUpgrade` (e.g. on the top plan) removes the button.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `tone thresholds = warnAt 70, criticalAt 90`
  Amber leaves time to act before a limit runs out; red at 90 matches the point where one long agent run can end the window.
- `bar height = ProgressTrack size sm (4px)`
  Same hairline as the context window bar above it in the Agent limits tile, so the two read as one family.
- `percent column = w-9, text-end, tabular-nums`
  A fixed column keeps "3%" and "100%" right-aligned so the reset texts line up row to row.

## API

```ts
function PlanUsageCard(props: { plan: ReactNode; limits: PlanLimit[]; title?: ReactNode; renews?: ReactNode; onUpgrade?: () => void; upgradeLabel?: ReactNode; warnAt?: number; criticalAt?: number; bare?: boolean; className?: string }): JSX.Element
type PlanLimit = { id: string; label: string; used: number; resets?: string }
```

- `plan: ReactNode`
  Plan name shown after the title, e.g. "Max (5x)".
- `limits: PlanLimit[]`
  One meter row per limit: label, percent used (0–100) and an optional reset text.
- `title: ReactNode` — default `"Plan usage limits"`
  Header title before the plan name.
- `renews: ReactNode`
  Renewal line in the footer, e.g. "Renews Dec 1".
- `onUpgrade: () => void`
  Shows the Upgrade button and is called when it is pressed.
- `upgradeLabel: ReactNode` — default `"Upgrade"`
  Upgrade button label.
- `warnAt: number` — default `70`
  Percent at which a meter turns amber.
- `criticalAt: number` — default `90`
  Percent at which a meter turns red.
- `bare: boolean` — default `false`
  Drop the card surface and padding to nest inside another tile.
- `className: string`
  Merged onto the root section.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function PlanUsageCard({
  plan,
  limits,
  title = "Plan usage limits",
  renews,
  onUpgrade,
  upgradeLabel = "Upgrade",
  warnAt = 70,
  criticalAt = 90,
  bare = false,
  className,
}: PlanUsageCardProps) {
  const toneOf = (pct: number): Tone => (pct >= criticalAt ? "error" : pct >= warnAt ? "warning" : "accent");

  return (
    <section
      className={cx(
        "flex w-full min-w-0 flex-col gap-3",
        !bare && "rounded-[14px] bg-background-secondary-default p-3.5",
        className,
      )}
    >
      <h3 className="flex min-w-0 items-center gap-1.5 text-caption-1-medium text-text-secondary">
        <span className="truncate">{title}</span>
        <span aria-hidden>·</span>
        <span className="shrink-0 text-text-primary">{plan}</span>
      </h3>

      <ul className="flex flex-col gap-3">
        {limits.map((limit) => {
          const pct = Math.round(Math.min(100, Math.max(0, limit.used)));
          const tone = toneOf(pct);
          return (
            <li key={limit.id}>
              <AriaMeter
                value={pct}
                aria-label={limit.label}
                valueLabel={limit.resets ? `${pct}% used, ${limit.resets}` : `${pct}% used`}
                className="flex flex-col gap-1.5"
              >
                {({ percentage }) => (
                  <>
                    <div className="flex items-baseline gap-2 text-caption-1-medium">
                      <span className="min-w-0 flex-1 truncate text-text-primary">{limit.label}</span>
                      {limit.resets ? (
                        <span className="shrink-0 truncate text-text-tertiary">{limit.resets}</span>
                      ) : null}
                      <span
                        className={cx(
                          "w-9 shrink-0 text-end text-caption-1-semibold tabular-nums transition-colors duration-300 ease-out motion-reduce:transition-none",
                          figure[tone],
                        )}
                      >
                        {pct}%
                      </span>
                    </div>
                    <ProgressTrack percentage={percentage} size="sm" className={fill[tone]} />
                  </>
                )}
              </AriaMeter>
            </li>
          );
        })}
      </ul>

      {renews != null || onUpgrade ? (
        <div className="flex items-center justify-between gap-3 border-t border-border-table pt-3">
          <span className="min-w-0 truncate text-caption-1-medium text-text-tertiary">{renews}</span>
          {onUpgrade ? (
            <Button variant="primary" size="xs" trailingIcon={RiArrowRightUpLine} onClick={onUpgrade}>
              {upgradeLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up: the component is stateless and its only motion is CSS transitions.

**Reduced motion.** The bar fill and the percentage colour carry `motion-reduce:transition-none`, so new usage values jump into place without a slide or a colour fade.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Building the bar from a bare div with a width style. You lose the meter role and its value text; the RAC Meter gives both for free.
- Putting the reset time only in the visible row. Screen readers announce the meter value without it unless it is part of `valueLabel`.
- Signalling the limit state with colour alone. The percentage stays printed next to every bar, so amber and red are reinforcement, not the only cue.

## Notes

- Nest it with `bare` as `children` of the Context Window Card to get the full Agent limits tile, as the demo does.
- `used` is a percentage on purpose: plan limits are rarely published as token counts, and the reset text carries the units that matter.

## Definition of done

The demo shows "Plan usage limits · Max (5x)" with rows at 38%, 3% and 5%. Each "Send a prompt" adds 9 points to the 5-hour row: it turns amber at 74% and red at 92%, and at 100% the button disables and the status reads "5-hour limit reached". "Upgrade" switches the header to Max (20x), quarters every value and removes the button.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
