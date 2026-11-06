/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Table Filter Bar" (boardui.com/templates/finance).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'table-filter-bar',
  title: 'Table Filter Bar',
  category: 'form',
  kit: 'boardui',
  tags: ['boardui', 'filters', 'table', 'search', 'chips', 'dashboard'],
  blurb: 'Strip above a data table: "All ..." select filters, a pill search, removable active-filter chips, Clear all and a live result count.',
  cost: 'css',
  motif: 'grid',
  files: [{ path: 'registry/ui/table-filter-bar.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],
  summary:
    'The filter row that sits on top of a BoardUI table: a "Total Results" count on the left, then one kit Select per filter ("All prices", "All products", "All regions") and a pill SearchField. Every active filter and a non-empty search become removable chips with a Clear all button. The bar never touches rows: it reports values and the query, the caller filters and passes back the result count, which is announced politely.',
  mechanism: [
    'State is a FilterValues record (filter id -> option id, a missing key means "All") plus a query string; both are controlled (values / query) or uncontrolled (defaultValues / defaultQuery) and every change is reported through onValuesChange / onQueryChange.',
    'Each filter renders a kit Select whose first SelectItem has the sentinel id __all__ and the allLabel text; selectedKey is values[id] ?? __all__, and choosing __all__ deletes the key instead of storing it.',
    'Active chips are derived on render: filters.flatMap finds the option matching values[filter.id]; a trimmed non-empty query adds a "Search: ..." chip. The chip row (role=group "Active filters") only mounts while something is active.',
    'Chip remove buttons and Clear all set a refocus ref before updating state; an effect after the re-render moves focus to the next [data-filter-chip-remove] button or, if none is left, to the search input, so focus never falls to <body>.',
    'resultCount renders under totalLabel inside an aria-live="polite" aria-atomic paragraph so assistive tech hears "4 orders" after each change; omit the prop to hide the count block.',
  ],
  constants: [
    { name: 'ALL sentinel', value: "'__all__'", why: 'Keeps "All ..." a real listbox option so the trigger shows its label, while the stored values stay free of reset entries.' },
    { name: 'search width', value: 'w-full, sm:w-[200px]', why: 'Full row on phones; a fixed 200px pill beside the selects from 640px up, as in the finance table header.' },
    { name: 'layout breakpoint', value: 'lg:flex-row', why: 'Below 1024px the count stacks above the controls so three selects plus search can wrap without squeezing the count.' },
    { name: 'chip remove target', value: 'size-5 rounded-full, 14px icon', why: 'A round 20px hit area inside a caption chip, with hover and focus-ring states from the kit tokens.' },
    { name: 'gap', value: 'gap-2.5 controls, gap-2 chips', why: '10px between bordered selects matches the reference spacing; chips sit slightly tighter.' },
  ],
  pitfalls: [
    'Do not store the "All" choice as a value: chips and filtering would treat __all__ as an active filter. Delete the key instead.',
    'Removing a chip unmounts the focused button; without the refocus effect keyboard focus drops to <body>.',
    'The bar does not filter anything itself; pass the post-filter length as resultCount or the live count will be stale.',
  ],
  notes: [
    'Set showActiveFilters={false} when the selects alone are enough, e.g. in a narrow card.',
    'Option and filter labels feed both the chips and the accessible names ("Filter by product", "Remove Product filter: Laptop").',
  ],
  apiSignature:
    'export function TableFilterBar({ filters, values, defaultValues, onValuesChange, query, defaultQuery, onQueryChange, searchPlaceholder, resultCount, resultLabel, totalLabel, showActiveFilters, clearLabel, className }: TableFilterBarProps): JSX.Element',
  props: [
    { name: 'filters', type: 'readonly FilterDefinition[]', description: 'Each { id, label, allLabel, options: { id, label }[] } renders one select.' },
    { name: 'values / defaultValues', type: 'Record<string, string>', default: '{}', description: 'Selected option per filter id, controlled or initial.' },
    { name: 'onValuesChange', type: '(values: FilterValues) => void', description: 'Called with the whole record after any select, chip or Clear all change.' },
    { name: 'query / defaultQuery', type: 'string', default: "''", description: 'Search text, controlled or initial.' },
    { name: 'onQueryChange', type: '(query: string) => void', description: 'Called on each keystroke and on clear.' },
    { name: 'searchPlaceholder', type: 'string', default: "'Search'", description: 'Placeholder and accessible name of the search field.' },
    { name: 'resultCount', type: 'number', description: 'Rows left after filtering; omit to hide the count block.' },
    { name: 'resultLabel', type: 'string', default: "'results'", description: 'Noun after the count.' },
    { name: 'totalLabel', type: 'ReactNode', default: "'Total Results'", description: 'Caption above the count.' },
    { name: 'showActiveFilters', type: 'boolean', default: 'true', description: 'Show the removable chip row while anything is active.' },
    { name: 'clearLabel', type: 'string', default: "'Clear all'", description: 'Label of the reset button.' },
  ],
  reducedMotion:
    'Only colour transitions are used (motion-reduce:transition-none on the chip remove buttons); the kit Select popover drops its scale entry under reduced motion.',
  cleanup: 'No timers or listeners of its own; the refocus effect only reads a ref. The kit Select owns its outside-press listener.',
  acceptance:
    'Choosing "Laptop" in "All products" narrows the demo list to 3 orders, shows a "Product: Laptop" chip and announces "3 orders"; typing "clark" in search narrows it to 1 order; Clear all removes every chip, resets the selects to "All ..." and restores 10 orders.',
  criticalRegion: 'critical',
};

export default meta;
