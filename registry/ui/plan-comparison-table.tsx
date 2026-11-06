/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Plan Comparison Table" (boardui.com/pricing).
 * No BoardUI source was used.
 */
"use client";

import { useId, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { RiArrowDownSLine, RiCheckLine, RiSubtractLine } from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { Button, ButtonLink } from "@/registry/ui/button";
import { SegmentedControl, SegmentedControlItem } from "@/registry/ui/segmented-control";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

/** `true` draws a check, `false` / missing draws a dash, a string is printed as is. */
export type ComparisonValue = boolean | string;

export interface ComparisonPlan {
  id: string;
  name: string;
  /** Formatted price, e.g. "€15". */
  price: string;
  /** Small text after the price, e.g. "/ month". */
  period?: string;
  highlighted?: boolean;
  badge?: string;
  cta?: { label: string; href?: string };
}

export interface ComparisonRow {
  id: string;
  label: string;
  hint?: string;
  values: Partial<Record<string, ComparisonValue>>;
}

export interface ComparisonGroup {
  id: string;
  title: string;
  icon?: IconComponent;
  rows: ComparisonRow[];
}

export interface PlanComparisonTableProps {
  plans: ComparisonPlan[];
  groups: ComparisonGroup[];
  /** Groups that start collapsed. */
  defaultCollapsed?: string[];
  /** Offset of the sticky plan header from the top of the scroll container, in px. */
  stickyTop?: number;
  /** Text in the header's first cell (also the table caption). */
  label?: string;
  /** Second line under `label`. */
  sublabel?: string;
  /** Called by CTAs of plans without `cta.href`. */
  onSelectPlan?: (planId: string) => void;
  className?: string;
}

/** Column tint for the highlighted plan, shared by header, body and footer cells. */
const TINT = "bg-accent-50 dark:bg-accent-950/40";

// #region critical
function ValueCell({ value }: { value: ComparisonValue | undefined }) {
  if (value === true) {
    return (
      <span className="inline-grid size-5 place-items-center rounded-full bg-badge-new-background text-badge-new-text">
        <RiCheckLine aria-hidden className="size-3.5" />
        <span className="sr-only">Included</span>
      </span>
    );
  }
  if (value === false || value === undefined || value === "") {
    return (
      <span className="inline-flex text-foreground-icon-quaternary">
        <RiSubtractLine aria-hidden className="size-4" />
        <span className="sr-only">Not included</span>
      </span>
    );
  }
  return <span className="text-body-medium text-text-primary">{value}</span>;
}

export function PlanComparisonTable({
  plans,
  groups,
  defaultCollapsed = [],
  stickyTop = 0,
  label = "Compare plans",
  sublabel,
  onSelectPlan,
  className,
}: PlanComparisonTableProps) {
  const uid = useId();
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set(defaultCollapsed));
  // On narrow containers only one plan column fits beside the labels; this picks it.
  const [focusPlan, setFocusPlan] = useState(() => (plans.find((p) => p.highlighted) ?? plans[0])?.id ?? "");

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Every plan column is visible from @3xl; below it only the focused plan's column is.
  const planCol = (plan: ComparisonPlan) =>
    cx(plan.id === focusPlan ? "table-cell" : "hidden @3xl:table-cell", plan.highlighted && TINT);

  const cta = (plan: ComparisonPlan, size: "small" | "xs") => {
    if (!plan.cta) return null;
    const variant = plan.highlighted ? "primary" : "secondary";
    const cls = "w-full rounded-full";
    return plan.cta.href ? (
      <ButtonLink href={plan.cta.href} size={size} variant={variant} className={cls}>
        {plan.cta.label}
      </ButtonLink>
    ) : (
      <Button size={size} variant={variant} className={cls} onClick={() => onSelectPlan?.(plan.id)}>
        {plan.cta.label}
      </Button>
    );
  };

  return (
    <div className={cx("@container w-full", className)}>
      {plans.length > 1 && (
        <div className="mb-4 flex justify-center @3xl:hidden">
          <SegmentedControl
            aria-label="Plan to compare"
            selectedKeys={new Set([focusPlan])}
            onSelectionChange={(keys) => {
              const next = [...keys][0];
              if (typeof next === "string") setFocusPlan(next);
            }}
          >
            {plans.map((plan) => (
              <SegmentedControlItem key={plan.id} id={plan.id}>
                {plan.name}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </div>
      )}

      <table className="w-full table-fixed border-separate border-spacing-0 text-left">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            <th
              scope="col"
              style={{ top: stickyTop }}
              className="sticky z-10 w-[55%] border-b border-separator-border bg-background-full px-3 pt-5 pb-4 align-bottom @3xl:w-[32%] @3xl:px-4"
            >
              <span className="block text-title-3-medium text-text-primary">{label}</span>
              {sublabel && <span className="mt-1 block text-body-2-regular text-text-tertiary">{sublabel}</span>}
            </th>
            {plans.map((plan) => (
              <th
                key={plan.id}
                scope="col"
                style={{ top: stickyTop }}
                className={cx(
                  "sticky z-10 border-b border-separator-border bg-background-full p-0 align-bottom",
                  plan.id === focusPlan ? "table-cell" : "hidden @3xl:table-cell",
                )}
              >
                <div className={cx("flex h-full flex-col gap-3 rounded-t-2xl px-3 pt-5 pb-4 @3xl:px-4", plan.highlighted && TINT)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-headline-medium text-text-primary">{plan.name}</span>
                    {plan.badge && (
                      <span className="rounded-full bg-badge-new-background px-2 py-0.5 text-caption-2-semibold text-badge-new-text">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="flex items-baseline gap-1">
                    <span className="text-title-1-medium tracking-tight text-text-primary tabular-nums">{plan.price}</span>
                    {plan.period && <span className="text-caption-1-regular text-text-tertiary">{plan.period}</span>}
                  </p>
                  {cta(plan, "small")}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        {groups.map((group) => {
          const open = !collapsed.has(group.id);
          const rowIds = group.rows.map((row) => `${uid}-${group.id}-${row.id}`);
          const GroupIcon = group.icon;
          return (
            <tbody key={group.id}>
              <tr>
                <th scope="colgroup" colSpan={plans.length + 1} className="px-0 pt-6 pb-1">
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={rowIds.join(" ")}
                    onClick={() => toggle(group.id)}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl bg-background-secondary-default px-3 py-2.5 text-left outline-none transition-colors duration-150 ease-out hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none @3xl:px-4"
                  >
                    {GroupIcon && <GroupIcon aria-hidden className="size-4 shrink-0 text-foreground-icon-secondary" />}
                    <span className="text-body-semibold text-text-primary">{group.title}</span>
                    <span className="text-caption-1-regular text-text-tertiary tabular-nums">{group.rows.length}</span>
                    <RiArrowDownSLine
                      aria-hidden
                      className={cx(
                        "ml-auto size-4 shrink-0 text-foreground-icon-tertiary transition-transform duration-200 ease-out motion-reduce:transition-none",
                        !open && "-rotate-90",
                      )}
                    />
                  </button>
                </th>
              </tr>
              {open &&
                group.rows.map((row, i) => (
                  <tr
                    key={row.id}
                    id={rowIds[i]}
                    className="transition-opacity duration-200 ease-out starting:opacity-0 motion-reduce:transition-none"
                  >
                    <th scope="row" className="border-b border-separator-border px-3 py-3 align-middle font-normal @3xl:px-4">
                      <span className="block text-body-regular text-text-secondary">{row.label}</span>
                      {row.hint && <span className="mt-0.5 block text-caption-1-regular text-text-tertiary">{row.hint}</span>}
                    </th>
                    {plans.map((plan) => (
                      <td
                        key={plan.id}
                        className={cx("border-b border-separator-border px-3 py-3 align-middle @3xl:px-4", planCol(plan))}
                      >
                        <ValueCell value={row.values[plan.id]} />
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          );
        })}

        <tfoot>
          <tr>
            <td className="px-3 pt-4 pb-5 @3xl:px-4" />
            {plans.map((plan) => (
              <td key={plan.id} className={cx("rounded-b-2xl px-3 pt-4 pb-5 @3xl:px-4", planCol(plan))}>
                {cta(plan, "xs")}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
// #endregion
