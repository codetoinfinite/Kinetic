/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Agents Bar Card" (boardui.com/templates/ai-profile).
 * No BoardUI source was used.
 */
"use client";

import { useState } from "react";
import type { HTMLAttributes, KeyboardEvent, Ref } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";

import { cx } from "@/registry/lib/cx";
import { Avatar } from "@/registry/ui/avatar";
import { Button } from "@/registry/ui/button";

/**
 * Agents Bar Card: one purple bar per agent for the chosen month.
 *
 * Idle agents show as grey stubs on the baseline. Hovering a bar, or arrowing
 * through the focused chart, highlights it and fills the readout row with the
 * agent's avatar, name and value; with nothing active the readout shows the
 * busiest agent. A month switcher in the corner pages through the data.
 */

export interface AgentUsage {
  id: string;
  name: string;
  /** Avatar initials; defaults to the first letter of `name`. */
  initials?: string;
  color?: "neutral" | "blue" | "lime" | "pink";
  /** Usage in the month; 0 renders an idle stub. */
  value: number;
}

export interface AgentMonth {
  id: string;
  /** Switcher label, e.g. "December". */
  label: string;
  agents: AgentUsage[];
}

export interface AgentsBarCardProps
  extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  title?: string;
  months: AgentMonth[];
  month?: string;
  defaultMonth?: string;
  onMonthChange?: (id: string) => void;
  /** Word after values, e.g. "runs". */
  unit?: string;
  formatValue?: (value: number) => string;
  /** Captions under the first and last bar. */
  startLabel?: string;
  endLabel?: string;
  ref?: Ref<HTMLElement>;
}

const plain = new Intl.NumberFormat("en-US");

// Neutral chevrons: the kit ghost button is blue-tinted, the switcher is not.
const chevron =
  "bg-transparent text-foreground-icon-tertiary hover:bg-background-secondary-hover hover:text-text-primary active:bg-background-secondary-hover disabled:bg-transparent disabled:text-foreground-icon-tertiary disabled:opacity-40";

export function AgentsBarCard({
  title = "Agents",
  months,
  month,
  defaultMonth,
  onMonthChange,
  unit = "runs",
  formatValue = (n) => plain.format(n),
  startLabel,
  endLabel,
  className,
  ref,
  ...props
}: AgentsBarCardProps) {
  const [innerMonth, setInnerMonth] = useState(defaultMonth ?? months[months.length - 1]?.id ?? "");
  const currentId = month ?? innerMonth;
  const monthIndex = Math.max(0, months.findIndex((m) => m.id === currentId));
  const current = months[monthIndex];
  const agents = current?.agents ?? [];
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // #region critical
  const max = agents.reduce((m, a) => Math.max(m, a.value), 0);
  const activeCount = agents.filter((a) => a.value > 0).length;
  const topIndex = agents.reduce((best, a, i) => (a.value > (agents[best]?.value ?? -1) ? i : best), 0);
  const shownIndex = activeIndex ?? topIndex;
  const shown = agents[shownIndex];
  const rank = shown ? agents.filter((a) => a.value > shown.value).length + 1 : 0;

  const goMonth = (step: -1 | 1) => {
    const next = months[monthIndex + step];
    if (!next) return;
    setActiveIndex(null);
    if (month === undefined) setInnerMonth(next.id);
    onMonthChange?.(next.id);
  };

  // One tab stop for every bar: arrows step, Home/End jump, Escape clears.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = agents.length - 1;
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
  // #endregion

  const describe = (a: AgentUsage) => `${a.name}: ${formatValue(a.value)} ${unit}`;

  return (
    <section
      ref={ref}
      className={cx("flex w-full min-w-0 flex-col rounded-2xl bg-background-secondary-default", className)}
      {...props}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-body-regular text-text-secondary">{title}</p>
          <p className="text-title-2-regular text-text-primary tabular-nums">
            {activeCount} {activeCount === 1 ? "agent" : "agents"}
          </p>
        </div>
        {months.length > 0 && (
          <div className="flex h-8 shrink-0 items-center rounded-lg border border-border-button-default bg-background-primary-default px-0.5 shadow-xs">
            <Button
              variant="ghost"
              size="xs"
              iconOnly
              leadingIcon={RiArrowLeftSLine}
              aria-label="Previous month"
              className={chevron}
              disabled={monthIndex === 0}
              onClick={() => goMonth(-1)}
            />
            <span
              aria-live="polite"
              className="min-w-[84px] px-1 text-center text-body-medium text-text-primary"
            >
              {current?.label}
            </span>
            <Button
              variant="ghost"
              size="xs"
              iconOnly
              leadingIcon={RiArrowRightSLine}
              aria-label="Next month"
              className={chevron}
              disabled={monthIndex === months.length - 1}
              onClick={() => goMonth(1)}
            />
          </div>
        )}
      </div>

      {shown && (
        <div data-agent-readout className="mt-3 flex min-h-6 items-center gap-2 px-4" aria-hidden>
          <Avatar size="sm" color={shown.color ?? "neutral"} initials={shown.initials ?? shown.name.charAt(0)} />
          <span className="truncate text-body-medium text-text-primary">{shown.name}</span>
          <span className="shrink-0 text-body-regular text-text-secondary tabular-nums">
            {formatValue(shown.value)} {unit}
          </span>
          <span className="ml-auto shrink-0 text-caption-1-regular text-text-tertiary">
            {activeIndex === null ? "Most active" : `#${rank} of ${agents.length}`}
          </span>
        </div>
      )}

      <div
        role="slider"
        tabIndex={0}
        aria-label={`${title} usage, ${current?.label ?? ""}`}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, agents.length - 1)}
        aria-valuenow={shownIndex}
        aria-valuetext={shown ? describe(shown) : "No agents"}
        onKeyDown={onKeyDown}
        onBlur={() => setActiveIndex(null)}
        onPointerLeave={() => setActiveIndex(null)}
        className="mx-2 mt-3 flex h-40 items-end gap-[3px] rounded-lg px-2 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring sm:gap-1.5"
      >
        {agents.map((agent, i) => {
          const isActive = activeIndex === i;
          const pct = max > 0 ? (agent.value / max) * 100 : 0;
          return (
            <div
              key={agent.id}
              onPointerEnter={() => setActiveIndex(i)}
              className="flex h-full min-w-0 flex-1 cursor-pointer items-end"
            >
              <div
                className={cx(
                  "w-full rounded-t-[3px] [transition:height_300ms_ease-out,background-color_120ms_ease-out] motion-reduce:transition-none",
                  agent.value === 0
                    ? "rounded-b-[1px] bg-chart-neutral"
                    : isActive
                      ? "bg-chart-agents-bar-active"
                      : "bg-chart-agents-bar",
                )}
                style={{ height: agent.value === 0 ? 3 : `max(6px, ${pct}%)` }}
              />
            </div>
          );
        })}
      </div>

      <div
        aria-hidden
        className="flex min-h-4 justify-between px-4 pt-2 pb-3 text-caption-2-medium text-text-tertiary"
      >
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </section>
  );
}
