import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'radial-mask-spotlight',
  title: 'Radial Mask Spotlight',
  category: 'cursor',
  tags: ['mask-image', 'pointer', 'spotlight', 'raf', 'css-mask'],
  blurb: 'A layer masked to a soft disc follows the pointer, with a flat core that makes it read as a beam.',
  cost: 'dom',
  motif: 'rings',

  files: [
    { path: 'registry/ui/radial-mask-spotlight.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: [],

  summary:
    'A stacked layer is masked by a radial gradient whose centre follows the pointer, so content is lit rather than uncovered. The mask string is rewritten once per animation frame from a damped pointer position, and both the prefixed and unprefixed `mask-image` properties are set.',

  mechanism: [
    'The gradient stops are the design: solid black to 30% of the radius, then a ramp to transparent at 72%. That flat core gives the beam a lit region with an actual size. A gradient that begins falling off at 0% has no lit area at all — just a bright point that fades, which the eye reads as blur rather than as light.',
    'A px radius is used rather than a percentage. A percentage radius in a radial gradient resolves against the element box, so the same declaration produces a beam of a different physical size in every panel it is dropped into, and the effect stops being reusable.',
    'Position comes from `useSmoothPointer` with a very low smoothing factor, so the beam has a small amount of drag. `damp` is frame-rate independent — the smoothing constant is the fraction of the gap left after one full second — so the same value produces the same feel at 60Hz and 144Hz rather than the beam arriving twice as fast on a fast display.',
    'The mask is written in a `useRaf` callback, not in the pointer handler. Setting `mask-image` invalidates paint for the layer, and a fast pointer delivers two or three events per frame, so a per-event write does the same expensive work several times to produce one visible result.',
    'The layer is seeded with a mask parked two radii off-panel, so the first painted frame — before rAF has run once — cannot show the layer unmasked. Nothing is written until `pointer.active` is true, which is what stops the beam flashing at the hook\'s centre-parked seed position on mount.',
    'Both `maskImage` and `WebkitMaskImage` are set. This is not defensive habit: released Safari versions mishandle gradient masks without the prefix, and the failure mode is the layer being fully visible or fully invisible rather than slightly wrong.',
  ],

  constants: [
    {
      name: 'radius',
      value: '220',
      why: 'Beam radius in px, giving a 132px solid core and a 92px falloff. Below ~120 the core is too small to hold a line of text and the effect becomes a magnifier; above ~350 in a small panel the falloff never completes inside the box and the beam reads as an uneven wash.',
    },
    {
      name: 'CORE_STOP',
      value: '0.3',
      why: 'Where the solid region ends. This is the single number that separates "a light" from "a smudge". At 0 there is no lit area, only a peak; past ~0.5 the edge becomes hard enough that it reads as a cut-out hole instead of illumination.',
    },
    {
      name: 'EDGE_STOP',
      value: '0.72',
      why: 'Where the falloff reaches zero. Short of 100% so the gradient completes inside its own radius and the beam never shows a visible circular boundary at the edge of the declared circle.',
    },
    {
      name: 'smoothing',
      value: '0.0006',
      why: 'Fraction of the remaining distance still uncovered after one second — so the beam is effectively caught up within about 100ms. Enough drag to give the light some weight, not enough for the beam to visibly trail behind the thing you are pointing at, which would make it useless for reading.',
    },
    {
      name: 'FADE_MS',
      value: '260',
      why: 'Enter and leave fade on the whole layer. Long enough that the beam does not blink on and off as the pointer crosses the edge, short enough that leaving does not leave a light hanging in an unhovered panel.',
    },
    {
      name: 'rest mask offset',
      value: '-radius * 2',
      why: 'Where the seeded mask sits before the first frame. Two radii guarantees no part of the falloff is inside the box at any panel size, so nothing is lit before the pointer has been seen.',
    },
  ],

  pitfalls: [
    'A linear falloff from 0%. Without a flat core there is no lit region, just a bright centre that fades continuously, and the result reads as a blurred blob rather than a light. This is the most common way this effect is built and the most common reason it looks cheap.',
    'Setting only `maskImage`. Released Safari versions mishandle gradient masks without `-webkit-mask-image`, and the failure is total — the layer is either always visible or never visible — so it does not look like a mask bug when reported.',
    'Writing the mask in the `pointermove` handler. Every write invalidates paint for the layer, and a fast pointer produces several events per frame, so the same paint is thrown away two or three times before anything reaches the screen.',
    'A percentage radius. `circle 30% at ...` resolves against the element box, so the beam is a different size in every container and the constant that looked right in the design mock is wrong everywhere else.',
    'Writing the mask before the pointer has actually been seen. `useSmoothPointer` parks at the element centre so the first movement eases out sensibly, but that seed is not a real position — treating it as one flashes a spotlight in the middle of the panel on mount.',
    'Masking a layer containing interactive elements. `mask-image` does not clip hit testing, so links in the dark region are still clickable while being invisible. Either keep the masked layer non-interactive or accept that the mask is purely decorative.',
    'Putting the effect on a layer with its own background. The mask reveals the layer, and a masked opaque background is a visible disc of colour, not a light. The lit layer needs a transparent background so the beam shows content, not a shape.',
  ],

  notes: [
    'Gated on `(pointer: fine)`. On touch the mask is removed entirely and the lit layer shows in full rather than staying hidden — an effect that cannot be operated must not be allowed to hide content. `useSmoothPointer` is also configured with `touch: false` so a scroll drag can never move the beam.',
    'Reduced motion keeps the spotlight but pins it: the mask is written once, centred slightly above middle, and never updated. The affordance survives; the chasing does not.',
    'Scoped to its own container and measured against its rect, so several instances can appear on one page without interfering.',
    'The masked layer is decorative by construction. If it holds links, remember that a mask hides paint but not hit testing.',
  ],

  apiSignature:
    'function RadialMaskSpotlight(props: { children: ReactNode; radius?: number; smoothing?: number; className?: string }): JSX.Element',

  props: [
    { name: 'children', type: 'ReactNode', description: 'Content of the lit layer. Should have a transparent background.' },
    { name: 'radius', type: 'number', default: '220', description: 'Beam radius in CSS px. Core is 30% of this, falloff completes at 72%.' },
    { name: 'smoothing', type: 'number', default: '0.0006', description: 'Fraction of the gap remaining after one second. Lower is tighter.' },
    { name: 'className', type: 'string', description: 'Merged onto the root container via `cn`.' },
  ],

  reducedMotion:
    'The spotlight is still drawn — it is a hover affordance and removing it would hide content — but it never moves. The mask is written once at 50% across and 45% down, the rAF loop is left disabled, and no pointer listeners attach.',

  cleanup:
    'Removes the enter and leave listeners, flips the enabled flag so any in-flight frame is a no-op, and clears the inline `maskImage`, `WebkitMaskImage` and `opacity`. `useRaf` and `useSmoothPointer` unsubscribe themselves. Nothing was allocated beyond the two strings written per frame.',

  acceptance:
    'Move across the panel and a soft round beam follows the pointer with a slight drag, lighting the content under it. The centre of the beam is evenly lit rather than brightest at one point — cover the middle third with a finger and the light should look flat, not peaked. Enter and leave and the whole layer fades over about a quarter of a second rather than blinking. On first load, before you move, nothing is lit. Check in Safari that the beam appears at all. On touch the layer is fully visible with no mask.',

  criticalRegion: 'critical',
};

export default meta;
