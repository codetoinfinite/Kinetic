import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'looping-scroll-cue',
  title: 'Looping Scroll Cue',
  category: 'primitive',
  tags: ['css', 'keyframes', 'scroll-cue', 'hero', 'loop'],
  blurb: 'The hairline that dives down a hero. One keyframe pair, a hard ease, and a seamless loop.',
  cost: 'css',
  motif: 'wave',

  files: [
    {
      path: 'registry/ui/looping-scroll-cue.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A short line that falls repeatedly through a clipping tube, the way a hero says "keep going" without saying it. It is pure CSS — one keyframe pair on one transform — so it costs nothing after mount and a dozen of them still emit a single rule. The character is entirely in the easing: the line hangs, dives, and hangs again, and the pause between dives is what reads as an instruction.',

  mechanism: [
    'A `span` is the tube: `position: relative`, `overflow: hidden`, `block-size: var(--kx-cue-length)`, `inline-size: var(--kx-cue-thickness)`. Everything visible happens inside its clip.',
    'A child span is the line: absolutely positioned at `top: 0`, `block-size: var(--kx-cue-run)` — 40% of the tube — with `background-color: currentColor`, so the cue takes the colour of whatever text it sits beside.',
    'One keyframe pair moves it from `translateY(-100%)` to `translateY(250%)`. Percentages on `translateY` resolve against the element\'s own height, not the tube\'s, so with the line at 40% the two ends are exactly flush with the outside of the clip: 40% x 1 above the top, 40% x 2.5 = 100% below it.',
    'The line\'s resting transform is set to `translateY(-100%)`, identical to the keyframe start, so the element is already outside the clip before the animation attaches and there is no first-frame flash.',
    'The timing function is `cubic-bezier(.76, 0, .24, 1)`, applied over the whole iteration rather than per keyframe — a hard ease-in-out that spends most of the cycle nearly stationary at the two extremes, both of which are off-screen.',
    'The stylesheet is a module-level template literal emitted through React 19\'s `<style href precedence>`, so it is hoisted to the document head once no matter how many cues render.',
    'Reduced motion is answered twice: a `@media (prefers-reduced-motion: reduce)` block so the server-rendered first paint is already correct, and `data-static` from `useReducedMotion` so a setting changed mid-session takes effect. Both resolve to `animation: none; top: 50%; transform: translateY(-50%)`.',
  ],

  constants: [
    {
      name: 'travel',
      value: '-100% to 250%',
      why: 'Relative to the line, not the tube. 350% of its own height means it is entirely outside the clip at both ends, so the wrap from the last frame back to the first happens while nothing is visible. Animating 0% to 100% instead makes the line vanish at the bottom edge and reappear at the top in the same frame, which is the visible seam every hand-rolled version has.',
    },
    {
      name: '--kx-cue-run',
      value: '40%',
      why: 'The line\'s height as a fraction of the tube, and the number that makes 250% exactly the far edge. At 100% the line fills the tube and the cue reads as a wipe rather than a falling object; below about 20% it is too short to register as travelling at this speed.',
    },
    {
      name: 'timing function',
      value: 'cubic-bezier(.76, 0, .24, 1)',
      why: 'A hard ease-in-out with almost no linear section. `linear` reads as a loading bar and `ease-in-out` is too soft to punctuate. The steep middle is what compresses the visible part of the cycle into a dive, leaving a deliberate pause between repetitions.',
    },
    {
      name: '--kx-cue-period',
      value: '1.8s',
      why: 'One dive plus the pause. Under about 1.2s the cue nags; past roughly 2.5s a visitor can land, look, and leave without ever seeing it move, which defeats the point of having it.',
    },
    {
      name: '--kx-cue-length',
      value: '3.5rem',
      why: 'Long enough that the dive is legible as travel rather than as a blink, short enough to sit under a line of body copy without becoming a design element in its own right.',
    },
  ],

  pitfalls: [
    'Animating `top` or `margin-top` instead of `transform`. Both are laid out on the main thread every frame; the transform runs on the compositor and is the difference between a cue that stays smooth during a heavy hero animation and one that stutters exactly when the page is busiest.',
    'Animating 0% to 100%. The line disappears at the bottom edge and is already back at the top on the next frame — the loop has a visible seam, and it is the single most common way this effect is got wrong.',
    'Assuming the percentages are relative to the tube. `translateY` percentages resolve against the transformed element, so changing the line\'s height silently changes where the travel ends, and a taller line stops exiting the clip.',
    'Using `animation-play-state: paused` for a paused state. The line stops on whatever frame it reached, and for roughly half the cycle that frame is outside the clip, so "paused" means "gone" about half the time it is used.',
    'Honouring reduced motion by rendering the animation\'s end state. The end state here is off-screen, so the cue would correctly render nothing. Park it in the middle instead: the point of a scroll cue is that it is visible.',
    'Relying on the `useReducedMotion` hook alone. It reads `false` during server render, so the first client paint animates for a frame before the hook corrects it — the media query in the stylesheet is what covers that window.',
    'Leaving the line\'s resting transform at its default. Without `transform: translateY(-100%)` matching the keyframe start, the line is briefly visible at the top of the tube between paint and the animation\'s first frame.',
  ],

  notes: [
    'Cost is CSS. Nothing runs after mount, there is nothing to clean up, and a row of cues is one rule plus one custom-property block each.',
    'Stagger a row with `delay` — the same period at three different offsets reads as a single wave without any coordination.',
    'The cue is `aria-hidden`. It is a hint, not content, and a screen reader announcing a decorative line is noise.',
  ],

  apiSignature:
    'function LoopingScrollCue(props: { length?: string; thickness?: string; run?: string; period?: number; delay?: number; paused?: boolean; className?: string }): JSX.Element',

  props: [
    { name: 'length', type: 'string', default: "'3.5rem'", description: 'Height of the tube. Any CSS length.' },
    { name: 'thickness', type: 'string', default: "'1px'", description: 'Width of the line.' },
    { name: 'run', type: 'string', default: "'40%'", description: 'Height of the travelling segment as a percentage of the tube.' },
    { name: 'period', type: 'number', default: '1.8', description: 'Seconds for one dive plus its pause.' },
    { name: 'delay', type: 'number', default: '0', description: 'Seconds before the first dive. Use it to stagger a row.' },
    { name: 'paused', type: 'boolean', default: 'false', description: 'Park the line in the middle of the tube instead of running it.' },
    { name: 'className', type: 'string', description: 'Merged onto the tube. Set `text-*` to colour the line.' },
  ],

  reducedMotion:
    'The line stops travelling and parks in the middle of the tube — visible, centred, still a cue. This is enforced both by a `@media (prefers-reduced-motion: reduce)` block in the hoisted stylesheet, which is correct from the first server-rendered paint, and by `data-static` driven from `useReducedMotion`, which catches the setting being changed while the page is open.',

  cleanup:
    'Nothing to release. No timers, no rAF, no listeners, no observers — the only side effect is the hoisted stylesheet, which React reference-counts and removes when the last cue unmounts.',

  acceptance:
    'The line falls through the tube, disappears, and pauses before falling again — and at no point is it visible in two places or seen jumping back to the top. Watch a full minute: the loop point cannot be identified. Turn on reduced motion and the line is a static hairline in the centre of the tube, not an empty box.',

  criticalRegion: 'critical',
};

export default meta;
