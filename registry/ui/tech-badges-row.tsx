/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Tech Badges Row" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { Focusable } from "react-aria-components";
import { cx } from "@/registry/lib/cx";
import { Tooltip, TooltipTrigger } from "@/registry/ui/tooltip";

/**
 * Tech Badges Row — the "built with" strip under a hero: a small glyph, the
 * name and a version per technology, separated by dots. Each badge lifts on
 * hover or keyboard focus and names itself in a tooltip.
 *
 *   <TechBadgesRow />                       // Next.js, React, Tailwind CSS…
 *   <TechBadgesRow variant="icon" />        // glyph tiles only, names in tooltips
 *
 * Glyphs are plain monogram tiles drawn inline (a rounded square and one or
 * two letters), not brand marks, so any technology can be added with a
 * `monogram` and a `tone`.
 */

export interface TechBadge {
  id: string;
  /** Display and accessible name, e.g. "Tailwind CSS". */
  name: string;
  /** Shown after the name as "v19.2". */
  version?: string;
  /** One or two letters drawn on the glyph tile. */
  monogram: string;
  /** Tile colour (any CSS colour; the glyph is SVG artwork). */
  tone: string;
  /** Second line of the tooltip, e.g. "UI runtime". */
  description?: string;
}

export interface TechBadgesRowProps {
  badges?: TechBadge[];
  /** `label` shows glyph + name + version; `icon` shows glyph tiles only. */
  variant?: "label" | "icon";
  /** Accessible name of the list. */
  label?: string;
  className?: string;
}

export const DEFAULT_TECH_BADGES: TechBadge[] = [
  { id: "next", name: "Next.js", version: "16", monogram: "N", tone: "#18181b", description: "App framework" },
  { id: "react", name: "React", version: "19.2", monogram: "R", tone: "#0891b2", description: "UI runtime" },
  { id: "tailwind", name: "Tailwind CSS", version: "4", monogram: "Tw", tone: "#0284c7", description: "Utility-first styles" },
  { id: "typescript", name: "TypeScript", version: "5.9", monogram: "TS", tone: "#2563eb", description: "Typed JavaScript" },
  { id: "motion", name: "Motion", version: "12", monogram: "M", tone: "#d97706", description: "Animation library" },
  { id: "react-aria", name: "React Aria", version: "1.17", monogram: "Ra", tone: "#7c3aed", description: "Accessible primitives" },
];

// #region critical
/** A rounded tile with a 1px inner highlight and the monogram centred on it. */
function MonogramGlyph({ monogram, tone, className }: { monogram: string; tone: string; className?: string }) {
  const small = monogram.length > 1;
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={cx("shrink-0", className)}>
      <rect width="20" height="20" rx="5.5" fill={tone} />
      <rect x="0.5" y="0.5" width="19" height="19" rx="5" fill="none" stroke="#ffffff" strokeOpacity="0.18" />
      <text
        x="10"
        y="10"
        dy="0.36em"
        textAnchor="middle"
        fill="#ffffff"
        fontSize={small ? 8.5 : 11}
        fontWeight={700}
        letterSpacing={small ? -0.3 : 0}
        style={{ fontFamily: "inherit" }}
      >
        {monogram}
      </text>
    </svg>
  );
}

/*
 * The lift: on hover or focus-visible the badge rises 2px (4px for icon
 * tiles) and picks up a surface, border and shadow, over 200ms ease-out.
 * Under reduced motion the surface still appears but nothing moves.
 */
const LIFT =
  "transition-[translate,background-color,border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none " +
  "hover:shadow-md hover:bg-background-primary-default hover:border-border-button-default " +
  "focus-visible:shadow-md focus-visible:bg-background-primary-default focus-visible:border-border-button-default " +
  "outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring";

function Badge({ badge, variant }: { badge: TechBadge; variant: "label" | "icon" }) {
  const full = badge.version ? `${badge.name} ${badge.version}` : badge.name;
  return (
    <TooltipTrigger>
      <Focusable>
        <span
          role="img"
          aria-label={full}
          className={cx(
            "inline-flex cursor-default items-center border select-none",
            LIFT,
            variant === "label"
              ? "gap-1.5 rounded-full border-transparent px-2.5 py-1 hover:-translate-y-0.5 focus-visible:-translate-y-0.5 motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0"
              : "size-10 justify-center rounded-xl border-border-button-default bg-background-primary-default shadow-xs hover:-translate-y-1 focus-visible:-translate-y-1 motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0",
          )}
        >
          <MonogramGlyph monogram={badge.monogram} tone={badge.tone} className={variant === "label" ? "size-4" : "size-5"} />
          {variant === "label" && (
            <>
              <span className="text-body-2-medium whitespace-nowrap text-text-primary">{badge.name}</span>
              {badge.version && (
                <span className="text-caption-1-regular whitespace-nowrap text-text-tertiary">v{badge.version}</span>
              )}
            </>
          )}
        </span>
      </Focusable>
      <Tooltip placement="top" offset={8}>
        <span className="text-caption-1-semibold">{full}</span>
        {badge.description && <span className="block text-caption-2-regular text-text-secondary">{badge.description}</span>}
      </Tooltip>
    </TooltipTrigger>
  );
}

export function TechBadgesRow({
  badges = DEFAULT_TECH_BADGES,
  variant = "label",
  label = "Built with",
  className,
}: TechBadgesRowProps) {
  return (
    <ul
      aria-label={label}
      className={cx(
        "flex flex-wrap items-center justify-center",
        variant === "label" ? "gap-x-1 gap-y-2" : "gap-2",
        className,
      )}
    >
      {badges.map((b, i) => (
        <li key={b.id} className="flex items-center gap-1">
          {variant === "label" && i > 0 && (
            <span aria-hidden className="hidden px-1 text-text-disabled sm:inline">
              ·
            </span>
          )}
          <Badge badge={b} variant={variant} />
        </li>
      ))}
    </ul>
  );
}
// #endregion
