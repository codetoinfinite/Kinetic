import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'badge',
  title: 'Badge',
  category: 'display',
  kit: 'boardui',
  tags: ['badge', 'counter', 'count', 'pill', 'boardui'],
  blurb:
    'The small numeric counter on nav items and unread totals: a 16px pill in a selected (blue) or resting (neutral) tone.',
  cost: 'css',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/badge.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A `<span>` with two colour tones and one fixed shape, 12px semibold type in a 4px-radius pill. It exists so every count in the kit (sidebar items, tab counts, unread totals) has the same metrics. The tone tracks the selection state of whatever holds it, not the meaning of the number.',

  mechanism: [
    'The shape is one class string: `inline-flex` centred content, `px-1 py-px`, `rounded-sm` and the kit\'s `text-caption-1-semibold` type style (12px over a 16px line). With one pixel of vertical padding the pill is 18px tall, short enough to sit inside a 32px nav row without pushing its height.',
    '`whitespace-nowrap` keeps "1,204" or "99+" on one line. Combined with `inline-flex` the pill grows with its content, and there is no fixed width that a three-digit count could overflow.',
    '`primary` uses `bg-accent-400` with white text and is meant for a badge inside the selected nav item, where the row itself is tinted. `neutral` uses the `badge-neutral-background` token with secondary text for every other row. The neutral token is redefined in `.dark`, so the same class reads correctly on both themes.',
    'All other attributes spread onto the `<span>`, so `aria-label="12 unread"` or a `title` pass straight through. `className` merges through `tailwind-merge`, so `rounded-full` replaces `rounded-sm` instead of both applying.',
  ],

  constants: [
    {
      name: 'padding',
      value: 'px-1 py-px (4px / 1px)',
      why: 'Figma\'s counter spec. Horizontal padding of 4px keeps a single digit almost square. Larger vertical padding makes the badge taller than the label text it sits beside, and the nav row starts to look uneven.',
    },
    {
      name: 'type',
      value: 'text-caption-1-semibold, tracking-normal',
      why: 'The smallest tier in the kit\'s type scale. `tracking-normal` overrides the negative tracking the scale applies at larger sizes, because tight tracking at 12px makes adjacent digits such as 11 merge into one shape.',
    },
  ],

  pitfalls: [
    'Choosing the tone by meaning ("red for errors"). Badge has no status palette on purpose: its tone follows selection. For status use `Chip` or `StatusDot`, which do carry status colours.',
    'Using a bare number as the only label. A screen reader hears "12" with no context. Pass `aria-label` ("12 unread messages"), or make sure the surrounding link text explains the count.',
    'Giving the pill a fixed `w-*` so counts line up. Three digits then clip or wrap. Align the column with the parent\'s layout instead, for example `ms-auto` in a flex row.',
  ],

  notes: [
    'The sidebar, tabs and notification centre all import this file, so changing its metrics changes every count in the kit at once. That shared source is the reason it is its own item.',
  ],

  apiSignature:
    'function Badge(props: HTMLAttributes<HTMLSpanElement> & { color?: "primary" | "neutral"; ref?: Ref<HTMLSpanElement> }): JSX.Element',

  props: [
    { name: 'color', type: '"primary" | "neutral"', default: '"neutral"', description: '`primary` (blue fill, white text) inside a selected row; `neutral` everywhere else.' },
    { name: 'children', type: 'ReactNode', description: 'The count or short label. Keep it to a few characters.' },
    { name: 'className', type: 'string', description: 'Merged through `tailwind-merge`, so conflicting utilities replace the defaults.' },
  ],

  reducedMotion:
    'Nothing animates. The badge is static, so there is no motion to reduce.',

  cleanup:
    'Nothing to clean up. The component renders a styled span with no state, effects or listeners.',

  acceptance:
    'A neutral badge reads clearly on the page background in both light and dark themes, and a primary badge is legible white-on-blue inside a selected nav row. "7", "48" and "1,204" all sit on one line with even side padding, and the pill is no taller than the 16px label line beside it. A consumer `rounded-full` turns it into a full pill without leaving `rounded-sm` in the computed styles.',

  criticalRegion: 'critical',
};

export default meta;
