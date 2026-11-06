/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "FAQ Section" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'faq-section',
  title: 'FAQ Section',
  category: 'block',
  kit: 'boardui',
  tags: ['faq', 'accordion', 'landing', 'section', 'boardui'],
  blurb:
    'Landing FAQ: heading block plus the kit accordion tray, two-column at wide container widths, with arrow-key navigation.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/faq-section.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'A `<section>` that pairs a heading block (eyebrow, title, copy, an optional aside) with the kit `Accordion` in its `contained` variant: white question cards on a grey tray, each with a plus that turns into a close. Below 64rem of container width it stacks and centres like the landing page. From 64rem the heading block becomes a sticky left column and the questions fill the right. The question headers also answer to the arrow, Home and End keys.',

  mechanism: [
    'The root is `@container w-full`, and every responsive switch is a container variant (`@xl:`, `@5xl:`), not a media query. The section therefore lays out by the width it is given: a scaled preview, a docs column or a full page all get the right arrangement.',
    'In the `split` layout the inner wrapper is `grid grid-cols-1`, which becomes `@5xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]` with a 64px gap inside a 1120px max width. The heading block switches from `items-center text-center` to `@5xl:items-start @5xl:text-start @5xl:sticky @5xl:top-10 @5xl:self-start`, so it stays in view while a long answer list scrolls past. `self-start` is what lets sticky work inside a grid cell. `stacked` keeps the single centred 760px column at every width.',
    'Questions map to `AccordionItem`s inside `<Accordion variant="contained" indicator="plus">`. The expansion props (`expandedKeys`, `defaultExpandedKeys`, `onExpandedChange`, `allowsMultipleExpanded`) pass straight through to React Aria\'s DisclosureGroup, so the section can be controlled or uncontrolled. Each question heading is one level below the section title (`headingLevel + 1`), and the section is `aria-labelledby` the title.',
    'Every answer body is wrapped in `[data-faq-answer]`. An `onKeyDown` on the list wrapper collects `button[aria-expanded]` elements that are not disabled and not inside an answer. ArrowDown and ArrowUp move focus with wrap-around, Home and End jump to the ends, and `preventDefault` stops the page from scrolling. Keys pressed inside an answer are ignored, so a nested control keeps its own keyboard behaviour.',
    'The title runs from `text-display-4-medium` (32px) up to `@xl:text-display-2-medium` (48px), with letter-spacing tightened to -0.035em at the large size. The description is capped at 440px so it wraps to two balanced lines under the title.',
  ],

  constants: [
    {
      name: 'split breakpoint',
      value: '@5xl (64rem of container width)',
      why: 'Below about 1024px a 5:7 split leaves the question column under 560px, and the longest questions start wrapping to three lines. Above it both columns read comfortably.',
    },
    {
      name: 'column ratio',
      value: 'minmax(0,5fr) minmax(0,7fr), gap 64px, max 1120px',
      why: 'The heading column only needs to fit a two-line display title and its copy. The extra width goes to the questions. `minmax(0, …)` stops a long unbroken answer from pushing the grid wider than its container.',
    },
    {
      name: 'title scale',
      value: '32px → 48px at @xl, tracking -0.02em → -0.035em',
      why: 'The two-line display title from the landing page needs tight tracking at 48px to read as one block. At 32px the same tracking crowds the letters, so it eases off.',
    },
    {
      name: 'answer measure',
      value: 'max-w-[60ch]',
      why: 'In the wide right column an unbounded answer runs over 100 characters per line. 60ch keeps answers readable without changing the card width.',
    },
  ],

  pitfalls: [
    'Using viewport breakpoints (`lg:`) for the split. Inside a scaled preview, a dashboard column or a modal the viewport says "wide" while the section is narrow, and the two columns crush the questions. The layout must read the container.',
    'Dropping `self-start` from the sticky heading. Grid items stretch to the row height by default, so a sticky element as tall as the row has nowhere to stick and scrolls away with the page.',
    'Finding headers with a broad `button` selector. An answer that holds its own disclosure or button would join the arrow-key cycle. Filter by `aria-expanded` and exclude anything inside `[data-faq-answer]`.',
    'Keeping the question headings at the same level as the section title. Screen-reader heading lists then show the questions as siblings of the section instead of its children. Use `headingLevel + 1`.',
  ],

  notes: [
    'Pass `layout="stacked"` for the exact centred column of the landing page at every width. The `aside` slot sits under the heading in either layout, which suits a contact card or an expand-all control.',
    'Collapsed answers use React Aria\'s `hidden="until-found"`, so the browser\'s find-in-page still searches them and opens the matching row.',
  ],

  apiSignature:
    'function FaqSection(props: { items: { id: string; question: ReactNode; answer: ReactNode; isDisabled?: boolean }[]; title?: ReactNode; description?: ReactNode; eyebrow?: ReactNode; layout?: "split" | "stacked"; variant?: "divided" | "contained" | "separated"; expandedKeys?: Iterable<Key>; defaultExpandedKeys?: Iterable<Key>; onExpandedChange?: (keys: Set<Key>) => void; allowsMultipleExpanded?: boolean; aside?: ReactNode; footer?: ReactNode; headingLevel?: 2 | 3 | 4 | 5; id?: string; className?: string }): JSX.Element',

  props: [
    { name: 'items', type: 'FaqEntry[]', description: 'Questions in order: `{ id, question, answer, isDisabled? }`. `id` is the key that `expandedKeys` holds.' },
    { name: 'title', type: 'ReactNode', default: '"Frequently asked questions"', description: 'Section title, rendered as `h{headingLevel}` and used as the section\'s accessible name.' },
    { name: 'description', type: 'ReactNode', description: 'Supporting copy under the title, capped at 440px.' },
    { name: 'eyebrow', type: 'ReactNode', description: 'Small uppercase label above the title.' },
    { name: 'layout', type: '"split" | "stacked"', default: '"split"', description: '`split` turns two-column from 64rem of container width; `stacked` stays a centred column.' },
    { name: 'variant', type: '"divided" | "contained" | "separated"', default: '"contained"', description: 'Accordion look, forwarded to the kit Accordion.' },
    { name: 'expandedKeys', type: 'Iterable<Key>', description: 'Controlled open question ids.' },
    { name: 'defaultExpandedKeys', type: 'Iterable<Key>', description: 'Initially open question ids when uncontrolled.' },
    { name: 'onExpandedChange', type: '(keys: Set<Key>) => void', description: 'Called with the new set of open ids.' },
    { name: 'allowsMultipleExpanded', type: 'boolean', default: 'false', description: 'Allow several answers open at once. When false, opening one closes the other.' },
    { name: 'aside', type: 'ReactNode', description: 'Content under the heading block (left column when split).' },
    { name: 'footer', type: 'ReactNode', description: 'Content under the question list.' },
    { name: 'headingLevel', type: '2 | 3 | 4 | 5', default: '2', description: 'Title level. Questions use the next level down.' },
  ],

  reducedMotion:
    'The only motion is the accordion\'s own: the panel height, the content fade-and-blur and the plus rotation. All of them carry `motion-reduce:transition-none`, so answers open and close instantly. Sticky positioning is not animation and stays.',

  cleanup:
    'Nothing to clean up. The section adds one React `onKeyDown` handler and no effects, timers or observers. React Aria owns the disclosure state.',

  acceptance:
    'In a container at least 1024px wide the title and copy sit in a left column and the nine questions run down the right column. Below that width everything centres in one column. Clicking a question opens its answer and turns its plus into a close. With `allowsMultipleExpanded` false, opening a second question closes the first. With a header focused, ArrowDown and ArrowUp move focus to the next and previous header (wrapping), Home and End jump to the ends, and Enter toggles the focused one. Expanding all from controlled state shows every answer.',

  criticalRegion: 'critical',
};

export default meta;
