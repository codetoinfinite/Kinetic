import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'container-animation-reveals',
  title: 'One Reveal Engine, Two Axes',
  category: 'scroll',
  tags: ['gsap', 'scrolltrigger', 'containeranimation', 'reveal', 'stagger'],
  blurb: 'The same staggered line reveal fires for vertical sections and for panels on a horizontal track.',
  cost: 'dom',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/container-animation-reveals.tsx',
      target: 'components/motion/container-animation-reveals.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/hooks/use-reduced-motion.ts',
      target: 'hooks/use-reduced-motion.ts',
      type: 'registry:hook',
      role: 'reduced-motion query, SSR-safe',
    },
  ],
  dependencies: ['gsap@^3.15.0'],
  registryDependencies: ['pinned-horizontal-track'],

  summary:
    'Lines rise out of a clipping box and fade up as their group enters. The interesting part is that the same builder serves a vertical page section and a panel riding a pinned horizontal strip — handed the strip\'s tween as `containerAnimation`, ScrollTrigger measures against that timeline\'s progress instead of scroll position. One set of numbers, two directions, nothing to keep in sync by hand.',

  mechanism: [
    'The subtree is scanned for `[data-reveal-group]` elements; each becomes one ScrollTrigger. A subtree with no groups reveals as a single group rooted on the component itself.',
    'Inside a group, every `[data-reveal]` element is a target of one `gsap.fromTo` running `{ yPercent: 110, opacity: 0.15 }` to `{ yPercent: 0, opacity: 1 }` on `power3.out` with a 0.12 s stagger — so the group is one tween, not one tween per line, and the stagger is real rather than simulated with delays.',
    'When a `containerAnimation` is supplied it is spread into the trigger vars and the position keywords flip from `top 88% / top 45%` to `left 85% / left 45%`, because a trigger attached to a container animation measures along that container\'s axis.',
    'The `containerAnimation` prop is tri-state: `undefined` means vertical flow, an animation means horizontal, and `null` means "a sibling owns the timeline and has not built it yet" — in which case nothing is built at all this commit.',
    '`scrub: 0.4` ties the reveal to scroll position with a short catch-up, so reversing direction reverses the reveal instead of replaying it.',
    'Everything is created inside a `gsap.context` scoped to the root, so `ctx.revert()` kills the triggers and restores the inline `transform` and `opacity` the tween wrote.',
  ],

  constants: [
    {
      name: 'lift',
      value: '110',
      why: 'Start offset as a percentage of the element\'s own height. 100 puts the line exactly at the bottom edge of its clipping box; 110 adds a sliver of overshoot so descenders are hidden through the whole travel rather than peeking under the mask on the first frame.',
    },
    {
      name: 'START_OPACITY',
      value: '0.15',
      why: 'Not 0. A line that fades from fully transparent reads as two separate events — a fade and a move. Starting at 0.15 makes the movement the thing you notice and the fade a supporting detail.',
    },
    {
      name: 'stagger',
      value: '0.12',
      why: 'Seconds between lines within a group. Below ~0.06 the lines read as one block; above ~0.2 the last line arrives after the eye has already moved on, which reads as lag rather than rhythm.',
    },
    {
      name: 'scrub',
      value: '0.4',
      why: 'Short catch-up so the reveal follows the scrollbar but survives a wheel step. At 0 the tween inherits every input spike; above ~1 the lines are still arriving after the section has left.',
    },
    {
      name: 'start / end (horizontal)',
      value: "'left 85%' / 'left 45%'",
      why: 'With `containerAnimation` the trigger is measured along the container\'s axis. Vertical keywords resolve to a position the element never occupies on that axis, so the tween simply never runs.',
    },
  ],

  pitfalls: [
    'Keeping vertical keywords when passing `containerAnimation`. `start: "top 85%"` produces no error, no warning and no animation — the panels simply arrive already revealed, and the bug survives review because nothing is broken, only absent.',
    'Passing `containerAnimation: undefined` explicitly. ScrollTrigger branches on whether the key exists, so an `undefined` value is not the same as an absent key; the code spreads the object conditionally for exactly this reason.',
    'Treating a not-yet-built timeline as the vertical case. The strip\'s tween is created in a sibling effect and arrives one render later, so a naive `containerAnimation ?? undefined` builds a full set of vertical triggers on horizontal content and tears them down on the next commit — visible as a flash of pre-revealed panels.',
    'Writing a second reveal system for the horizontal section. Two systems mean two staggers, two easings and two sets of position keywords, and they diverge the first time someone tunes one of them.',
    'Building one tween per line instead of one tween per group. Stagger stops being a property of the group and becomes a pile of hand-computed delays, which no longer reverse correctly when the user scrolls back up.',
  ],

  notes: [
    'Combine with `pinned-horizontal-track`: pass its `onTrack` payload\'s `animation` straight into `containerAnimation`.',
    'ScrollTrigger forbids `pin` on a trigger that has a `containerAnimation`. Pin the strip\'s section, never the panels riding it.',
  ],

  apiSignature:
    'function AxisReveals(props: { children: ReactNode; scroller?: RefObject<HTMLElement | null>; containerAnimation?: gsap.core.Animation | null; scrub?: number; lift?: number; stagger?: number; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Markup containing `[data-reveal-group]` scopes and `[data-reveal]` targets.' },
    { name: 'scroller', type: 'RefObject<HTMLElement | null>', description: 'Scroll container the triggers read. Omit for the document.' },
    { name: 'containerAnimation', type: 'gsap.core.Animation | null', description: 'Omit for vertical flow, pass a horizontal tween to measure against it, pass `null` to hold off until that tween exists.' },
    { name: 'scrub', type: 'number', default: '0.4', description: 'Seconds of catch-up on the reveal.' },
    { name: 'lift', type: 'number', default: '110', description: 'Start offset as a percentage of the element height.' },
    { name: 'stagger', type: 'number', default: '0.12', description: 'Seconds between elements inside a group.' },
    { name: 'className', type: 'string', description: 'Merged onto the wrapper. Use `contents` when the wrapper must not affect layout.' },
  ],

  reducedMotion:
    'No triggers are created and no `fromTo` runs, so every line renders at its final position and full opacity on first paint. The clipping boxes stay in the markup and do nothing, so the layout is byte-for-byte the finished state.',

  cleanup:
    '`ctx.revert()` on unmount and on every dependency change: it kills each group\'s tween and ScrollTrigger and restores the inline `transform` and `opacity` GSAP wrote, so a re-mount measures clean markup rather than the last run\'s end state.',

  acceptance:
    'Scroll the vertical section: the three lines rise out of their masks in sequence and reverse cleanly when you scroll back up. Keep scrolling into the pinned strip: each panel\'s lines rise with the same rhythm as it crosses the container, not as it crosses the viewport. With reduced motion on, every line is already in place.',

  criticalRegion: 'critical',
};

export default meta;
