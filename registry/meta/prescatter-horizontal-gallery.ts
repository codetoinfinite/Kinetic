import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'prescatter-horizontal-gallery',
  title: 'Pre-Scatter Horizontal Gallery',
  category: 'scroll',
  tags: ['gsap', 'scrolltrigger', 'containeranimation', 'horizontal', 'scatter', 'seeded'],
  blurb: 'A pinned strip where each item rests slightly off its slot, flies in from ahead and peels away behind.',
  cost: 'dom',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/prescatter-horizontal-gallery.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['gsap@^3.15.0'],

  summary:
    'A pinned horizontal strip whose media is deliberately off-grid: every item gets a small seeded resting offset, then rides in from ahead of its slot and runs out behind it, rotating through zero on the way past. Two `fromTo` pairs per item — one entry, one exit — measured against the strip\'s own tween rather than against scroll position, so the choreography is a property of where an item is in the container, not of where the page is.',

  mechanism: [
    'The component owns a `PinnedHorizontalTrack` and captures its `onTrack` payload in state. The strip\'s tween is built in the child\'s effect and therefore arrives one commit late, which is why it is state and not a ref — the arrival has to re-run the builder.',
    'Every `[data-scatter]` element draws one value from `createRng(seed)`: `rest = (rng() - 0.5) * scatter`, a resting `xPercent` offset. It is applied with `gsap.set` for every item whether or not it animates, so the composition is identical with motion on and off.',
    'The entry is `fromTo(el, { xPercent: rest + sweep, yPercent: dir * lift, rotation: dir * rotation }, { xPercent: rest, yPercent: 0, rotation: 0 })` scrubbed over `left 110%` to `left 65%` — the item lags behind its slot and catches up as it crosses the container.',
    'The exit is the mirror: `fromTo(el, { xPercent: rest, yPercent: 0, rotation: 0 }, { xPercent: rest - sweep, yPercent: -dir * lift, rotation: -dir * rotation })` over `right 35%` to `right -10%`, with `immediateRender: false` so it does not overwrite the entry\'s from-state at creation.',
    '`dir` alternates by index parity, so odd items throw up and rotate clockwise while even items do the opposite, and the rotation passes continuously through zero between the two ranges.',
    'Both triggers take `containerAnimation: track.animation` and horizontal position keywords, so ScrollTrigger measures each item along the strip\'s timeline instead of down the page.',
  ],

  constants: [
    {
      name: 'scatter',
      value: '32',
      why: 'Total resting spread as a percentage of the item\'s own width, i.e. ±16%. Below ~10 the grid still reads as a grid and the effect is invisible; above ~50 items collide with their neighbours\' captions and it reads as a layout bug rather than a composition.',
    },
    {
      name: 'sweep',
      value: '400',
      why: 'Horizontal lag on entry and lead on exit, as a percentage of item width. Four widths is enough that the item is genuinely off-stage at the start of its range, so the catch-up is a travel rather than a nudge. Under ~150 the item is already visible when its tween begins and appears to jerk into place.',
    },
    {
      name: 'lift',
      value: '150',
      why: 'Vertical throw as a percentage of item height. At 100 the item starts exactly one height away, so its edge is still touching the frame; 150 clears the frame with margin, which is what makes it read as flying in rather than sliding.',
    },
    {
      name: 'rotation',
      value: '40°',
      why: 'Peak tilt. Under ~15° the rotation is mistaken for a rendering artefact; past ~60° the item is legibly upside-down at the extremes and text inside it becomes unreadable during the travel.',
    },
    {
      name: 'ENTER_START / ENTER_END',
      value: "'left 110%' / 'left 65%'",
      why: 'The item\'s leading edge, measured along the container. Starting past 100% means the tween begins before the item is visible, so nothing pops in already moving. Ending at 65% leaves the middle third of the crossing settled.',
    },
    {
      name: 'EXIT_START / EXIT_END',
      value: "'right 35%' / 'right -10%'",
      why: 'The trailing edge. Ending below 0% carries the item fully past the left frame before the tween completes, so it never freezes half-visible at the edge. The two ranges cannot overlap for any item narrower than 1.3 containers.',
    },
    {
      name: 'item scrub',
      value: 'true',
      why: 'Locked to the container animation, not a number. These triggers read the strip\'s progress, and the strip already scrubs with a second of catch-up, so a numeric scrub here smooths an already-smoothed signal and the items swim behind the panels they belong to.',
    },
  ],

  pitfalls: [
    'Using `gsap.to` for the exit. A `to` records its start values when it is created, which is after the entry has already rendered its from-state — so the exit animates from `xPercent: rest + sweep` and the item never returns to its slot.',
    'Using a second `fromTo` for the exit without `immediateRender: false`. A `fromTo` writes its from-state immediately, so the later tween wins and every item starts on the grid: the entry animation exists, runs, and is invisible.',
    'Keeping vertical position keywords with a `containerAnimation`. `start: "top 110%"` on a horizontal container resolves to a position the element never occupies. No error, no warning, no animation — the items simply arrive pre-placed.',
    'Measuring the scatter in pixels off the container width. It has to be recomputed on every ScrollTrigger refresh or the composition creeps as the window resizes; expressed as `xPercent` it resolves against the element and never needs invalidating.',
    '`Math.random()` for the offsets. The server and the client disagree at hydration, and the composition is different on every reload, so nobody can tell a regression from a reroll.',
    'Building the item triggers before the strip\'s tween exists. Treating `undefined` as "no container animation" builds a full set of vertical triggers on horizontal content and tears them down on the next commit — a visible flash of items that were already in place.',
    'Alternating direction from the generator instead of from the index. A random sign lands three items the same way often enough to look like a bug, where parity always reads as rhythm.',
  ],

  notes: [
    'Mark the media, not the panel: `data-scatter` on an inner element lets the panel keep the caption on the grid while the image drifts off it.',
    'ScrollTrigger forbids `pin` on a trigger that has a `containerAnimation`. The strip\'s section is pinned by `PinnedHorizontalTrack`; the items riding it are never pinned.',
    'Panels need `overflow: visible` for the sweep to be seen. Clipping happens once, at the pinned section\'s edge.',
  ],

  apiSignature:
    'function PrescatterHorizontalGallery(props: { children: ReactNode; scroller?: RefObject<HTMLElement | null>; seed?: number | string; scatter?: number; rotation?: number; lift?: number; sweep?: number; scrub?: number; className?: string; trackClassName?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Panels for the strip. Give each a width and `shrink-0`, and mark the media inside `data-scatter`.' },
    { name: 'scroller', type: 'RefObject<HTMLElement | null>', description: 'Scroll container the triggers read. Omit for the document.' },
    { name: 'seed', type: 'number | string', default: "'gallery'", description: 'Anything hashable. The same seed rebuilds the same composition.' },
    { name: 'scatter', type: 'number', default: '32', description: 'Total resting spread as a percentage of item width.' },
    { name: 'rotation', type: 'number', default: '40', description: 'Peak tilt in degrees, alternating by index.' },
    { name: 'lift', type: 'number', default: '150', description: 'Vertical throw as a percentage of item height.' },
    { name: 'sweep', type: 'number', default: '400', description: 'Horizontal lag and lead as a percentage of item width.' },
    { name: 'scrub', type: 'number', default: '1', description: 'Seconds of catch-up on the strip, forwarded to the pinned track.' },
    { name: 'className', type: 'string', description: 'Merged onto the gallery wrapper.' },
    { name: 'trackClassName', type: 'string', description: 'Merged onto the moving strip.' },
  ],

  reducedMotion:
    'The resting scatter is still applied — it is layout, not motion, and the gallery is supposed to look deliberately off-grid. What is dropped is the flight: no entry or exit triggers are created, so every item sits at its offset from first paint. The pinned track also declines to pin, so the strip becomes a horizontally scrollable row and every item stays reachable.',

  cleanup:
    'One `gsap.context` scoped to the root holds the `set` calls and both tweens per item, so `ctx.revert()` kills every tween, kills every ScrollTrigger, and strips the inline transforms back off the media. It runs on unmount and on every dependency change, including the commit where the strip\'s tween arrives.',

  acceptance:
    'Scroll into the section: it pins, the strip travels sideways, and each item swings in from ahead of its slot, straightens, holds through the middle of the crossing, then tilts the other way and runs out to the left. Scroll back up and every item reverses along the same path. Note that no two items rest exactly on the grid, and that reloading gives the identical composition. With reduced motion on, the items are already at their offsets and the strip can be swiped by hand.',

  criticalRegion: 'critical',
};

export default meta;
