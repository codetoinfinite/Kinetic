import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'props-table',
  title: 'Props Table',
  category: 'display',
  kit: 'boardui',
  tags: ['docs', 'api-reference', 'table', 'responsive', 'boardui'],
  blurb:
    'API props table with code-styled names, types and defaults; long unions collapse, and narrow slots stack each prop into a card.',
  cost: 'css',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/props-table.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A documentation table for a component API: prop name in a grey code chip, the TypeScript type in the purple command colour, the default in muted code and a plain-language description. Required and deprecated props get small tinted tags. When the slot it sits in is narrower than 42rem, the same table re-flows into one bordered card per prop with Type and Default labels.',

  mechanism: [
    'The root is an `@container`; every layout switch uses `@2xl:` container variants, so the table reacts to the width of the column it lives in (a sidebar, a modal, a phone) rather than the viewport.',
    'Mobile-first, the `<table>`, `<tbody>` and `<tr>` are `block` / `flex flex-col` and each row is a rounded bordered card; from `@2xl` they return to `table`, `table-row-group` and `table-row` with a top separator instead of a card border. Explicit `role="table|rowgroup|row|columnheader|rowheader|cell"` attributes keep the semantics that `display` overrides strip in some engines.',
    'The header row is `sr-only` in card mode (`@2xl:not-sr-only` brings it back) and each cell carries its own `aria-hidden` label ("Type", "Default") that is `@2xl:hidden`, so sighted users get labels in cards while screen readers keep the column headers.',
    'A string `type` is split by `splitUnion`, which walks the string and only splits on `|` at depth 0 outside quotes (tracking `([{<` and ignoring the `>` of `=>`). Unions with more than `maxUnionMembers` members show the first ones plus a "+N more" button with `aria-expanded` / `aria-controls`; the expanded rows are kept in a `Set` keyed by prop name.',
  ],

  constants: [
    { name: 'stack breakpoint', value: '@2xl (42rem / 672px container width)', why: 'Below this the four columns squeeze descriptions into 2-3 words per line; the card layout reads better.' },
    { name: 'maxUnionMembers', value: '4 (demo uses 3)', why: 'Four literal members fit one line of a 30% column; longer unions wrap into a wall of code.' },
    { name: 'column widths', value: '22% / 30% / 14% / rest', why: 'Types need the most room after descriptions; defaults are short literals.' },
    { name: 'cell padding', value: 'px-4 py-3, header py-2.5', why: 'Matches the 16px inset of the docs preview cards and keeps rows at a ~44px minimum.' },
  ],

  pitfalls: [
    'Using viewport breakpoints (`md:`) for the stack switch. A props table in a narrow docs column on a wide screen would stay a cramped table; a container query follows the slot.',
    'Setting `display: block` on table elements without explicit ARIA roles. Some browsers then expose a flat list of text with no row or column relationships.',
    'Splitting union types on every `|`. Pipes inside generics, tuples, object types or string literals belong to one member.',
    'Labelling card cells with visible text that screen readers also hear next to the real column header. Mark the inline labels `aria-hidden`.',
  ],

  notes: [
    'Pass a ReactNode as `type` or `default` to skip union splitting and render your own markup (links to type docs, for example).',
    'With `idPrefix`, each row gets `id="<prefix>-<name>"` and `scroll-mt-20`, and a `:target` row is highlighted in table mode.',
  ],

  apiSignature:
    'function PropsTable(props: { rows: PropsTableRow[]; caption?: string; maxUnionMembers?: number; labels?: PropsTableLabels; idPrefix?: string; className?: string }): JSX.Element\ntype PropsTableRow = { name: string; type: string | ReactNode; default?: string | ReactNode; description?: ReactNode; required?: boolean; deprecated?: boolean }\nfunction splitUnion(type: string): string[]',

  props: [
    { name: 'rows', type: 'PropsTableRow[]', description: 'One entry per prop: name, type, optional default, description, required and deprecated flags.' },
    { name: 'caption', type: 'string', description: 'Visually hidden `<caption>` naming the table.' },
    { name: 'maxUnionMembers', type: 'number', default: '4', description: 'Unions longer than this collapse behind a "+N more" toggle; 0 never collapses.' },
    { name: 'labels', type: 'PropsTableLabels', default: '{ name: "Prop", type: "Type", default: "Default", description: "Description", ... }', description: 'Header and tag wording, for localisation.' },
    { name: 'idPrefix', type: 'string', description: 'Gives each row an id of `<idPrefix>-<name>` for deep links.' },
    { name: 'className', type: 'string', description: 'Merged onto the container element.' },
  ],

  reducedMotion:
    'Only the "+N more" button has a 150ms colour transition, removed with `motion-reduce:transition-none`. The layout switch is instant.',

  cleanup:
    'Nothing to release: no timers, listeners or observers. Container queries are pure CSS.',

  acceptance:
    'At full width the demo shows a bordered table with Prop, Type, Default and Description headers and six LineChartCard rows; `data` carries a "required" tag and `curve` a struck-through name with "deprecated". The `range` type shows three members and "+3 more"; clicking it reveals all six and the button reads "Show less" with aria-expanded="true". Switching to ChartTooltip swaps to four rows. Choosing Narrow constrains the slot to 360px and the same rows become separate cards with "Type" and "Default" labels while the header row disappears visually.',

  criticalRegion: 'critical',
};

export default meta;
