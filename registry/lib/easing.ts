/* ==========================================================================
   Easing.
   --------------------------------------------------------------------------
   Plain functions on [0,1] so a component can ease without pulling in GSAP,
   plus the matching `cubic-bezier()` strings for CSS. The two lists are the
   same curves, so a component can animate in JS and its reduced-motion
   fallback can animate in CSS without the timing changing character.
   ========================================================================== */

export type EasingFn = (t: number) => number;

export const linear: EasingFn = (t) => t;

export const easeInQuad: EasingFn = (t) => t * t;
export const easeOutQuad: EasingFn = (t) => 1 - (1 - t) * (1 - t);
export const easeInOutQuad: EasingFn = (t) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export const easeInCubic: EasingFn = (t) => t * t * t;
export const easeOutCubic: EasingFn = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeInQuart: EasingFn = (t) => t * t * t * t;
export const easeOutQuart: EasingFn = (t) => 1 - Math.pow(1 - t, 4);
export const easeInOutQuart: EasingFn = (t) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

export const easeInExpo: EasingFn = (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10));
export const easeOutExpo: EasingFn = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInOutExpo: EasingFn = (t) =>
  t === 0
    ? 0
    : t === 1
      ? 1
      : t < 0.5
        ? Math.pow(2, 20 * t - 10) / 2
        : (2 - Math.pow(2, -20 * t + 10)) / 2;

/** Overshoots past 1 then settles. `s` is the overshoot amount. */
export const backOut = (s = 1.70158): EasingFn => {
  const c = s + 1;
  return (t) => 1 + c * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
};

export const elasticOut: EasingFn = (t) => {
  const c = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c) + 1;
};

/** CSS equivalents of the curves above, for reduced-motion fallbacks. */
export const CSS_EASING = {
  outQuad: 'cubic-bezier(0.5, 1, 0.89, 1)',
  outCubic: 'cubic-bezier(0.33, 1, 0.68, 1)',
  outQuart: 'cubic-bezier(0.25, 1, 0.5, 1)',
  outExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  inOutQuart: 'cubic-bezier(0.76, 0, 0.24, 1)',
  inOutExpo: 'cubic-bezier(0.87, 0, 0.13, 1)',
} as const;
