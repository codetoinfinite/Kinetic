/* ==========================================================================
   Frame-rate-independent interpolation.
   --------------------------------------------------------------------------
   The everywhere-idiom `x += (target - x) * 0.1` is a bug: it converges twice
   as fast on a 120 Hz display as on a 60 Hz one, so the same code feels
   different on different hardware and visibly speeds up when the browser
   drops frames. `damp` fixes it by raising the retention factor to the power
   of elapsed time, which is the exact continuous form of the same curve.
   ========================================================================== */

/**
 * Fraction of the remaining distance to close this frame.
 *
 * @param smoothing Fraction of the gap that REMAINS after one second.
 *   Smaller is snappier. 0.001 ≈ very fast, 0.01 ≈ fast, 0.1 ≈ soft,
 *   0.5 ≈ slow drift.
 * @param dt Seconds elapsed since the previous frame.
 */
export function dampFactor(smoothing: number, dt: number): number {
  return 1 - Math.pow(smoothing, dt);
}

/** Move `current` toward `target` at a rate independent of frame rate. */
export function damp(
  current: number,
  target: number,
  smoothing: number,
  dt: number,
): number {
  return current + (target - current) * dampFactor(smoothing, dt);
}

/**
 * The per-frame lerp constant an author measured at 60fps, converted into the
 * `smoothing` argument `damp` wants. Lets a source that says "0.1 per frame"
 * be ported without re-tuning by eye:
 *
 *   damp(x, t, perFrameToSmoothing(0.1), dt)
 */
export function perFrameToSmoothing(alpha: number, baseFps = 60): number {
  return Math.pow(1 - alpha, baseFps);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function inverseLerp(a: number, b: number, v: number): number {
  return a === b ? 0 : (v - a) / (b - a);
}

export function mapRange(
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  doClamp = true,
): number {
  const t = inverseLerp(inMin, inMax, v);
  const r = lerp(outMin, outMax, doClamp ? clamp(t, 0, 1) : t);
  return r;
}

/** GLSL `smoothstep`, same semantics, for parity between JS and shader code. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp(inverseLerp(edge0, edge1, x), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Gaussian falloff, `exp(-d²)`. Yields 1.000 / 0.368 / 0.018 / 0.0001 at
 * distances 0 / 1 / 2 / 3 — a continuous focus scalar with no thresholds and
 * no branches, which is why carousels that use it feel analogue rather than
 * stepped.
 */
export function gaussian(distance: number, falloff = 1): number {
  const d = distance * falloff;
  return Math.exp(-(d * d));
}
