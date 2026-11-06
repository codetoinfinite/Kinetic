/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Floating Stickers" (boardui.com/).
 * No BoardUI source was used.
 */
"use client";

import { useId } from "react";
import type { ReactNode } from "react";

/**
 * Sticker artwork: five die-cut characters drawn as SVG on a 100x100 grid.
 * Each shape is painted twice: first with a thick white stroke (the paper
 * border a die-cut sticker has), then with its gradient fill. The colours are
 * artwork, not theme tokens, so a sticker reads the same in light and dark.
 */

export type StickerKind = "blob" | "star" | "cloud" | "heart" | "chart";

export const STICKER_KINDS: readonly StickerKind[] = ["blob", "star", "cloud", "heart", "chart"];

const INK = "#1d2633";
const CUT = "#ffffff";

const STAR_POINTS = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 === 0 ? 40 : 19;
  const a = -Math.PI / 2 + (i * Math.PI) / 5;
  return `${(50 + r * Math.cos(a)).toFixed(1)},${(55 + r * Math.sin(a)).toFixed(1)}`;
}).join(" ");

const SHAPES: Record<Exclude<StickerKind, "star" | "chart">, string> = {
  blob: "M20 34C22 20 38 14 56 16C74 18 86 26 85 44C84 60 87 76 70 82C52 88 30 87 19 79C11 72 17 50 20 34Z",
  cloud:
    "M28 72C17 72 10 64 11 55C12 46 20 41 28 42C29 30 39 22 51 23C62 24 69 31 71 40C80 39 89 46 89 56C89 65 82 72 73 72Z",
  heart:
    "M50 84C38 74 14 60 14 38C14 26 23 18 34 18C42 18 47 23 50 28C53 23 58 18 66 18C77 18 86 26 86 38C86 60 62 74 50 84Z",
};

const STOPS: Record<StickerKind, readonly [string, string]> = {
  blob: ["#a4ebe6", "#45b9b4"],
  star: ["#ffe98e", "#f4c033"],
  cloud: ["#f6f9ff", "#bfd6ff"],
  heart: ["#ffa3c8", "#ec4c8a"],
  chart: ["#ffffff", "#e6ecfa"],
};

function Face({ kind }: { kind: StickerKind }): ReactNode {
  switch (kind) {
    case "blob":
      return (
        <>
          <ellipse cx="42" cy="51" rx="5" ry="8.5" fill={INK} />
          <ellipse cx="62" cy="50" rx="5" ry="8.5" fill={INK} />
          <circle cx="43.6" cy="46.5" r="1.7" fill={CUT} />
          <circle cx="63.6" cy="45.5" r="1.7" fill={CUT} />
        </>
      );
    case "star":
      return (
        <>
          <path d="M39 59q4.5 -4.5 9 0M53 59q4.5 -4.5 9 0" fill="none" stroke="#4a3a12" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="37" cy="66" r="3.6" fill="#ff8f7e" fillOpacity="0.55" />
          <circle cx="64" cy="66" r="3.6" fill="#ff8f7e" fillOpacity="0.55" />
        </>
      );
    case "cloud":
      return (
        <>
          <circle cx="42" cy="53" r="3.3" fill={INK} />
          <circle cx="60" cy="53" r="3.3" fill={INK} />
          <path d="M46 60q5 4.5 10 0" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        </>
      );
    case "heart":
      return (
        <>
          <ellipse cx="40" cy="44" rx="3.8" ry="5.2" fill="#2a1220" />
          <ellipse cx="60" cy="44" rx="3.8" ry="5.2" fill="#2a1220" />
          <path d="M45.5 54q4.5 3.5 9 0" fill="none" stroke="#2a1220" strokeWidth="2.6" strokeLinecap="round" />
        </>
      );
    case "chart":
      return (
        <>
          <rect x="29" y="52" width="10" height="21" rx="3" fill="#5b8cff" />
          <rect x="45" y="39" width="10" height="34" rx="3" fill="#9a7bff" />
          <rect x="61" y="28" width="10" height="45" rx="3" fill="#45b9b4" />
        </>
      );
  }
}

/** One sticker character, filling its box. Decorative: the parent names it. */
export function StickerArtwork({ kind, className }: { kind: StickerKind; className?: string }) {
  const fill = `sticker-${useId().replace(/:/g, "")}`;
  const [from, to] = STOPS[kind];
  const shape = (paint: { fill: string; stroke: string; strokeWidth: number }) => {
    const common = { ...paint, strokeLinejoin: "round" as const };
    if (kind === "star") return <polygon points={STAR_POINTS} {...common} />;
    if (kind === "chart") return <rect x="14" y="14" width="72" height="72" rx="20" {...common} />;
    return <path d={SHAPES[kind]} {...common} />;
  };

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={fill} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      {shape({ fill: CUT, stroke: CUT, strokeWidth: 12 })}
      {shape({ fill: `url(#${fill})`, stroke: kind === "star" ? `url(#${fill})` : "none", strokeWidth: kind === "star" ? 6 : 0 })}
      {kind === "chart" || kind === "cloud" ? (
        <g strokeOpacity="0.1">{shape({ fill: "none", stroke: INK, strokeWidth: 1 })}</g>
      ) : null}
      <Face kind={kind} />
    </svg>
  );
}
