/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Activity Rings Card" (boardui.com/components/activity-rings-card).
 * No BoardUI source was used.
 */
"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";

import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { cx } from "@/registry/lib/cx";

export type ActivityRing = {
  id: string;
  label: string;
  /** Progress so far, in the same unit as `goal`. */
  value: number;
  goal: number;
  /** Text for the tile, e.g. "1,592 kcal". Defaults to the rounded value. */
  display?: string;
  /** Any CSS colour; the track is this colour mixed into the chart track. */
  color: string;
};

export const ACTIVITY_RINGS: ActivityRing[] = [
  { id: "move", label: "Move", value: 1592, goal: 1800, display: "1,592 kcal", color: "var(--color-chart-3)" },
  { id: "exercise", label: "Exercise", value: 105, goal: 130, display: "1h 45m", color: "var(--color-chart-2)" },
  { id: "running", label: "Running", value: 5.2, goal: 6.8, display: "5.2 km", color: "var(--color-chart-4)" },
];

const SIZE = 184;
const STROKE = 18;
const RING_GAP = 4;
const STAGGER_MS = 140;

export interface ActivityRingsCardProps {
  title?: string;
  /** Optional right-hand caption, such as the day on show. */
  caption?: string;
  /** Outermost ring first. Three rings fit the default size; more get thinner bands. */
  rings?: ActivityRing[];
  /** Diameter of the ring stack in px. */
  size?: number;
  /** Controlled focused ring id (hover or keyboard preview still wins while it lasts). */
  focused?: string | null;
  onFocusedChange?: (id: string | null) => void;
  className?: string;
}

export function ActivityRingsCard({
  title = "Activity",
  caption,
  rings = ACTIVITY_RINGS,
  size = SIZE,
  focused: focusedProp,
  onFocusedChange,
  className,
}: ActivityRingsCardProps) {
  const labelId = useId();
  const reduced = useReducedMotion();
  const [drawn, setDrawn] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const selected = focusedProp !== undefined ? focusedProp : pinned;
  const active = preview ?? selected;

  // Two frames after mount the rings switch to their real offsets, so the CSS transition draws them in.
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setDrawn(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  // #region critical
  // Each ring is a circle with pathLength 100, so a dash of p units is p percent of the lap.
  // The outer radius leaves half a stroke of room; each inner ring steps in by one band plus the gap.
  const stroke = rings.length > 3 ? Math.max(8, (size / 2 - 20) / rings.length - RING_GAP) : (STROKE * size) / SIZE;
  const geometry = rings.map((ring, i) => {
    const r = size / 2 - stroke / 2 - i * (stroke + RING_GAP);
    const pct = ring.goal > 0 ? (ring.value / ring.goal) * 100 : 0;
    const shown = drawn || reduced ? Math.min(100, Math.max(0, pct)) : 0;
    return { ring, r, pct, offset: 100 - shown, delay: i * STAGGER_MS };
  });
  // #endregion

  const toggle = (id: string) => {
    const next = selected === id ? null : id;
    setPinned(next);
    onFocusedChange?.(next);
  };
  const activeRing = geometry.find((g) => g.ring.id === active);
  const center = size / 2;

  return (
    <section
      aria-labelledby={labelId}
      className={cx("@container flex w-full min-w-0 flex-col gap-3 rounded-2xl bg-background-secondary-default p-2", className)}
    >
      <div className="flex items-baseline justify-between gap-3 px-2 pt-2">
        <p id={labelId} className="text-body-medium text-text-secondary">
          {title}
        </p>
        {caption && <p className="truncate text-body-medium text-text-tertiary">{caption}</p>}
      </div>

      <ul className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${rings.length}, minmax(0, 1fr))` }}>
        {rings.map((ring) => {
          const on = active === ring.id;
          return (
            <li key={ring.id} className="min-w-0">
              <button
                type="button"
                data-ring-tile={ring.id}
                aria-pressed={selected === ring.id}
                onClick={() => toggle(ring.id)}
                onMouseEnter={() => setPreview(ring.id)}
                onMouseLeave={() => setPreview(null)}
                onFocus={() => setPreview(ring.id)}
                onBlur={() => setPreview(null)}
                className={cx(
                  "flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-xl bg-background-primary-default px-2.5 py-2 text-left @max-sm:px-2 outline-none transition-opacity duration-200 ease-out focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none",
                  active && !on && "opacity-50",
                )}
              >
                <span className="flex min-w-0 items-center gap-1.5 text-body-medium text-text-secondary">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: ring.color }} />
                  <span className="truncate">{ring.label}</span>
                </span>
                <span className="w-full truncate text-body-medium text-text-primary tabular-nums @max-sm:text-body-2-medium">
                  {ring.display ?? Math.round(ring.value).toLocaleString("en-US")}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="relative mx-auto my-3" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          role="img"
          aria-label={geometry.map((g) => `${g.ring.label} ${Math.round(g.pct)}% of goal`).join(", ")}
          onMouseLeave={() => setPreview(null)}
          className="block overflow-visible"
        >
          {geometry.map(({ ring, r, offset, delay }) => {
            const dim = active !== null && active !== ring.id;
            const style: CSSProperties = { transitionDelay: drawn && !reduced ? `${delay}ms` : "0ms" };
            return (
              <g
                key={ring.id}
                data-ring={ring.id}
                onMouseEnter={() => setPreview(ring.id)}
                className={cx("transition-opacity duration-200 ease-out motion-reduce:transition-none", dim && "opacity-30")}
                transform={`rotate(-90 ${center} ${center})`}
              >
                <circle
                  cx={center}
                  cy={center}
                  r={r}
                  fill="none"
                  pointerEvents="stroke"
                  strokeWidth={stroke}
                  style={{ stroke: `color-mix(in oklab, ${ring.color} 22%, var(--color-chart-track))` }}
                />
                <circle
                  cx={center}
                  cy={center}
                  r={r}
                  fill="none"
                  pathLength={100}
                  strokeDasharray="100 100"
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  strokeWidth={stroke}
                  pointerEvents="stroke"
                  data-progress={ring.id}
                  className="transition-[stroke-dashoffset] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                  style={{ ...style, stroke: ring.color }}
                />
              </g>
            );
          })}
        </svg>

        {/* Centre readout for the focused ring */}
        <div
          aria-live="polite"
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
        >
          {activeRing && (
            <span
              key={activeRing.ring.id}
              data-center
              className="flex animate-number-fade flex-col items-center motion-reduce:animate-none"
            >
              <span className="text-body-medium text-text-primary tabular-nums">{Math.round(activeRing.pct)}%</span>
              <span className="text-caption-1-regular text-text-secondary">{activeRing.ring.label}</span>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
