import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'on-this-page-toc',
  title: 'On This Page TOC',
  category: 'navigation',
  kit: 'boardui',
  tags: ['docs', 'toc', 'scrollspy', 'navigation', 'intersection-observer', 'boardui'],
  blurb:
    'Right-hand "On this page" list that tracks the section you are reading with an IntersectionObserver and a sliding active bar.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/on-this-page-toc.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'The table of contents that sits to the right of a docs article. A thin rail runs down the list and a 2px bar slides to the section currently in view, which also turns its label from tertiary to primary. Clicking a label scrolls the article to that section and moves focus there. It watches any scroll container, not only the window, so it works inside panels and previews.',

  mechanism: [
    'Items are `{ id, label, depth? }`, where `id` is the id of a section element. One IntersectionObserver is created with `root` set to the `scrollRoot` element (or the viewport when omitted) and observes every section.',
    'The observer\'s `rootMargin` shrinks the root to an activation band: `-offset px` from the top and `-(1 - activationRatio)` from the bottom (by default the top 30%). Callbacks add or remove ids from an in-band set, and the active item is the last id in TOC order that is in the band, which is the section whose heading most recently scrolled into it. When nothing is in the band, the last active id is kept.',
    'A passive scroll listener on the same root only checks for reaching the end: once `scrollTop + clientHeight` hits `scrollHeight`, the last item wins, because a short final section can never reach the band.',
    'Clicking an item prevents the hash jump, computes the target offset relative to the root with `getBoundingClientRect`, and calls `root.scrollTo` (smooth unless reduced motion). The clicked id is committed at once and observer updates are locked until `scrollend` or a 900ms fallback, so the bar does not stutter through the sections the scroll passes.',
    'The indicator is one absolutely positioned span whose `translateY` and height are copied from the active link\'s `offsetTop` / `offsetHeight` in a layout effect. A ResizeObserver on the list re-measures when wrapping changes, and the first placement skips the transition so it does not slide in from the top.',
  ],

  constants: [
    { name: 'activation band', value: 'top 30% of the root (activationRatio 0.3)', why: 'A section counts as "being read" once its top crosses into the upper part of the view; a band that is too low flips the TOC before the heading is visible.' },
    { name: 'offset', value: '16px', why: 'Used for both the observer\'s top margin and the scroll target, so a clicked section lands where the observer already treats it as active.' },
    { name: 'click lock', value: 'until scrollend, max 900ms', why: 'Long enough for a smooth scroll across the article; the timeout covers browsers without `scrollend` and clicks on the section already in place.' },
    { name: 'indicator', value: '2px bar on a 1px rail, 300ms ease-out', why: 'Matches the reference: a light rail with a darker bar beside the active label.' },
    { name: 'end tolerance', value: '2px', why: 'Fractional scroll positions on high-DPI screens can stop a pixel short of `scrollHeight`.' },
  ],

  pitfalls: [
    'Observing with the default viewport root while the sections live in an inner scroll container. The sections never leave the viewport, so the TOC never changes; pass the container as `root`.',
    'Picking the entry with the largest `intersectionRatio`. Tall sections have tiny ratios, so the TOC jumps to short neighbours; track which ids are in the band and choose the last one in document order instead.',
    'Letting the observer drive the TOC during a click-initiated smooth scroll. The bar runs through every section in between; lock it to the clicked id until the scroll ends.',
    'Using `scrollIntoView` for the jump. It scrolls every ancestor, so the page under an embedded article moves too.',
    'Forgetting the end-of-scroll rule. A final section shorter than the band never becomes active and the last TOC item is unreachable by scrolling.',
  ],

  notes: [
    'Section ids in the demo are prefixed with `useId` so two copies on one page do not share targets.',
    'Prefer the section wrapper as the target over its heading: the wrapper stays intersecting while its body is read.',
  ],

  apiSignature:
    'function OnThisPageToc(props: { items: TocItem[]; scrollRoot?: RefObject<HTMLElement | null>; activeId?: string | null; defaultActiveId?: string | null; onActiveChange?: (id: string) => void; title?: ReactNode; offset?: number; activationRatio?: number; focusTarget?: boolean; "aria-label"?: string; className?: string }): JSX.Element\ntype TocItem = { id: string; label: string; depth?: 0 | 1 | 2 }',

  props: [
    { name: 'items', type: 'TocItem[]', description: 'Entries in document order; `id` is the section element id and `depth` indents sub-sections.' },
    { name: 'scrollRoot', type: 'RefObject<HTMLElement | null>', default: 'window', description: 'Scroll container holding the sections. Becomes the observer root and the element scrolled on click.' },
    { name: 'activeId / defaultActiveId', type: 'string | null', default: 'first item', description: 'Active section, controlled or initial.' },
    { name: 'onActiveChange', type: '(id: string) => void', description: 'Called when scrolling or a click changes the active section.' },
    { name: 'title', type: 'ReactNode', default: '"On this page"', description: 'Heading above the list; pass null to hide it.' },
    { name: 'offset', type: 'number', default: '16', description: 'Px between the root top and a section after a jump; also the top of the activation band.' },
    { name: 'activationRatio', type: 'number', default: '0.3', description: 'Fraction of the root height, from the top, in which a section counts as active.' },
    { name: 'focusTarget', type: 'boolean', default: 'true', description: 'Moves focus to the section after a jump (adds `tabindex="-1"` if needed).' },
    { name: 'className', type: 'string', description: 'Merged onto the nav.' },
  ],

  reducedMotion:
    'With reduced motion the click jump uses `behavior: "auto"` (an instant scroll) and the bar and label colour transitions carry `motion-reduce:transition-none`, so the indicator moves without sliding.',

  cleanup:
    'The IntersectionObserver is disconnected and the scroll listener removed when the component unmounts or its items, root, offset or ratio change. A pending click lock removes its `scrollend` listener and clears its timeout on release and on unmount. The ResizeObserver lives in `useResizeObserver` and disconnects itself.',

  acceptance:
    'Preview is active on load with the bar beside it. Scrolling the article moves the bar to Installation, Usage and so on; scrolling to the bottom activates Accessibility. Clicking Tokens scrolls the article so Tokens sits near the top, the Tokens link gets `aria-current="location"`, and the page around the demo does not move.',

  criticalRegion: 'critical',
};

export default meta;
