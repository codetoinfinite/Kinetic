import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'proximity-snap-track',
  title: 'Proximity Snap Track',
  category: 'layout',
  tags: ['scroll-snap', 'css', 'track', 'scroll-snap-stop', 'rail'],
  blurb:
    'A horizontal rail of variable-width cards that snaps only when you stop near one, and never skips past two at once.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/proximity-snap-track.tsx',
      target: 'components/motion/proximity-snap-track.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A scrollable rail whose items may be any width. `scroll-snap-type: x proximity` snaps to an item only when the scroll comes to rest near one, so free scanning stays free. `scroll-snap-stop: always` caps a single fling at one item, so a hard swipe cannot launch the user past six cards. No JavaScript runs during the scroll.',

  mechanism: [
    'The container is `overflow-x: auto` with `scroll-snap-type: x proximity`. `proximity` means the browser only adjusts the resting position when the natural end of the scroll already falls close to a snap point; anywhere else, it leaves the position exactly where the user left it.',
    'Each item declares `scroll-snap-align: start` (or `center`) — this is what makes it a snap point at all — and `scroll-snap-stop: always`, which forbids the browser from passing more than one snap point per gesture no matter how much momentum the fling carried.',
    '`scroll-padding-inline` is set alongside `padding-inline` to the same gutter. They are different properties: `padding` insets the content, `scroll-padding` insets the *snapport* — the rectangle a snap position is measured against. With padding alone, a `start`-aligned item comes to rest flush against the container border and the inset the design asked for vanishes at every rest position.',
    '`overscroll-behavior-x: contain` stops a horizontal fling that reaches the end of the rail from chaining to an ancestor scroller or triggering the browser\'s back-navigation gesture.',
    '`scroll-behavior` is `smooth` normally and `auto` under reduced motion, which affects programmatic and keyboard-initiated scrolls. The snap adjustment itself is the browser\'s own and already respects the OS setting.',
  ],

  constants: [
    {
      name: 'snapType',
      value: "'proximity'",
      why: 'The whole argument of this component. With `mandatory`, the browser must always come to rest on a snap point, so on a rail of variable-width items it is physically impossible to stop between two of them — every attempt to park somewhere gets yanked. Worse, on a long rail `mandatory` plus a short flick can leave the user unable to reach a position at all. `proximity` snaps when it helps and gets out of the way when it does not.',
    },
    {
      name: 'snapStop',
      value: "'always'",
      why: 'Without it, a hard fling on a trackpad passes every snap point and lands on whichever item the momentum ran out over — which on a rail of 20 cards means the user has no way to advance by exactly one. `always` turns each item into a gate.',
    },
    {
      name: 'snapAlign',
      value: "'start'",
      why: 'Correct default for variable-width items: their left edges line up at rest, which reads as a column of starts. `center` is right only when items are uniform, because with mixed widths a centred rest position puts every item\'s left edge somewhere different.',
    },
    {
      name: 'gutter',
      value: '16',
      why: 'Set on both `padding-inline` and `scroll-padding-inline`. The two must match or the resting inset and the visual inset disagree by exactly this many pixels, which looks like a rounding bug.',
    },
    {
      name: 'gap',
      value: '12',
      why: 'Large enough that two adjacent cards read as separate snap targets, small enough that the next card is clearly a continuation of the row rather than a separate section.',
    },
  ],

  pitfalls: [
    '`scroll-snap-type: x mandatory` on a track with variable-width items. It makes it impossible to rest between items: every release is pulled to a snap point, so the user cannot park where they want, and on a long rail with wide items they end up fighting the browser for the whole length of the track. `proximity` is the correct choice whenever the items are not uniform or the track is long.',
    'Setting `padding-inline` without `scroll-padding-inline`. Every rest position then puts the item flush against the container edge, so the gutter appears while scrolling and disappears the instant you let go.',
    'Omitting `scroll-snap-stop: always`. A single hard swipe lands eight cards along, which makes stepping by one impossible and makes the rail feel slippery rather than mechanical.',
    'Hiding the scrollbar without making the container focusable. The rail becomes invisible to keyboard users and to anyone who was relying on the scrollbar as the affordance. `tabIndex={0}` and a `role`/`aria-label` restore arrow-key scrolling, and Chrome stops warning about a non-focusable scroll container.',
    'Leaving `overscroll-behavior-x` at `auto`. Flinging past the end chains into the page or, in Safari and Chrome, triggers the swipe-to-go-back gesture and the user loses the page.',
    'Reaching for a JS carousel because "the design has arrows". A snap track already has momentum, rubber-banding, keyboard support and accessible scroll semantics; arrows are one `scrollBy` call on top, not a reason to replace the mechanism.',
  ],

  notes: [
    'Snap is a layout-level contract, not an animation. Everything here runs on the compositor and continues to work when the main thread is blocked, which is the reason to prefer it over a JS track whenever the interaction is genuinely "a scrollable row".',
    'Items are `shrink-0`. Without it, flex would compress them to fit the container and the track would never overflow, so there would be nothing to snap.',
    '`scroll-snap-stop` is ignored during programmatic scrolls in every engine — it only constrains user gestures. Arrows implemented with `scrollTo` can therefore still jump several items at once by design.',
  ],

  apiSignature:
    "function ProximitySnapTrack(props: { children: ReactNode; snapType?: 'proximity' | 'mandatory'; snapAlign?: 'start' | 'center'; snapStop?: 'normal' | 'always'; gutter?: number; gap?: number; className?: string; itemClassName?: string; 'aria-label'?: string }): JSX.Element",

  props: [
    { name: 'children', type: 'ReactNode', description: 'One item per child. Widths may differ.' },
    { name: 'snapType', type: "'proximity' | 'mandatory'", default: "'proximity'", description: 'Snap strictness. `mandatory` is exposed so the difference can be felt, not because it is usually right here.' },
    { name: 'snapAlign', type: "'start' | 'center'", default: "'start'", description: 'Which edge of an item lines up with the snapport.' },
    { name: 'snapStop', type: "'normal' | 'always'", default: "'always'", description: '`always` caps one gesture at one item.' },
    { name: 'gutter', type: 'number', default: '16', description: 'Inset in px, applied to both `padding-inline` and `scroll-padding-inline`.' },
    { name: 'gap', type: 'number', default: '12', description: 'Gap between items in px.' },
    { name: 'className', type: 'string', description: 'Merged onto the scroll container.' },
    { name: 'itemClassName', type: 'string', description: 'Merged onto each item cell.' },
    { name: 'aria-label', type: 'string', default: "'Track'", description: 'Label for the focusable scroll region.' },
  ],

  reducedMotion:
    'The rail behaves identically — it is a scroll container, and scrolling is the user moving, not the interface animating. The one change is `scroll-behavior: auto` instead of `smooth`, so keyboard and programmatic scrolls jump rather than glide. The snap adjustment is the browser\'s own transition and already follows the OS setting without any help.',

  cleanup:
    'Nothing to release. All behaviour is declarative CSS on nodes React owns; the only subscription is `useReducedMotion`, which removes its own `matchMedia` listener on unmount. No listeners, no timers, no rAF.',

  acceptance:
    'Scroll the rail slowly and stop between two cards — it stays where you left it. Stop just past a card\'s edge and it eases onto that card. Fling as hard as you can and it advances exactly one card. Tab to the rail and press the arrow keys: it scrolls and snaps the same way. At every rest position the leading card sits inset from the container edge by the gutter, not flush against it.',

  criticalRegion: 'critical',
};

export default meta;
