# Build: Looping Scroll Cue

A short line that falls repeatedly through a clipping tube, the way a hero says "keep going" without saying it. It is pure CSS — one keyframe pair on one transform — so it costs nothing after mount and a dozen of them still emit a single rule. The character is entirely in the easing: the line hangs, dives, and hangs again, and the pause between dives is what reads as an instruction.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

The hairline that dives down a hero. One keyframe pair, a hard ease, and a seamless loop.

- Category: primitive
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. A `span` is the tube: `position: relative`, `overflow: hidden`, `block-size: var(--kx-cue-length)`, `inline-size: var(--kx-cue-thickness)`. Everything visible happens inside its clip.
2. A child span is the line: absolutely positioned at `top: 0`, `block-size: var(--kx-cue-run)` — 40% of the tube — with `background-color: currentColor`, so the cue takes the colour of whatever text it sits beside.
3. One keyframe pair moves it from `translateY(-100%)` to `translateY(250%)`. Percentages on `translateY` resolve against the element's own height, not the tube's, so with the line at 40% the two ends are exactly flush with the outside of the clip: 40% x 1 above the top, 40% x 2.5 = 100% below it.
4. The line's resting transform is set to `translateY(-100%)`, identical to the keyframe start, so the element is already outside the clip before the animation attaches and there is no first-frame flash.
5. The timing function is `cubic-bezier(.76, 0, .24, 1)`, applied over the whole iteration rather than per keyframe — a hard ease-in-out that spends most of the cycle nearly stationary at the two extremes, both of which are off-screen.
6. The stylesheet is a module-level template literal emitted through React 19's `<style href precedence>`, so it is hoisted to the document head once no matter how many cues render.
7. Reduced motion is answered twice: a `@media (prefers-reduced-motion: reduce)` block so the server-rendered first paint is already correct, and `data-static` from `useReducedMotion` so a setting changed mid-session takes effect. Both resolve to `animation: none; top: 50%; transform: translateY(-50%)`.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `travel = -100% to 250%`
  Relative to the line, not the tube. 350% of its own height means it is entirely outside the clip at both ends, so the wrap from the last frame back to the first happens while nothing is visible. Animating 0% to 100% instead makes the line vanish at the bottom edge and reappear at the top in the same frame, which is the visible seam every hand-rolled version has.
- `--kx-cue-run = 40%`
  The line's height as a fraction of the tube, and the number that makes 250% exactly the far edge. At 100% the line fills the tube and the cue reads as a wipe rather than a falling object; below about 20% it is too short to register as travelling at this speed.
- `timing function = cubic-bezier(.76, 0, .24, 1)`
  A hard ease-in-out with almost no linear section. `linear` reads as a loading bar and `ease-in-out` is too soft to punctuate. The steep middle is what compresses the visible part of the cycle into a dive, leaving a deliberate pause between repetitions.
- `--kx-cue-period = 1.8s`
  One dive plus the pause. Under about 1.2s the cue nags; past roughly 2.5s a visitor can land, look, and leave without ever seeing it move, which defeats the point of having it.
- `--kx-cue-length = 3.5rem`
  Long enough that the dive is legible as travel rather than as a blink, short enough to sit under a line of body copy without becoming a design element in its own right.

## API

```ts
function LoopingScrollCue(props: { length?: string; thickness?: string; run?: string; period?: number; delay?: number; paused?: boolean; className?: string }): JSX.Element
```

- `length: string` — default `'3.5rem'`
  Height of the tube. Any CSS length.
- `thickness: string` — default `'1px'`
  Width of the line.
- `run: string` — default `'40%'`
  Height of the travelling segment as a percentage of the tube.
- `period: number` — default `1.8`
  Seconds for one dive plus its pause.
- `delay: number` — default `0`
  Seconds before the first dive. Use it to stagger a row.
- `paused: boolean` — default `false`
  Park the line in the middle of the tube instead of running it.
- `className: string`
  Merged onto the tube. Set `text-*` to colour the line.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const CUE_CSS = `
@keyframes kx-scroll-cue-travel {
  from { transform: translateY(-100%); }
  to   { transform: translateY(250%); }
}
.kx-scroll-cue {
  position: relative;
  display: block;
  overflow: hidden;
  flex: none;
  inline-size: var(--kx-cue-thickness, 1px);
  block-size: var(--kx-cue-length, 3.5rem);
  color: currentColor;
}
.kx-scroll-cue-line {
  position: absolute;
  inset-inline: 0;
  top: 0;
  block-size: var(--kx-cue-run, 40%);
  background-color: currentColor;
  /* Matches the keyframe start, so the line is already outside the clip
     before the first frame and never flashes at rest. */
  transform: translateY(-100%);
  animation: var(--kx-cue-period, 1.8s) cubic-bezier(.76, 0, .24, 1) infinite
    kx-scroll-cue-travel;
  animation-delay: var(--kx-cue-delay, 0s);
}
/* Parked, not frozen. 'animation-play-state: paused' stops on whatever frame
   it reached, and for roughly half the cycle that frame is off-screen — the
   cue would simply vanish. */
.kx-scroll-cue[data-static='true'] .kx-scroll-cue-line {
  animation: none;
  top: 50%;
  transform: translateY(-50%);
}
@media (prefers-reduced-motion: reduce) {
  .kx-scroll-cue .kx-scroll-cue-line {
    animation: none;
    top: 50%;
    transform: translateY(-50%);
  }
}
`;

export interface LoopingScrollCueProps {
  /** Height of the tube. Any CSS length. */
  length?: string;
  /** Width of the line. Any CSS length. */
  thickness?: string;
  /** Height of the travelling segment, as a percentage of the tube. */
  run?: string;
  /** Seconds for one full dive. */
  period?: number;
  /** Seconds before the first dive. Stagger a row of cues with this. */
  delay?: number;
  /** Park the line in the middle instead of running it. */
  paused?: boolean;
  className?: string;
}

export function LoopingScrollCue({
  length = '3.5rem',
  thickness = '1px',
  run = '40%',
  period = 1.8,
  delay = 0,
  paused = false,
  className,
}: LoopingScrollCueProps) {
  const reduced = useReducedMotion();

  return (
    <>
      {/* Hoisted once by React 19 regardless of how many cues are on the page. */}
      <style href="kinetic-looping-scroll-cue" precedence="medium">
        {CUE_CSS}
      </style>
      <span
        aria-hidden
        data-static={reduced || paused ? 'true' : 'false'}
        className={cn('kx-scroll-cue', className)}
        style={
          {
            '--kx-cue-length': length,
            '--kx-cue-thickness': thickness,
            '--kx-cue-run': run,
            '--kx-cue-period': `${period}s`,
            '--kx-cue-delay': `${delay}s`,
          } as CSSProperties
        }
      >
        <span className="kx-scroll-cue-line" />
      </span>
    </>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to release. No timers, no rAF, no listeners, no observers — the only side effect is the hoisted stylesheet, which React reference-counts and removes when the last cue unmounts.

**Reduced motion.** The line stops travelling and parks in the middle of the tube — visible, centred, still a cue. This is enforced both by a `@media (prefers-reduced-motion: reduce)` block in the hoisted stylesheet, which is correct from the first server-rendered paint, and by `data-static` driven from `useReducedMotion`, which catches the setting being changed while the page is open.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Animating `top` or `margin-top` instead of `transform`. Both are laid out on the main thread every frame; the transform runs on the compositor and is the difference between a cue that stays smooth during a heavy hero animation and one that stutters exactly when the page is busiest.
- Animating 0% to 100%. The line disappears at the bottom edge and is already back at the top on the next frame — the loop has a visible seam, and it is the single most common way this effect is got wrong.
- Assuming the percentages are relative to the tube. `translateY` percentages resolve against the transformed element, so changing the line's height silently changes where the travel ends, and a taller line stops exiting the clip.
- Using `animation-play-state: paused` for a paused state. The line stops on whatever frame it reached, and for roughly half the cycle that frame is outside the clip, so "paused" means "gone" about half the time it is used.
- Honouring reduced motion by rendering the animation's end state. The end state here is off-screen, so the cue would correctly render nothing. Park it in the middle instead: the point of a scroll cue is that it is visible.
- Relying on the `useReducedMotion` hook alone. It reads `false` during server render, so the first client paint animates for a frame before the hook corrects it — the media query in the stylesheet is what covers that window.
- Leaving the line's resting transform at its default. Without `transform: translateY(-100%)` matching the keyframe start, the line is briefly visible at the top of the tube between paint and the animation's first frame.

## Notes

- Cost is CSS. Nothing runs after mount, there is nothing to clean up, and a row of cues is one rule plus one custom-property block each.
- Stagger a row with `delay` — the same period at three different offsets reads as a single wave without any coordination.
- The cue is `aria-hidden`. It is a hint, not content, and a screen reader announcing a decorative line is noise.

## Definition of done

The line falls through the tube, disappears, and pauses before falling again — and at no point is it visible in two places or seen jumping back to the top. Watch a full minute: the loop point cannot be identified. Turn on reduced motion and the line is a static hairline in the centre of the tube, not an empty box.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
