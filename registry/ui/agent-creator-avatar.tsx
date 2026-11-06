/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Agent Creator" (boardui.com/components/agent-creator).
 * No BoardUI source was used.
 */
"use client";

import { useId } from "react";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cx } from "@/registry/lib/cx";

/**
 * Paper avatar — a cut-paper shape with an ink face, drawn as one inline SVG.
 *
 * Three layers: a darker copy of the silhouette nudged down and right (the
 * paper's cut edge), the silhouette itself in the chosen colour, and a grain
 * pass (fractal noise clipped to the silhouette) that keeps the fill from
 * reading as flat vector. The face sits on top at a per-shape anchor, because
 * a heart's visual centre is well above its box centre.
 */

/* ------------------------------------------------------------------ shapes */

function polygon(points: number, outer: number, inner: number, cy: number) {
  const coords: string[] = [];
  const steps = inner > 0 ? points * 2 : points;
  for (let i = 0; i < steps; i++) {
    const angle = (-90 + (i * 360) / steps) * (Math.PI / 180);
    const r = inner > 0 && i % 2 === 1 ? inner : outer;
    coords.push(`${(50 + r * Math.cos(angle)).toFixed(1)} ${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return `M${coords.join("L")}Z`;
}

export type AgentShapeId =
  | "cloud"
  | "circle"
  | "star"
  | "heart"
  | "diamond"
  | "shield"
  | "hexagon"
  | "pebble"
  | "tile";

export interface AgentShape {
  id: AgentShapeId;
  label: string;
  path: string;
  /** Where the face sits, in the 100-unit box, and how large it is drawn. */
  face: { x: number; y: number; scale: number };
}

export const AGENT_SHAPES: readonly AgentShape[] = [
  {
    id: "cloud",
    label: "Cloud",
    path: "M24 80A18 18 0 0 1 20 44.5A28 28 0 0 1 74 36A22.5 22.5 0 0 1 78 80Z",
    face: { x: 50, y: 58, scale: 1 },
  },
  {
    id: "circle",
    label: "Circle",
    path: "M50 8A42 42 0 1 1 50 92A42 42 0 1 1 50 8Z",
    face: { x: 50, y: 52, scale: 1.1 },
  },
  { id: "star", label: "Star", path: polygon(5, 44, 21, 54), face: { x: 50, y: 56, scale: 0.85 } },
  {
    id: "heart",
    label: "Heart",
    path: "M50 88C20 68 6 52 6 34C6 20 17 10 30 10C39 10 46 15 50 22C54 15 61 10 70 10C83 10 94 20 94 34C94 52 80 68 50 88Z",
    face: { x: 50, y: 42, scale: 1 },
  },
  { id: "diamond", label: "Diamond", path: "M50 6L92 50L50 94L8 50Z", face: { x: 50, y: 52, scale: 0.95 } },
  {
    id: "shield",
    label: "Shield",
    path: "M50 7L88 19V48C88 70 72 86 50 94C28 86 12 70 12 48V19Z",
    face: { x: 50, y: 47, scale: 1 },
  },
  { id: "hexagon", label: "Hexagon", path: polygon(6, 45, 0, 50), face: { x: 50, y: 52, scale: 1.05 } },
  {
    id: "pebble",
    label: "Pebble",
    path: "M52 10C76 10 92 26 92 48C92 74 74 90 48 90C24 90 8 74 8 52C8 28 26 10 52 10Z",
    face: { x: 50, y: 52, scale: 1.1 },
  },
  {
    id: "tile",
    label: "Tile",
    path: "M30 10H70C82 10 90 18 90 30V70C90 82 82 90 70 90H30C18 90 10 82 10 70V30C10 18 18 10 30 10Z",
    face: { x: 50, y: 52, scale: 1.1 },
  },
];

/* ------------------------------------------------------------------- faces */

type EyeKind = "dot" | "tall" | "round" | "happy" | "line" | "lid" | "wide";
type BrowKind = "angry" | "sad" | "flat" | "raised";
type MouthKind = "smile" | "o" | "flat" | "smirk";

export interface AgentFace {
  id: string;
  label: string;
  eyes: readonly [EyeKind, EyeKind];
  brows?: BrowKind;
  mouth?: MouthKind;
  /** Gaze, -1 (left) to 1 (right). */
  look?: number;
}

export const AGENT_FACES: readonly AgentFace[] = [
  { id: "calm", label: "Calm", eyes: ["dot", "dot"] },
  { id: "determined", label: "Determined", eyes: ["tall", "tall"] },
  { id: "cheerful", label: "Cheerful", eyes: ["happy", "happy"] },
  { id: "grumpy", label: "Grumpy", eyes: ["dot", "dot"], brows: "angry" },
  { id: "curious", label: "Curious", eyes: ["wide", "wide"], look: 1 },
  { id: "focused", label: "Focused", eyes: ["tall", "tall"], brows: "flat" },
  { id: "glancing", label: "Glancing", eyes: ["dot", "dot"], look: 1 },
  { id: "smiling", label: "Smiling", eyes: ["dot", "dot"], mouth: "smile" },
  { id: "surprised", label: "Surprised", eyes: ["round", "round"], mouth: "o" },
  { id: "sleepy", label: "Sleepy", eyes: ["line", "line"] },
  { id: "worried", label: "Worried", eyes: ["tall", "tall"], brows: "sad" },
  { id: "skeptical", label: "Skeptical", eyes: ["dot", "lid"], brows: "raised" },
  { id: "bored", label: "Bored", eyes: ["lid", "lid"], mouth: "flat" },
  { id: "wink", label: "Wink", eyes: ["happy", "dot"], mouth: "smirk" },
  { id: "shy", label: "Shy", eyes: ["dot", "dot"], look: -1, brows: "sad" },
  { id: "smug", label: "Smug", eyes: ["lid", "lid"], mouth: "smirk" },
];

export type AgentFaceId = (typeof AGENT_FACES)[number]["id"];

/* Ink stays dark in both themes: it is drawn on the paper, not on the page. */
const INK = "#1f1a17";
const EYE_GAP = 8.5;

function Eye({ kind, x, look }: { kind: EyeKind; x: number; look: number }) {
  const stroke = { stroke: INK, strokeWidth: 2.6, strokeLinecap: "round" as const, fill: "none" };
  switch (kind) {
    case "dot":
      return <ellipse cx={x + look * 2.4} cy={0} rx={3.3} ry={4.3} fill={INK} />;
    case "tall":
      return <ellipse cx={x + look * 2.4} cy={0} rx={3.4} ry={6.2} fill={INK} />;
    case "round":
      return <circle cx={x} cy={0} r={4.6} fill={INK} />;
    case "happy":
      return <path d={`M${x - 4} 1.5Q${x} -4.5 ${x + 4} 1.5`} {...stroke} />;
    case "line":
      return <path d={`M${x - 4.4} 0.5H${x + 4.4}`} {...stroke} />;
    case "lid":
      return <path d={`M${x - 4.3} -0.6A4.3 4.3 0 0 0 ${x + 4.3} -0.6Z`} fill={INK} />;
    case "wide":
      return (
        <g>
          <circle cx={x} cy={0} r={5.4} fill="#ffffff" stroke={INK} strokeWidth={1.4} />
          <circle cx={x + look * 1.7} cy={0.4} r={2.7} fill={INK} />
        </g>
      );
  }
}

function Brows({ kind }: { kind: BrowKind }) {
  const s = { stroke: INK, strokeWidth: 2.2, strokeLinecap: "round" as const, fill: "none" };
  const l = -EYE_GAP;
  const r = EYE_GAP;
  switch (kind) {
    case "angry":
      return (
        <g {...s}>
          <path d={`M${l - 4.5} -11L${l + 3.5} -7.6`} />
          <path d={`M${r + 4.5} -11L${r - 3.5} -7.6`} />
        </g>
      );
    case "sad":
      return (
        <g {...s}>
          <path d={`M${l - 4} -8L${l + 3.5} -11.2`} />
          <path d={`M${r + 4} -8L${r - 3.5} -11.2`} />
        </g>
      );
    case "flat":
      return (
        <g {...s}>
          <path d={`M${l - 4} -9.6H${l + 4}`} />
          <path d={`M${r - 4} -9.6H${r + 4}`} />
        </g>
      );
    case "raised":
      return (
        <g {...s}>
          <path d={`M${l - 4.5} -10Q${l} -14.5 ${l + 4.5} -10.6`} />
          <path d={`M${r - 4} -8H${r + 4}`} />
        </g>
      );
  }
}

function Mouth({ kind }: { kind: MouthKind }) {
  const s = { stroke: INK, strokeWidth: 2.2, strokeLinecap: "round" as const, fill: "none" };
  switch (kind) {
    case "smile":
      return <path d="M-4 8.5Q0 12.5 4 8.5" {...s} />;
    case "o":
      return <ellipse cx={0} cy={10.5} rx={2.2} ry={2.8} fill={INK} />;
    case "flat":
      return <path d="M-3 10H3" {...s} />;
    case "smirk":
      return <path d="M-3 10Q1 11.6 4.2 8.2" {...s} />;
  }
}

/** Just the ink: eyes, brows and mouth, centred on the origin. */
export function FaceInk({
  face,
  blink = false,
}: {
  face: AgentFace;
  /** Close the eyes for a beat every few seconds. Off under reduced motion. */
  blink?: boolean;
}) {
  const look = face.look ?? 0;
  const eyes: ReactNode = (
    <>
      <Eye kind={face.eyes[0]} x={-EYE_GAP} look={look} />
      <Eye kind={face.eyes[1]} x={EYE_GAP} look={look} />
    </>
  );
  return (
    <g>
      {blink ? (
        <motion.g
          style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
          animate={{ scaleY: [1, 1, 0.12, 1] }}
          transition={{ duration: 4.2, times: [0, 0.9, 0.94, 1], repeat: Infinity, ease: "easeInOut" }}
        >
          {eyes}
        </motion.g>
      ) : (
        eyes
      )}
      {face.brows ? <Brows kind={face.brows} /> : null}
      {face.mouth ? <Mouth kind={face.mouth} /> : null}
    </g>
  );
}

/* ------------------------------------------------------------------ colour */

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m || !m[1]) return null;
  const n = Number.parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mixes a hex colour toward black (amount > 0) or white (amount < 0). */
export function shadeHex(hex: string, amount: number) {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const target = amount >= 0 ? 0 : 255;
  const t = Math.min(1, Math.abs(amount));
  const out = rgb.map((c) => Math.round(c + (target - c) * t));
  return `#${out.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/* ------------------------------------------------------------------ avatar */

export interface PaperAvatarProps {
  shape: AgentShapeId;
  /** Face to draw; null leaves the paper blank (shape pickers). */
  face: AgentFaceId | null;
  /** Paper colour as a 6-digit hex. */
  color: string;
  /** Rendered size in px. */
  size?: number;
  /** Float and blink. Pass false under reduced motion. */
  animated?: boolean;
  /** Fractal-noise paper grain. Worth it at large sizes only. */
  grain?: boolean;
  /** Accessible name. Without it the avatar is decorative (aria-hidden). */
  label?: string;
  className?: string;
}

// #region critical
export function PaperAvatar({
  shape,
  face,
  color,
  size = 128,
  animated = false,
  grain = true,
  label,
  className,
}: PaperAvatarProps) {
  const rawId = useId();
  const grainId = `paper-grain-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const def = AGENT_SHAPES.find((s) => s.id === shape) ?? AGENT_SHAPES[0]!;
  const faceDef = face === null ? null : (AGENT_FACES.find((f) => f.id === face) ?? AGENT_FACES[0]!);
  // The cut edge: the same silhouette, 28% darker, offset 2.5/3.5 units.
  const edge = shadeHex(color, 0.28);

  const body = (
    <>
      <path d={def.path} transform="translate(2.5 3.5)" fill={edge} stroke={edge} strokeWidth={5} strokeLinejoin="round" />
      <path d={def.path} fill={color} stroke={color} strokeWidth={5} strokeLinejoin="round" />
      {grain ? (
        <path d={def.path} fill={color} filter={`url(#${grainId})`} opacity={0.3} />
      ) : null}
      {faceDef ? (
        <g transform={`translate(${def.face.x} ${def.face.y}) scale(${def.face.scale})`}>
          <FaceInk face={faceDef} blink={animated} />
        </g>
      ) : null}
    </>
  );

  return (
    <svg
      viewBox="-6 -6 114 114"
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cx("shrink-0 overflow-visible", className)}
    >
      {grain ? (
        <defs>
          <filter id={grainId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={7} result="noise" />
            {/* Speckle alpha from the noise's red channel: dark flecks only where it peaks. */}
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.2 0 0 0 -1.25"
              result="speckle"
            />
            <feComposite in="speckle" in2="SourceAlpha" operator="in" />
          </filter>
        </defs>
      ) : null}
      {animated ? (
        <motion.g
          animate={{ y: [0, -2.5, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        >
          {body}
        </motion.g>
      ) : (
        <g>{body}</g>
      )}
    </svg>
  );
}
// #endregion

/** A face option on its own: a small paper disc in the avatar colour. */
export function FaceDisc({ face, color, size = 30 }: { face: AgentFaceId; color: string; size?: number }) {
  const faceDef = AGENT_FACES.find((f) => f.id === face) ?? AGENT_FACES[0]!;
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden className="shrink-0">
      <circle cx={20.8} cy={21.4} r={17.5} fill={shadeHex(color, 0.22)} />
      <circle cx={20} cy={20} r={17.5} fill={color} />
      <g transform="translate(20 21) scale(0.78)">
        <FaceInk face={faceDef} />
      </g>
    </svg>
  );
}
