/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Stage Bars Card" (boardui.com/components/stage-bars-card).
 * No BoardUI source was used.
 */
"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import {
  RiBuildingLine,
  RiEyeLine,
  RiFlashlightLine,
  RiTeamLine,
  RiUserAddLine,
  RiVipCrownLine,
} from "@remixicon/react";

import {
  CHART_COLORS,
  ChartCardFrame,
  ChartCardHeader,
  MONO_FILL,
  PeriodSelect,
  StatTiles,
  chartColorAt,
  formatInt,
  useTweenedValues,
  type ChartColor,
} from "@/registry/ui/funnel-chart-card-shell";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { cx } from "@/registry/lib/cx";

/**
 * A funnel drawn as a list: one rounded pill per stage over the chart track,
 * the stage name on the left, its value and share of the top stage on the
 * right. Stages may carry a breakdown (`segments`); with `stacked` each pill
 * splits into those parts, a legend names them, and hovering a part (or
 * arrowing through it from the keyboard) shows its numbers in the headline.
 */

export type StageSegment = {
  label: string;
  value: number;
  /** Overrides the palette colour of this series (first occurrence wins). */
  color?: ChartColor;
};

export type BarStage = {
  label: string;
  value: number;
  color?: ChartColor;
  /** A 14px icon drawn at the left end inside the pill. */
  icon?: ReactNode;
  /** Breakdown of `value`, drawn as stacked parts when the card is `stacked`. */
  segments?: StageSegment[];
};

export type StageRange = {
  id: string;
  label: string;
  stages: BarStage[];
  delta?: number;
  /** Headline when nothing is hovered; defaults to the top stage's value. */
  headline?: number;
};

const ICON = "size-3.5";
const PIPELINE_STAGES: readonly { label: string; icon: ReactNode; mix: readonly [number, number] }[] = [
  { label: "Visits", icon: <RiEyeLine className={ICON} />, mix: [0.52, 0.33] },
  { label: "Sign-up", icon: <RiUserAddLine className={ICON} />, mix: [0.48, 0.32] },
  { label: "Active", icon: <RiFlashlightLine className={ICON} />, mix: [0.5, 0.27] },
  { label: "Pro", icon: <RiVipCrownLine className={ICON} />, mix: [0.46, 0.3] },
  { label: "Team", icon: <RiTeamLine className={ICON} />, mix: [0.42, 0.33] },
  { label: "Enterprise", icon: <RiBuildingLine className={ICON} />, mix: [0.35, 0.25] },
];

/** Splits each stage into Organic / Paid / Referral by a fixed per-stage mix. */
function pipelineRange(id: string, label: string, values: readonly number[], delta: number): StageRange {
  return {
    id,
    label,
    delta,
    stages: values.map((value, index) => {
      const def = PIPELINE_STAGES[index];
      const [organicShare, paidShare] = def?.mix ?? [0.5, 0.3];
      const organic = Math.round(value * organicShare);
      const paid = Math.round(value * paidShare);
      return {
        label: def?.label ?? `Stage ${index + 1}`,
        value,
        icon: def?.icon,
        segments: [
          { label: "Organic", value: organic },
          { label: "Paid", value: paid },
          { label: "Referral", value: value - organic - paid },
        ],
      };
    }),
  };
}

/** Three demo periods of a product pipeline, each stage split by channel. */
export const PIPELINE_RANGES: StageRange[] = [
  pipelineRange("7d", "Last 7 days", [1180, 790, 460, 250, 120, 40], 2.4),
  pipelineRange("30d", "Last 30 days", [4820, 3210, 1870, 960, 430, 150], 6.1),
  pipelineRange("90d", "Last 90 days", [13960, 8730, 5240, 2610, 1180, 390], -1.3),
];

/** The pill never shrinks below its icon, so the icon always sits on colour. */
const ICON_PILL_MIN = 20;
/** Mono parts step down in opacity so a stacked pill still reads as parts. */
const monoOpacity = (seriesIndex: number) => Math.max(0.4, 1 - seriesIndex * 0.25);
const pct = (value: number, of: number) => (of > 0 ? Math.round((value / of) * 100) : 0);
const partsOf = (stage: BarStage) => (stage.segments ?? []).filter((s) => s.value > 0);

type Series = { label: string; color: ChartColor };
type Target = { stage: number; segment: number | null };

function collectSeries(stages: readonly BarStage[]): Series[] {
  const series: Series[] = [];
  for (const stage of stages) {
    for (const part of partsOf(stage)) {
      if (!series.some((s) => s.label === part.label)) {
        series.push({ label: part.label, color: chartColorAt(series.length, part.color) });
      }
    }
  }
  return series;
}

type StageRowProps = {
  stage: BarStage;
  index: number;
  share: number;
  topLabel: string;
  topValue: number;
  series: readonly Series[];
  mono: boolean;
  showIcons: boolean;
  active: Target | null;
  pinned: boolean;
  formatValue: (value: number) => string;
  onTarget: (target: Target | null) => void;
  onTogglePin: () => void;
};

// #region critical
/**
 * One stage: a subgrid row of [name | pill on the track | value + share].
 * The pill's width is the tweened share of the top stage. Stacked, it is a
 * flex row of parts whose `flex-grow` is their value, so the parts always fill
 * exactly the pill and re-proportion with a CSS transition on a new period.
 */
function StageRow({
  stage,
  index,
  share,
  topLabel,
  topValue,
  series,
  mono,
  showIcons,
  active,
  pinned,
  formatValue,
  onTarget,
  onTogglePin,
}: StageRowProps) {
  const parts = series.length > 0 ? partsOf(stage) : [];
  const isActive = active?.stage === index;
  const activePart = isActive ? (active?.segment ?? null) : null;
  const color = CHART_COLORS[chartColorAt(index, stage.color)];
  const solid = mono ? (isActive ? "var(--color-text-primary)" : MONO_FILL) : isActive ? color.active : color.fill;
  const icon = showIcons && stage.icon ? stage.icon : null;
  const percent = pct(stage.value, topValue);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (parts.length === 0 || (event.key !== "ArrowRight" && event.key !== "ArrowLeft")) return;
    event.preventDefault();
    const last = parts.length - 1;
    // Right walks 0..last then back to the whole stage; Left walks the other way.
    const next =
      event.key === "ArrowRight"
        ? activePart === null ? 0 : activePart < last ? activePart + 1 : null
        : activePart === null ? last : activePart > 0 ? activePart - 1 : null;
    onTarget({ stage: index, segment: next });
  };

  const breakdown = parts.map((p) => `${p.label} ${formatValue(p.value)}`).join(", ");

  return (
    <button
      type="button"
      aria-pressed={pinned}
      aria-label={`${stage.label}: ${formatValue(stage.value)}, ${percent}% of ${topLabel}${breakdown ? `. ${breakdown}` : ""}`}
      aria-keyshortcuts={parts.length > 0 ? "ArrowLeft ArrowRight" : undefined}
      onPointerEnter={() => onTarget({ stage: index, segment: null })}
      onFocus={() => onTarget({ stage: index, segment: null })}
      onBlur={() => onTarget(null)}
      onClick={onTogglePin}
      onKeyDown={onKeyDown}
      className={cx(
        "col-span-3 grid cursor-pointer grid-cols-subgrid items-center rounded-md py-1 text-left outline-none",
        "transition-opacity duration-200 ease-out motion-reduce:transition-none",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        active !== null && !isActive && "opacity-40",
      )}
    >
      <span className="text-right text-body-regular whitespace-nowrap text-text-secondary">{stage.label}</span>
      <span className="relative h-5 min-w-0 rounded-full bg-chart-track">
        <span
          className="absolute inset-y-0 left-0 flex gap-0.5 overflow-hidden rounded-full"
          style={{
            width: `${Math.max(0, share) * 100}%`,
            minWidth: icon && stage.value > 0 ? ICON_PILL_MIN : undefined,
          }}
        >
          {parts.length > 0 ? (
            parts.map((part, partIndex) => {
              const seriesIndex = series.findIndex((s) => s.label === part.label);
              const tone = CHART_COLORS[series[seriesIndex]?.color ?? "lime"];
              const lit = activePart === partIndex;
              return (
                <span
                  key={part.label}
                  data-part={part.label}
                  onPointerEnter={() => onTarget({ stage: index, segment: partIndex })}
                  onPointerLeave={() => onTarget({ stage: index, segment: null })}
                  className="h-full min-w-0 basis-0 transition-[flex-grow,background-color,opacity] duration-300 ease-out motion-reduce:transition-none"
                  style={{
                    flexGrow: part.value,
                    backgroundColor: mono ? (lit ? "var(--color-text-primary)" : MONO_FILL) : lit ? tone.active : tone.fill,
                    opacity: activePart !== null && !lit ? 0.35 : mono ? monoOpacity(seriesIndex) : 1,
                  }}
                />
              );
            })
          ) : (
            <span
              className="h-full flex-1 transition-[background-color] duration-200 ease-out motion-reduce:transition-none"
              style={{ backgroundColor: solid }}
            />
          )}
        </span>
        {icon ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-[3px] flex size-3.5 -translate-y-1/2 items-center justify-center text-neutral-950"
          >
            {icon}
          </span>
        ) : null}
      </span>
      <span className="flex items-baseline justify-end gap-1.5 tabular-nums">
        <span className="text-body-medium text-text-primary">{formatValue(stage.value)}</span>
        <span className="min-w-[4ch] text-caption-1-regular text-text-tertiary">{percent}%</span>
      </span>
    </button>
  );
}
// #endregion

export type StageBarsCardProps = {
  /** Card label shown while nothing is hovered. */
  title?: string;
  /** Periods with their own stages; two or more show the period select. */
  ranges?: StageRange[];
  /** Plain stage list; when set it replaces `ranges` and the select is hidden. */
  stages?: BarStage[];
  /** Headline chip percentage when `stages` is used. */
  delta?: number;
  /** Controlled period id. */
  range?: string;
  /** Initial period id when uncontrolled; defaults to the first range. */
  defaultRange?: string;
  onRangeChange?: (id: string) => void;
  /** Split each pill into its stage's `segments`, with a legend. */
  stacked?: boolean;
  /** One ink for every pill instead of per-stage hues. */
  mono?: boolean;
  /** Draw each stage's icon inside its pill. */
  showIcons?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
};

export function StageBarsCard({
  title = "Pipeline",
  ranges = PIPELINE_RANGES,
  stages: stagesProp,
  delta: deltaProp,
  range: rangeProp,
  defaultRange,
  onRangeChange,
  stacked = false,
  mono = false,
  showIcons = true,
  formatValue = formatInt,
  className,
}: StageBarsCardProps) {
  const reduced = useReducedMotion();
  const [innerRange, setInnerRange] = useState(defaultRange ?? ranges[0]?.id ?? "");
  const rangeId = rangeProp ?? innerRange;
  const activeRange = ranges.find((r) => r.id === rangeId) ?? ranges[0];
  const stages = stagesProp ?? activeRange?.stages ?? [];
  const delta = stagesProp ? deltaProp : activeRange?.delta;

  const [hovered, setHovered] = useState<Target | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const raw = hovered ?? (pinned !== null ? { stage: pinned, segment: null } : null);
  const active = raw && raw.stage < stages.length ? raw : null;

  const top = stages[0];
  const topValue = top?.value ?? 0;
  // Shares are tweened from 0 on mount and from the old shares on a new period.
  const shares = useTweenedValues(
    stages.map((s) => (topValue > 0 ? Math.max(0, s.value) / topValue : 0)),
    { disabled: reduced },
  );
  const series = stacked ? collectSeries(stages) : [];

  const activeStage = active ? stages[active.stage] : undefined;
  const activePart = activeStage && active?.segment != null ? partsOf(activeStage)[active.segment] : undefined;
  const prevStage = active && active.stage > 0 ? stages[active.stage - 1] : undefined;

  let label: ReactNode = title;
  let value = (!stagesProp && activeRange?.headline) || topValue;
  let note: string | undefined;
  if (activeStage && activePart) {
    label = `${activeStage.label} · ${activePart.label}`;
    value = activePart.value;
    note = `${pct(activePart.value, activeStage.value)}% of ${activeStage.label}`;
  } else if (activeStage) {
    label = activeStage.label;
    value = activeStage.value;
    note = prevStage ? `${pct(activeStage.value, prevStage.value)}% of ${prevStage.label}` : "Top of funnel";
  }

  const selectRange = (id: string) => {
    if (rangeProp === undefined) setInnerRange(id);
    setPinned(null);
    onRangeChange?.(id);
  };

  return (
    <ChartCardFrame className={className} aria-label={title}>
      <ChartCardHeader
        label={label}
        value={value}
        formatValue={formatValue}
        valueKey={active ? `${active.stage}-${active.segment ?? "all"}` : "total"}
        delta={activeStage ? undefined : delta}
        note={note}
        action={
          !stagesProp && ranges.length > 1 ? (
            <PeriodSelect options={ranges} selectedId={activeRange?.id ?? ""} onChange={selectRange} />
          ) : undefined
        }
      />

      <div
        role="group"
        aria-label={`${title} stages`}
        className="grid grid-cols-[max-content_minmax(0,1fr)_max-content] gap-x-3 gap-y-1 px-2"
        onPointerLeave={() => setHovered(null)}
      >
        {stages.map((stage, index) => (
          <StageRow
            key={`${stage.label}-${index}`}
            stage={stage}
            index={index}
            share={shares[index] ?? 0}
            topLabel={top?.label ?? "top"}
            topValue={topValue}
            series={series}
            mono={mono}
            showIcons={showIcons}
            active={active}
            pinned={pinned === index}
            formatValue={formatValue}
            onTarget={setHovered}
            onTogglePin={() => setPinned((p) => (p === index ? null : index))}
          />
        ))}
      </div>

      {series.length > 0 ? (
        <ul
          aria-label="Breakdown"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 text-caption-1-regular text-text-secondary"
        >
          {series.map((s, si) => (
            <li key={s.label} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={cx("size-2 shrink-0 rounded-[3px]", mono ? "bg-text-secondary" : CHART_COLORS[s.color].swatch)}
                style={mono ? { opacity: monoOpacity(si) } : undefined}
              />
              {s.label}
            </li>
          ))}
        </ul>
      ) : null}

      <StatTiles
        columns={3}
        activeIndex={active?.stage ?? null}
        onActiveChange={(index) => setHovered(index === null ? null : { stage: index, segment: null })}
        items={stages.map((stage, index) => ({
          id: `${stage.label}-${index}`,
          label: stage.label,
          value: formatValue(stage.value),
          // Stacked pills are coloured by part, so stage swatches would mislead.
          color: mono || series.length > 0 ? null : chartColorAt(index, stage.color),
        }))}
      />
    </ChartCardFrame>
  );
}
