/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Agent Limits Card" (boardui.com/components/agent-limits-card).
 * No BoardUI source was used.
 */
"use client";

import { useId, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { RiArrowDownSLine, RiArrowRightLine, RiArrowRightSLine } from "@remixicon/react";
import { cx } from "@/registry/lib/cx";
import { ProgressTrack } from "@/registry/ui/progress";

/* ------------------------------------------------------------------ types */

export interface ContextBucket {
  label: string;
  tokens: number;
  /** Any CSS colour; defaults to the next chart token in BUCKET_PALETTE. */
  color?: string;
  /** Listed with a dash, left out of the bar, the used total and free space. */
  deferred?: boolean;
}

export interface ContextGroupMember {
  label: string;
  tokens: number;
}

export interface ContextGroup {
  label: string;
  tokens: number;
  members: readonly ContextGroupMember[];
}

export interface ContextUsage {
  /** Size of the context window in tokens. */
  capacity: number;
  buckets: readonly ContextBucket[];
  /** Collapsible member lists shown under the breakdown. */
  groups?: readonly ContextGroup[];
}

export interface PlanLimit {
  label: string;
  /** Share of the limit already used, 0–1. */
  used: number;
  /** Reset copy, e.g. "Resets in 2 hr 46 min". */
  resets: string;
}

export interface AgentLimitsCardProps {
  context: ContextUsage;
  /** Plan name shown after the limits title, e.g. "Max (5x)". */
  plan?: string;
  limits?: readonly PlanLimit[];
  /** Turns the plan heading into a link to the plan settings. */
  planHref?: string;
  /** Turns the plan heading into a button when there is no planHref. */
  onManagePlan?: () => void;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Caps the breakdown height (px); longer lists scroll inside the card. */
  maxBreakdownHeight?: number;
  contextTitle?: string;
  limitsTitle?: string;
  className?: string;
}

/* ------------------------------------------------------------- constants */

/** Default bucket colours, in order: blue, purple, pink, yellow, green, sky, teal, lime, indigo. */
export const BUCKET_PALETTE = [
  "var(--color-chart-6)",
  "var(--color-chart-5)",
  "var(--color-chart-3)",
  "var(--color-chart-8)",
  "var(--color-chart-7)",
  "var(--color-chart-4)",
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-9)",
] as const;

const DEFERRED_COLOR = "var(--color-chart-neutral)";
const FREE_COLOR = "var(--color-chart-track)";

/** Limits at or past these shares switch the bar to the warning, then the error tone. */
const WARN_AT = 0.75;
const DANGER_AT = 0.9;

const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring";
const COLLAPSE =
  "grid transition-[grid-template-rows,opacity,visibility] duration-300 ease-out motion-reduce:transition-none";

/* ------------------------------------------------------------------ maths */

const oneDecimal = (value: number) => (Math.round(value * 10) / 10).toString();

/** 520000 → "520k", 137900 → "137.9k", 1000000 → "1M". */
export function formatTokens(tokens: number): string {
  const abs = Math.abs(tokens);
  if (abs >= 999_950) return `${oneDecimal(tokens / 1_000_000)}M`;
  if (abs >= 1_000) return `${oneDecimal(tokens / 1_000)}k`;
  return String(Math.round(tokens));
}

interface BucketView extends ContextBucket {
  color: string;
  /** Share of the window, 0–100, or null for deferred buckets. */
  share: number | null;
  /** Width of the bar segment, 0–100. */
  width: number;
}

// #region critical
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
// #endregion

const TONE_FILL = {
  normal: "text-accent-500",
  warning: "text-chart-8-active",
  danger: "text-notification-error-foreground",
} as const;

/* ------------------------------------------------------------------ parts */

function Collapse({ open, id, children }: { open: boolean; id?: string; children: ReactNode }) {
  return (
    <div
      id={id}
      inert={!open}
      className={cx(COLLAPSE, open ? "visible grid-rows-[1fr] opacity-100" : "invisible grid-rows-[0fr] opacity-0")}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: color }} />;
}

function GroupRow({ group }: { group: ContextGroup }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={cx(
          "flex w-full items-center gap-1.5 rounded-lg py-1.5 pe-0 ps-0.5 text-start text-body-regular transition-colors duration-150 hover:bg-background-secondary-hover motion-reduce:transition-none",
          "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus-ring",
        )}
      >
        <RiArrowRightSLine
          aria-hidden
          className={cx(
            "size-4 shrink-0 text-foreground-icon-tertiary transition-transform duration-200 ease-out motion-reduce:transition-none rtl:-scale-x-100",
            open && "rotate-90 rtl:-rotate-90",
          )}
        />
        <span className="min-w-0 flex-1 truncate text-text-secondary">{group.label}</span>
        <span className="w-14 shrink-0 text-end text-text-tertiary tabular-nums">{formatTokens(group.tokens)}</span>
        <span className="w-10 shrink-0 text-end text-text-tertiary tabular-nums">
          {group.members.length}
          <span className="sr-only"> {group.members.length === 1 ? "item" : "items"}</span>
        </span>
      </button>
      <Collapse open={open} id={listId}>
        <ul className="pb-1 ps-[1.375rem]">
          {group.members.map((member) => (
            <li key={member.label} className="flex items-center gap-2 py-1 text-body-2-regular">
              <span className="min-w-0 flex-1 truncate text-text-tertiary">{member.label}</span>
              <span className="w-14 shrink-0 text-end text-text-tertiary tabular-nums">{formatTokens(member.tokens)}</span>
              <span aria-hidden className="w-10 shrink-0" />
            </li>
          ))}
        </ul>
      </Collapse>
    </li>
  );
}

function LimitRow({ limit }: { limit: PlanLimit }) {
  const { value, tone } = limitTone(limit.used);
  const percent = Math.round(value * 100);
  return (
    <li>
      <div
        role="meter"
        aria-label={limit.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent}% used. ${limit.resets}`}
        className="flex flex-col gap-2"
      >
        <div className="flex items-baseline gap-3 text-body-regular">
          <span className="max-w-[62%] shrink-0 truncate text-body-medium text-text-primary">{limit.label}</span>
          <span className="min-w-0 flex-1 truncate text-end text-body-2-regular text-text-tertiary sm:text-body-regular">{limit.resets}</span>
          <span
            className={cx(
              "w-9 shrink-0 text-end text-body-medium tabular-nums",
              tone === "danger" ? "text-text-error-primary" : "text-text-primary",
            )}
          >
            {percent}%
          </span>
        </div>
        <ProgressTrack percentage={percent} size="md" className={TONE_FILL[tone]} />
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ card */

export function AgentLimitsCard({
  context,
  plan,
  limits = [],
  planHref,
  onManagePlan,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  maxBreakdownHeight,
  contextTitle = "Context window",
  limitsTitle = "Plan usage limits",
  className,
}: AgentLimitsCardProps) {
  const [ownExpanded, setOwnExpanded] = useState(defaultExpanded);
  const isExpanded = expanded ?? ownExpanded;
  const [hovered, setHovered] = useState<number | null>(null);
  const breakdownId = useId();

  const { views, used, free, percent } = summarizeContext(context);
  const freeShare = (free / Math.max(1, context.capacity)) * 100;
  const groups = context.groups ?? [];

  const toggle = () => {
    const next = !isExpanded;
    if (expanded === undefined) setOwnExpanded(next);
    onExpandedChange?.(next);
  };

  const planHeading = (
    <>
      <span className="min-w-0 flex-1 truncate">
        {limitsTitle}
        {plan ? ` · ${plan}` : null}
      </span>
      {(planHref || onManagePlan) && (
        <RiArrowRightLine
          aria-hidden
          className="size-4 shrink-0 text-foreground-icon-tertiary transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none rtl:-scale-x-100"
        />
      )}
    </>
  );
  const planRowClass = cx(
    "group -mx-1.5 flex w-[calc(100%+0.75rem)] items-center gap-2 rounded-lg px-1.5 py-1 text-start text-body-regular text-text-secondary",
  );
  const planActionClass = cx(
    planRowClass,
    "transition-colors duration-150 hover:bg-background-secondary-hover hover:text-text-primary motion-reduce:transition-none",
    FOCUS,
  );

  return (
    <section
      aria-label={plan ? `Agent limits, ${plan}` : "Agent limits"}
      className={cx(
        "w-full max-w-[448px] rounded-2xl bg-background-secondary-default p-3.5 text-text-primary sm:p-4",
        className,
      )}
    >
      {/* Context window header: the whole row toggles the breakdown. */}
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={breakdownId}
        onClick={toggle}
        className={cx(
          "-mx-1.5 -mt-1 flex w-[calc(100%+0.75rem)] items-center gap-2 rounded-lg px-1.5 py-1 text-start text-body-2-regular transition-colors sm:text-body-regular duration-150 hover:bg-background-secondary-hover motion-reduce:transition-none",
          FOCUS,
        )}
      >
        <span className="min-w-0 flex-1 truncate text-text-secondary">{contextTitle}</span>
        <span className="shrink-0 text-text-secondary tabular-nums">
          {formatTokens(used)} / {formatTokens(context.capacity)}{" "}
          <span className="text-body-2-medium text-text-primary sm:text-body-medium">({percent}%)</span>
        </span>
        <RiArrowDownSLine
          aria-hidden
          className={cx(
            "size-4 shrink-0 text-foreground-icon-tertiary transition-transform duration-200 ease-out motion-reduce:transition-none",
            isExpanded && "rotate-180",
          )}
        />
      </button>

      <div
        role="meter"
        aria-label={contextTitle}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, percent)}
        aria-valuetext={`${formatTokens(used)} of ${formatTokens(context.capacity)} tokens, ${percent}%`}
        className="mt-2 flex h-1.5 w-full gap-px overflow-hidden rounded-full"
        style={{ backgroundColor: FREE_COLOR }}
        onPointerLeave={() => setHovered(null)}
      >
        {views.map((view, i) =>
          view.deferred || view.width <= 0 ? null : (
            <span
              key={`${view.label}-${i}`}
              title={`${view.label} · ${formatTokens(view.tokens)}`}
              onPointerEnter={() => setHovered(i)}
              className={cx(
                "h-full shrink-0 transition-[width,opacity] duration-500 ease-out motion-reduce:transition-none",
                hovered !== null && hovered !== i && "opacity-35",
              )}
              style={{ width: `${view.width}%`, backgroundColor: view.color } as CSSProperties}
            />
          ),
        )}
      </div>

      <Collapse open={isExpanded} id={breakdownId}>
        <div
          className="mt-3 overflow-y-auto overscroll-contain [scrollbar-width:thin]"
          style={maxBreakdownHeight ? { maxHeight: maxBreakdownHeight } : undefined}
        >
          <ul aria-label="Context breakdown" onPointerLeave={() => setHovered(null)}>
            {views.map((view, i) => (
              <li
                key={`${view.label}-${i}`}
                onPointerEnter={() => setHovered(view.deferred ? null : i)}
                className={cx(
                  "flex items-center gap-2 rounded-md py-1.5 text-body-regular transition-opacity duration-150 motion-reduce:transition-none",
                  hovered !== null && hovered !== i && "opacity-60",
                )}
              >
                <Swatch color={view.color} />
                <span className="min-w-0 flex-1 truncate text-text-primary">{view.label}</span>
                <span className="w-14 shrink-0 text-end text-text-tertiary tabular-nums">{formatTokens(view.tokens)}</span>
                <span className="w-14 shrink-0 text-end tabular-nums text-text-primary">
                  {view.share === null ? (
                    <>
                      <span aria-hidden>—</span>
                      <span className="sr-only">deferred, not counted</span>
                    </>
                  ) : (
                    `${view.share.toFixed(1)}%`
                  )}
                </span>
              </li>
            ))}
            <li className="flex items-center gap-2 py-1.5 text-body-regular">
              <Swatch color={FREE_COLOR} />
              <span className="min-w-0 flex-1 truncate text-text-primary">Free space</span>
              <span className="w-14 shrink-0 text-end text-text-tertiary tabular-nums">{formatTokens(free)}</span>
              <span className="w-14 shrink-0 text-end tabular-nums text-text-primary">{freeShare.toFixed(1)}%</span>
            </li>
          </ul>

          {groups.length > 0 && (
            <ul aria-label="Groups" className="mt-2">
              {groups.map((group) => (
                <GroupRow key={group.label} group={group} />
              ))}
            </ul>
          )}
        </div>
        <div aria-hidden className="mt-3 h-px bg-border-table" />
      </Collapse>

      {limits.length > 0 || plan ? (
        <div className={cx("transition-[margin] duration-300 ease-out motion-reduce:transition-none", isExpanded ? "mt-3" : "mt-5")}>
          {planHref ? (
            <a href={planHref} className={planActionClass}>
              {planHeading}
              <span className="sr-only">, manage plan</span>
            </a>
          ) : onManagePlan ? (
            <button type="button" onClick={onManagePlan} className={planActionClass}>
              {planHeading}
              <span className="sr-only">, manage plan</span>
            </button>
          ) : (
            <h3 className={planRowClass}>{planHeading}</h3>
          )}
          <ul className="mt-2 flex flex-col gap-4">
            {limits.map((limit) => (
              <LimitRow key={limit.label} limit={limit} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
