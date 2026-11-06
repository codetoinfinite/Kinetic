/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Accent Swatch Picker" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import type { CSSProperties, ReactNode } from "react";
import { Radio, RadioGroup } from "react-aria-components";
import { cx } from "@/registry/lib/cx";

/**
 * Accent Swatch Picker — a row of glossy colour spheres that works as one
 * radio group (Tab in, arrow keys move and select), plus `AccentScope`, the
 * wrapper that turns the chosen colour into the kit's accent.
 *
 *   const [id, setId] = useState("violet");
 *   const swatch = findAccentSwatch(id);
 *   <AccentScope color={swatch.color}>
 *     <AccentSwatchPicker value={id} onChange={setId} />
 *     <Button>Get the component</Button>   // re-tinted
 *   </AccentScope>
 *
 * AccentScope writes ONE custom property, `--accent`, on its element and
 * derives the whole `--color-accent-50…950` ramp from it with color-mix. The
 * kit's semantic tokens that read the ramp (primary-button gradient, focus
 * ring, switch chip, ghost button, NEW badge) are resolved at :root, so the
 * scope re-declares them too — otherwise they would keep the root blue.
 */

export interface AccentSwatch {
  id: string;
  /** Accessible name of the swatch, e.g. "Violet". */
  label: string;
  /** Any CSS colour; becomes `--accent` (and the sphere's base tint). */
  color: string;
  /** Optional CSS background for the sphere, e.g. an iridescent conic gradient. */
  fill?: string;
}

export type AccentSwatchSize = "sm" | "md" | "lg";

export interface AccentSwatchPickerProps {
  swatches?: AccentSwatch[];
  /** Controlled selected id. */
  value?: string;
  /** Initial id when uncontrolled. Default: the first swatch. */
  defaultValue?: string;
  onChange?: (id: string) => void;
  /** Sphere size: sm 24px, md 36px, lg 36px → 48px from the sm breakpoint. */
  size?: AccentSwatchSize;
  /** `pill` sits the row on a floating rounded surface. */
  variant?: "plain" | "pill";
  /** The radio group's accessible name. */
  label?: string;
  isDisabled?: boolean;
  className?: string;
}

/** Sphere base colours are kit palette variables, so they follow the theme file. */
export const DEFAULT_ACCENT_SWATCHES: AccentSwatch[] = [
  {
    id: "iridescent",
    label: "Iridescent",
    color: "var(--color-teal-500)",
    fill: "conic-gradient(from 200deg, var(--color-cyan-400), var(--color-violet-500), var(--color-pink-500), var(--color-amber-500), var(--color-green-500), var(--color-cyan-400))",
  },
  { id: "blue", label: "Blue", color: "var(--color-blue-500)" },
  { id: "violet", label: "Violet", color: "var(--color-violet-500)" },
  { id: "pink", label: "Pink", color: "var(--color-pink-500)" },
  { id: "red", label: "Red", color: "var(--color-red-500)" },
  { id: "green", label: "Green", color: "var(--color-green-500)" },
  { id: "orange", label: "Orange", color: "var(--color-orange-500)" },
];

export function findAccentSwatch(id: string, swatches: AccentSwatch[] = DEFAULT_ACCENT_SWATCHES): AccentSwatch {
  return swatches.find((s) => s.id === id) ?? swatches[0] ?? DEFAULT_ACCENT_SWATCHES[1]!;
}

const SPHERE: Record<AccentSwatchSize, string> = {
  sm: "size-6",
  md: "size-9",
  lg: "size-9 sm:size-12",
};
const GAP: Record<AccentSwatchSize, string> = {
  sm: "gap-1.5",
  md: "gap-2.5",
  lg: "gap-2 sm:gap-3",
};

// #region critical
/**
 * The ramp: 50–400 mix the accent toward white, 600–950 toward black, 500 is
 * the accent itself. Then every semantic token that reads the ramp is
 * re-declared here so it resolves against the scoped ramp (dark mode keeps
 * the kit's own dark mapping for the ghost button and NEW badge).
 */
export const accentScopeClassName = [
  "[--color-accent-50:color-mix(in_oklab,var(--accent)_8%,white)]",
  "[--color-accent-100:color-mix(in_oklab,var(--accent)_16%,white)]",
  "[--color-accent-200:color-mix(in_oklab,var(--accent)_32%,white)]",
  "[--color-accent-300:color-mix(in_oklab,var(--accent)_52%,white)]",
  "[--color-accent-400:color-mix(in_oklab,var(--accent)_78%,white)]",
  "[--color-accent-500:var(--accent)]",
  "[--color-accent-600:color-mix(in_oklab,var(--accent)_86%,black)]",
  "[--color-accent-700:color-mix(in_oklab,var(--accent)_70%,black)]",
  "[--color-accent-800:color-mix(in_oklab,var(--accent)_56%,black)]",
  "[--color-accent-900:color-mix(in_oklab,var(--accent)_42%,black)]",
  "[--color-accent-950:color-mix(in_oklab,var(--accent)_28%,black)]",
  "[--color-border-focus-ring:var(--color-accent-500)]",
  "[--gradient-button-primary-default:linear-gradient(180deg,var(--color-accent-500)_0%,var(--color-accent-600)_100%)]",
  "[--gradient-button-primary-hover:linear-gradient(180deg,var(--color-accent-400)_0%,var(--color-accent-500)_100%)]",
  "[--gradient-button-primary-active:linear-gradient(180deg,var(--color-accent-600)_0%,var(--color-accent-700)_100%)]",
  "[--color-switch-on-chip-start:color-mix(in_oklab,var(--color-accent-500)_63%,var(--color-accent-600))]",
  "[--color-switch-on-chip-end:color-mix(in_oklab,var(--color-accent-600)_16%,var(--color-accent-700))]",
  "[--color-button-ghost-background:var(--color-accent-100)] dark:[--color-button-ghost-background:var(--color-accent-900)]",
  "[--color-button-ghost-hover:var(--color-accent-200)] dark:[--color-button-ghost-hover:var(--color-accent-800)]",
  "[--color-button-ghost-active:var(--color-accent-300)] dark:[--color-button-ghost-active:var(--color-accent-700)]",
  "[--color-button-ghost-foreground:var(--color-accent-700)] dark:[--color-button-ghost-foreground:var(--color-accent-300)]",
  "[--color-badge-new-background:var(--color-accent-100)] dark:[--color-badge-new-background:color-mix(in_srgb,var(--color-accent-950)_50%,transparent)]",
  "[--color-badge-new-text:var(--color-accent-600)] dark:[--color-badge-new-text:var(--color-accent-400)]",
].join(" ");

export interface AccentScopeProps {
  /** Any CSS colour: a palette variable, hex, oklch()… */
  color: string;
  children?: ReactNode;
  className?: string;
}

/** Re-tints every kit control inside it from one `--accent` value. */
export function AccentScope({ color, children, className }: AccentScopeProps) {
  return (
    <div style={{ "--accent": color } as CSSProperties} className={cx(accentScopeClassName, className)}>
      {children}
    </div>
  );
}

/** Glossy sphere: a light spot up-left, the colour, a darker rim. */
function sphereBackground(s: AccentSwatch) {
  const gloss =
    "radial-gradient(circle at 32% 26%, color-mix(in oklab, white 85%, transparent) 0%, color-mix(in oklab, white 0%, transparent) 42%)";
  if (s.fill) return `${gloss}, ${s.fill}`;
  return `${gloss}, radial-gradient(circle at 40% 35%, color-mix(in oklab, var(--swatch) 70%, white) 0%, var(--swatch) 52%, color-mix(in oklab, var(--swatch) 72%, black) 100%)`;
}

export function AccentSwatchPicker({
  swatches = DEFAULT_ACCENT_SWATCHES,
  value,
  defaultValue,
  onChange,
  size = "md",
  variant = "plain",
  label = "Accent colour",
  isDisabled,
  className,
}: AccentSwatchPickerProps) {
  return (
    <RadioGroup
      aria-label={label}
      orientation="horizontal"
      value={value}
      defaultValue={value === undefined ? (defaultValue ?? swatches[0]?.id) : undefined}
      onChange={onChange}
      isDisabled={isDisabled}
      className={cx(
        "flex w-fit flex-wrap items-center justify-center",
        GAP[size],
        variant === "pill" &&
          "rounded-full border border-border-button-default bg-background-primary-default p-1.5 shadow-md",
        className,
      )}
    >
      {swatches.map((s) => (
        <Radio
          key={s.id}
          value={s.id}
          aria-label={s.label}
          style={{ "--swatch": s.color } as CSSProperties}
          className={cx(
            "group relative shrink-0 cursor-pointer rounded-full outline-none",
            "data-disabled:cursor-not-allowed data-disabled:opacity-50",
          )}
        >
          <span
            aria-hidden
            style={{ background: sphereBackground(s) }}
            className={cx(
              "block rounded-full",
              SPHERE[size],
              "shadow-[inset_0_-2px_4px_color-mix(in_oklab,var(--swatch)_55%,black),0_1px_2px_color-mix(in_oklab,var(--swatch)_30%,transparent)]",
              "outline-2 outline-offset-2 outline-transparent",
              "transition-[scale,outline-color] duration-150 ease-out motion-reduce:transition-none",
              "group-data-hovered:scale-105 group-data-pressed:scale-95",
              "group-data-selected:outline-(--swatch)",
              "group-data-focus-visible:outline-text-primary",
              size === "sm" && "outline-offset-1",
            )}
          />
        </Radio>
      ))}
    </RadioGroup>
  );
}
// #endregion
