/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Context Usage Ring" (boardui.com/templates/ai-chat).
 * No BoardUI source was used.
 */
"use client";

import { Button as AriaButton } from "react-aria-components";

import { cx } from "@/registry/lib/cx";
import { Tooltip, TooltipTrigger } from "@/registry/ui/tooltip";

export type ContextTone = "accent" | "blue" | "purple" | "orange" | "cyan" | "lime" | "rose" | "yellow";

export interface ContextSlice {
  label: string;
  tokens: number;
  tone?: ContextTone;
}

export type ContextLevel = "normal" | "warning" | "danger";

const SLICE_TONE: Record<ContextTone, string> = {
  accent: "bg-accent-500",
  blue: "bg-status-blue-text",
  purple: "bg-status-purple-text",
  orange: "bg-status-orange-text",
  cyan: "bg-status-cyan-text",
  lime: "bg-status-lime-text",
  rose: "bg-status-rose-text",
  yellow: "bg-status-yellow-text",
};

const FALLBACK_TONES: ContextTone[] = ["accent", "purple", "cyan", "lime", "yellow"];

const toneClass = (slice: ContextSlice, index: number) =>
  SLICE_TONE[slice.tone ?? FALLBACK_TONES[index % FALLBACK_TONES.length] ?? "accent"];

const LEVEL_STYLE: Record<ContextLevel, { pill: string; arc: string }> = {
  normal: { pill: "bg-background-tertiary-default text-text-secondary", arc: "text-foreground-icon-secondary" },
  warning: { pill: "bg-status-orange-background text-status-orange-text", arc: "text-status-orange-text" },
  danger: { pill: "bg-status-rose-background text-status-rose-text", arc: "text-status-rose-text" },
};

/** 812, 4.2k, 114k, 1.2M. */
export function formatTokens(n: number): string {
  if (n < 1000) return String(Math.round(n));
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function contextLevel(ratio: number, warnAt = 0.75, dangerAt = 0.9): ContextLevel {
  if (ratio >= dangerAt) return "danger";
  if (ratio >= warnAt) return "warning";
  return "normal";
}

export interface ContextUsageRingProps {
  /** Tokens currently in the window. */
  used: number;
  /** Window size in tokens. */
  limit: number;
  /** What the used tokens are made of. Shown as a stacked bar and a list in the tooltip. */
  breakdown?: ContextSlice[];
  /** Share of the window (0-1) where the ring turns orange. */
  warnAt?: number;
  /** Share of the window (0-1) where the ring turns rose. */
  dangerAt?: number;
  /** Hide the percentage and show the ring alone. */
  hideLabel?: boolean;
  /** Ring diameter in px. */
  size?: number;
  className?: string;
}

// #region critical
function Ring({ pct, size, arcClass }: { pct: number; size: number; arcClass: string }) {
  const stroke = size <= 16 ? 2 : 2.5;
  const r = (size - stroke) / 2;
  return (
    <svg aria-hidden width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-foreground-icon-quaternary" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        pathLength={100}
        // A round cap pokes past a zero-length dash, so an empty window draws nothing.
        strokeDasharray={pct > 0 ? `${pct} 100` : "0 100"}
        opacity={pct > 0 ? 1 : 0}
        className={cx(
          "transition-[stroke-dasharray,color] duration-300 ease-out motion-reduce:transition-none",
          arcClass,
        )}
      />
    </svg>
  );
}
// #endregion

export function ContextUsageRing({
  used,
  limit,
  breakdown,
  warnAt = 0.75,
  dangerAt = 0.9,
  hideLabel = false,
  size = 16,
  className,
}: ContextUsageRingProps) {
  const ratio = limit > 0 ? Math.min(1, Math.max(0, used / limit)) : 0;
  const pct = Math.round(ratio * 100);
  const level = contextLevel(ratio, warnAt, dangerAt);
  const style = LEVEL_STYLE[level];
  const free = Math.max(0, limit - used);
  const slices = (breakdown ?? []).filter((s) => s.tokens > 0);

  return (
    <TooltipTrigger>
      <AriaButton
        aria-label={`Context window ${pct}% used`}
        data-level={level}
        className={cx(
          "inline-flex h-8 shrink-0 cursor-default items-center gap-1.5 rounded-full text-body-2-medium tabular-nums outline-none",
          "transition-colors duration-300 ease-out motion-reduce:transition-none",
          "data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring",
          hideLabel ? "justify-center px-2" : "ps-2 pe-2.5",
          style.pill,
          className,
        )}
      >
        <Ring pct={pct} size={size} arcClass={style.arc} />
        {!hideLabel && <span aria-hidden>{pct}%</span>}
      </AriaButton>
      <Tooltip placement="top" className="w-[248px] max-w-[calc(100vw-32px)] p-3">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-body-2-medium text-text-primary">Context window</span>
            <span className="text-body-2-regular text-text-tertiary tabular-nums">
              {formatTokens(used)} / {formatTokens(limit)}
            </span>
          </div>

          {slices.length > 0 && (
            <>
              <div aria-hidden className="flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-background-tertiary-default">
                {slices.map((s, i) => (
                  <span
                    key={s.label}
                    className={cx("h-full", toneClass(s, i))}
                    style={{ width: `${(s.tokens / Math.max(limit, 1)) * 100}%` }}
                  />
                ))}
              </div>
              <ul className="flex flex-col gap-1">
                {slices.map((s, i) => (
                  <li key={s.label} className="flex items-center gap-2 text-body-2-regular">
                    <span
                      aria-hidden
                      className={cx("size-2 shrink-0 rounded-full", toneClass(s, i))}
                    />
                    <span className="min-w-0 flex-1 truncate text-text-secondary">{s.label}</span>
                    <span className="text-text-primary tabular-nums">{formatTokens(s.tokens)}</span>
                  </li>
                ))}
                <li className="flex items-center gap-2 text-body-2-regular">
                  <span aria-hidden className="size-2 shrink-0 rounded-full bg-foreground-icon-quaternary" />
                  <span className="flex-1 text-text-secondary">Free</span>
                  <span className="text-text-primary tabular-nums">{formatTokens(free)}</span>
                </li>
              </ul>
            </>
          )}

          {level !== "normal" && (
            <p className={cx("text-body-2-regular", level === "danger" ? "text-status-rose-text" : "text-status-orange-text")}>
              {level === "danger"
                ? "Almost full. Older turns will be summarised on the next message."
                : "Filling up. Long files and tool output take the most room."}
            </p>
          )}
        </div>
      </Tooltip>
    </TooltipTrigger>
  );
}
