import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'feature-card-grid',
  title: 'Feature Card Grid',
  category: 'block',
  kit: 'boardui',
  tags: ['features', 'grid', 'landing', 'marketing', 'cards', 'boardui'],
  blurb:
    'Landing grid of feature cards, each topped by a small illustration built from kit parts that plays a state change on hover or focus.',
  cost: 'css',
  motif: 'grid',

  files: [
    { path: 'registry/ui/feature-card-grid.tsx', type: 'registry:ui', role: 'component' },
  ],
  dependencies: [],

  summary:
    'The "what is in the box" section of a component-kit landing page: a centred header (eyebrow, title, copy, CTAs) over a responsive grid of rounded cards. Each card shows a cropped, fading illustration on top and a title with a two-line description below. The illustration can be a render function that receives `{ active }`, so a picture assembled from real kit components (ProgressTrack, Switch, Checkbox, Chip, Avatar, Kbd) can flip a switch, fill a bar or complete a step while the card is hovered or focused.',

  mechanism: [
    'Active state: `FeatureCard` keeps `hovered` (pointerenter/leave) and `focused` (focus, and blur only when focus leaves the card, checked with `relatedTarget`) and ORs them into `active`. It writes `data-active` on the card and calls the illustration with `{ active }` when it is a function, so the artwork changes props on real components and their own transitions animate the change.',
    'Artwork frame: the top area is a fixed 196px, `overflow-hidden`, with `mask-b-from-75%` so artwork that runs past the bottom fades out instead of being cut, and wider artwork is simply cropped at the card edge. While active the artwork lifts 4px on a 500ms ease-out curve.',
    'The artwork is `aria-hidden` and `inert`: it is made of interactive kit components (checkboxes, switches, buttons) shown read-only, and inert keeps them out of the tab order and the accessibility tree, so the card is one stop with one name.',
    'Card element: with `href` the whole card is an `<a>`, otherwise an `<article>`; both get the hover border and shadow lift and a focus-visible ring offset from the page background.',
    'Grid: the `<section>` is an `@container/features`; columns step 1 → 2 (@xl) → 3 (@4xl) → 4 (@6xl) with the gap opening from 16 to 24px at four columns. `span={2}` widens a card from two columns up, for bento layouts.',
  ],

  constants: [
    { name: 'artwork height', value: '196px', why: 'About two thirds of a 300px-wide card, leaving room for a title and two lines of copy at a near-square card.' },
    { name: 'fade', value: 'mask-b-from-75%', why: 'Artwork can be taller than the frame and trail off; the last quarter fades into the card.' },
    { name: 'lift', value: '-4px, 500ms cubic-bezier(0.22,1,0.36,1)', why: 'Enough to read as a response, small enough that cropped artwork never reveals its top edge.' },
    { name: 'columns', value: '1 / 2 @xl / 3 @4xl / 4 @6xl', why: 'Keeps each card between roughly 260 and 340px wide at every container size.' },
  ],

  pitfalls: [
    'Leaving the illustration interactive. Kit checkboxes and switches inside a card link nest focusable controls in a link and add a dozen tab stops; mark the frame `inert` and `aria-hidden`.',
    'Clearing focus state on every `blur`. Focus moving between elements inside the card fires blur; check `relatedTarget` against the card first.',
    'Using `md:`/`lg:` for the column count. The grid often sits in a narrower column than the window; container queries keep cards a sane width.',
    'Animating the illustration with its own timers. Reacting to `active` keeps every card still until a visitor points at it, which also costs nothing off screen.',
  ],

  notes: [
    'The demo builds eight illustrations entirely from kit components and tokens: ProgressTrack bars that fill further, a Switch that flips, Checkboxes that select, a sidebar selection that moves.',
    'Pass a plain node as `illustration` for static artwork.',
  ],

  apiSignature:
    'function FeatureCardGrid(props: { eyebrow?: ReactNode; title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }): JSX.Element\nfunction FeatureCard(props: { title: ReactNode; description?: ReactNode; illustration?: ReactNode | ((state: { active: boolean }) => ReactNode); href?: string; onClick?: MouseEventHandler; span?: 1 | 2; className?: string }): JSX.Element',

  props: [
    { name: 'title', type: 'ReactNode', description: 'Card heading (rendered as h3).' },
    { name: 'description', type: 'ReactNode', description: 'Up to two lines of supporting copy.' },
    { name: 'illustration', type: 'ReactNode | ({ active }) => ReactNode', description: 'Artwork for the top frame; the function form reacts to hover and focus.' },
    { name: 'href', type: 'string', description: 'Makes the card a link.' },
    { name: 'span', type: '1 | 2', default: '1', description: 'Columns spanned from the two-column breakpoint up.' },
    { name: 'eyebrow / title / description / actions', type: 'ReactNode', description: 'FeatureCardGrid header slots; all optional.' },
  ],

  reducedMotion:
    'The artwork lift and its transition are removed with `motion-reduce:` variants. State changes still happen on hover, they just snap; kit components drop their own transitions under the same preference.',

  cleanup:
    'No listeners, timers or effects; hover and focus state are plain React handlers on the card.',

  acceptance:
    'At 1280px the section shows the install line, title, copy and two CTAs above four columns of cards. Hovering "Agent limits" raises the card and its context bar moves from 82% to 91%; hovering "Notification settings" flips the Mentions switch on; leaving restores both. Tab skips everything inside the artwork. In a narrow container the grid drops to two and then one column.',

  criticalRegion: 'critical',
};

export default meta;
