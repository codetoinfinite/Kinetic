/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Image Gallery Masonry" (boardui.com/templates/ai-image-generation).
 * No BoardUI source was used.
 */
"use client";

import { useId } from "react";

import { cx } from "@/registry/lib/cx";

/**
 * Stand-in "generated images" for the masonry gallery: twelve small flat
 * illustrations drawn inline in SVG, so the gallery, its lightbox and the
 * demos never touch the network. Each one is drawn on a 100 × 100 canvas
 * with its subject kept near the middle, because the tiles crop it to
 * different aspect ratios with `xMidYMid slice`.
 */

export type GalleryArtKind =
  | "ape"
  | "crown"
  | "ronin"
  | "bloom"
  | "branch"
  | "perfume"
  | "cat"
  | "cabs"
  | "beach"
  | "highway"
  | "goldfish"
  | "hanok";

export interface GalleryItem {
  id: string;
  /** Subject, e.g. "Green ape". */
  title: string;
  /** Style note, e.g. "screenprint halftone". */
  style: string;
  /** CSS aspect-ratio of the tile, e.g. "3 / 4". */
  ratio: string;
  kind: GalleryArtKind;
  /** Background, mid, accent, ink. */
  palette: readonly [string, string, string, string];
  /** Lays a dot screen over the picture. */
  halftone?: boolean;
  /** False while the file is not ready; the download action stays inert. */
  downloadable?: boolean;
}

export const GALLERY_ITEMS: GalleryItem[] = [
  { id: "ape", title: "Green ape", style: "screenprint halftone", ratio: "4 / 5", kind: "ape", palette: ["#dbe8c6", "#4f7a3a", "#f1cf5f", "#1f2a1c"], halftone: true },
  { id: "crown", title: "Cloud crown", style: "editorial portrait", ratio: "3 / 4", kind: "crown", palette: ["#cdd8e8", "#e2bd9f", "#ffffff", "#2a3550"] },
  { id: "cat", title: "Cat with a beer", style: "bold linework", ratio: "1 / 1", kind: "cat", palette: ["#f5cf48", "#ffffff", "#e0782f", "#141414"] },
  { id: "hanok", title: "Hanok bookshop", style: "pastel duotone", ratio: "4 / 3", kind: "hanok", palette: ["#f6d7dd", "#9cc3d1", "#ffffff", "#56698a"] },
  { id: "ronin", title: "Ronin in red", style: "cel-shaded", ratio: "2 / 3", kind: "ronin", palette: ["#f4e7d7", "#c8312b", "#f3b13c", "#1c1a1a"] },
  { id: "bloom", title: "Bloom swirl", style: "impasto abstraction", ratio: "1 / 1", kind: "bloom", palette: ["#2b1d3a", "#e9668b", "#f6c453", "#7cc4b8"] },
  { id: "hoopoes", title: "Hoopoes in olive branches", style: "gouache", ratio: "3 / 4", kind: "branch", palette: ["#efe6cf", "#6f7d4a", "#d98b4a", "#2e2a24"] },
  { id: "beach", title: "Beach kid", style: "35mm flash", ratio: "4 / 5", kind: "beach", palette: ["#93d3e6", "#f2d7a6", "#ff7a59", "#1f5f8b"] },
  { id: "highway", title: "Underwater highway", style: "flat vector", ratio: "4 / 3", kind: "highway", palette: ["#0f4c75", "#3282b8", "#bbe1fa", "#16222b"], downloadable: false },
  { id: "perfume", title: "Perfume still life", style: "grainy neon", ratio: "3 / 4", kind: "perfume", palette: ["#1b1530", "#ff4fa3", "#53e0ff", "#f2eaff"], halftone: true },
  { id: "cabs", title: "Yellow cabs", style: "palette-knife oil", ratio: "1 / 1", kind: "cabs", palette: ["#a3b6ca", "#5d6b7a", "#f2c230", "#2a2f36"] },
  { id: "goldfish", title: "Goldfish living room", style: "surreal collage", ratio: "4 / 5", kind: "goldfish", palette: ["#f0e2c8", "#2f6d6a", "#f08a24", "#3b2b23"] },
];

export const captionOf = (item: GalleryItem) => `${item.title}, ${item.style}`;

function Subject({ kind, palette }: Pick<GalleryItem, "kind" | "palette">) {
  const [bg, mid, accent, ink] = palette;
  switch (kind) {
    case "ape":
      return (
        <>
          <circle cx="50" cy="44" r="31" fill={accent} />
          <circle cx="29" cy="47" r="7" fill={mid} />
          <circle cx="71" cy="47" r="7" fill={mid} />
          <ellipse cx="50" cy="48" rx="20" ry="22" fill={mid} />
          <ellipse cx="50" cy="57" rx="13" ry="10" fill={bg} />
          <circle cx="44" cy="45" r="2.2" fill={ink} />
          <circle cx="56" cy="45" r="2.2" fill={ink} />
          <path d="M45 61 Q50 64 55 61" stroke={ink} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M12 100 Q18 75 50 73 Q82 75 88 100Z" fill={ink} />
        </>
      );
    case "crown":
      return (
        <>
          <path d="M16 100 Q20 74 50 72 Q80 74 84 100Z" fill={ink} />
          <rect x="45" y="60" width="10" height="14" fill={mid} />
          <ellipse cx="50" cy="50" rx="14" ry="17" fill={mid} />
          <path d="M36 48 Q36 32 50 32 Q64 32 64 48 Q58 40 50 40 Q42 40 36 48Z" fill={ink} />
          <g fill={accent}>
            <circle cx="38" cy="26" r="9" />
            <circle cx="51" cy="20" r="12" />
            <circle cx="64" cy="26" r="9" />
            <rect x="34" y="24" width="34" height="10" rx="5" />
          </g>
        </>
      );
    case "ronin":
      return (
        <>
          <circle cx="50" cy="42" r="30" fill={mid} />
          <path d="M28 44 L50 30 L72 44Z" fill={ink} />
          <circle cx="50" cy="50" r="7" fill={ink} />
          <path d="M34 100 L39 58 L61 58 L66 100Z" fill={ink} />
          <path d="M26 92 L80 46" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M39 70 L61 70" stroke={mid} strokeWidth="2" />
        </>
      );
    case "bloom":
      return (
        <>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, index) => (
            <ellipse
              key={angle}
              cx="50"
              cy="30"
              rx="10"
              ry="20"
              fill={index % 2 ? accent : mid}
              opacity={index % 2 ? 0.85 : 0.95}
              transform={`rotate(${angle + 12} 50 50)`}
            />
          ))}
          <circle cx="50" cy="50" r="11" fill={ink} />
          <circle cx="50" cy="50" r="5" fill={bg} />
        </>
      );
    case "branch":
      return (
        <>
          <path d="M4 74 Q40 60 96 34" stroke={ink} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          {[
            [16, 68, -40],
            [26, 64, 30],
            [74, 46, -50],
            [86, 38, 20],
            [36, 66, -60],
          ].map(([x, y, r]) => (
            <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="7" ry="3" fill={mid} transform={`rotate(${r} ${x} ${y})`} />
          ))}
          <ellipse cx="52" cy="50" rx="13" ry="7" fill={accent} transform="rotate(-18 52 50)" />
          <circle cx="64" cy="42" r="5.5" fill={accent} />
          <path d="M60 37 L58 28 L63 35 L65 27 L67 36Z" fill={ink} />
          <path d="M69 42 L80 46" stroke={ink} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M40 54 L50 52 L44 57Z" fill={ink} />
          <circle cx="65.5" cy="41" r="1" fill={ink} />
        </>
      );
    case "perfume":
      return (
        <>
          <circle cx="50" cy="52" r="28" fill={mid} opacity="0.35" />
          <rect x="0" y="74" width="100" height="26" fill={ink} opacity="0.08" />
          <rect x="38" y="42" width="24" height="34" rx="5" fill={accent} opacity="0.9" />
          <rect x="45" y="33" width="10" height="9" rx="1.5" fill={ink} />
          <rect x="42" y="47" width="3" height="22" rx="1.5" fill={ink} opacity="0.6" />
          <circle cx="74" cy="70" r="5" fill={mid} />
        </>
      );
    case "cat":
      return (
        <>
          <path d="M28 100 Q30 70 50 68 Q70 70 72 100Z" fill={mid} stroke={ink} strokeWidth="2.5" />
          <path
            d="M30 44 L32 24 L44 35 Q50 33 56 35 L68 24 L70 44 Q72 64 50 66 Q28 64 30 44Z"
            fill={mid}
            stroke={ink}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle cx="43" cy="47" r="2.5" fill={ink} />
          <circle cx="57" cy="47" r="2.5" fill={ink} />
          <path d="M47 54 L50 57 L53 54" stroke={ink} strokeWidth="2" fill="none" strokeLinejoin="round" />
          <rect x="66" y="60" width="16" height="24" rx="2" fill={accent} stroke={ink} strokeWidth="2.5" />
          <path d="M66 62 Q70 54 74 60 Q78 54 82 62" fill={mid} stroke={ink} strokeWidth="2.5" />
        </>
      );
    case "cabs":
      return (
        <>
          <rect x="6" y="20" width="18" height="60" fill={mid} />
          <rect x="26" y="32" width="16" height="48" fill={ink} opacity="0.75" />
          <rect x="44" y="14" width="20" height="66" fill={mid} opacity="0.85" />
          <rect x="66" y="28" width="28" height="52" fill={ink} opacity="0.6" />
          <rect x="0" y="78" width="100" height="22" fill={ink} />
          {(
            [
              [10, 70],
              [54, 73],
            ] as const
          ).map(([x, y]) => (
            <g key={x}>
              <rect x={x} y={y} width="28" height="9" rx="2.5" fill={accent} />
              <rect x={x + 6} y={y - 5} width="15" height="6" rx="2" fill={accent} />
              <circle cx={x + 6} cy={y + 9} r="2.6" fill={bg} />
              <circle cx={x + 22} cy={y + 9} r="2.6" fill={bg} />
            </g>
          ))}
        </>
      );
    case "beach":
      return (
        <>
          <circle cx="78" cy="22" r="9" fill="#fff4d6" />
          <rect x="0" y="54" width="100" height="18" fill={ink} opacity="0.7" />
          <path d="M0 70 Q50 64 100 70 V100 H0Z" fill={mid} />
          <circle cx="48" cy="52" r="6" fill="#9a6a49" />
          <rect x="42" y="58" width="12" height="15" rx="3" fill={accent} />
          <path d="M44 73 L42 86 M52 73 L54 86" stroke="#9a6a49" strokeWidth="3" strokeLinecap="round" />
          <path d="M62 80 L72 80 L70 90 L64 90Z" fill={ink} />
        </>
      );
    case "highway":
      return (
        <>
          <rect x="0" y="40" width="100" height="60" fill={mid} opacity="0.55" />
          <path d="M34 100 L48 42 L52 42 L66 100Z" fill={ink} />
          {[50, 62, 76, 92].map((y) => (
            <rect key={y} x="49.4" y={y} width="1.2" height={y / 18} fill={accent} />
          ))}
          <g fill={accent} opacity="0.7">
            <circle cx="20" cy="30" r="2" />
            <circle cx="24" cy="22" r="1.4" />
            <circle cx="78" cy="18" r="1.8" />
          </g>
          <path d="M70 58 Q78 52 86 58 Q78 64 70 58Z M86 58 L91 54 L91 62Z" fill={accent} />
        </>
      );
    case "goldfish":
      return (
        <>
          <rect x="0" y="72" width="100" height="28" fill={ink} opacity="0.2" />
          <rect x="18" y="56" width="64" height="18" rx="5" fill={mid} />
          <rect x="22" y="46" width="56" height="14" rx="5" fill={mid} opacity="0.85" />
          <path d="M84 72 L84 34 M78 34 L90 34 L86 26 L82 26Z" stroke={ink} strokeWidth="1.6" fill={ink} />
          <ellipse cx="50" cy="30" rx="16" ry="10" fill={accent} />
          <path d="M34 30 L22 22 L24 30 L22 38Z" fill={accent} />
          <circle cx="58" cy="28" r="1.8" fill={ink} />
          <g fill="none" stroke={accent} strokeWidth="1">
            <circle cx="70" cy="20" r="2" />
            <circle cx="74" cy="13" r="1.4" />
          </g>
        </>
      );
    case "hanok":
      return (
        <>
          <path d="M12 44 Q50 26 88 44 L82 50 Q50 36 18 50Z" fill={ink} />
          <rect x="24" y="49" width="52" height="34" fill={mid} />
          <g stroke={accent} strokeWidth="1.2">
            <path d="M30 56 H46 V78 H30Z M38 56 V78 M30 67 H46" fill="none" />
          </g>
          {[54, 58, 62, 66, 70].map((x, index) => (
            <rect key={x} x={x} y={62 + (index % 2)} width="3" height={14 - (index % 2)} fill={index % 2 ? ink : accent} />
          ))}
          <rect x="52" y="76" width="22" height="2" fill={ink} />
          <rect x="16" y="83" width="68" height="4" fill={ink} opacity="0.5" />
        </>
      );
  }
}

/** One gallery picture, filling its box. */
export function GalleryArt({ item, className }: { item: GalleryItem; className?: string }) {
  const dots = useId();
  const [bg, , , ink] = item.palette;
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className={cx("block size-full", className)}
      aria-hidden
    >
      <rect width="100" height="100" fill={bg} />
      <Subject kind={item.kind} palette={item.palette} />
      {item.halftone ? (
        <>
          <defs>
            <pattern id={dots} width="3" height="3" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="0.55" fill={ink} />
            </pattern>
          </defs>
          <rect width="100" height="100" fill={`url(#${dots})`} opacity="0.22" />
        </>
      ) : null}
    </svg>
  );
}
