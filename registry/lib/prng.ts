/* ==========================================================================
   Seeded randomness.
   --------------------------------------------------------------------------
   `Math.random()` in a particle field means the server and the client
   disagree, which React reports as a hydration mismatch, and it means the
   layout is different on every reload so a visual regression is invisible.
   Every component that scatters something uses a seeded generator instead.
   ========================================================================== */

export type Rng = () => number;

/**
 * mulberry32 — 32-bit, fast, and good enough for visual scatter. Returns a
 * function yielding floats in [0, 1).
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turn any string into a 32-bit seed, so `seed="hero"` is reproducible. */
export function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRng(seed: number | string): Rng {
  return mulberry32(typeof seed === 'string' ? hashSeed(seed) : seed);
}

export function randRange(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function randInt(rng: Rng, min: number, maxExclusive: number): number {
  return Math.floor(randRange(rng, min, maxExclusive));
}

/**
 * Uniform point on a unit sphere. Naive angle-pairing clusters at the poles;
 * this inverts the cosine so density is even.
 */
export function randOnSphere(rng: Rng): [number, number, number] {
  const u = rng() * 2 - 1;
  const theta = rng() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  return [r * Math.cos(theta), r * Math.sin(theta), u];
}

/** Uniform point in a unit disc — `sqrt` prevents crowding at the centre. */
export function randInDisc(rng: Rng): [number, number] {
  const r = Math.sqrt(rng());
  const theta = rng() * Math.PI * 2;
  return [r * Math.cos(theta), r * Math.sin(theta)];
}

/** In-place Fisher-Yates using the supplied generator. */
export function shuffle<T>(rng: Rng, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i + 1);
    const a = arr[i] as T;
    const b = arr[j] as T;
    arr[i] = b;
    arr[j] = a;
  }
  return arr;
}
