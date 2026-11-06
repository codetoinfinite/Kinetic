import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'important-alerts-card',
  title: 'Important Alerts Card',
  category: 'display',
  kit: 'boardui',
  tags: ['card', 'alerts', 'feed', 'dashboard', 'medical', 'boardui'],
  blurb: 'A health dashboard card: weekly alert count, a week pill, and a scrolling feed of tinted-icon alerts that fades under its header.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/important-alerts-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
    {
      path: 'registry/ui/week-range-pill.tsx',
      type: 'registry:ui',
      role: 'week range pill in the header',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The alerts card from BoardUI\'s medical profile dashboard. A header shows "Important alerts" with a large weekly count (12 this week) and a static week pill ("29 Jun - 5 Jul"). Below it, a fixed-height feed lists the six most recent alerts: a coloured circle with a white Remix icon, a title, a description and a date tag pinned to the row\'s top-right corner. The feed runs flush to the card\'s bottom edge and clips there, so the third row is cut off as in the Figma frame, and a card-coloured gradient fades in over the top of the feed once it has been scrolled.',

  mechanism: [
    'The `section` is a fixed `h-[330px]` flex column with `overflow-hidden rounded-[20px]` and 10px padding on the top and sides only, so the feed meets the bottom edge. Its 1px border is the same colour as its background: invisible, but content clips inside it so rows stop 1px short of the rounded corner.',
    'The header is a flex row: label in `text-body-medium text-text-secondary`, the count `12` in `text-title-1-medium tabular-nums` with "this week" baseline-aligned beside it, and `WeekRangePill` on the end.',
    'The feed is `flex-1 min-h-0 overflow-y-auto overscroll-contain` with `gap-2.5` and `pb-2.5`, so it scrolls inside the card without chaining to the page and the last row has room at the bottom.',
    'Each alert row is `rounded-2lg bg-background-inner-default p-2.5`: a `size-8` circle in the alert\'s colour with an 18px white icon, the title (`text-body-medium`, no wrap) and description (`text-body-2-regular`), plus an absolutely positioned date tag at `top-2.5 end-2.5`.',
    'An `onScroll` handler sets `scrolled` to `scrollTop > 0`. An `aria-hidden` 40px `bg-linear-to-b from-background-secondary-default to-transparent` overlay at the top of the feed transitions to `opacity-100` while scrolled, so rows dissolve under the header instead of being cut by it.',
    '`WeekRangePill` renders a 32px tall, min-151px pill with a 1px button border and `shadow-xs`. Without `onPrev`/`onNext` both chevrons are `aria-hidden` spans and the label is plain text.',
  ],

  constants: [
    {
      name: 'card height',
      value: '330px, rounded-[20px], px-2.5 pt-2.5 (no bottom padding)',
      why: 'Matches the Figma frame, where the feed is deliberately cut by the card\'s bottom edge to show it scrolls.',
    },
    {
      name: 'ALERTS_THIS_WEEK_COUNT',
      value: '12',
      why: 'The week\'s total, higher than the six rows in the feed, which only lists the most recent alerts.',
    },
    {
      name: 'top fade',
      value: 'h-10 (40px) gradient, opacity 200ms ease-out',
      why: 'Shown only once `scrollTop > 0`, so the first row is never dimmed at rest.',
    },
    {
      name: 'icon tints',
      value: 'rose-600, amber-400, emerald-500, blue-400, purple-400, teal-400',
      why: 'One hue per alert type (heart rate, Medical ID, lab results, medication, sleep, blood oxygen) so a row can be recognised at a glance.',
    },
    {
      name: 'week pill',
      value: 'h-8, min-w-[151px], rounded-2lg, border-border-button-default, shadow-xs',
      why: 'The same 151×32 chrome as the dashboard\'s other range pills; min-width rather than width so a longer label grows the pill.',
    },
  ],

  pitfalls: [
    'The alerts, the count and the week label are constants inside the file. To use real data, lift `ALERTS` and the count into props; the component takes only `className` today.',
    'Do not give the card a fixed height and remove `min-h-0` from the feed wrapper. Without it the flex child grows to its content and the feed stops scrolling.',
    'Do not add bottom padding to the card. The flush bottom edge is what tells people the feed scrolls.',
    'If you change the card background, change the fade\'s `from-` colour and the border colour with it, or the fade shows as a band and the border as a line.',
  ],

  notes: [
    'The date tag is absolutely positioned, so a very long title can run under it; titles are kept short and `whitespace-nowrap`.',
    '`WeekRangePill` also has an interactive mode: pass `onPrev`/`onNext` and the chevrons become real buttons and the label rolls like a counter (220ms `label-out` / `label-in` keyframes). This card uses the static mode.',
    'All copy passes through `useTemplateCopy`, which translates display strings when a `TemplateCopyProvider` is present and is a no-op otherwise.',
  ],

  apiSignature:
    'function ImportantAlertsCard(props?: { className?: string }): JSX.Element\nfunction WeekRangePill(props: { label: string; onPrev?: () => void; onNext?: () => void; className?: string }): JSX.Element',

  props: [
    { name: 'className', type: 'string', description: 'ImportantAlertsCard: merged onto the card section, e.g. to set its width.' },
    { name: 'label', type: 'string', description: 'WeekRangePill: the range text, e.g. "29 Jun - 5 Jul".' },
    { name: 'onPrev / onNext', type: '() => void', description: 'WeekRangePill: makes the chevrons buttons and turns on the rolling label.' },
  ],

  reducedMotion:
    'The only motion in the card is the 200ms opacity fade of the top gradient while scrolling. It does not move anything, so there is no reduced-motion branch; scrolling itself is native.',

  cleanup: 'Nothing to clean up. The scroll handler is a React prop and the only state is a boolean.',

  acceptance:
    'The card renders 330px tall with "Important alerts", a large 12 and "this week", and a "29 Jun - 5 Jul" pill with chevrons on the right. The feed starts with High Heart rate and is cut off mid-row by the card\'s bottom edge. Scrolling the feed fades a gradient in under the header within 200ms and fades it out again when scrolled back to the top; the page does not scroll when the feed reaches its end. Each row has a coloured circle with a white icon and a date tag in its top-right corner.',

  criticalRegion: 'critical',
};

export default meta;
