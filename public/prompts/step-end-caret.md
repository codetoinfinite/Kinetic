# Build: Step-End Blinking Caret

A bar caret that blinks the way a terminal cursor does: fully on, then fully off, with nothing in between. The switch is `animation-timing-function: step-end`, which holds each keyframe value until the next one rather than interpolating toward it. The keyframe distribution is deliberately uneven so the rhythm reads as alive rather than as a metronome, and the whole thing is CSS — no JavaScript runs after mount.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A text caret that snaps on and off instead of fading, using step-end timing and an uneven blink rhythm.

- Category: text
- Runtime cost: css
- Dependencies: none beyond React

## How it works

1. A single `@keyframes` rule sets `opacity: 1` at 0%, 70% and 100%, and `opacity: 0` at 20% and 50%. With `step-end`, each value is held until the following keyframe is reached, so opacity is only ever exactly 1 or exactly 0.
2. The shorthand `animation: var(--kx-caret-period, 1.05s) step-end infinite kinetic-caret-blink` puts the period in a custom property, so the `period` prop varies the speed through an inline `style` without generating a new class or a new keyframe rule.
3. The bar itself is an `inline-block` span with `background-color: currentColor`, so it inherits the colour of the text it sits in, and `vertical-align: -0.14em` to seat it on the baseline of the surrounding type rather than the box.
4. The `paused` state sets `animation: none; opacity: 1` rather than `animation-play-state: paused` — pausing freezes on whichever frame the clock happened to reach, which is a coin flip between a visible caret and an invisible one.
5. The stylesheet is emitted through React 19's `<style href precedence>` hoisting, so the rule is deduplicated by `href` and a hundred carets on a page produce exactly one rule in the document.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `period = 1.05`
  Seconds per full on-off-on-off cycle. Terminal defaults sit near 1s; below ~0.6s it reads as an error indicator, above ~1.6s the reader stops associating the blink with the text it follows.
- `keyframe stops = 0/20/50/70/100%`
  On 0-20, off 20-50, on 50-70, off 70-100. An even 50/50 square wave reads as a metronome. The long-on / short-off asymmetry is what makes it read as something alive rather than as a timer.
- `width = 2`
  Pixels. 1px disappears at typical body sizes on a low-DPI display; past 3px it stops being a caret and starts being a block cursor, which implies overtype mode.
- `vertical-align = -0.14em`
  Seats the bar on the text baseline. At 0 the caret floats above the descender line and looks like a stray rule; in `em` it tracks the type size, so the same caret is correct at 14px and at 72px.

## API

```ts
function StepEndCaret(props: { width?: number; height?: string; period?: number; paused?: boolean; className?: string }): JSX.Element
```

- `width: number` — default `2`
  Bar width in pixels.
- `height: string` — default `'1em'`
  Any CSS length. `em` keeps it locked to the surrounding type size.
- `period: number` — default `1.05`
  Seconds for one full on-off-on-off cycle.
- `paused: boolean` — default `false`
  Hold the caret solid — what a terminal does while keys are down.
- `className: string`
  Merged onto the bar via `cn`.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const CARET_CSS = `
@keyframes kinetic-caret-blink {
  0%, 70%, 100% { opacity: 1; }
  20%, 50%      { opacity: 0; }
}
.kinetic-caret {
  display: inline-block;
  background-color: currentColor;
  vertical-align: -0.14em;
  animation: var(--kx-caret-period, 1.05s) step-end infinite kinetic-caret-blink;
}
/* Paused means solid, not frozen. 'animation-play-state: paused' stops on
   whatever frame it happened to be on, which is a 50% chance of an invisible
   caret. Dropping the animation entirely re-exposes the base opacity. */
.kinetic-caret[data-paused='true'] {
  animation: none;
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .kinetic-caret {
    animation: none;
    opacity: 1;
  }
}
`;

export interface StepEndCaretProps {
  /** Bar width in px. */
  width?: number;
  /** Any CSS length. `em` keeps it locked to the type size around it. */
  height?: string;
  /** Seconds for one on-off-on-off cycle. */
  period?: number;
  /** Hold the caret solid — what a real terminal does while keys are down. */
  paused?: boolean;
  className?: string;
}

export function StepEndCaret({
  width = 2,
  height = '1em',
  period = 1.05,
  paused = false,
  className,
}: StepEndCaretProps) {
  return (
    <>
      <style href="kinetic-step-end-caret" precedence="medium">
        {CARET_CSS}
      </style>
      <span
        aria-hidden
        data-paused={paused ? 'true' : 'false'}
        className={cn('kinetic-caret', className)}
        style={
          {
            width,
            height,
            '--kx-caret-period': `${period}s`,
          } as CSSProperties
        }
      />
    </>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. There is no effect, no timer and no listener; unmounting removes the span, and React's stylesheet hoisting handles the shared rule.

**Reduced motion.** A `@media (prefers-reduced-motion: reduce)` block inside the component stylesheet sets `animation: none; opacity: 1`. The caret remains fully visible and correctly positioned — it simply stops blinking. It is never left in the off state.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Leaving the default `ease` timing function. The opacity interpolates and the caret pulses like a glow, which reads as decoration; a cursor must be unambiguously present or absent.
- Using `animation-play-state: paused` for the held state. It stops on an arbitrary frame, so roughly half the time the "solid" caret is invisible and the user thinks the field lost focus.
- A symmetric 50/50 blink. It reads as mechanical timekeeping rather than as a cursor waiting for input.
- Hardcoding the caret colour. `background-color: currentColor` is what lets the same component sit inside inverted, accented or muted text without a variant per context.
- Emitting the keyframes per instance in a styled-component or inline `<style>` without a precedence key. Ten carets means ten identical rule sets the style engine has to resolve.
- Exposing the caret to assistive technology. It is `aria-hidden` — a screen reader announcing a decorative bar between every phrase is noise.

## Notes

- No JavaScript executes after mount: no rAF loop, no timer, no listener, nothing to clean up. The component is a span and a stylesheet.
- Designed to be composed — `asymmetric-typewriter` renders this component and drives its `paused` prop from its own typing state.

## Definition of done

The bar is either fully opaque or fully invisible at every moment — screenshot it repeatedly and no intermediate opacity appears. Set `paused` and it goes solid immediately rather than freezing wherever it was. Render ten carets and inspect the document: one `kinetic-step-end-caret` stylesheet. Enable reduced motion and the caret is present and solid.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
