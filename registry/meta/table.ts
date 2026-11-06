import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'table',
  title: 'Table',
  category: 'display',
  kit: 'boardui',
  tags: ['table', 'data', 'rows', 'react-aria', 'boardui'],
  blurb: 'Semantic table on React Aria with a scroll container, an md/sm density flag and dashboard styling from one scoped stylesheet.',
  cost: 'css',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/table.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'The static table primitive behind BoardUI\'s dashboard tables. Only the root is wrapped: `Table` adds a horizontal scroll container and a density flag around React Aria\'s `Table`. `TableHeader`, `TableColumn`, `TableBody`, `TableRow` and `TableCell` are React Aria\'s collection components re-exported untouched, because wrapping them would break React Aria\'s collection building. All visual styling (header band, row separators, cell padding, focus ring) lives in CSS scoped to `.bui-table`, so the markup stays real `<table>`, `<th>`, `<tr>` and `<td>` with keyboard navigation for free.',

  mechanism: [
    'Wrap the table in `<div className="w-full overflow-x-auto">` (plus `containerClassName`), so a wide table scrolls sideways inside its card instead of stretching the page.',
    'Render `AriaTable` with every React Aria prop passed through (`aria-label`, `selectionMode`, `sortDescriptor`, …), the forwarded `ref`, and `className = cx("bui-table", size === "sm" && "bui-table-sm", className)`.',
    'Re-export `TableHeader`, `Column as TableColumn`, `TableBody`, `Row as TableRow` and `Cell as TableCell` from react-aria-components unchanged, so React Aria can still introspect the collection.',
    'In the theme sheet, `.bui-table` is `w-full border-collapse text-start`. Header cells get `px-3 py-2.5 text-body-medium text-text-tertiary whitespace-nowrap`, the secondary background and a separator border above and below; body cells get `px-3 py-2.5 text-body-medium text-text-primary`.',
    'Rows are separated by `tbody tr:not(:last-child) { border-bottom }` only, so the last row never doubles up with the container edge or a pagination footer. `tr[data-focus-visible]` draws an inset 2px focus ring.',
    '`.bui-table-sm` drops cells to `px-2.5 py-1.5 text-body-2-medium`; padding and font-size carry a 200ms ease transition, so switching density animates.',
  ],

  constants: [
    {
      name: 'cell padding',
      value: 'md px-3 py-2.5 (12 / 10px); sm px-2.5 py-1.5 (10 / 6px)',
      why: 'The two dashboard densities. Both are set on th and td together, so header and body stay aligned.',
    },
    {
      name: 'density transition',
      value: 'padding 200ms ease, font-size 200ms ease',
      why: 'Toggling `size` reflows the rows smoothly instead of snapping.',
    },
    {
      name: 'separators',
      value: '1px solid var(--color-separator-border)',
      why: 'One token for the header band edges and the between-row rules, set with plain CSS because `@apply` drops border and background on row-group cells.',
    },
  ],

  pitfalls: [
    'Do not wrap `TableColumn`, `TableRow` or `TableCell` in your own components. React Aria builds the collection by introspecting these exact elements; restyle through `.bui-table` CSS or `className` instead.',
    'Do not forget `aria-label` (or `aria-labelledby`) on `Table`. Without one the grid has no accessible name.',
    'Mark exactly one column `isRowHeader`, usually the name column, so screen readers announce each row by it.',
    'Do not put the header background or borders on `<thead>`. With `border-collapse` the browser does not paint them on the row group, which is why the sheet puts them on `th`.',
  ],

  notes: [
    'Sorting, filtering and pagination are not built in. Pair the primitive with @tanstack/react-table (or your own state) and pass `sortDescriptor` / `onSortChange` through to React Aria.',
    'The component file\'s doc comment mentions h-16 / h-12 rows and a `data-size` attribute; the shipped code uses the `bui-table-sm` class and padding-driven heights instead.',
  ],

  apiSignature:
    'type TableSize = "sm" | "md"\ninterface TableProps extends Omit<AriaTableProps, "className"> { size?: TableSize; className?: string; containerClassName?: string; ref?: Ref<HTMLTableElement> }\nfunction Table(props: TableProps): JSX.Element\nexport { TableHeader, Column as TableColumn, TableBody, Row as TableRow, Cell as TableCell } from "react-aria-components"',

  props: [
    { name: 'size', type: '"sm" | "md"', default: '"md"', description: 'Row density. `sm` adds `bui-table-sm` for tighter padding and the smaller body type.' },
    { name: 'aria-label', type: 'string', description: 'Accessible name for the table (React Aria). Required unless `aria-labelledby` is set.' },
    { name: 'className', type: 'string', description: 'Merged onto the `<table>` after `bui-table`.' },
    { name: 'containerClassName', type: 'string', description: 'Class for the `overflow-x-auto` scroll wrapper.' },
    { name: 'ref', type: 'Ref<HTMLTableElement>', description: 'Forwarded to the `<table>` element.' },
    { name: '...props', type: 'AriaTableProps', description: 'Selection, sorting and every other React Aria Table prop.' },
  ],

  reducedMotion:
    'The only motion is the 200ms padding and font-size transition when `size` changes, plus a 150ms colour transition on rows. Neither is gated by prefers-reduced-motion; both are short, non-spatial reflows. Add `motion-reduce:transition-none` through `className` if a product needs them off.',

  cleanup: 'Nothing to clean up. The wrapper is stateless; React Aria owns focus and selection state and removes its own listeners on unmount.',

  acceptance:
    'A `<Table aria-label="Team members">` with a header row and four body rows renders a real `<table>` inside a horizontally scrolling div. Header cells sit on the secondary background between two hairlines in tertiary text; body rows are separated by hairlines with none under the last row. Tabbing into the table and pressing the arrow keys moves a visible inset ring between rows. Switching `size` to "sm" tightens every cell from 12/10px to 10/6px padding over 200ms. At 360px the table scrolls sideways inside its container without widening the page.',

  criticalRegion: 'critical',
};

export default meta;
