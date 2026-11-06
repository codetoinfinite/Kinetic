/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Stacked Card Fan" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useId } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine, RiCheckboxBlankCircleLine, RiLoader4Line } from "@remixicon/react";
import { Chip } from "@/registry/ui/chip";
import type { StackedCardFanItem } from "@/registry/ui/stacked-card-fan";

/*
 * Five agent-dashboard card faces sized for StackedCardFan (they fill the card
 * and lay out with flex, so they work from about 230 to 320px wide). They are
 * pictures of an app: static, with no focusable content.
 */

function Meter({ label, value, tone = "bg-chart-6" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 text-caption-1-medium">
        <span className="truncate text-text-secondary">{label}</span>
        <span className="text-text-tertiary tabular-nums">{value}%</span>
      </div>
      <span className="h-1.5 overflow-hidden rounded-full bg-background-tertiary-default">
        <span className={`block h-full rounded-full ${tone}`} style={{ width: `${value}%` }} />
      </span>
    </div>
  );
}

export function UsageCardFace() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-body-semibold text-text-primary">Context window</span>
        <Meter label="Used this session" value={62} />
      </div>
      <span className="h-px bg-separator-border" />
      <div className="flex flex-col gap-3">
        <span className="text-body-semibold text-text-primary">Plan usage</span>
        <Meter label="5-hour limit" value={48} />
        <Meter label="Weekly, all models" value={22} />
        <Meter label="Weekly, large model" value={9} tone="bg-chart-5" />
      </div>
    </div>
  );
}

const STEPS = ["Read the brief", "Update the schema", "Implement the endpoint", "Add tests", "Run checks"];

export function StepsCardFace() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <RiLoader4Line className="size-4 animate-spin text-accent-500 motion-reduce:animate-none" aria-hidden="true" />
        <span className="text-body-semibold text-text-primary">5 steps left</span>
      </div>
      <ul className="flex flex-col gap-1">
        {STEPS.map((step, i) => (
          <li
            key={step}
            className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-body-medium ${
              i === 0 ? "border border-border-button-default bg-background-secondary-default text-text-primary" : "text-text-tertiary"
            }`}
          >
            {i === 0 ? (
              <RiLoader4Line className="size-4 shrink-0 animate-spin text-text-secondary motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <RiCheckboxBlankCircleLine className="size-4 shrink-0 text-foreground-icon-tertiary" aria-hidden="true" />
            )}
            <span className="truncate">{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TOKENS = [58, 46, 16, 4, 4, 4, 4, 4, 4, 70, 18, 12, 10, 20, 10, 8, 86, 96, 92, 66, 18, 8, 34, 44, 62, 50, 42];
const W = 300;
const H = 120;
const tokenPoints = TOKENS.map((v, i) => [(i / (TOKENS.length - 1)) * W, H - (v / 100) * (H - 8)] as const);
const tokenLine = tokenPoints.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
const tokenArea = `${tokenLine} L${W} ${H} L0 ${H} Z`;

export function TokensCardFace() {
  const gradient = useId();
  return (
    <div className="flex h-full flex-col">
      <span className="text-caption-1-medium text-text-secondary">Tokens</span>
      <div className="mt-1 flex items-center gap-2">
        <span className="min-w-0 truncate text-title-3-semibold text-text-primary tabular-nums">
          667.7M<span className="hidden @3xs/card:inline"> tokens</span>
        </span>
        <Chip variant="subtle" color="purple">
          +9.4%
        </Chip>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-3 min-h-0 w-full flex-1 text-chart-5" aria-hidden="true">
        <defs>
          <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={tokenArea} fill={`url(#${gradient})`} />
        <path d={tokenLine} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 flex justify-between text-caption-2-regular text-text-tertiary">
        <span>Jun 14</span>
        <span>Today</span>
      </div>
    </div>
  );
}

const HEAT = [0, 1, 2, 1, 0, 3, 2, 1, 2, 3, 3, 1, 0, 1, 2, 3, 2, 2, 1, 0, 3, 3, 2, 1, 2, 1, 0, 2, 3, 1];
const HEAT_TONE = ["bg-background-tertiary-default", "bg-chart-5/25", "bg-chart-5/55", "bg-chart-5"];

export function CalendarCardFace() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-body-semibold text-text-primary">September</span>
        <span className="flex gap-1 text-foreground-icon-secondary" aria-hidden="true">
          <RiArrowLeftSLine className="size-4" />
          <RiArrowRightSLine className="size-4" />
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-caption-2-medium text-text-tertiary">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-5 gap-1">
        {HEAT.map((level, i) => (
          <span key={i} className={`rounded-[5px] ${HEAT_TONE[level] ?? HEAT_TONE[0]}`} />
        ))}
      </div>
    </div>
  );
}

const REQUESTS = [22, 30, 26, 44, 38, 52, 34, 60, 48, 70, 56, 64, 82, 58, 76, 90, 68, 84, 96, 72, 88, 80, 94, 100];

export function RequestsCardFace() {
  return (
    <div className="flex h-full flex-col">
      <span className="text-caption-1-medium text-text-secondary">Requests</span>
      <span className="mt-1 text-title-3-semibold text-text-primary tabular-nums">18.2k</span>
      <div className="mt-3 flex min-h-0 flex-1 items-end gap-[3px]" aria-hidden="true">
        {REQUESTS.map((v, i) => (
          <span key={i} className={`flex-1 rounded-full ${i % 3 === 2 ? "bg-chart-9" : "bg-chart-5"}`} style={{ height: `${v}%` }} />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3 text-caption-2-medium text-text-tertiary">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-chart-5" />
          Chat
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-chart-9" />
          Agents
        </span>
      </div>
    </div>
  );
}

/** The five faces in fan order, ready for `<StackedCardFan items={…} />`. Front card is index 0. */
export const AGENT_DASHBOARD_CARDS: StackedCardFanItem[] = [
  { id: "tokens", label: "Tokens", content: <TokensCardFace /> },
  { id: "calendar", label: "September activity", content: <CalendarCardFace /> },
  { id: "requests", label: "Requests", content: <RequestsCardFace /> },
  { id: "usage", label: "Context window and plan usage", content: <UsageCardFace /> },
  { id: "steps", label: "5 steps left", content: <StepsCardFace /> },
];
