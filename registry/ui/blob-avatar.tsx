/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Blob Avatar" (boardui.com/components/multi-agent-chat).
 * No BoardUI source was used.
 */
"use client";

import { useId, useMemo, type CSSProperties, type ReactNode } from "react";

import { cx } from "@/registry/lib/cx";
import { createRng, hashSeed, randRange } from "@/registry/lib/prng";
import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";

export type BlobShape = "blob" | "squircle" | "star" | "flower" | "diamond" | "shield" | "cloud";
export type BlobFace = "dots" | "happy" | "sleepy" | "wink" | "surprised" | "none";
export type BlobColor = "lime" | "mint" | "sky" | "violet" | "peach" | "butter" | "pink" | "coral";
export type BlobAvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export const BLOB_SHAPES: readonly BlobShape[] = ["blob", "squircle", "star", "flower", "diamond", "shield", "cloud"];
export const BLOB_FACES: readonly BlobFace[] = ["dots", "happy", "sleepy", "wink", "surprised", "none"];

/** Body fill and the darker edge drawn behind it. Artwork colours, identical in both themes. */
export const BLOB_COLORS: Record<BlobColor, { label: string; fill: string; edge: string }> = {
  lime: { label: "Lime", fill: "#b9e36f", edge: "#8dbf45" },
  mint: { label: "Mint", fill: "#93dbc8", edge: "#5fb59f" },
  sky: { label: "Sky", fill: "#93b6ff", edge: "#6188e3" },
  violet: { label: "Violet", fill: "#a991f6", edge: "#7d64d6" },
  peach: { label: "Peach", fill: "#f4b892", edge: "#d68f66" },
  butter: { label: "Butter", fill: "#f6d872", edge: "#d6b445" },
  pink: { label: "Pink", fill: "#f69dc2", edge: "#d66d99" },
  coral: { label: "Coral", fill: "#f6927f", edge: "#d66855" },
};

const COLOR_KEYS = Object.keys(BLOB_COLORS) as BlobColor[];

export const BLOB_AVATAR_SIZES: Record<BlobAvatarSize, number> = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80, "2xl": 128 };

const INK = "#1d2420";
/** Samples around the outline; every frame of one shape has the same count so the path can morph. */
const SAMPLES = 40;
/** Body centre and radius in the 100×100 viewBox; the edge is drawn 2.5 right, 3.5 down. */
const CX = 48;
const CY = 47;
const RADIUS = 40;
/** Radial wobble of the morph frames, as a fraction of the radius. */
const WOBBLE = 0.055;

type Pt = readonly [number, number];

// #region critical
/** Shape, colour and face picked from a string, so the same name always gets the same blob. */
export function blobLook(seed: string): { shape: BlobShape; color: BlobColor; face: BlobFace } {
  const h = hashSeed(seed);
  return {
    color: COLOR_KEYS[h % COLOR_KEYS.length] ?? "lime",
    shape: BLOB_SHAPES[(h >>> 4) % BLOB_SHAPES.length] ?? "blob",
    face: BLOB_FACES[(h >>> 8) % 4] ?? "dots",
  };
}

function polar(radius: (angle: number) => number): Pt[] {
  return Array.from({ length: SAMPLES }, (_, i) => {
    const a = -Math.PI / 2 + (i / SAMPLES) * Math.PI * 2;
    const r = radius(a + Math.PI / 2); // 0 points straight up
    return [Math.cos(a) * r, Math.sin(a) * r] as const;
  });
}

/** Even arc-length samples along a closed polygon; the spline later rounds its corners. */
function polygon(verts: Pt[]): Pt[] {
  const lens = verts.map((v, i) => {
    const w = verts[(i + 1) % verts.length] ?? v;
    return Math.hypot(w[0] - v[0], w[1] - v[1]);
  });
  const total = lens.reduce((sum, l) => sum + l, 0);
  const out: Pt[] = [];
  let seg = 0;
  let start = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const d = (i / SAMPLES) * total;
    while (seg < verts.length - 1 && start + (lens[seg] ?? 0) < d) start += lens[seg++] ?? 0;
    const v = verts[seg] ?? ([0, 0] as const);
    const w = verts[(seg + 1) % verts.length] ?? v;
    const t = (d - start) / (lens[seg] || 1);
    out.push([v[0] + (w[0] - v[0]) * t, v[1] + (w[1] - v[1]) * t]);
  }
  return out;
}

/** Unit outline (radius about 1, y down) for a shape; `rand` adds the per-seed lumps. */
function outline(shape: BlobShape, rand: () => number): Pt[] {
  switch (shape) {
    case "squircle":
      return polar((a) => 0.84 * (Math.abs(Math.cos(a)) ** 4 + Math.abs(Math.sin(a)) ** 4) ** -0.25);
    case "star":
      return polar((a) => 0.58 + 0.42 * ((1 + Math.cos(5 * a)) / 2) ** 1.4);
    case "flower":
      return polar((a) => 0.74 + 0.26 * Math.abs(Math.cos(3 * a)) ** 0.6);
    case "diamond":
      return polygon([[0, -1], [0.9, 0], [0, 1], [-0.9, 0]]);
    case "shield":
      return polygon([[-0.84, -0.8], [0, -0.94], [0.84, -0.8], [0.8, 0.18], [0, 0.98], [-0.8, 0.18]]);
    case "cloud":
      return polar((a) => 0.8 + 0.2 * Math.abs(Math.cos(2.5 * a)) ** 0.5).map(([x, y]) => [x * 1.06, Math.min(y, 0.66)] as const);
    case "blob": {
      const lumps = [2, 3, 4].map((k) => ({ k, amp: randRange(rand, 0.025, 0.075), phase: randRange(rand, 0, Math.PI * 2) }));
      return polar((a) => 0.92 + lumps.reduce((sum, l) => sum + l.amp * Math.cos(l.k * a + l.phase), 0));
    }
  }
}

const round = (v: number) => Math.round(v * 10) / 10;

/** Closed Catmull-Rom spline through the points, as cubic Béziers in viewBox units. */
function toPath(points: Pt[]): string {
  const p = points.map(([x, y]) => [CX + x * RADIUS, CY + y * RADIUS] as const);
  const n = p.length;
  const at = (i: number): Pt => p[((i % n) + n) % n] ?? [CX, CY];
  let d = `M${round(at(0)[0])} ${round(at(0)[1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    d += `C${round(p1[0] + (p2[0] - p0[0]) / 6)} ${round(p1[1] + (p2[1] - p0[1]) / 6)} ${round(p2[0] - (p3[0] - p1[0]) / 6)} ${round(p2[1] - (p3[1] - p1[1]) / 6)} ${round(p2[0])} ${round(p2[1])}`;
  }
  return `${d}Z`;
}

/**
 * The resting path of a shape plus two wobbled frames. A seeded tilt keeps two
 * blobs of the same shape from looking stamped; the frames push each sample
 * in and out along its own radius with two out-of-phase waves.
 */
export function blobPaths(shape: BlobShape, seed: string): { rest: string; frames: [string, string, string, string] } {
  const rand = createRng(`${shape}:${seed}`);
  const tilt = randRange(rand, -0.14, 0.14);
  const base = outline(shape, rand).map(([x, y]) => [x * Math.cos(tilt) - y * Math.sin(tilt), x * Math.sin(tilt) + y * Math.cos(tilt)] as const);
  const phase = randRange(rand, 0, Math.PI * 2);
  const wobble = (k: number) =>
    toPath(
      base.map(([x, y], i) => {
        const theta = (i / SAMPLES) * Math.PI * 2;
        const ph = phase + (k * Math.PI * 2) / 3;
        const f = 1 + WOBBLE * (0.6 * Math.sin(2 * theta + ph) + 0.4 * Math.sin(3 * theta - 2 * ph));
        return [x * f, y * f] as const;
      }),
    );
  const rest = toPath(base);
  return { rest, frames: [rest, wobble(1), wobble(2), rest] };
}
// #endregion

/** Where the eyes sit (as a fraction of the radius, below centre) and how big they are, per shape. */
const FACE_FIT: Record<BlobShape, { dy: number; scale: number; gap: number }> = {
  blob: { dy: -0.04, scale: 1, gap: 11 },
  squircle: { dy: -0.04, scale: 1, gap: 11.5 },
  star: { dy: 0.1, scale: 0.8, gap: 8.6 },
  flower: { dy: 0, scale: 0.9, gap: 10 },
  diamond: { dy: 0.02, scale: 0.84, gap: 9.2 },
  shield: { dy: -0.1, scale: 1, gap: 11.5 },
  cloud: { dy: 0.04, scale: 0.95, gap: 11 },
};

type Eye = "open" | "round" | "smile" | "closed";

const EYES: Record<BlobFace, [Eye, Eye] | null> = {
  dots: ["open", "open"],
  happy: ["smile", "smile"],
  sleepy: ["closed", "closed"],
  wink: ["open", "smile"],
  surprised: ["round", "round"],
  none: null,
};

function EyeMark({ kind }: { kind: Eye }) {
  if (kind === "open")
    return (
      <>
        <rect x={-5} y={-8.5} width={10} height={17} rx={5} fill={INK} />
        <circle cx={-1.6} cy={-4.4} r={1.9} fill="#ffffff" opacity={0.9} />
      </>
    );
  if (kind === "round")
    return (
      <>
        <circle r={6.4} fill={INK} />
        <circle cx={-1.9} cy={-2.1} r={2.1} fill="#ffffff" opacity={0.9} />
      </>
    );
  const d = kind === "smile" ? "M-5.6 2.6Q0-6.2 5.6 2.6" : "M-5.6 0.8H5.6";
  return <path d={d} fill="none" stroke={INK} strokeWidth={3.6} strokeLinecap="round" />;
}

export interface BlobAvatarProps {
  /** Accessible name, and the default seed. */
  name: string;
  /** Seed for shape, colour, face and wobble; defaults to `name`. */
  seed?: string;
  shape?: BlobShape;
  color?: BlobColor;
  face?: BlobFace;
  /** Preset (24 · 32 · 40 · 56 · 80 · 128 px) or a pixel size. */
  size?: BlobAvatarSize | number;
  /** Morph the body and blink. Always off under reduced motion. */
  animated?: boolean;
  /** Hide from assistive tech when the name is already next to it. */
  decorative?: boolean;
  /** Overlaid on the avatar (a status dot, a badge). */
  children?: ReactNode;
  className?: string;
}

export function BlobAvatar({
  name,
  seed,
  shape,
  color,
  face,
  size = "md",
  animated = true,
  decorative = false,
  children,
  className,
}: BlobAvatarProps) {
  const key = seed ?? name;
  const look = blobLook(key);
  const s = shape ?? look.shape;
  const c = BLOB_COLORS[color ?? look.color];
  const f = face ?? look.face;
  const { rest, frames } = useMemo(() => blobPaths(s, key), [s, key]);
  const reduced = useReducedMotion();
  const live = animated && !reduced;

  // Per-seed timing so a list of avatars never breathes or blinks in step.
  const timing = useMemo(() => {
    const rand = createRng(`t:${key}`);
    return { morph: randRange(rand, 5.5, 8), offset: randRange(rand, 0, 5), blink: randRange(rand, 3.5, 6.5) };
  }, [key]);

  const px = typeof size === "number" ? size : BLOB_AVATAR_SIZES[size];
  const fit = FACE_FIT[s];
  const eyes = EYES[f];
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const clipId = `blob-clip-${uid}`;
  const lightId = `blob-light-${uid}`;

  const morph = live ? (
    <animate
      attributeName="d"
      values={frames.join(";")}
      keyTimes="0;0.33;0.67;1"
      calcMode="spline"
      keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1"
      dur={`${timing.morph.toFixed(2)}s`}
      begin={`-${timing.offset.toFixed(2)}s`}
      repeatCount="indefinite"
    />
  ) : null;

  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
      data-shape={s}
      data-color={color ?? look.color}
      data-face={f}
      className={cx("relative inline-flex shrink-0 select-none", className)}
      style={{ width: px, height: px } satisfies CSSProperties}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden className="overflow-visible">
        <defs>
          <clipPath id={clipId}>
            <path d={rest}>{morph}</path>
          </clipPath>
          <radialGradient id={lightId} cx="0.3" cy="0.22" r="0.55">
            <stop offset="0" stopColor="#ffffff" stopOpacity={0.4} />
            <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </radialGradient>
        </defs>
        <path d={rest} fill={c.edge} transform="translate(2.5 3.5)">
          {morph}
        </path>
        <path d={rest} fill={c.fill}>
          {morph}
        </path>
        {/* Soft top-left light, clipped to the body so it follows the morph. */}
        <rect width={100} height={100} fill={`url(#${lightId})`} clipPath={`url(#${clipId})`} />
        {eyes &&
          eyes.map((eye, i) => {
            const x = CX + (i === 0 ? -fit.gap : fit.gap);
            const y = CY + fit.dy * RADIUS;
            const blinks = live && (eye === "open" || eye === "round");
            return (
              <g key={i} transform={`translate(${x} ${y}) scale(${fit.scale})`}>
                <g>
                  {blinks && (
                    <animateTransform
                      attributeName="transform"
                      type="scale"
                      values="1 1;1 1;1 0.12;1 1"
                      keyTimes="0;0.92;0.96;1"
                      dur={`${timing.blink.toFixed(2)}s`}
                      begin={`-${timing.offset.toFixed(2)}s`}
                      repeatCount="indefinite"
                    />
                  )}
                  <EyeMark kind={eye} />
                </g>
              </g>
            );
          })}
      </svg>
      {children}
    </span>
  );
}
