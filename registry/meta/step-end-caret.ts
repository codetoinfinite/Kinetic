import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'step-end-caret',
  title: 'Step-End Blinking Caret',
  category: 'text',
  tags: ['css', 'caret', 'cursor', 'keyframes', 'terminal'],
  blurb:
    'A text caret that snaps on and off instead of fading, using step-end timing and an uneven blink rhythm.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/step-end-caret.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],
  registryDependencies: [],

  summary:
    'A bar caret that blinks the way a terminal cursor does: fully on, then fully off, with nothing in between. The switch is `animation-timing-function: step-end`, which holds each keyframe value until the next one rather than interpolating toward it. The keyframe distribution is deliberately uneven so the rhythm reads as alive rather than as a metronome, and the whole thing is CSS — no JavaScript runs after mount.',

  mechanism: [
    'A single `@keyframes` rule sets `opacity: 1` at 0%, 70% and 100%, and `opacity: 0` at 20% and 50%. With `step-end`, each value is held until the following keyframe is reached, so opacity is only ever exactly 1 or exactly 0.',
    'The shorthand `animation: var(--kx-caret-period, 1.05s) step-end infinite kinetic-caret-blink` puts the period in a custom property, so the `period` prop varies the speed through an inline `style` without generating a new class or a new keyframe rule.',
    'The bar itself is an `inline-block` span with `background-color: currentColor`, so it inherits the colour of the text it sits in, and `vertical-align: -0.14em` to seat it on the baseline of the surrounding type rather than the box.',
    'The `paused` state sets `animation: none; opacity: 1` rather than `animation-play-state: paused` — pausing freezes on whichever frame the clock happened to reach, which is a coin flip between a visible caret and an invisible one.',
    'The stylesheet is emitted through React 19\'s `<style href precedence>` hoisting, so the rule is deduplicated by `href` and a hundred carets on a page produce exactly one rule in the document.',
  ],

  constants: [
    {
      name: 'period',
      value: '1.05',
      why: 'Seconds per full on-off-on-off cycle. Terminal defaults sit near 1s; below ~0.6s it reads as an error indicator, above ~1.6s the reader stops associating the blink with the text it follows.',
    },
    {
      name: 'keyframe stops',
      value: '0/20/50/70/100%',
      why: 'On 0-20, off 20-50, on 50-70, off 70-100. An even 50/50 square wave reads as a metronome. The long-on / short-off asymmetry is what makes it read as something alive rather than as a timer.',
    },
    {
      name: 'width',
      value: '2',
      why: 'Pixels. 1px disappears at typical body sizes on a low-DPI display; past 3px it stops being a caret and starts being a block cursor, which implies overtype mode.',
    },
    {
      name: 'vertical-align',
      value: '-0.14em',
      why: 'Seats the bar on the text baseline. At 0 the caret floats above the descender line and looks like a stray rule; in `em` it tracks the type size, so the same caret is correct at 14px and at 72px.',
    },
  ],

  pitfalls: [
    'Leaving the default `ease` timing function. The opacity interpolates and the caret pulses like a glow, which reads as decoration; a cursor must be unambiguously present or absent.',
    'Using `animation-play-state: paused` for the held state. It stops on an arbitrary frame, so roughly half the time the "solid" caret is invisible and the user thinks the field lost focus.',
    'A symmetric 50/50 blink. It reads as mechanical timekeeping rather than as a cursor waiting for input.',
    'Hardcoding the caret colour. `background-color: currentColor` is what lets the same component sit inside inverted, accented or muted text without a variant per context.',
    'Emitting the keyframes per instance in a styled-component or inline `<style>` without a precedence key. Ten carets means ten identical rule sets the style engine has to resolve.',
    'Exposing the caret to assistive technology. It is `aria-hidden` — a screen reader announcing a decorative bar between every phrase is noise.',
  ],

  notes: [
    'No JavaScript executes after mount: no rAF loop, no timer, no listener, nothing to clean up. The component is a span and a stylesheet.',
    'Designed to be composed — `asymmetric-typewriter` renders this component and drives its `paused` prop from its own typing state.',
  ],

  apiSignature:
    "function StepEndCaret(props: { width?: number; height?: string; period?: number; paused?: boolean; className?: string }): JSX.Element",

  props: [
    { name: 'width', type: 'number', default: '2', description: 'Bar width in pixels.' },
    { name: 'height', type: 'string', default: "'1em'", description: 'Any CSS length. `em` keeps it locked to the surrounding type size.' },
    { name: 'period', type: 'number', default: '1.05', description: 'Seconds for one full on-off-on-off cycle.' },
    { name: 'paused', type: 'boolean', default: 'false', description: 'Hold the caret solid — what a terminal does while keys are down.' },
    { name: 'className', type: 'string', description: 'Merged onto the bar via `cn`.' },
  ],

  reducedMotion:
    'A `@media (prefers-reduced-motion: reduce)` block inside the component stylesheet sets `animation: none; opacity: 1`. The caret remains fully visible and correctly positioned — it simply stops blinking. It is never left in the off state.',

  cleanup:
    'Nothing to clean up. There is no effect, no timer and no listener; unmounting removes the span, and React\'s stylesheet hoisting handles the shared rule.',

  acceptance:
    'The bar is either fully opaque or fully invisible at every moment — screenshot it repeatedly and no intermediate opacity appears. Set `paused` and it goes solid immediately rather than freezing wherever it was. Render ten carets and inspect the document: one `kinetic-step-end-caret` stylesheet. Enable reduced motion and the caret is present and solid.',

  criticalRegion: 'critical',
};

export default meta;
