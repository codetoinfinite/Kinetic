import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'cta-section',
  title: 'CTA Section',
  category: 'block',
  kit: 'boardui',
  tags: ['cta', 'landing', 'marketing', 'section', 'cards', 'boardui'],
  blurb:
    'Closing call-to-action: a faded stack of product cards, a large headline, copy and buttons that rise in one after another on scroll.',
  cost: 'css',
  motif: 'stack',

  files: [{ path: 'registry/ui/cta-section.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: [],

  summary:
    'The last section of a landing page. A fanned stack of product cards (the Stacked Card Fan, with its lower edge masked into the page and a "See all" pill) sits above a large two-line headline, a short paragraph and a row of actions, all centred on a full-width surface. The first time a quarter of the section scrolls into view, the visual, headline, copy and actions rise, unblur and fade in one after another. The cards stay live: hovering spreads them, clicking cycles them and the pill lays them all out.',

  mechanism: [
    'Reveal flag: the kit `useInView` hook (shared IntersectionObserver, `once`, threshold 0.25) sets `data-shown` on the section. Each part carries the same transition class and is hidden by `group-data-[shown=false]/cta:` variants (16px lower, `opacity-0`, `blur-sm`). Flipping the one flag starts every transition.',
    'Stagger: parts are numbered in render order, skipping any that are not passed, and each gets an inline `transition-delay` of `order × 90ms`. A text-only CTA therefore starts with the headline and has no gap where the visual would be.',
    'Visual: `cards` are passed to `StackedCardFan` with `fade` (a `mask-b-from-55%` gradient mask) at 320×280px inside a 680px column. `fanProps` overrides any of its props, such as the pill label or the controlled front card.',
    'Fit: the section is a size container (`@container/cta`). Below `@2xl` the headline steps down from display-2 to display-4 and the copy from 16px to 14px, so it reads the same in a narrow preview as on a phone. `text-balance` keeps the headline lines even and `max-w-[18ch]` breaks it in two.',
    'Semantics: a `section` labelled by its `h2` through `useId`, so it appears as a named region; the action row takes any buttons or links.',
  ],

  constants: [
    { name: 'stagger', value: '90ms per part', why: 'Close enough that the four parts read as one movement, far enough apart that the order shows.' },
    { name: 'entrance', value: '700ms, 16px rise, blur-sm, cubic-bezier(0.22, 1, 0.36, 1)', why: 'A soft settle, matching the card fan transition, without a bounce on a closing section.' },
    { name: 'trigger', value: '25% visible, once', why: 'Starts when the section is clearly arriving, and does not replay when it is scrolled past again.' },
    { name: 'visual', value: '320 × 280px cards in a 680px column', why: 'Large enough that the front card reads, narrow enough that the fan stays above the headline width.' },
  ],

  pitfalls: [
    'Hiding parts with an `opacity-0` class that a reveal removes: reduced-motion visitors and anything rendered before the observer fires get a blank section. Key the hidden state to the flag being false and start it true under reduced motion.',
    'Animating `transform` while the cards inside also animate theirs: the entrance uses the standalone `translate` property and filter, so it composes with the fan transforms without overriding them.',
    'Using `md:` breakpoints for the headline size: in a scaled preview or a narrow column they follow the window. Use container queries on the section.',
  ],

  notes: [
    'Imports Stacked Card Fan and is shown with its `AGENT_DASHBOARD_CARDS` faces; any `StackedCardFanItem[]` works.',
    'Omit `cards` for a text-only CTA; the stagger starts at the headline.',
    'The demo actions are kit `ButtonLink`s with hash links.',
  ],

  apiSignature:
    'function CtaSection(props: { title: ReactNode; description?: ReactNode; actions?: ReactNode; cards?: StackedCardFanItem[]; fanProps?: Omit<StackedCardFanProps, "items">; className?: string }): JSX.Element',

  props: [
    { name: 'title', type: 'ReactNode', description: 'Headline; rendered as the `h2` that labels the section.' },
    { name: 'description', type: 'ReactNode', description: 'Supporting copy under the headline.' },
    { name: 'actions', type: 'ReactNode', description: 'Buttons or links, in a centred wrapping row.' },
    { name: 'cards', type: 'StackedCardFanItem[]', description: 'Cards for the faded stack above the headline; omit for text only.' },
    { name: 'fanProps', type: 'Omit<StackedCardFanProps, "items">', description: 'Overrides for the card stack (pill label, size, controlled state).' },
    { name: 'className', type: 'string', description: 'Classes for the section.' },
  ],

  reducedMotion:
    'The reveal flag starts true and the transitions are off (`motion-reduce:transition-none`), so everything is visible at once. The card fan changes state instantly under the same preference.',

  cleanup:
    'The shared IntersectionObserver stops watching the section after the first reveal (`once`) and on unmount. The entrance is CSS transitions with nothing to cancel.',

  acceptance:
    'Scrolling the section in shows the card stack, then the headline, copy and two buttons rising and unblurring in that order. The stack fades into the page at the bottom with the See all five pill over the fade; hovering spreads it and the pill lays the cards out. At 360px the headline is smaller and wraps, the buttons wrap onto two lines and nothing overflows. Light and dark both read.',

  criticalRegion: 'critical',
};

export default meta;
