import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'stacked-card-fan',
  title: 'Stacked Card Fan',
  category: 'display',
  kit: 'boardui',
  tags: ['cards', 'stack', 'fan', 'carousel', 'showcase', 'boardui'],
  blurb:
    'A fanned stack of tilted cards: hover spreads the fan, clicking or arrow keys bring the next card forward, and a pill lays them all out.',
  cost: 'css',
  motif: 'stack',

  files: [
    { path: 'registry/ui/stacked-card-fan.tsx', type: 'registry:ui', role: 'component' },
    { path: 'registry/ui/stacked-card-fan-cards.tsx', type: 'registry:ui', role: 'content' },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria@^3.53.1'],

  summary:
    'Cards stacked on top of each other with a slight fan: the front card sits upright in the middle and the others peek out to its left and right, each tilted, lowered, shrunk and dimmed a little more the further back it is. Hovering or keyboard-focusing the stack spreads the fan so more of each card shows; clicking the front card, or pressing an arrow key, sends it round the back and brings the next one forward, and clicking a card behind brings that card forward directly. A "See all" pill under the stack spreads the cards almost flat for a full view.',

  mechanism: [
    'Slots: each card gets a signed circular distance `d` from the front card, `((i − active + ⌊n/2⌋) mod n) − ⌊n/2⌋`, so five cards are ordered 0, +1, +2, −2, −1 around the front. Cycling shifts every `d` by one; the card leaving one end wraps to the other end at the back of the pile, where the higher cards hide the crossing.',
    'One transform per card, written once as CSS variables: `translateX(-50%) translateX(d·gap) translateY(|d|·drop) rotate(d·tilt) scale(1 − |d|·shrink)`. `--d` and `--ad` are set per card; `--spread`, `--tilt`, `--drop`, `--shrink` come from `data-state` (rest, peek, expanded) on the stage. Changing either recomputes the transform and a single 500ms `transform` transition animates it, so hover, cycle and expand share one path with no JS animation loop.',
    'Fit: the wrapper is a size container. Card width is `min(cardWidth, 80cqi)` and height keeps the aspect ratio. The gap is `max(12px, min(cardW · spread, (100cqi − cardW) / (2·⌊n/2⌋)))`, so the outermost card never passes the container edge, however wide the state asks it to spread. Expanded lays the cards in a row instead, which also needs them smaller: the container width from the kit `useResizeObserver` gives `scale = width / (card · (1 + (n − 1) · 0.86))` and a gap of `0.86 · card · scale`, passed in as `--base` and `--gap`. Scale is a plain number, and CSS cannot yet divide lengths into one in every browser.',
    'Depth: `z-index` is `n − |d|`, and a token-coloured veil inside each card (`bg-background-primary-default` at `0.24·|d|` opacity, capped at 0.6) dims cards behind. A veil rather than card opacity keeps cards behind from showing through each other in dark mode.',
    'Input: the stage is a focusable `role="group"` with `aria-roledescription="card stack"`. Arrow keys, Enter and Space cycle; Home and End jump. react-aria `useHover` (mouse only, so touch never sticks in peek) and `useFocusRing` (keyboard focus only) drive the peek state. Cards behind are `aria-hidden`, and a polite live region announces the new front card ("Tokens, 1 of 5").',
  ],

  constants: [
    { name: 'rest / peek spread', value: '0.30 / 0.46 × card width', why: 'Rest shows a sliver of each card; peek shows their headings.' },
    { name: 'expanded step', value: '0.86 × scaled card width', why: 'Cards sit in a row with 14% overlap, scaled so the whole row fits the container.' },
    { name: 'tilt', value: '5° / 8° / 1.5° per slot', why: 'The fan opens wider on hover; flat-ish when expanded so content reads.' },
    { name: 'drop, shrink', value: '10px / 16px / 4px per slot; 4% per slot (0 expanded)', why: 'Cards behind sit lower and smaller, which reads as depth without a 3D perspective.' },
    { name: 'transition', value: '500ms cubic-bezier(0.22, 1, 0.36, 1)', why: 'A fast start and long settle makes the cycle feel like a flick.' },
    { name: 'card size', value: '300 × 260px, 80cqi max', why: 'Default shown in the reference; shrinks together with the aspect ratio below about 400px.' },
  ],

  pitfalls: [
    'Using `inert` on the cards behind: inert elements are skipped by hit testing, so clicks on them fall through and they cannot be brought forward. Use `aria-hidden` and keep the card faces non-interactive.',
    'Declaring `--gap` on an element above the stage: unregistered custom properties substitute their `var()` references where they are declared, so a `--gap` that reads `--spread` must sit on the element that sets `--spread`.',
    'Fading cards behind with `opacity` on the whole card: they become see-through and stack into a muddle in dark mode. Dim with an opaque-coloured veil instead.',
    'Driving peek from `onMouseEnter`: a tap on touch devices fires it and never the leave, leaving the fan open. react-aria `useHover` ignores emulated mouse events.',
  ],

  notes: [
    '`stacked-card-fan-cards.tsx` holds five agent-dashboard card faces (tokens chart, activity calendar, requests bars, usage meters, step list) and `AGENT_DASHBOARD_CARDS`, the array the demo and the CTA Section use.',
    'With `fade` the lower part of the stack is masked into the page, as in a hero visual.',
    'Active card and expanded state are both controllable (`activeIndex`/`onActiveChange`, `expanded`/`onExpandedChange`).',
  ],

  apiSignature:
    'function StackedCardFan(props: { items: { id: string; label: string; content: ReactNode }[]; activeIndex?: number; defaultActiveIndex?: number; onActiveChange?: (index: number) => void; expanded?: boolean; defaultExpanded?: boolean; onExpandedChange?: (expanded: boolean) => void; showToggle?: boolean; expandLabel?: string; collapseLabel?: string; cardWidth?: number; cardHeight?: number; fade?: boolean; "aria-label"?: string; className?: string }): JSX.Element',

  props: [
    { name: 'items', type: 'StackedCardFanItem[]', description: '`{ id, label, content }`; `label` is announced when the card comes forward.' },
    { name: 'activeIndex', type: 'number', description: 'Controlled front card.' },
    { name: 'defaultActiveIndex', type: 'number', default: '0', description: 'Initial front card.' },
    { name: 'onActiveChange', type: '(index: number) => void', description: 'Called when the front card changes.' },
    { name: 'expanded', type: 'boolean', description: 'Controlled expanded state.' },
    { name: 'defaultExpanded', type: 'boolean', default: 'false', description: 'Initial expanded state.' },
    { name: 'showToggle', type: 'boolean', default: 'true', description: 'Show the See all / Stack pill.' },
    { name: 'expandLabel', type: 'string', default: '"See all {n}"', description: 'Pill label while stacked.' },
    { name: 'collapseLabel', type: 'string', default: '"Stack cards"', description: 'Pill label while expanded.' },
    { name: 'cardWidth', type: 'number', default: '300', description: 'Card width in px.' },
    { name: 'cardHeight', type: 'number', default: '260', description: 'Card height in px.' },
    { name: 'fade', type: 'boolean', default: 'false', description: 'Mask the bottom of the stack into the page.' },
  ],

  reducedMotion:
    'Card transforms and the dimming veil change instantly (`motion-reduce:transition-none`); hover, cycling and expanding still work. The step spinner in the sample faces stops.',

  cleanup:
    'Motion is a CSS transition with no loop to stop. The shared ResizeObserver unobserves the wrapper on unmount, and react-aria removes its hover and focus listeners itself.',

  acceptance:
    'Five cards rest in a slight fan with the Tokens chart upright in front. Hovering spreads them and shows each heading; clicking the front card sends it round the back and brings September forward; clicking a card behind brings it forward; the arrow keys do the same with a visible focus ring. See all five lays the cards out nearly flat and Stack cards gathers them. At 360px the cards shrink and the fan stays inside the frame. Light and dark both read.',

  criticalRegion: 'critical',
};

export default meta;
