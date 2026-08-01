import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'matchmedia-layout-teardown',
  title: 'matchMedia Layout Teardown',
  category: 'layout',
  tags: ['gsap', 'matchmedia', 'responsive', 'breakpoint', 'cleanup'],
  blurb: 'Two layouts behind one gsap.matchMedia block. Cross the breakpoint and the desktop branch reverts itself.',
  cost: 'dom',
  motif: 'stack',

  files: [
    { path: 'registry/ui/matchmedia-layout-teardown.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: ['gsap@^3.15.0'],
  registryDependencies: [],

  summary:
    'A fanned card layout on desktop and a plain column on mobile, with the entire desktop branch registered inside `gsap.matchMedia()`. GSAP records every `set`, tween and returned cleanup made inside the callback and reverts them the moment the query stops matching, so crossing the breakpoint leaves no inline transforms, no live listeners and no half-applied layout behind.',

  mechanism: [
    '`gsap.matchMedia().add({ isDesktop, isMobile, reduced }, self => …)` uses the object form: several queries are evaluated at once and arrive as booleans on `self.conditions`, so one callback branches on width and on motion preference together instead of needing an `add` per combination. GSAP re-runs the callback when any of the queries flips, which means toggling the OS "reduce motion" setting reconfigures the layout live, without a reload.',
    'The desktop branch positions the cards entirely through `gsap.set` — `position: absolute`, `left`, `top`, `rotation`, `zIndex` — rather than through breakpoint utility classes. That is deliberate: the breakpoint then exists in exactly one place, the query string, and the base markup can stay a plain flex column that doubles as the mobile layout.',
    'Positions are percentages of the container (`left: 50 + offset * spread`%, `top: 50 + |offset| * arc`%) with `xPercent: -50, yPercent: -50` for centring. Because percentages resolve against the container box, the fan rescales on resize with no measuring pass, no `ResizeObserver` and no resize listener inside the branch.',
    'Layout and interaction are kept on separate transform channels. `left`/`top` carry the fan, the entrance tween owns `y` and `autoAlpha`, and the pointer parallax writes only `x` via `gsap.quickTo`. Two animations sharing one property means one of them silently loses, usually the one that started first.',
    'The callback returns a cleanup function that removes the pointer listeners. GSAP invokes it when the branch stops matching, not only on unmount, so a desktop-only listener cannot survive into the mobile layout.',
    'On teardown the effect calls `mm.revert()`, which restores the inline styles GSAP wrote — including the `position: absolute` — so the authored column comes back unmodified. `mm.kill()` would stop the tweens but leave the fan frozen exactly where it was.',
  ],

  constants: [
    {
      name: 'breakpoint',
      value: '768',
      why: 'Where the fan takes over. The mobile query is deliberately `max-width: breakpoint - 1` rather than `max-width: breakpoint`: overlapping queries both match at exactly 768px and the two branches register at once, which is how a card ends up absolutely positioned inside a column.',
    },
    {
      name: 'spread',
      value: '15',
      why: 'Percent of container width per card step. At this value a five-card fan spans about 60% of the box with visible overlap. Past ~22% the outer cards leave the container; under ~8% they stack almost exactly and the fan reads as a printing error.',
    },
    {
      name: 'arc',
      value: '4',
      why: 'Percent of container height each step drops. A small positive arc puts the centre card highest, which is what makes the row read as a hand of cards rather than a straight strip. Zero is flat; past ~10% the outer cards fall out of the box bottom.',
    },
    {
      name: 'tilt',
      value: '5',
      why: 'Degrees per step, applied about a `50% 90%` origin so the cards rotate around their lower edge like a fan pivot. Rotating about the centre swings the tops and bottoms in opposite directions and the arc stops reading.',
    },
    {
      name: 'parallax',
      value: '26',
      why: 'Maximum pixels the outermost card travels with the pointer, scaled by its distance from centre. Enough to give the fan depth; past ~50px the cards visibly separate from their own shadows and the layout looks unstable.',
    },
    {
      name: 'ENTER_DURATION / ENTER_STAGGER',
      value: '0.7 / 0.06',
      why: 'A five-card fan finishes in 0.7 + 4 x 0.06 = 0.94 s. Longer staggers make the last card arrive after the user has already started reading; shorter ones collapse the sequence into a single flash.',
    },
  ],

  pitfalls: [
    'Registering animations once at mount and relying on CSS to hide them below the breakpoint. Resize past a breakpoint and a desktop-only ScrollTrigger keeps pinning on mobile, leaving a section stuck: the pin spacer is still in the document, the section will not scroll past, and nothing in the mobile stylesheet can undo it because the offending styles are inline. `matchMedia` reverts them instead.',
    'Using `mm.kill()` instead of `mm.revert()`. Kill stops the tweens but leaves every inline style GSAP wrote, so the fan freezes in place and the column never comes back.',
    'Overlapping queries: `(min-width: 768px)` paired with `(max-width: 768px)`. Both match at exactly 768px, both branches register, and the mobile teardown fights the desktop setup for one very confusing breakpoint width.',
    'Adding an event listener inside the callback without returning a cleanup. The listener outlives the branch, so a desktop pointer handler keeps writing transforms to cards that are back in the mobile column.',
    'Putting the responsive layout in Tailwind breakpoint classes AND the animation in matchMedia. The breakpoint now exists in two places and they drift; the classic symptom is a layout that switches at 768px while its animation switches at 1024px.',
    'Measuring the container inside the branch and hard-coding pixel offsets. The branch does not re-run on resize — only on a query change — so the fan is correct at the width it was registered at and wrong at every other width until you cross the breakpoint twice.',
    'Treating `self.conditions` as always defined. It is optional, and with `noUncheckedIndexedAccess` each lookup is `boolean | undefined`; a non-null assertion here compiles and then reads `undefined` as truthy-adjacent in the one edge case that matters.',
  ],

  notes: [
    'No ScrollTrigger is used here, but the failure mode described in the first pitfall is the reason this pattern exists — a pinned desktop section that survives into a mobile layout is the single most common GSAP responsiveness bug, and `matchMedia` is the sanctioned fix.',
    'The same block also handles reduced motion: the `reduced` condition composes the final fan with `gsap.set` and returns before registering the entrance tween or the parallax listener, so the layout is identical and only the motion is absent.',
    '`gsap.context()` (via the `use-gsap` hook) is the right tool when you need scoped selectors and cleanup but no breakpoints. `matchMedia` is `context` plus queries — reach for it the moment a layout differs across breakpoints, not just its timing.',
  ],

  apiSignature:
    'function MatchMediaLayoutTeardown(props: { children: ReactNode; breakpoint?: number; spread?: number; arc?: number; tilt?: number; parallax?: number; className?: string; itemClassName?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'One card per child. Each is wrapped in the element GSAP positions.' },
    { name: 'breakpoint', type: 'number', default: '768', description: 'Pixel width at which the fan layout takes over.' },
    { name: 'spread', type: 'number', default: '15', description: 'Horizontal step per card, as a percentage of container width.' },
    { name: 'arc', type: 'number', default: '4', description: 'Vertical drop per step from centre, as a percentage of container height.' },
    { name: 'tilt', type: 'number', default: '5', description: 'Degrees of rotation per step from centre.' },
    { name: 'parallax', type: 'number', default: '26', description: 'Maximum pointer parallax in pixels for the outermost card.' },
    { name: 'className', type: 'string', description: 'Merged onto the container.' },
    { name: 'itemClassName', type: 'string', description: 'Merged onto every card wrapper. Give the cards a width here — the fan does not measure them.' },
  ],

  reducedMotion:
    '`(prefers-reduced-motion: reduce)` is one of the queries in the same `add` block. When it matches, the desktop branch still composes the full fan with `gsap.set` and then returns early — no entrance tween, no pointer listener. The layout is identical; only the movement is gone. Because it is a matchMedia condition rather than a mount-time read, changing the OS setting reconfigures a mounted component immediately.',

  cleanup:
    '`mm.revert()` on unmount reverts every recorded `set` and tween back to the pre-branch inline styles and runs each branch\'s returned cleanup, which removes the pointermove and pointerleave listeners. Nothing else is registered, so there is nothing else to release.',

  acceptance:
    'Above 768px the cards fan out from the centre with a stagger, tilt outward, and drift with the pointer. Drag the window narrower past 768px and they return to a plain vertical column with no leftover transforms and no inline `position: absolute` on any card. Widen again and the fan re-registers and re-plays its entrance. Resize within the desktop range and the fan rescales with the box. Enable reduce-motion while it is open and the fan stays but stops moving.',

  criticalRegion: 'critical',
};

export default meta;
