import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'compound-group-hover',
  title: 'Compound Group Hover Card',
  category: 'primitive',
  tags: ['css', 'hover', 'has-selector', 'transition', 'card'],
  blurb: 'One hover drives four changes on three elements, each with its own duration and curve. Keyboard gets all four.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/compound-group-hover.tsx',
      target: 'components/motion/compound-group-hover.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],
  registryDependencies: [],

  summary:
    'A content card that answers a hover with a short sequence rather than a single state flip: it lifts, its icon tilts and overshoots its scale, a corner blob brightens, and the affordance arrow slides in — each on its own duration and delay. The trigger is `:hover, :has(:focus-visible)`, so a keyboard user tabbing to the link inside gets exactly the same four changes.',

  mechanism: [
    'The card owns `translate` and `border-color` on a 260ms `cubic-bezier(0.22, 1, 0.36, 1)`. It is the fastest change in the set because it is the one that acknowledges the pointer — anything slower and the card feels like it is deciding whether to respond.',
    'The icon animates `rotate` over 320ms on the same ease and `scale` over 420ms on `cubic-bezier(0.34, 1.56, 0.64, 1)`, both delayed 40ms. Two curves on one element is only possible because `rotate` and `scale` are independent properties; packed into `transform` they would share a single duration and a single easing, and the overshoot would drag the rotation with it.',
    'The corner blob is a radial gradient that is blurred once at paint time (`filter: blur(2rem)`) and thereafter only changes `opacity` 0.12 to 0.4 over 500ms and `scale` 1 to 1.15 over 700ms. It is the slowest element in the group, which is what makes it read as lighting rather than as a moving object.',
    '`z-index: -1` on the blob places it above the card background and below the card content with no extra wrapper, and `isolation: isolate` on the card stops that negative index from escaping into the page stacking context and sliding behind an ancestor background.',
    'The arrow translates 4px and goes from 0.4 to 1 opacity after an 80ms delay — last in the sequence, so the eye arrives at the call to action after the card has already committed to the hover.',
    'The whole card is clickable through a stretched pseudo-element on the anchor (`::after { position: absolute; inset: 0 }`), so there is exactly one focusable, screen-reader-announced target. The card responds to that anchor\'s focus through `:has(:focus-visible)`, which is what gives keyboard parity without a single line of JavaScript.',
  ],

  constants: [
    {
      name: 'lift',
      value: '-6px',
      why: 'Card travel on hover. Under 3px it is not distinguishable from a rendering shift; over about 10px the card visibly overlaps its neighbour in a tight grid and the shadow it does not have becomes conspicuous.',
    },
    {
      name: 'durations',
      value: '260 / 320 / 420 / 500 / 700 ms',
      why: 'Ascending by element weight: card, icon rotation, icon scale, blob opacity, blob scale. Equal durations collapse the sequence into a single snap; the spread is the entire effect. The 260ms floor is roughly the shortest a positional change can be and still be perceived as movement rather than a jump.',
    },
    {
      name: 'delays',
      value: '40ms icon, 80ms arrow',
      why: 'Small enough to feel like consequence rather than queueing. Past about 120ms the arrow reads as a second, separate event and a fast pointer pass leaves it half-animated.',
    },
    {
      name: 'icon scale',
      value: '1.1 with cubic-bezier(0.34, 1.56, 0.64, 1)',
      why: 'The 1.56 control point overshoots to roughly 1.13 before settling. Overshoot on a small element reads as physical; on the card itself it would read as a bug, which is why only the icon gets it.',
    },
    {
      name: 'blob opacity range',
      value: '0.12 to 0.40',
      why: 'It must be visible at rest — a blob that appears only on hover reads as a new object arriving, not as a light coming up. 0.12 is enough to establish it; past about 0.5 the accent starts tinting the body copy.',
    },
    {
      name: 'icon rotation',
      value: '-6deg',
      why: 'Anticlockwise, because the arrow moves right and the two would otherwise both push the same direction and read as a shear. Past about 10deg a glyph-based icon starts to look misaligned rather than tilted.',
    },
  ],

  pitfalls: [
    'Packing the icon lift into `transform: rotate(-6deg) scale(1.1)`. It works, but both halves are now one property with one duration — the moment you want the scale to overshoot and the rotation not to, you have to split them, and splitting `transform` mid-project means rewriting every rule that touches it.',
    'Transitioning `filter: blur()` on the blob instead of `opacity`. Every frame re-runs a 2rem blur over a 14rem box; on a grid of six cards a single pointer sweep drops the page into the teens.',
    'Making the card itself a `<div role="link" tabindex="0">` to get a focus state. It is not announced as a link, it does not middle-click, it does not open in a new tab, and it needs a keydown handler. The stretched `::after` on a real anchor gives all of that for one pseudo-element.',
    'Using `:focus-within` instead of `:has(:focus-visible)`. `:focus-within` fires on mouse clicks too, so the card sticks in its hover state after every click and only releases when something else is focused.',
    'Omitting `isolation: isolate` on the card. The blob\'s `z-index: -1` then resolves against whichever ancestor last created a stacking context and the blob disappears behind a section background — intermittently, depending on what else is on the page.',
    'Leaving all four changes in place under reduced motion. Lift, tilt and slide are motion; the border, the blob and the arrow opacity are not. Disabling the whole hover state is over-correction and leaves the card with no feedback at all.',
    'Forgetting `overflow: hidden` on the card. The blob is positioned 4rem outside the card on two sides and paints over the neighbouring card in a grid.',
  ],

  notes: [
    '`:has()` needs Safari 15.4+, Chrome 105+ and Firefox 121+. Where it is unsupported the pointer hover still works exactly as written and the keyboard path degrades to the browser\'s own focus ring on the link.',
    'Independent `translate` / `rotate` / `scale` need Chrome 104+, Safari 14.1+, Firefox 72+. In older engines the properties are dropped and the card still changes colour and opacity on hover.',
    'The accent is one custom property, `--kx-hcard-accent`, read by the blob, the icon and the link. A grid of these differs only by that value.',
  ],

  apiSignature:
    'function CompoundGroupHover(props: { title: string; description: string; eyebrow?: string; icon?: ReactNode; href?: string; accent?: string; action?: string; className?: string }): JSX.Element',

  props: [
    { name: 'title', type: 'string', description: 'Card heading, rendered as an `h3`.' },
    { name: 'description', type: 'string', description: 'Body copy under the heading.' },
    { name: 'eyebrow', type: 'string', description: 'Small uppercase label above the title.' },
    { name: 'icon', type: 'ReactNode', description: 'Rendered inside the tilting badge. An inline SVG or a single character.' },
    { name: 'href', type: 'string', description: 'Renders the affordance link and stretches it over the whole card.' },
    { name: 'accent', type: 'string', default: "'var(--color-accent, currentColor)'", description: 'Drives the blob, the icon border and the link colour.' },
    { name: 'action', type: 'string', default: "'Read more'", description: 'Text of the affordance link.' },
    { name: 'className', type: 'string', description: 'Merged onto the card via `cn`. Use it for sizing inside a grid.' },
  ],

  reducedMotion:
    'A `@media (prefers-reduced-motion: reduce)` block cancels the three positional changes — the card no longer lifts, the icon no longer tilts or scales, the arrow no longer slides — while keeping every non-positional one. The border still brightens, the blob still comes up from 0.12 to 0.4 opacity, and the arrow still reaches full opacity, so hover and keyboard focus remain visibly acknowledged.',

  cleanup:
    'Nothing to clean up. No listeners, no timers, no animation frames; the hover state lives entirely in the cascade. React removes the hoisted `<style>` when the last card unmounts.',

  acceptance:
    'Hover the card and four things change on four different timings — you can see the arrow arrive after the card has already lifted. Tab to the link with the keyboard and the identical four changes happen. Click the card anywhere, including on the description text, and the link activates. Turn reduced motion on: nothing moves, but the border, blob and arrow still respond.',

  criticalRegion: 'critical',
};

export default meta;
