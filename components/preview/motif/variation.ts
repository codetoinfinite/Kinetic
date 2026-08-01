import type { Motif } from '@/scripts/schema';

/* ==========================================================================
   Which plate, not how it is drawn.
   --------------------------------------------------------------------------
   119 components share eight motif families, so the family on its own cannot
   be the picture: thirty-seven cards drawing the same nested rectangle is
   what made the grid read as clip art. This module answers one question —
   which specimen of the family does this slug get — and answers it the same
   way every time.

   Three rules the scheme rests on.

     1. Structural, not jittered. The hash chooses between plates that were
        drawn on purpose, and between counts, turns and anchors that were
        looked at. It never nudges a coordinate. Nudged coordinates are
        precisely what makes generated art look generated, and the poster is
        the state most cards are in most of the time.

     2. One hash per (slug, axis), separately salted, rather than successive
        draws from one stream. Adding a ninth axis then cannot reshuffle the
        eight that already exist — a new axis is an addition, not a redesign
        of all 119 posters.

     3. Deterministic to the byte. No Math.random, no Date.now, no useId. The
        poster is server-rendered and then hydrated; anything that disagrees
        across that boundary is a hydration error, not a cosmetic variance.

   Deliberately free of value imports. scripts/audit-posters.ts enumerates
   every slug's spec through this exact code to prove that no two members of a
   family resolve to the same drawing — which is the only way to know SALT is
   a good salt rather than a hopeful one.
   ========================================================================== */

/** A list known to have a first member, so index 0 needs no narrowing. */
export type NonEmpty<T> = readonly [T, ...T[]];

/**
 * A list of exactly N members. Used to tie each family's plate array to the
 * variant count the selector picks from, so adding a plate without widening
 * VARIANTS is a type error rather than a plate nothing ever selects.
 */
export type Fixed<T, N extends number, R extends readonly T[] = []> = R['length'] extends N
  ? R
  : Fixed<T, N, readonly [...R, T]>;

/**
 * FNV-1a, 32-bit, with an avalanche pass. Not reused from registry/lib/prng:
 * that module exists to produce a random stream, and a stream is the wrong
 * instrument here — see rule 2. This is a selector, and its only requirement
 * is that it spreads short kebab-case strings evenly across a small modulus.
 */
export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Murmur3's fmix32, and it is load-bearing rather than decorative. Raw FNV-1a
  // is nearly linear in its low bits: bit 0 of the digest is the parity of bit
  // 0 of every input byte, so any two slugs of equal parity agreed on every
  // axis taken mod 2 or mod 4 at once. That produced twelve pairs and triples
  // of posters that were the same drawing moved sideways. Mixing before the
  // modulus is what makes the axes independent of each other. Integer ops only
  // (imul, xor, unsigned shift), so the server and the client agree exactly.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/* Changing this reshuffles all 119 posters at once. It exists so that a
   collision the audit finds is a one-character fix rather than a redesign. */
const SALT = 'kx-poster-2';

function axis(slug: string, name: string, count: number): number {
  return hash32(SALT + '/' + name + '/' + slug) % count;
}

function pick<T>(slug: string, name: string, options: NonEmpty<T>): T {
  return options[axis(slug, name, options.length)] ?? options[0];
}

/** Where the figure sits in the frame. Five positions, no in-between. */
export type Anchor = 'center' | 'left' | 'right' | 'high' | 'low';

/**
 * How the category accent is spent. `one` puts it on a single element, `set`
 * on every other member of a series, and `axis` takes it out of the figure
 * entirely and spends it on one measure line across the plate.
 */
export type AccentMode = 'one' | 'set' | 'axis';

/** Quiet frame furniture, drawn outside the figure and never over it. */
export type Chrome = 'none' | 'ticks' | 'baseline' | 'gauge';

/* Weighted by repetition rather than by a weight table, because the ratio is
   the design decision and a list shows it. `one` is the normal deployment of
   the accent; `axis` is the rare, quiet one. Half of all plates get no
   chrome at all and no dashes, so the devices stay devices. */
const ACCENT_MODES: NonEmpty<AccentMode> = ['one', 'one', 'one', 'set', 'axis'];
const CHROMES: NonEmpty<Chrome> = ['none', 'none', 'none', 'ticks', 'baseline', 'gauge'];
const ANCHORS: NonEmpty<Anchor> = ['center', 'center', 'left', 'right', 'high', 'low'];
const SCALES: NonEmpty<number> = [0.94, 1, 1, 1.06];
const DASHES: NonEmpty<number> = [0, 0, 0, 1, 2, 3];
const TURNS: NonEmpty<number> = [0, 1, 2, 3];
const MIRRORS: NonEmpty<boolean> = [false, false, true];

/** How many plates each family draws, and the counts they were drawn for. */
export const VARIANTS = {
  stack: 14,
  wave: 8,
  rings: 8,
  split: 8,
  grid: 8,
  orbit: 6,
  trail: 6,
  noise: 6,
} as const;

interface FamilyPlan {
  variants: number;
  /** Primary element count: layers, rows, bars, orbits. */
  counts: NonEmpty<number>;
  /** The second count where a grammar has two — rules, spokes, lattice rows. */
  counts2: NonEmpty<number>;
}

/* stack carries 37 components and so gets the widest plate set and the widest
   count range; noise carries 7 and needs neither. */
const PLAN: Record<Motif, FamilyPlan> = {
  stack: { variants: VARIANTS.stack, counts: [3, 4, 5, 6], counts2: [2, 3, 4] },
  wave: { variants: VARIANTS.wave, counts: [3, 4, 5, 6], counts2: [2, 3] },
  rings: { variants: VARIANTS.rings, counts: [3, 4, 5, 6], counts2: [4, 6, 8] },
  split: { variants: VARIANTS.split, counts: [6, 7, 9, 11], counts2: [2, 3, 4] },
  grid: { variants: VARIANTS.grid, counts: [5, 7, 9, 11], counts2: [3, 4, 5] },
  orbit: { variants: VARIANTS.orbit, counts: [2, 3, 4], counts2: [1, 2, 3] },
  trail: { variants: VARIANTS.trail, counts: [6, 8, 10, 12], counts2: [2, 3] },
  noise: { variants: VARIANTS.noise, counts: [4, 6, 8], counts2: [4, 8] },
};

export interface PlateSpec {
  /** Index into the family's plate list. */
  variant: number;
  /** Primary element count, in the plate's own grammar. */
  count: number;
  /** Secondary count where the plate has two. */
  count2: number;
  /** 0-3. A deliberate step — tilt, lean, direction — read per plate. */
  turn: number;
  mirror: boolean;
  /** Index of the accented element, already inside 0..count-1. */
  accent: number;
  accentMode: AccentMode;
  anchor: Anchor;
  /** One of three scale steps. The figure never lands between them. */
  scale: number;
  /** Index into the dash rhythms; 0 is solid. */
  dash: number;
  chrome: Chrome;
}

export function resolve(motif: Motif, slug: string): PlateSpec {
  // The manifest is validated, but component-card casts entry.motif from a
  // plain string, so a motif outside the enum can reach here at runtime. It
  // resolves to stack's plan rather than to nothing: a blank poster is the
  // exact failure this system exists to remove.
  const plan: FamilyPlan = PLAN[motif] ?? PLAN.stack;
  const count = pick(slug, motif + '/count', plan.counts);

  return {
    variant: axis(slug, motif + '/variant', plan.variants),
    count,
    count2: pick(slug, motif + '/count2', plan.counts2),
    turn: pick(slug, motif + '/turn', TURNS),
    mirror: pick(slug, motif + '/mirror', MIRRORS),
    // Salted with the count so that two slugs sharing a plate and a count
    // still light up different members of the series.
    accent: axis(slug, motif + '/accent/' + count, count),
    accentMode: pick(slug, motif + '/accent-mode', ACCENT_MODES),
    anchor: pick(slug, motif + '/anchor', ANCHORS),
    scale: pick(slug, motif + '/scale', SCALES),
    dash: pick(slug, motif + '/dash', DASHES),
    chrome: pick(slug, motif + '/chrome', CHROMES),
  };
}
