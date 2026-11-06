/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Site Footer" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { cx } from "@/registry/lib/cx";

/**
 * Accent swatches: the row of glossy colour dots in the footer's bottom bar.
 * A single-choice radio group with a roving tab stop: Tab enters on the
 * checked dot, arrow keys move and select, Home/End jump to the ends.
 * Each dot is SVG artwork (a radial highlight over a two-stop gradient), so
 * the colours are literal and look the same in both themes.
 */

export interface AccentSwatch {
  id: string;
  label: string;
  /** Gradient stops for the SVG artwork, light to dark. Three or more stops read as a multi-colour swatch. */
  stops: readonly string[];
}

export const ACCENT_SWATCHES: readonly AccentSwatch[] = [
  { id: "blue", label: "Blue", stops: ["#5b8cff", "#1f4fd8"] },
  { id: "violet", label: "Violet", stops: ["#9a7bff", "#5a2fd6"] },
  { id: "pink", label: "Pink", stops: ["#f36fb0", "#c42a7c"] },
  { id: "red", label: "Red", stops: ["#f26464", "#c22626"] },
  { id: "orange", label: "Orange", stops: ["#f7b24f", "#dd7c12"] },
  { id: "green", label: "Green", stops: ["#5cc68a", "#1f8a50"] },
  { id: "spectrum", label: "Spectrum", stops: ["#ffb3c7", "#ffd59a", "#a6f0c6", "#9cc8ff", "#d2a8ff"] },
];

export interface AccentSwatchesProps {
  swatches?: readonly AccentSwatch[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string, swatch: AccentSwatch) => void;
  "aria-label"?: string;
  className?: string;
}

function SwatchDot({ swatch, uid }: { swatch: AccentSwatch; uid: string }) {
  const fill = `${uid}-${swatch.id}-fill`;
  const shine = `${uid}-${swatch.id}-shine`;
  const n = swatch.stops.length;
  return (
    <svg viewBox="0 0 24 24" className="size-full" aria-hidden>
      <defs>
        <linearGradient id={fill} x1="0" y1="0" x2="1" y2="1">
          {swatch.stops.map((stop, i) => (
            <stop key={stop + i} offset={n === 1 ? 0 : i / (n - 1)} stopColor={stop} />
          ))}
        </linearGradient>
        <radialGradient id={shine} cx="0.35" cy="0.3" r="0.55">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill={`url(#${fill})`} />
      <circle cx="12" cy="12" r="12" fill={`url(#${shine})`} />
      <circle cx="12" cy="12" r="11.5" fill="none" stroke="#000000" strokeOpacity="0.12" />
    </svg>
  );
}

// #region critical
export function AccentSwatches({
  swatches = ACCENT_SWATCHES,
  value,
  defaultValue,
  onChange,
  "aria-label": ariaLabel = "Accent colour",
  className,
}: AccentSwatchesProps) {
  const uid = useId().replace(/:/g, "");
  const [inner, setInner] = useState(() => defaultValue ?? swatches[0]?.id ?? "");
  const current = value ?? inner;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const checkedIndex = Math.max(
    0,
    swatches.findIndex((s) => s.id === current),
  );

  const select = (index: number, focus: boolean) => {
    const swatch = swatches[index];
    if (!swatch) return;
    if (focus) refs.current[index]?.focus();
    if (swatch.id === current) return;
    if (value === undefined) setInner(swatch.id);
    onChange?.(swatch.id, swatch);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = swatches.length - 1;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const step: Record<string, number> = {
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
      ArrowDown: 1,
      ArrowUp: -1,
    };
    let next: number | null = null;
    if (event.key in step) next = (checkedIndex + (step[event.key] ?? 0) + swatches.length) % swatches.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    select(next, true);
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border border-border-button-default bg-background-primary-default p-1.5 shadow-xs",
        className,
      )}
    >
      {swatches.map((swatch, i) => {
        const checked = i === checkedIndex;
        return (
          <button
            key={swatch.id}
            ref={(node) => {
              refs.current[i] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={swatch.label}
            tabIndex={checked ? 0 : -1}
            onClick={() => select(i, false)}
            className={cx(
              "relative size-6 shrink-0 cursor-pointer rounded-full outline-none",
              "transition-transform duration-150 ease-out hover:scale-110 motion-reduce:transition-none motion-reduce:hover:scale-100",
              "focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary-default",
              checked && "ring-2 ring-foreground-icon-primary ring-offset-1 ring-offset-background-primary-default",
            )}
          >
            <SwatchDot swatch={swatch} uid={uid} />
          </button>
        );
      })}
    </div>
  );
}
// #endregion
