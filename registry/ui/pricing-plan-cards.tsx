/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Pricing Plan Cards" (boardui.com/pricing).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { RiCheckLine, RiSubtractLine } from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { Button, ButtonLink } from "@/registry/ui/button";
import { SegmentedControl, SegmentedControlItem } from "@/registry/ui/segmented-control";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export type BillingCycle = "monthly" | "yearly";

export interface PricingPlanFeature {
  label: ReactNode;
  /** Leading glyph. Falls back to a check (included) or a dash (not included). */
  icon?: IconComponent;
  /** `false` greys the row out and swaps the glyph for a dash. Default `true`. */
  included?: boolean;
  /** Small inline pill after the label, e.g. a "Join now" link. */
  action?: { label: string; href: string };
}

export interface PricingPlan {
  id: string;
  name: string;
  description: ReactNode;
  icon?: IconComponent;
  /** Monthly price, and the total charged for a year. 0 / 0 renders `freeLabel`. */
  price: { monthly: number; yearly: number };
  /** Two caption lines beside the price. Defaults depend on the cycle. */
  caption?: [ReactNode, ReactNode];
  /** Pill in the top-right corner of the card. */
  badge?: string;
  /** Primary CTA and the badge sparkle. Usually one plan. */
  highlighted?: boolean;
  cta: { label: string; icon?: IconComponent; href?: string };
  features: PricingPlanFeature[];
}

export interface PricingPlanCardsProps {
  plans: PricingPlan[];
  /** Controlled billing cycle. */
  cycle?: BillingCycle;
  defaultCycle?: BillingCycle;
  onCycleChange?: (cycle: BillingCycle) => void;
  /** Called by plans whose CTA has no `href`. */
  onSelectPlan?: (planId: string, cycle: BillingCycle) => void;
  /** ISO 4217 code, e.g. "EUR". */
  currency?: string;
  /** Number formatting locale. Fixed (not the browser's) so server and client agree. */
  locale?: string;
  freeLabel?: string;
  heading?: ReactNode;
  description?: ReactNode;
  /** Glyph shown in a tile above the heading. */
  icon?: IconComponent;
  className?: string;
}

const TWEEN_MS = 360;

/** Rolls a number toward `target` with an ease-out cubic; instant under reduced motion. */
function useTweenedNumber(target: number, reduced: boolean) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    if (reduced) {
      fromRef.current = target;
      return;
    }
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / TWEEN_MS));
      const next = from + (target - from) * (1 - Math.pow(1 - t, 3));
      fromRef.current = next;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced]);

  return reduced ? target : value;
}

function useMoney(currency: string, locale: string) {
  return useMemo(() => {
    const whole = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 });
    const cents = new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (n: number) => (Number.isInteger(Math.round(n * 100) / 100) ? whole : cents).format(n);
  }, [currency, locale]);
}

/** Per-month figure shown for a cycle. Yearly shows the monthly equivalent of the annual total. */
export function perMonth(plan: PricingPlan, cycle: BillingCycle) {
  return cycle === "monthly" ? plan.price.monthly : plan.price.yearly / 12;
}

/** What paying yearly saves over twelve monthly payments (never negative). */
export function yearlySavings(plan: PricingPlan) {
  return Math.max(0, plan.price.monthly * 12 - plan.price.yearly);
}

// #region critical
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
// #endregion
