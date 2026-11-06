import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'accordion',
  title: 'Accordion',
  category: 'display',
  kit: 'boardui',
  tags: ['accordion', 'disclosure', 'faq', 'expand', 'react-aria', 'boardui'],
  blurb: 'Sections that expand in place in divided, contained and separated styles, with an eased height and a blur-in body, on React Aria.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/accordion.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'Stacked sections for FAQs, settings groups and order details. `Accordion` is React Aria\'s `DisclosureGroup` and each `AccordionItem` is a `Disclosure`, so every header is a real button inside a heading with `aria-expanded`, and a collapsed panel stays searchable by find-in-page. Opening is pure CSS: React Aria measures the panel into `--disclosure-panel-height`, the panel eases to that height over 300ms while the body fades in, drops 4px and sharpens from a 4px blur, and the indicator turns with it. Three looks share the code: hairline-divided rows, the landing FAQ\'s tray of rounded cards, and one bordered card per item.',

  mechanism: [
    '`Accordion` renders `AriaDisclosureGroup` with all props passed through (`defaultExpandedKeys`, `expandedKeys`, `allowsMultipleExpanded`, `onExpandedChange`) and puts `{ variant, indicator }` in a context, so items style themselves without prop drilling.',
    '`AccordionItem` renders `AriaDisclosure` with `group/item`, then an `AriaHeading` (level 3 by default) holding an `AriaButton slot="trigger"`: optional icon, title in `text-headline-medium`, optional description, and the indicator icon. Keyboard focus shows an inset 2px focus ring.',
    'The indicator is `RiArrowDownSLine` or `RiAddLine`. On `group-data-[expanded]/item` it rotates 180deg (chevron) or 45deg (plus turns into a close) and darkens from tertiary to primary icon colour, over 300ms.',
    '`AriaDisclosurePanel` gets `h-(--disclosure-panel-height) overflow-clip transition-[height] duration-300`. React Aria\'s `useDisclosure` writes the measured content height into that custom property, so the height eases between 0 and the real size.',
    'The body inside starts at `opacity-0` and, when motion is allowed, `-translate-y-1 blur-[4px]`. On expand it goes to `opacity-100 translate-y-0 blur-[0px]` with the same 300ms curve.',
    'Variant classes come from a `sortCx` map: `divided` uses `divide-y divide-separator-border`; `contained` is a `rounded-[26px]` tray with 3px gaps holding `rounded-[23px]` cards (surfaces swap in dark mode); `separated` is `gap-2` between `rounded-2xl` bordered cards with `shadow-xs`.',
  ],

  constants: [
    {
      name: 'EASE',
      value: 'cubic-bezier(0.22, 1, 0.36, 1), 300ms',
      why: 'A fast-out, soft-landing curve shared with the agent limits card and Tree View, used on the height, the body fade and the indicator turn so they move as one.',
    },
    {
      name: 'body entrance',
      value: 'opacity 0 → 1, translate-y -4px → 0, blur 4px → 0',
      why: 'The text settles into place as the panel opens instead of being revealed by the clip edge alone.',
    },
    {
      name: 'contained radii',
      value: 'tray rounded-[26px] p-[3px]; card rounded-[23px]',
      why: 'The card radius is the tray radius minus its 3px padding, so the curves stay concentric.',
    },
    {
      name: 'indicator turn',
      value: 'chevron rotate-180; plus rotate-45',
      why: 'A chevron points back up; a plus rotated 45deg reads as a close mark.',
    },
  ],

  pitfalls: [
    'Give every `AccordionItem` a stable `id`. `defaultExpandedKeys` and `expandedKeys` match on it.',
    'Do not animate the panel with `max-height` or JS. The height comes from `--disclosure-panel-height`, which React Aria keeps up to date when the content changes.',
    'The group allows one open item at a time by default. Pass `allowsMultipleExpanded` for settings groups where several can stay open.',
    'Pick `headingLevel` to fit the page outline; the default h3 is wrong under an h1-only page.',
    'Do not put interactive controls inside `title` or `description`. They render inside the trigger button.',
  ],

  notes: [
    'A collapsed panel uses `hidden="until-found"` (set by React Aria\'s `useDisclosure`), so the browser\'s find-in-page can reach hidden text and expand its section.',
    'The `separated` card uses `bg-background-full` (the modal ground) rather than the card surface, so inputs and switch tracks inside keep an edge in dark mode.',
  ],

  apiSignature:
    'type AccordionVariant = "divided" | "contained" | "separated"\ninterface AccordionProps extends Omit<DisclosureGroupProps, "className" | "children"> { variant?: AccordionVariant; indicator?: "chevron" | "plus"; className?: string; children: ReactNode }\ninterface AccordionItemProps extends Omit<DisclosureProps, "className" | "children"> { title: ReactNode; description?: ReactNode; icon?: ComponentType<{ className?: string }>; headingLevel?: 2 | 3 | 4 | 5 | 6; className?: string; children: ReactNode }\nfunction Accordion(props: AccordionProps): JSX.Element\nfunction AccordionItem(props: AccordionItemProps): JSX.Element',

  props: [
    { name: 'variant', type: '"divided" | "contained" | "separated"', default: '"divided"', description: 'Accordion: hairline rows, a tray of cards, or one bordered card per item.' },
    { name: 'indicator', type: '"chevron" | "plus"', default: '"chevron"', description: 'Accordion: chevron that flips, or plus that turns into a close.' },
    { name: 'defaultExpandedKeys / expandedKeys', type: 'Iterable<Key>', description: 'Accordion: uncontrolled or controlled open items (React Aria).' },
    { name: 'allowsMultipleExpanded', type: 'boolean', default: 'false', description: 'Accordion: let several items stay open (React Aria).' },
    { name: 'id', type: 'Key', description: 'AccordionItem: key matched by the expanded keys.' },
    { name: 'title', type: 'ReactNode', description: 'AccordionItem: header text inside the trigger button.' },
    { name: 'description', type: 'ReactNode', description: 'AccordionItem: supporting line under the title.' },
    { name: 'icon', type: 'ComponentType', description: 'AccordionItem: Remix Icon shown before the title.' },
    { name: 'headingLevel', type: '2 | 3 | 4 | 5 | 6', default: '3', description: 'AccordionItem: heading level wrapping the trigger.' },
    { name: 'isDisabled', type: 'boolean', description: 'AccordionItem: dims to 50% and blocks toggling (React Aria).' },
  ],

  reducedMotion:
    'Every transition carries `motion-reduce:transition-none`, and the body\'s 4px drop and blur are applied only under `motion-safe:`. With reduced motion the panel snaps open, the text appears in place, and the indicator jumps to its turned angle.',

  cleanup: 'Nothing to clean up. React Aria owns the expanded state and the panel measurement; the component adds no listeners or timers.',

  acceptance:
    'A contained accordion with `indicator="plus"` and `defaultExpandedKeys={["billing"]}` shows three rounded cards on a tray with the first open and its plus turned into a close. Clicking the second header closes the first and opens the second: its height eases over about 300ms and its text fades in from a slight blur while dropping 4px. Each header is a button with `aria-expanded` inside an h3, Enter and Space toggle it, and find-in-page for text in a closed panel opens that panel. With reduced motion everything snaps.',

  criticalRegion: 'critical',
};

export default meta;
