import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'rotating-word-hero',
  title: 'Rotating Word Hero',
  category: 'block',
  kit: 'boardui',
  tags: ['hero', 'landing', 'marketing', 'text', 'boardui'],
  blurb:
    'Landing hero whose key word slides and blurs through a list while the line glides to each new width, with CTAs and a stack badges row.',
  cost: 'dom',
  motif: 'stack',

  files: [
    { path: 'registry/ui/rotating-word-hero.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: ['motion@^12.43.0'],

  summary:
    'The landing page opener: an announcement pill, a two-line headline whose key word cycles through a list ("for Finance / Healthcare / Agentic Interface"), a subcopy paragraph, a CTA row and a "built with" badges row. Each swap slides the old word up through a blur while the next rises from below, and the word slot animates its width so the centred line re-balances smoothly. A dotted rule under the word signals that it changes. `RotatingWord` is exported on its own for headlines laid out differently.',

  mechanism: [
    'Slot sizing: inside the word slot sits an in-flow, invisible `inline-block` copy of the current word. It gives the slot its line height and baseline, and a ResizeObserver on it reports its border-box inline size. That number becomes the slot\'s explicit `width`, which has `transition-[width] duration-500 ease-out`, so the rest of the centred line glides instead of jumping. The first measurement replaces `auto` and therefore does not animate.',
    'Word swap: the visible word is a `motion.span` keyed by index inside `AnimatePresence initial={false}`, absolutely positioned at the slot\'s top-left. Enter is `y 45% → 0, opacity 0 → 1, blur 8px → 0`; exit is `y 0 → -45%` with the same fade and blur, 550ms on `cubic-bezier(0.22, 1, 0.36, 1)`. Both run at once, so the words cross mid-slot.',
    'Rotation clock: one `setInterval` advances the index every `interval` ms (2600 by default). The effect only runs while `running` is true: more than one word, not `paused`, no reduced-motion preference, not hovered, tab visible (`useVisibility`) and slot on screen (`useInView`). Any of these flipping clears the interval, so a hidden tab never queues swaps.',
    'Measurement uses ResizeObserver layout sizes, never `getBoundingClientRect`, because the hero is often rendered inside a CSS-scaled preview and a rect would report the scaled width.',
    'Accessibility: the animated layers are `aria-hidden`; a `sr-only` span holds the first word, so assistive tech reads one stable headline ("React Design System for Finance Interface") rather than a sentence that mutates every few seconds. Hovering the word pauses it for reading.',
    'Layout: the `<section>` is an `@container/hero`; the headline steps from display-4 to display-2 at `@xl` and to the 64px large title at `@4xl`, so a narrow column gets a smaller heading even on a wide window. The optional glow is four blurred token-coloured bars behind the headline, masked off toward the bottom.',
  ],

  constants: [
    { name: 'interval', value: '2600ms', why: 'Long enough to read a word and the line it completes, short enough that a visitor sees at least two swaps before scrolling.' },
    { name: 'swap', value: '550ms, y ±45%, blur 8px', why: 'Under half the slot height keeps both words partly in the slot while they cross, and the blur hides the overlap.' },
    { name: 'width transition', value: '500ms ease-out', why: 'Slightly shorter than the swap so the line settles before the incoming word fully sharpens.' },
    { name: 'dot rule', value: '0.15em × 0.1em tiles, 0.032em dots', why: 'Em units scale the dotted underline with every headline size step.' },
  ],

  pitfalls: [
    'Measuring an inline `<span>`: ResizeObserver reports 0x0 for non-replaced inline elements. The sizer must be `inline-block`.',
    'Letting the slot width follow its content: CSS cannot transition `width: auto`, so the line snaps. Feed a measured pixel width instead.',
    'Leaving the interval running in a background tab: when the tab returns, the browser fires the backlog and the word flickers through several swaps.',
    'Putting `aria-live` on the word. Screen readers then announce a new word every 2.6 seconds; keep the animated part hidden and expose one stable word.',
  ],

  notes: [
    'Pass `paused` to hold the word, e.g. while a modal is open over the hero.',
    'The `before` slot accepts any node; the demo wraps "React Design System" in a block span to force the two-line split.',
    '`HeroAnnouncement` renders an anchor when given `href`, otherwise a static pill.',
  ],

  apiSignature:
    'function RotatingWordHero(props: { words: string[]; before?: ReactNode; after?: ReactNode; announcement?: ReactNode; description?: ReactNode; actions?: ReactNode; badges?: { label: string; version?: string; icon?: ComponentType }[]; interval?: number; paused?: boolean; glow?: boolean; children?: ReactNode; className?: string }): JSX.Element\nfunction RotatingWord(props: { words: string[]; interval?: number; paused?: boolean; underline?: boolean; className?: string }): JSX.Element\nfunction HeroAnnouncement(props: { tag?: string; href?: string; onClick?: MouseEventHandler; children: ReactNode }): JSX.Element',

  props: [
    { name: 'words', type: 'string[]', description: 'Words cycled in the headline slot. One word renders static.' },
    { name: 'before / after', type: 'ReactNode', description: 'Headline text around the rotating word.' },
    { name: 'interval', type: 'number', default: '2600', description: 'Milliseconds per word.' },
    { name: 'paused', type: 'boolean', default: 'false', description: 'Holds the current word.' },
    { name: 'announcement', type: 'ReactNode', description: 'Pill above the headline, usually a `HeroAnnouncement`.' },
    { name: 'description', type: 'ReactNode', description: 'Subcopy under the headline (max 620px).' },
    { name: 'actions', type: 'ReactNode', description: 'CTA row, e.g. a primary and a secondary kit Button.' },
    { name: 'badges', type: 'HeroBadgeItem[]', default: '[]', description: '`{ label, version?, icon? }` items separated by dots.' },
    { name: 'glow', type: 'boolean', default: 'true', description: 'Soft accent light bars behind the headline.' },
    { name: 'children', type: 'ReactNode', description: 'Content below the badges row, e.g. a product shot.' },
  ],

  reducedMotion:
    'The rotation stops entirely and the headline shows its current word. The width transition is removed, and the word renders without enter/exit motion.',

  cleanup:
    'The interval is cleared whenever the rotation stops or the hero unmounts; the ResizeObserver is disconnected on unmount. useInView and useVisibility unsubscribe their shared observers.',

  acceptance:
    'The headline reads "React Design System / for Finance Interface" with a dotted rule under Finance. About every 2.6s the word slides up and blurs out while the next (Healthcare, Agentic, …) rises in, and "Interface" glides to its new position. Hovering the word pauses it. With reduced motion the word never changes. Light and dark both show the pill, CTAs and four badges.',

  criticalRegion: 'critical',
};

export default meta;
