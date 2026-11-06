import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'pagination',
  title: 'Pagination',
  category: 'navigation',
  kit: 'boardui',
  tags: ['pagination', 'pager', 'ellipsis', 'responsive', 'navigation', 'boardui'],
  blurb:
    'Controlled pager with Previous/Next buttons, 32px page cells and ellipsis collapsing that turns compact below a 420px container.',
  cost: 'css',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/pagination.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'A controlled page navigator: secondary small `Button`s for Previous and Next at either end, and a row of 32px page cells between them that collapses long ranges to first, last, a window around the current page, and "…" placeholders. The active page borrows the raised secondary-button surface; the rest are ghost cells. A `ResizeObserver` on the nav switches it to an icon-only, zero-sibling layout when its own container is narrow, so it never clips.',

  mechanism: [
    '`paginationRange(current, total, sibling)` builds the item list. If `sibling * 2 + 5` (first, last, current, the siblings on both sides and two dots) is at least `total`, every page is shown. Otherwise it computes `leftSibling = max(current - sibling, 1)` and `rightSibling = min(current + sibling, total)`, and shows left dots only when `leftSibling > 2` and right dots only when `rightSibling < total - 2`.',
    'The three collapsed shapes keep the row a constant length: near the start it is `1…(3 + 2·sibling), …, total`; near the end `1, …, (total − 2 − 2·sibling)…total`; in the middle `1, …, leftSibling…rightSibling, …, total`. With the default `siblingCount` of 1 this is always 7 items, so the Next button does not jump sideways as you page.',
    '`useIsCompact` returns a callback ref for the `<nav>`. When the nav mounts it measures `offsetWidth` at once (during commit, so the first paint already has the right layout), then observes the border box with a `ResizeObserver`; `isCompact` is `width < 420`, and a width of 0 (hidden, not laid out) is ignored so the last layout stays. The ref\'s cleanup disconnects the observer when the nav unmounts. In compact mode both arrow buttons become `iconOnly` with the label moved to `aria-label`, and `paginationRange` is called with sibling 0, which trims the row to 5 items.',
    'The nav is `flex w-full items-center justify-between gap-2`, so Previous sits flush left, Next flush right and the `<ul>` of cells (`gap-0.5`) floats between them. Previous is disabled on page 1 and Next on the last page, and each calls `onChange(page ∓ 1)`.',
    'Each page is a `<button type="button" aria-label="Go to page N">` in a shared `cell` class: `size-8 rounded-lg text-body-medium`, centred. The current page gets `aria-current="page"` and the secondary-button surface (`border border-border-button-default bg-background-primary-default text-text-primary shadow-xs`). Others are `text-text-secondary` with `hover:bg-background-secondary-hover hover:text-text-primary`. Dots are `aria-hidden` `<li>`s in `text-text-tertiary`.',
    'The cells deliberately have no transition. Animating background, shadow and colour makes the previously active number visibly fade out on every page change, which reads as a flicker.',
    'With `totalPages <= 1` the component returns `null` after its hooks have run. The whole tree passes through `useTemplateCopy()`, which is the identity unless a `TemplateCopyProvider` supplies a translator for the labels.',
  ],

  constants: [
    {
      name: 'COMPACT_WIDTH',
      value: '420px',
      why: 'The full-label, one-sibling layout starts clipping somewhere between 380 and 420px depending on how many digits `totalPages` has. Switching at the upper end of that range means it never clips.',
    },
    {
      name: 'cell',
      value: 'size-8 (32×32), rounded-lg, gap-0.5',
      why: '32px matches the small secondary `Button` height on either side, so the whole row shares one baseline and one height. The 2px gap keeps hover backgrounds from touching.',
    },
    {
      name: 'item count',
      value: 'siblingCount × 2 + 5 (7 at the default of 1)',
      why: 'First, last, current, the siblings and two dot slots. Keeping the count constant across the three collapsed shapes is what stops the row from changing width while paging.',
    },
    {
      name: 'siblingCount default',
      value: '1',
      why: 'One neighbour each side is enough to step through pages by clicking without overfilling a card footer. Compact mode forces 0.',
    },
  ],

  pitfalls: [
    'Do not add `transition-colors` to the page cells. The old active cell then fades out while the new one fades in, which looks like a flicker on every click.',
    'Do not decide compact mode only in the `ResizeObserver` callback, and do not let a 0 width count. The first callback lands after the first paint, so a narrow pager flashes its full labels, and a hidden pager (0 wide) would flip to compact and flash that when shown again.',
    'Do not switch to compact mode on a viewport media query. The pager lives in cards and table footers, so it observes its own nav width with a `ResizeObserver`.',
    'Do not drop the `aria-label` on the icon-only arrows. In compact mode the visible label is gone and the button would otherwise be announced as just "button".',
    'Do not use the array index as the key for page cells. They are keyed by page number so a cell keeps its identity, and focus, when the window shifts. Only the dots use an index key.',
    'Do not treat it as uncontrolled. It renders whatever `page` it is given and only reports clicks through `onChange`, so the parent must store the page.',
  ],

  notes: [
    'The observer follows the nav, not the component: if `totalPages` starts at 1 (the pager renders `null`) and grows later, the nav attaches and is measured then; dropping back to 1 disconnects it.',
    'The arrow icons come through `Button`, which mirrors directional glyphs in RTL, so Previous and Next point the reading direction automatically.',
  ],

  apiSignature:
    'function Pagination(props: { page: number; totalPages: number; onChange: (page: number) => void; siblingCount?: number; className?: string; previousLabel?: string; nextLabel?: string; "aria-label"?: string }): JSX.Element | null',

  props: [
    { name: 'page', type: 'number', description: 'Current page, 1-based. Controlled.' },
    { name: 'totalPages', type: 'number', description: 'Number of pages. At 1 or fewer the component renders nothing.' },
    { name: 'onChange', type: '(page: number) => void', description: 'Called with the target page from a cell, Previous or Next.' },
    { name: 'siblingCount', type: 'number', default: '1', description: 'Pages shown on each side of the current one. Forced to 0 below a 420px container.' },
    { name: 'previousLabel / nextLabel', type: 'string', default: '"Previous" / "Next"', description: 'Button labels, used as `aria-label` in compact mode.' },
    { name: 'aria-label', type: 'string', default: '"Pagination"', description: 'Accessible name of the `<nav>` landmark.' },
  ],

  reducedMotion:
    'Nothing animates. The page cells have no transitions by design, and the arrow buttons only have the shared button press, which `Button` already removes under `prefers-reduced-motion: reduce`.',

  cleanup:
    'The `ResizeObserver` on the nav is disconnected by the callback ref\'s cleanup whenever the nav unmounts (component unmount, or `totalPages` dropping to 1). There are no timers or animation frames.',

  acceptance:
    'With page 3 of 10 the row reads Previous, 1, 2, 3, 4, 5, …, 10, Next, with 3 raised and bordered. Clicking 4 moves the raised cell instantly with no fade and the row becomes 1, …, 3, 4, 5, …, 10, still seven items. Previous is disabled on page 1 and Next on page 10. Narrowing the container below 420px turns both arrows into icon-only buttons and the row becomes 1, …, 3, …, 10 without clipping. Each page cell announces "Go to page N" and the current one has `aria-current="page"`.',

  criticalRegion: 'critical',
};

export default meta;
