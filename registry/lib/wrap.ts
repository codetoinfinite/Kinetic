/* ==========================================================================
   Ring index arithmetic.
   --------------------------------------------------------------------------
   Anything that loops — a drum carousel, an infinite marquee, a cylinder of
   image planes — needs to answer "how far is item i from position p" in a way
   that treats the sequence as a circle. A plain `i - p` says item 0 is 18 away
   from item 18 in a list of 19, when really it is 1 step back.
   ========================================================================== */

/** True modulo. Unlike `%`, the result is never negative. */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Shortest signed distance from `position` to index `i` around a ring of
 * `count` items. Result is in `(-count/2, count/2]`; negative means "behind".
 *
 * This one function is what makes a finite array behave like an infinite one.
 */
export function wrappedOffset(i: number, position: number, count: number): number {
  if (count <= 0) return 0;
  let offset = mod(i - position, count);
  if (offset > count / 2) offset -= count;
  return offset;
}

/** Wrap `value` into `[min, max)`, e.g. an angle into `[-PI, PI)`. */
export function wrapRange(value: number, min: number, max: number): number {
  const span = max - min;
  if (span <= 0) return min;
  return mod(value - min, span) + min;
}

/** Wrap an index into `[0, count)`. Accepts fractional and negative input. */
export function wrapIndex(i: number, count: number): number {
  return count <= 0 ? 0 : mod(i, count);
}

/**
 * Shortest signed angular distance from `a` to `b` in radians, in `(-PI, PI]`.
 * Prevents a rotation tween from taking the long way round.
 */
export function shortestAngle(a: number, b: number): number {
  return wrapRange(b - a, -Math.PI, Math.PI);
}
