/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Plan Usage Card" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import type { ReactNode } from "react";
import { Meter as AriaMeter } from "react-aria-components";
import { RiArrowRightUpLine } from "@remixicon/react";
import { Button } from "@/registry/ui/button";
import { ProgressTrack } from "@/registry/ui/progress";
import { cx, sortCx } from "@/registry/lib/cx";

/**
 * Plan Usage Card — the limits of a subscription plan as a stack of thin
 * meters (a rolling 5-hour window, weekly caps), each with when it resets,
 * plus the renewal date and an upgrade action in the footer.
 *
 *   <PlanUsageCard
 *     plan="Max (5x)"
 *     renews="Renews Dec 1"
 *     limits={[{ id: "5h", label: "5-hour limit", used: 38, resets: "Resets in 2 hr 46 min" }]}
 *     onUpgrade={() => openBilling()}
 *   />
 *
 * Each meter turns amber past `warnAt` and red past `criticalAt`, so a limit
 * that is about to run out reads before its number does. `bare` drops the
 * surface for nesting under another tile (e.g. a context window card).
 */

export interface PlanLimit {
  id: string;
  label: string;
  /** Share of the limit used, 0–100. */
  used: number;
  /** When the window resets, e.g. "Resets Tue 3:00 PM". */
  resets?: string;
}

export interface PlanUsageCardProps {
  /** Plan name shown after the title, e.g. "Max (5x)". */
  plan: ReactNode;
  limits: PlanLimit[];
  /** Header title. Default "Plan usage limits". */
  title?: ReactNode;
  /** Renewal line in the footer, e.g. "Renews Dec 1". */
  renews?: ReactNode;
  /** Shows the upgrade button when set. */
  onUpgrade?: () => void;
  upgradeLabel?: ReactNode;
  /** Percent at which a meter turns amber. Default 70. */
  warnAt?: number;
  /** Percent at which a meter turns red. Default 90. */
  criticalAt?: number;
  /** Drop the card surface and padding, for nesting in another tile. */
  bare?: boolean;
  className?: string;
}

type Tone = "accent" | "warning" | "error";

const fill = sortCx({
  accent: "text-accent-500",
  warning: "text-chart-8-active",
  error: "text-notification-error-foreground",
});

const figure = sortCx({
  accent: "text-text-primary",
  warning: "text-chart-8-active",
  error: "text-notification-error-foreground",
});

// #region critical
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
// #endregion
