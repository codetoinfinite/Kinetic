# Build: Pricing Plan Cards

A pricing section: an optional icon tile, heading and copy, a Monthly / Yearly segmented control, and a responsive grid of plan cards. Each card is a grey shell holding two white panels (name and description on top, features below) with the price and CTA sitting on the shell between them. Switching the cycle rolls every price to its new per-month figure, strikes through the monthly price and swaps the caption for the yearly saving.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Plan cards with a monthly/yearly switch that rolls the prices, shows yearly savings, highlights one plan and lists features with icons.

- Category: block
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The cycle is controlled-or-uncontrolled: `cycle ?? inner`, where `inner` starts at `defaultCycle`. The kit `SegmentedControl` (a React Aria single-select toggle group) feeds `onSelectionChange`, and the handler only accepts the keys "monthly" and "yearly" before calling `setInner` (when uncontrolled) and `onCycleChange`.
2. Each plan stores `price.monthly` and the annual total `price.yearly`. `perMonth()` returns the monthly price, or `yearly / 12` on the yearly cycle; `yearlySavings()` is `monthly * 12 - yearly`, clamped at 0. The best saving across paid plans, as a rounded percentage, becomes the "-21%" chip inside the Yearly segment.
3. `useTweenedNumber` rolls the displayed price from where it currently is to the new target over 360ms with an ease-out cubic in a `requestAnimationFrame` loop, writing the in-flight value back to a ref so a toggle mid-roll restarts from what is on screen. The rolling digits are `aria-hidden`; an `sr-only` sibling always holds the final formatted price.
4. Prices format through two cached `Intl.NumberFormat` instances (whole and two-decimal) built from the fixed `locale` and `currency` props, so the server and client print the same string. A plan with 0 / 0 prices renders `freeLabel` instead of a number.
5. On the yearly cycle a paid plan with a saving shows the monthly price struck through (with a hidden "was" for screen readers) and replaces the second caption line with "Save €48 a year" in the success colour. A plan with its own `caption` keeps it on both cycles.
6. The card grid is driven by a container query (`@container` on the section): one column, two from `@2xl` (42rem) and four from `@5xl` (64rem), so the block reflows by the width it is given rather than the viewport. A highlighted plan gets the primary CTA, an accent ring and its badge pill; the others use the secondary button.
7. The CTA is a `ButtonLink` when the plan has `cta.href`; otherwise a `Button` that calls `onSelectPlan(plan.id, cycle)`. Features render as a list with the given icon, a check when no icon is given, or a dash plus struck text and an "Not included:" prefix for screen readers when `included` is false.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `TWEEN_MS = 360`
  Long enough to read as the price rolling to its new value, short enough that a quick double toggle never feels laggy.
- `ease = 1 - (1 - t)^3`
  Ease-out cubic: the number moves fast first and settles, so the final digits are readable almost immediately.
- `grid breakpoints = @2xl (42rem) → 2 cols, @5xl (64rem) → 4 cols`
  Four cards need about 250px each for the feature labels to wrap at most once; container queries keep that true inside narrow hosts.
- `panel radius = shell rounded-3xl (24px), panels 20px, shell padding 4px`
  Inner radius = outer radius minus the padding, so the nested panels stay concentric with the shell.
- `CTA = h-11 rounded-full`
  Matches the reference: a 44px pill across the full card width, taller than the kit default 36px button.

## API

```ts
function PricingPlanCards(props: { plans: PricingPlan[]; cycle?: BillingCycle; defaultCycle?: BillingCycle; onCycleChange?: (cycle: BillingCycle) => void; onSelectPlan?: (planId: string, cycle: BillingCycle) => void; currency?: string; locale?: string; freeLabel?: string; heading?: ReactNode; description?: ReactNode; icon?: IconComponent; className?: string }): JSX.Element
type BillingCycle = "monthly" | "yearly"
interface PricingPlan { id: string; name: string; description: ReactNode; icon?: IconComponent; price: { monthly: number; yearly: number }; caption?: [ReactNode, ReactNode]; badge?: string; highlighted?: boolean; cta: { label: string; icon?: IconComponent; href?: string }; features: PricingPlanFeature[] }
```

- `plans: PricingPlan[]`
  Cards in display order. `price.yearly` is the annual total.
- `cycle: "monthly" | "yearly"`
  Controlled billing cycle.
- `defaultCycle: "monthly" | "yearly"` — default `"monthly"`
  Initial cycle when uncontrolled.
- `onCycleChange: (cycle: BillingCycle) => void`
  Fires when the segmented control changes.
- `onSelectPlan: (planId: string, cycle: BillingCycle) => void`
  Called by CTAs of plans without `cta.href`.
- `currency: string` — default `"EUR"`
  ISO 4217 currency for every price.
- `locale: string` — default `"en-US"`
  Fixed formatting locale, so SSR and client output match.
- `freeLabel: string` — default `"Free"`
  Shown instead of a number for 0 / 0 plans.
- `heading: ReactNode`
  Section heading.
- `description: ReactNode`
  Copy under the heading.
- `icon: ComponentType`
  Glyph drawn in a tile above the heading.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
function PlanPrice({
  plan,
  cycle,
  format,
  freeLabel,
  reduced,
}: {
  plan: PricingPlan;
  cycle: BillingCycle;
  format: (n: number) => string;
  freeLabel: string;
  reduced: boolean;
}) {
  const target = perMonth(plan, cycle);
  const shown = useTweenedNumber(target, reduced);
  const free = plan.price.monthly === 0 && plan.price.yearly === 0;
  const savings = yearlySavings(plan);
  const wholeOnly = Number.isInteger(target) && Number.isInteger(plan.price.monthly);
  const display = format(wholeOnly ? Math.round(shown) : Math.round(shown * 100) / 100);
  const [line1, line2] = plan.caption ?? [
    "per month",
    cycle === "yearly" ? `billed ${format(plan.price.yearly)} yearly` : "billed monthly",
  ];

  return (
    <div className="flex min-h-12 items-center gap-2.5">
      {free ? (
        <span className="text-display-4-medium tracking-tight text-text-primary">{freeLabel}</span>
      ) : (
        <span className="flex items-baseline gap-1.5">
          {cycle === "yearly" && savings > 0 && (
            <s className="text-title-1-regular text-text-tertiary tabular-nums decoration-1">
              <span className="sr-only">was </span>
              {format(plan.price.monthly)}
            </s>
          )}
          <span aria-hidden className="text-display-4-medium tracking-tight text-text-primary tabular-nums">
            {display}
          </span>
          <span className="sr-only">{format(target)}</span>
        </span>
      )}
      <span className="flex flex-col text-caption-1-regular leading-tight">
        <span className="text-text-secondary">{line1}</span>
        {cycle === "yearly" && savings > 0 && !plan.caption ? (
          <span className="text-state-success-text">Save {format(savings)} a year</span>
        ) : (
          <span className="text-text-tertiary">{line2}</span>
        )}
      </span>
    </div>
  );
}

function PlanCard({
  plan,
  cycle,
  format,
  freeLabel,
  reduced,
  onSelectPlan,
}: {
  plan: PricingPlan;
  cycle: BillingCycle;
  format: (n: number) => string;
  freeLabel: string;
  reduced: boolean;
  onSelectPlan?: (planId: string, cycle: BillingCycle) => void;
}) {
  const titleId = useId();
  const Icon = plan.icon;
  const variant = plan.highlighted ? "primary" : "secondary";
  const ctaClass = "h-11 w-full rounded-full text-body-medium";

  return (
    <article
      aria-labelledby={titleId}
      data-highlighted={plan.highlighted || undefined}
      className={cx(
        "flex flex-col rounded-3xl bg-background-secondary-default p-1 ring-1 ring-separator-border",
        plan.highlighted && "ring-accent-200 dark:ring-accent-900",
      )}
    >
      <div className="relative rounded-[20px] bg-background-primary-default px-5 pt-5 pb-5 shadow-xs">
        {Icon && <Icon aria-hidden className="mb-3 size-5 text-text-primary" />}
        {plan.badge && (
          <span className="absolute top-4 right-4 inline-flex items-center rounded-md bg-badge-new-background px-1.5 py-0.5 text-caption-1-medium text-badge-new-text">
            <span aria-hidden className="absolute -top-1 -left-1 size-1 rounded-full bg-accent-300" />
            <span aria-hidden className="absolute -right-1 -bottom-1 size-1 rounded-full bg-accent-300" />
            {plan.badge}
          </span>
        )}
        <h3 id={titleId} className="text-title-2-regular text-text-primary">
          {plan.name}
        </h3>
        <p className="mt-1 text-body-regular text-text-secondary [&_strong]:font-semibold [&_strong]:text-text-primary">
          {plan.description}
        </p>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-5 pb-5">
        <PlanPrice plan={plan} cycle={cycle} format={format} freeLabel={freeLabel} reduced={reduced} />
        {plan.cta.href ? (
          <ButtonLink href={plan.cta.href} variant={variant} leadingIcon={plan.cta.icon} className={ctaClass}>
            {plan.cta.label}
          </ButtonLink>
        ) : (
          <Button
            variant={variant}
            leadingIcon={plan.cta.icon}
            className={ctaClass}
            aria-describedby={titleId}
            onClick={() => onSelectPlan?.(plan.id, cycle)}
          >
            {plan.cta.label}
          </Button>
        )}
      </div>

      <ul className="flex flex-1 flex-col gap-3.5 rounded-[20px] bg-background-primary-default px-5 py-5 shadow-xs">
        {plan.features.map((feature, i) => {
          const included = feature.included !== false;
          const Glyph = included ? (feature.icon ?? RiCheckLine) : RiSubtractLine;
          return (
            <li key={i} className={cx("flex items-start gap-2.5 text-body-regular", included ? "text-text-secondary" : "text-text-tertiary")}>
              <Glyph aria-hidden className={cx("mt-px size-[18px] shrink-0", included ? "text-foreground-icon-tertiary" : "text-foreground-icon-quaternary")} />
              <span className={cx(!included && "line-through decoration-1")}>
                {!included && <span className="sr-only">Not included: </span>}
                {feature.label}
              </span>
              {feature.action && (
                <a
                  href={feature.action.href}
                  className="-my-0.5 ml-0.5 shrink-0 rounded-md bg-background-secondary-default px-1.5 py-0.5 text-caption-1-medium text-text-primary outline-none transition-colors duration-150 ease-out hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none"
                >
                  {feature.action.label}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export function PricingPlanCards({
  plans,
  cycle: cycleProp,
  defaultCycle = "monthly",
  onCycleChange,
  onSelectPlan,
  currency = "EUR",
  locale = "en-US",
  freeLabel = "Free",
  heading,
  description,
  icon: HeadingIcon,
  className,
}: PricingPlanCardsProps) {
  const [inner, setInner] = useState<BillingCycle>(defaultCycle);
  const cycle = cycleProp ?? inner;
  const reduced = useReducedMotion();
  const format = useMoney(currency, locale);

  const bestPercent = useMemo(() => {
    let best = 0;
    for (const p of plans) {
      if (p.price.monthly > 0) best = Math.max(best, yearlySavings(p) / (p.price.monthly * 12));
    }
    return Math.round(best * 100);
  }, [plans]);

  const setCycle = (next: BillingCycle) => {
    if (cycleProp === undefined) setInner(next);
    onCycleChange?.(next);
  };

  return (
    <section className={cx("@container flex flex-col items-center", className)}>
      {HeadingIcon && (
        <span className="mb-5 grid size-14 place-items-center rounded-2xl bg-background-primary-default shadow-sm ring-1 ring-separator-border">
          <HeadingIcon aria-hidden className="size-7 text-text-primary" />
        </span>
      )}
      {heading && (
        <h2 className="max-w-2xl text-center text-display-3-medium tracking-tight text-balance text-text-primary">{heading}</h2>
      )}
      {description && (
        <p className="mt-3 max-w-md text-center text-body-regular text-pretty text-text-secondary">{description}</p>
      )}

      <SegmentedControl
        aria-label="Billing cycle"
        className="mt-6"
        selectedKeys={new Set([cycle])}
        onSelectionChange={(keys) => {
          const next = [...keys][0];
          if (next === "monthly" || next === "yearly") setCycle(next);
        }}
      >
        <SegmentedControlItem id="monthly">Monthly</SegmentedControlItem>
        <SegmentedControlItem id="yearly">
          Yearly
          {bestPercent > 0 && (
            <span className="ml-1.5 rounded-sm bg-badge-new-background px-1 text-caption-2-semibold text-badge-new-text">
              -{bestPercent}%
            </span>
          )}
        </SegmentedControlItem>
      </SegmentedControl>

      <div className="mt-8 grid w-full grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            cycle={cycle}
            format={format}
            freeLabel={freeLabel}
            reduced={reduced}
            onSelectPlan={onSelectPlan}
          />
        ))}
      </div>
    </section>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The price tween cancels its pending `requestAnimationFrame` when the target changes or the card unmounts. There are no other listeners or timers.

**Reduced motion.** Under `prefers-reduced-motion: reduce` the price roll is skipped: `useTweenedNumber` returns the target directly and starts no animation frame. The "Join now" pill hover transition is removed with `motion-reduce:transition-none`.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Formatting with the browser locale (`toLocaleString()` without a locale). The server and client may print different separators and React reports a hydration mismatch; the `locale` prop pins it.
- Tweening the accessible text. Screen readers would announce every intermediate number; the rolling figure is `aria-hidden` and an `sr-only` copy carries the final price.
- Storing the yearly price as a per-month value. Savings and the "billed €180 yearly" caption need the annual total; the per-month figure is derived.
- Using viewport breakpoints for the grid. Inside a narrow container (a docs preview, a modal) four cards would squeeze; the grid uses container queries instead.

## Notes

- Pass `cycle` and `onCycleChange` to keep the switch in the URL or in shared state; omit both to let the component own it.
- Rich descriptions are allowed: `<strong>` inside `description` is styled as the primary text colour, matching the reference card copy.

## Definition of done

The section renders four cards in a row at 1280px and one column at 360px. Monthly is selected and the Pro card reads €19 per month. Clicking Yearly rolls Pro to €15, strikes €19 through, and the caption reads "Save €48 a year"; the Yearly segment carries a "-21%" chip. The highlighted Team card has a blue CTA and a "Most popular" pill. Clicking a CTA reports the plan and current cycle through `onSelectPlan`. Under reduced motion prices change instantly.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
