import type { PlateSpec } from '@/components/preview/motif/variation';

/* ==========================================================================
   The vocabulary every plate is drawn with.
   --------------------------------------------------------------------------
   One safe box, three stroke weights, five opacities, four dash rhythms, one
   tabulated sine. This is not a set of shortcuts for authoring geometry — it
   is the set of values a plate is *allowed* to use, so that sixty-four
   drawings by the same hand cannot drift into sixty-four design languages.

   No Math.sin, Math.cos, Math.pow or Math.hypot anywhere in this system.
   Those are permitted a one-ulp error by the spec, engines disagree in the
   last bit, and a coordinate that lands on a rounding boundary would
   serialise differently in the server render than in the hydration — which
   React reports as a hydration error. Add, multiply, floor, round, abs and
   sqrt are exact; the sine comes off a table written by hand.
   ========================================================================== */

/**
 * The figure's safe box. Everything a plate draws lives inside it, which is
 * what lets the shell shift the composition by ±5 and scale it by 1.06
 * without any risk of geometry crossing the viewBox and being clipped.
 */
export const BOX = { x0: 10, y0: 7, x1: 90, y1: 57, cx: 50, cy: 32, w: 80, h: 50 } as const;

/**
 * Stroke weights in CSS pixels rather than user units — see the vector-effect
 * rule in motif.tsx. 1px is the site's hairline and `key` is the only
 * emphasis in the system; a third weight would be a fourth opinion.
 */
export const W = { faint: 0.7, hair: 1, key: 1.5 } as const;

/** Five steps. A plate that wants a sixth is shading rather than drawing. */
export const O = { ghost: 0.12, faint: 0.24, mid: 0.4, strong: 0.62, key: 0.9 } as const;

/* Pixels, for the same reason as W. Index 0 is solid, which is what most
   plates get — a dash is a device and stops being one when everything has it. */
const DASH = ['none', '1 2.5', '3 2.5', '5 3'] as const;

export function dashOf(i: number): string {
  return DASH[i] ?? 'none';
}

/** Quantise to 1/100 of a user unit: identical geometry, a third of the bytes
    once 119 posters have been server-rendered into one document. */
export function q(v: number): number {
  return Math.round(v * 100) / 100;
}

export function seq(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

/* Sine at 15° steps, written out. Every angle in the system is a step of this
   table, which is what keeps rotations deliberate instead of arbitrary. */
const SIN24 = [
  0, 0.2588, 0.5, 0.7071, 0.866, 0.9659, 1, 0.9659, 0.866, 0.7071, 0.5, 0.2588, 0, -0.2588, -0.5,
  -0.7071, -0.866, -0.9659, -1, -0.9659, -0.866, -0.7071, -0.5, -0.2588,
] as const;

/** Sine of a fraction of a turn. Interpolated between table steps, so it is
    smooth where a curve needs to be and still free of transcendentals. */
export function sinT(turns: number): number {
  const x = turns * 24;
  const i = Math.floor(x);
  const f = x - i;
  const a = SIN24[((i % 24) + 24) % 24] ?? 0;
  const b = SIN24[(((i + 1) % 24) + 24) % 24] ?? 0;
  return a + (b - a) * f;
}

export function cosT(turns: number): number {
  return sinT(turns + 0.25);
}

/**
 * Which member of an n-element series carries the accent. In `axis` mode the
 * accent has left the figure for a single measure line at frame level, so
 * nothing inside the figure claims it.
 */
export function accented(s: PlateSpec, i: number, n: number): boolean {
  if (s.accentMode === 'axis') return false;
  if (s.accentMode === 'set') return i % 2 === s.accent % 2;
  return i === s.accent % Math.max(1, n);
}

/** A descending opacity ramp across a series — the only shading device here. */
export function ramp(i: number, n: number, from: number = O.strong, to: number = O.faint): number {
  if (n <= 1) return from;
  return q(from + (to - from) * (i / (n - 1)));
}

interface Ink {
  className: string | undefined;
  opacity: number;
  strokeWidth: number;
}

/**
 * Ink for member i of a stroked series. The accented one takes the category
 * hue at full weight and full opacity; everything else recedes. Splitting it
 * this way is what makes the accent read as a second ink deliberately spent,
 * rather than as a highlight sprayed over the whole drawing.
 */
export function ink(s: PlateSpec, i: number, n: number, base: number = O.mid): Ink {
  const hot = accented(s, i, n);
  return {
    className: hot ? 'text-accent' : undefined,
    opacity: hot ? 1 : base,
    strokeWidth: hot ? W.key : W.hair,
  };
}

interface FillInk {
  className: string | undefined;
  opacity: number;
  fill: string;
  stroke: string;
}

/** The same decision for a filled shape, where weight cannot carry emphasis. */
export function inkFill(s: PlateSpec, i: number, n: number, base: number = O.mid): FillInk {
  const hot = accented(s, i, n);
  return {
    className: hot ? 'text-accent' : undefined,
    opacity: hot ? 1 : base,
    fill: 'currentColor',
    stroke: 'none',
  };
}

/**
 * A wave as alternating cubic humps rather than as a sampled polyline. Control
 * points at 4/3 of the amplitude put a cubic's midpoint exactly on the sine's
 * peak, so this stays smooth at a 1400px hero for a fifth of the path data —
 * and a hump is four numbers, where a polyline smooth enough for that hero is
 * forty.
 *
 * `taper` windows the amplitude to nothing at both ends, which is the whole
 * difference between a wave train and a wave packet.
 */
export function humps(opts: {
  x0: number;
  x1: number;
  y: number;
  amp: number;
  halves: number;
  up?: boolean;
  taper?: number;
}): string {
  const { x0, x1, y, amp, halves } = opts;
  const up = opts.up ?? true;
  const taper = opts.taper ?? 0;
  const len = (x1 - x0) / halves;
  let d = 'M' + q(x0) + ',' + q(y);

  for (let i = 0; i < halves; i++) {
    const a = x0 + i * len;
    const t = halves > 1 ? i / (halves - 1) : 0;
    const bell = 1 - taper * Math.abs(2 * t - 1);
    const k = amp * bell * 1.3333 * (up === (i % 2 === 0) ? -1 : 1);
    d +=
      ' C' +
      q(a + len / 3) +
      ',' +
      q(y + k) +
      ' ' +
      q(a + (2 * len) / 3) +
      ',' +
      q(y + k) +
      ' ' +
      q(a + len) +
      ',' +
      q(y);
  }

  return d;
}

/** A polyline through points, as path data. */
export function poly(points: readonly { x: number; y: number }[]): string {
  return points.map((p, i) => (i === 0 ? 'M' : 'L') + q(p.x) + ',' + q(p.y)).join(' ');
}

/**
 * The four paths a trail is allowed to take: a rise, a fall, an S and a lean.
 * Four designed curves rather than a parameter, because a following series
 * needs somewhere to go and "somewhere" is a composition decision.
 */
export function trailPoint(t: number, turn: number): { x: number; y: number } {
  // 18..82 rather than 16..84: the widest thing a trail plate places on the
  // path is a 16-unit ghost frame, and this keeps its edges inside the frame.
  const x = BOX.x0 + 8 + t * 64;
  if (turn === 0) return { x, y: q(47 - 26 * sinT(t * 0.5)) };
  if (turn === 1) return { x, y: q(17 + 26 * sinT(t * 0.5)) };
  if (turn === 2) return { x, y: q(BOX.cy - 15 * sinT(t)) };
  return { x, y: q(49 - t * 32) };
}

/**
 * The threshold at (x, y) of an m×m ordered dither matrix, 0..m²-1, by the
 * recursive Bayer construction M₂ₙ(x,y) = Mₙ(x»1, y»1) + 4ⁿ⁻¹·M₂(x&1, y&1).
 * Bit maths only, so this is one of the few places where the drawing is
 * literally the technique the component it stands for implements.
 */
export function bayer(x: number, y: number, m: number): number {
  let bits = 0;
  for (let s = m; s > 1; s >>= 1) bits++;

  let v = 0;
  for (let i = 0; i < bits; i++) {
    const a = (x >> i) & 1;
    const b = (y >> i) & 1;
    v += (2 * (a ^ b) + b) * (1 << (2 * (bits - 1 - i)));
  }
  return v;
}

/* A hand-drawn radial profile, used by the contour plate. Twenty-four radii
   that were placed rather than sampled: it is the difference between a
   topographic line and a noise function with the volume turned down. */
export const CONTOUR = [
  1, 0.95, 0.89, 0.94, 1.04, 1.1, 1.03, 0.91, 0.86, 0.92, 1, 1.07, 1.11, 1.05, 0.96, 0.9, 0.93,
  0.99, 1.06, 1.1, 1.04, 0.97, 0.93, 0.96,
] as const;

export function contourAt(i: number): number {
  return CONTOUR[((i % 24) + 24) % 24] ?? 1;
}
