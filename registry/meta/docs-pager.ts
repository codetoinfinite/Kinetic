import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'docs-pager',
  title: 'Docs Pager',
  category: 'navigation',
  kit: 'boardui',
  tags: ['docs', 'pagination', 'previous-next', 'navigation', 'boardui'],
  blurb:
    'Previous / next cards for the foot of a docs page: arrow and title on top, a one-line summary below, mirrored for RTL.',
  cost: 'css',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/docs-pager.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'Two bordered cards that close a documentation page, pointing to the page before and the page after. The previous card sits left with a back arrow, the next card sits right with its text end-aligned, and each shows the page title over a short tertiary description. On hover the card fills and its arrow nudges toward where it leads.',

  mechanism: [
    'The nav is a one-column grid that becomes two columns from `sm`. The next card always takes `sm:col-start-2`, so on the first page (no previous) it still sits on the right instead of sliding into the empty left slot.',
    'Each card is an `<a rel="prev|next">` when the link has an `href`, otherwise a `<button>` that only calls `onNavigate(direction, link)`, which suits client routers and demos. The direction is read out through a visible label (`showLabels`) or an `sr-only` "Previous:" / "Next:" prefix, so the title and description stay part of the accessible name.',
    'The arrow uses `directionalIconClass` (`rtl:rotate-180`) and the hover nudge flips sign under `rtl:`, so in a right-to-left document the previous card points right and moves right. Because Tailwind v4 writes `translate` and `rotate` as separate properties, the nudge and the mirror compose without overriding each other.',
    'In button mode the pager re-renders in place. When the clicked card disappears (the first or last page was reached), an effect keyed on the two titles sees focus on `<body>` and moves it to the card that remains, so keyboard users are not dropped to the top of the document.',
  ],

  constants: [
    { name: 'card', value: 'rounded-xl, 1px border, px-4 py-3.5, shadow-xs', why: 'Matches the reference pager: a quiet bordered card that reads as part of the page rather than a primary button.' },
    { name: 'arrow nudge', value: '2px (translate-x-0.5), 200ms ease-out', why: 'Enough to hint at direction on hover without moving the title text.' },
    { name: 'type', value: 'title body-medium primary, description caption-1 tertiary', why: 'Same hierarchy as the reference: page name first, a muted one-liner under it.' },
  ],

  pitfalls: [
    'Letting the next card fall into the first grid column when there is no previous page. Readers expect "next" on the right; pin it with `col-start-2`.',
    'Putting `aria-label="Next page"` on the card. It replaces the title and description for screen readers; prefix an `sr-only` label instead.',
    'Mirroring the arrow with a `rotate-180` class that also sets `transform`, then adding a hover translate on the same property. One wins and the other is lost; keep them on separate properties.',
    'Re-rendering a pager whose clicked card unmounts without moving focus. Focus falls back to `<body>` and the next Tab starts from the top of the page.',
  ],

  notes: [
    'Pass `href` from your router\'s page list; `rel="prev"` / `rel="next"` also helps crawlers and reader modes.',
    'The component renders nothing when both links are missing, so it can sit in a layout unconditionally.',
  ],

  apiSignature:
    'function DocsPager(props: { prev?: DocsPagerLink | null; next?: DocsPagerLink | null; onNavigate?: (direction: "prev" | "next", link: DocsPagerLink) => void; showLabels?: boolean; prevLabel?: string; nextLabel?: string; "aria-label"?: string; className?: string }): JSX.Element | null\ntype DocsPagerLink = { title: string; description?: ReactNode; href?: string }',

  props: [
    { name: 'prev / next', type: 'DocsPagerLink | null', description: '`{ title, description?, href? }` for each neighbour; omit one at the ends of a section.' },
    { name: 'onNavigate', type: '(direction: "prev" | "next", link: DocsPagerLink) => void', description: 'Called on click; the only effect when the link has no `href`.' },
    { name: 'showLabels', type: 'boolean', default: 'false', description: 'Shows "Previous" / "Next" above the titles instead of keeping them screen-reader only.' },
    { name: 'prevLabel / nextLabel', type: 'string', default: '"Previous" / "Next"', description: 'Direction words, visible or `sr-only`.' },
    { name: 'aria-label', type: 'string', default: '"Previous and next page"', description: 'Name of the wrapping `<nav>`.' },
    { name: 'className', type: 'string', description: 'Merged onto the grid.' },
  ],

  reducedMotion:
    'The hover arrow nudge and the card colour transitions carry `motion-reduce:transition-none`; the arrow still shifts 2px but without animating.',

  cleanup:
    'Nothing to release: there are no timers, listeners or observers. The focus hand-off is a one-shot effect that reads `document.activeElement`.',

  acceptance:
    'The demo opens on Line Chart Card with "Heatmap Chart" on the left and "Most Active Days" on the right. Clicking Next twice reaches Sankey Flow (6 of 6), the right card disappears and focus moves to the remaining Previous card. Clicking Previous walks back; on Area Chart Card (1 of 6) only the Next card shows and it stays on the right.',

  criticalRegion: 'critical',
};

export default meta;
