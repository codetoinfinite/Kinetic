# Build: Important Alerts Card

The alerts card from BoardUI's medical profile dashboard. A header shows "Important alerts" with a large weekly count (12 this week) and a static week pill ("29 Jun - 5 Jul"). Below it, a fixed-height feed lists the six most recent alerts: a coloured circle with a white Remix icon, a title, a description and a date tag pinned to the row's top-right corner. The feed runs flush to the card's bottom edge and clips there, so the third row is cut off as in the Figma frame, and a card-coloured gradient fades in over the top of the feed once it has been scrolled.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A health dashboard card: weekly alert count, a week pill, and a scrolling feed of tinted-icon alerts that fades under its header.

- Category: display
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The `section` is a fixed `h-[330px]` flex column with `overflow-hidden rounded-[20px]` and 10px padding on the top and sides only, so the feed meets the bottom edge. Its 1px border is the same colour as its background: invisible, but content clips inside it so rows stop 1px short of the rounded corner.
2. The header is a flex row: label in `text-body-medium text-text-secondary`, the count `12` in `text-title-1-medium tabular-nums` with "this week" baseline-aligned beside it, and `WeekRangePill` on the end.
3. The feed is `flex-1 min-h-0 overflow-y-auto overscroll-contain` with `gap-2.5` and `pb-2.5`, so it scrolls inside the card without chaining to the page and the last row has room at the bottom.
4. Each alert row is `rounded-2lg bg-background-inner-default p-2.5`: a `size-8` circle in the alert's colour with an 18px white icon, the title (`text-body-medium`, no wrap) and description (`text-body-2-regular`), plus an absolutely positioned date tag at `top-2.5 end-2.5`.
5. An `onScroll` handler sets `scrolled` to `scrollTop > 0`. An `aria-hidden` 40px `bg-linear-to-b from-background-secondary-default to-transparent` overlay at the top of the feed transitions to `opacity-100` while scrolled, so rows dissolve under the header instead of being cut by it.
6. `WeekRangePill` renders a 32px tall, min-151px pill with a 1px button border and `shadow-xs`. Without `onPrev`/`onNext` both chevrons are `aria-hidden` spans and the label is plain text.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `card height = 330px, rounded-[20px], px-2.5 pt-2.5 (no bottom padding)`
  Matches the Figma frame, where the feed is deliberately cut by the card's bottom edge to show it scrolls.
- `ALERTS_THIS_WEEK_COUNT = 12`
  The week's total, higher than the six rows in the feed, which only lists the most recent alerts.
- `top fade = h-10 (40px) gradient, opacity 200ms ease-out`
  Shown only once `scrollTop > 0`, so the first row is never dimmed at rest.
- `icon tints = rose-600, amber-400, emerald-500, blue-400, purple-400, teal-400`
  One hue per alert type (heart rate, Medical ID, lab results, medication, sleep, blood oxygen) so a row can be recognised at a glance.
- `week pill = h-8, min-w-[151px], rounded-2lg, border-border-button-default, shadow-xs`
  The same 151×32 chrome as the dashboard's other range pills; min-width rather than width so a longer label grows the pill.

## API

```ts
function ImportantAlertsCard(props?: { className?: string }): JSX.Element
function WeekRangePill(props: { label: string; onPrev?: () => void; onNext?: () => void; className?: string }): JSX.Element
```

- `className: string`
  ImportantAlertsCard: merged onto the card section, e.g. to set its width.
- `label: string`
  WeekRangePill: the range text, e.g. "29 Jun - 5 Jul".
- `onPrev / onNext: () => void`
  WeekRangePill: makes the chevrons buttons and turns on the rolling label.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function ImportantAlertsCard({ className }: { className?: string } = {}) {
  const localize = useTemplateCopy();
  const [scrolled, setScrolled] = useState(false);

  return localize((
    <section
      className={cx(
        // The 1px border matches the card's own bg — invisible as a line,
        // but content clips at the padding box (inside the border), so the
        // white alert rows stop 1px shy of the rounded edge instead of
        // touching it when scrolled to the bottom.
        "flex h-[330px] w-full min-w-0 flex-col gap-4 overflow-hidden rounded-[20px] border border-background-secondary-default bg-background-secondary-default px-2.5 pt-2.5",
        className,
      )}
    >
      <div className="flex w-full items-start justify-between gap-2 px-1.5 pt-1.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-body-medium text-text-secondary">Important alerts</p>
          <div className="flex items-baseline gap-1">
            <p className="text-title-1-medium whitespace-nowrap text-text-primary tabular-nums">
              {ALERTS_THIS_WEEK_COUNT}
            </p>
            <span className="text-caption-1-medium whitespace-nowrap text-text-secondary">this week</span>
          </div>
        </div>
        <WeekRangePill label="29 Jun - 5 Jul" />
      </div>

      <div className="relative min-h-0 w-full flex-1">
        <div
          className="flex h-full w-full flex-col gap-2.5 overflow-y-auto overscroll-contain pb-2.5"
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
        >
          {ALERTS.map((alert, index) => (
            <div
              key={`${alert.title}-${index}`}
              className="relative flex w-full shrink-0 flex-col gap-2 rounded-2lg bg-background-inner-default p-2.5"
            >
              <span className={cx("flex size-8 shrink-0 items-center justify-center rounded-full", alert.iconBg)}>
                <alert.icon className="size-[18px] text-white" aria-hidden />
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-body-medium whitespace-nowrap text-text-primary">{alert.title}</p>
                <p className="text-body-2-regular text-text-secondary">{alert.description}</p>
              </div>
              <span className="absolute top-2.5 end-2.5 rounded-md bg-background-secondary-default px-1.5 py-px text-body-medium whitespace-nowrap text-text-secondary">
                {alert.date}
              </span>
            </div>
          ))}
        </div>
        {/* Top fade — card-colored gradient that eases in once the feed is
            scrolled, so rows dissolve under the header instead of cutting. */}
        <div
          aria-hidden
          className={cx(
            "pointer-events-none absolute inset-x-0 top-0 h-10 bg-linear-to-b from-background-secondary-default to-transparent",
            "transition-opacity duration-200 ease-out",
            scrolled ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
    </section>
  ));
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The scroll handler is a React prop and the only state is a boolean.

**Reduced motion.** The only motion in the card is the 200ms opacity fade of the top gradient while scrolling. It does not move anything, so there is no reduced-motion branch; scrolling itself is native.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- The alerts, the count and the week label are constants inside the file. To use real data, lift `ALERTS` and the count into props; the component takes only `className` today.
- Do not give the card a fixed height and remove `min-h-0` from the feed wrapper. Without it the flex child grows to its content and the feed stops scrolling.
- Do not add bottom padding to the card. The flush bottom edge is what tells people the feed scrolls.
- If you change the card background, change the fade's `from-` colour and the border colour with it, or the fade shows as a band and the border as a line.

## Notes

- The date tag is absolutely positioned, so a very long title can run under it; titles are kept short and `whitespace-nowrap`.
- `WeekRangePill` also has an interactive mode: pass `onPrev`/`onNext` and the chevrons become real buttons and the label rolls like a counter (220ms `label-out` / `label-in` keyframes). This card uses the static mode.
- All copy passes through `useTemplateCopy`, which translates display strings when a `TemplateCopyProvider` is present and is a no-op otherwise.

## Definition of done

The card renders 330px tall with "Important alerts", a large 12 and "this week", and a "29 Jun - 5 Jul" pill with chevrons on the right. The feed starts with High Heart rate and is cut off mid-row by the card's bottom edge. Scrolling the feed fades a gradient in under the header within 200ms and fades it out again when scrolled back to the top; the page does not scroll when the feed reaches its end. Each row has a coloured circle with a white icon and a date tag in its top-right corner.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
