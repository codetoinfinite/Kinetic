# Build: Table Filter Bar

The filter row that sits on top of a BoardUI table: a "Total Results" count on the left, then one kit Select per filter ("All prices", "All products", "All regions") and a pill SearchField. Every active filter and a non-empty search become removable chips with a Clear all button. The bar never touches rows: it reports values and the query, the caller filters and passes back the result count, which is announced politely.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Strip above a data table: "All ..." select filters, a pill search, removable active-filter chips, Clear all and a live result count.

- Category: form
- Runtime cost: css
- Dependencies: @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. State is a FilterValues record (filter id -> option id, a missing key means "All") plus a query string; both are controlled (values / query) or uncontrolled (defaultValues / defaultQuery) and every change is reported through onValuesChange / onQueryChange.
2. Each filter renders a kit Select whose first SelectItem has the sentinel id __all__ and the allLabel text; selectedKey is values[id] ?? __all__, and choosing __all__ deletes the key instead of storing it.
3. Active chips are derived on render: filters.flatMap finds the option matching values[filter.id]; a trimmed non-empty query adds a "Search: ..." chip. The chip row (role=group "Active filters") only mounts while something is active.
4. Chip remove buttons and Clear all set a refocus ref before updating state; an effect after the re-render moves focus to the next [data-filter-chip-remove] button or, if none is left, to the search input, so focus never falls to <body>.
5. resultCount renders under totalLabel inside an aria-live="polite" aria-atomic paragraph so assistive tech hears "4 orders" after each change; omit the prop to hide the count block.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `ALL sentinel = '__all__'`
  Keeps "All ..." a real listbox option so the trigger shows its label, while the stored values stay free of reset entries.
- `search width = w-full, sm:w-[200px]`
  Full row on phones; a fixed 200px pill beside the selects from 640px up, as in the finance table header.
- `layout breakpoint = lg:flex-row`
  Below 1024px the count stacks above the controls so three selects plus search can wrap without squeezing the count.
- `chip remove target = size-5 rounded-full, 14px icon`
  A round 20px hit area inside a caption chip, with hover and focus-ring states from the kit tokens.
- `gap = gap-2.5 controls, gap-2 chips`
  10px between bordered selects matches the reference spacing; chips sit slightly tighter.

## API

```ts
export function TableFilterBar({ filters, values, defaultValues, onValuesChange, query, defaultQuery, onQueryChange, searchPlaceholder, resultCount, resultLabel, totalLabel, showActiveFilters, clearLabel, className }: TableFilterBarProps): JSX.Element
```

- `filters: readonly FilterDefinition[]`
  Each { id, label, allLabel, options: { id, label }[] } renders one select.
- `values / defaultValues: Record<string, string>` — default `{}`
  Selected option per filter id, controlled or initial.
- `onValuesChange: (values: FilterValues) => void`
  Called with the whole record after any select, chip or Clear all change.
- `query / defaultQuery: string` — default `''`
  Search text, controlled or initial.
- `onQueryChange: (query: string) => void`
  Called on each keystroke and on clear.
- `searchPlaceholder: string` — default `'Search'`
  Placeholder and accessible name of the search field.
- `resultCount: number`
  Rows left after filtering; omit to hide the count block.
- `resultLabel: string` — default `'results'`
  Noun after the count.
- `totalLabel: ReactNode` — default `'Total Results'`
  Caption above the count.
- `showActiveFilters: boolean` — default `true`
  Show the removable chip row while anything is active.
- `clearLabel: string` — default `'Clear all'`
  Label of the reset button.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function TableFilterBar({
  filters,
  values,
  defaultValues = EMPTY,
  onValuesChange,
  query,
  defaultQuery = '',
  onQueryChange,
  searchPlaceholder = 'Search',
  resultCount,
  resultLabel = 'results',
  totalLabel = 'Total Results',
  showActiveFilters = true,
  clearLabel = 'Clear all',
  className,
}: TableFilterBarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [innerValues, setInnerValues] = useState<FilterValues>(defaultValues);
  const [innerQuery, setInnerQuery] = useState(defaultQuery);
  const current = values ?? innerValues;
  const search = query ?? innerQuery;

  const setValues = (next: FilterValues) => {
    setInnerValues(next);
    onValuesChange?.(next);
  };
  const setSearch = (next: string) => {
    setInnerQuery(next);
    onQueryChange?.(next);
  };
  const setFilter = (filterId: string, optionId: string | null) => {
    const { [filterId]: _removed, ...rest } = current;
    setValues(optionId === null ? rest : { ...rest, [filterId]: optionId });
  };

  // Removing a chip unmounts the focused button; after the re-render, hand
  // focus to the next chip, else to the search input.
  const refocus = useRef(false);
  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    const root = rootRef.current;
    (root?.querySelector<HTMLElement>('[data-filter-chip-remove]') ?? root?.querySelector<HTMLElement>('input'))?.focus();
  });

  const active = filters.flatMap((filter) => {
    const option = filter.options.find((o) => o.id === current[filter.id]);
    return option ? [{ filter, option }] : [];
  });
  const trimmed = search.trim();
  const hasActive = active.length > 0 || trimmed.length > 0;

  const clearAll = () => {
    refocus.current = true;
    setValues(EMPTY);
    setSearch('');
  };

  return (
    <div ref={rootRef} className={cx('flex w-full flex-col gap-3', className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {resultCount !== undefined ? (
          <div className="flex shrink-0 flex-col justify-center">
            <p className="text-body-medium whitespace-nowrap text-text-tertiary">{totalLabel}</p>
            <p aria-live="polite" aria-atomic className="text-body-medium whitespace-nowrap text-text-primary tabular-nums">
              {resultCount.toLocaleString()} {resultLabel}
            </p>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
          {filters.map((filter) => (
            <Select
              key={filter.id}
              aria-label={`Filter by ${filter.label.toLowerCase()}`}
              className="shrink-0"
              popoverClassName="w-auto min-w-44"
              selectedKey={current[filter.id] ?? ALL}
              onSelectionChange={(key: Key | null) => setFilter(filter.id, key === null || key === ALL ? null : String(key))}
            >
              <SelectItem id={ALL} textValue={filter.allLabel}>
                {filter.allLabel}
              </SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={option.id} id={option.id} textValue={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </Select>
          ))}
          <SearchField
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={search}
            onChange={setSearch}
            className="w-full sm:w-[200px]"
          />
        </div>
      </div>

      {showActiveFilters && hasActive ? (
        <div role="group" aria-label="Active filters" className="flex flex-wrap items-center gap-2">
          {active.map(({ filter, option }) => (
            <Chip key={filter.id} color="soft" variant="caption" className="gap-1 rounded-full py-0.5 ps-2.5 pe-0.5">
              <span>
                {filter.label}: <span className="text-text-primary">{option.label}</span>
              </span>
              <button
                type="button"
                data-filter-chip-remove
                aria-label={`Remove ${filter.label} filter: ${option.label}`}
                onClick={() => {
                  refocus.current = true;
                  setFilter(filter.id, null);
                }}
                className={cx(
                  'inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-foreground-icon-tertiary outline-none',
                  'transition-colors duration-150 ease-out motion-reduce:transition-none',
                  'hover:bg-background-tertiary-hover hover:text-foreground-icon-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring',
                )}
              >
                <RiCloseLine aria-hidden className="size-3.5" />
              </button>
            </Chip>
          ))}
          {trimmed ? (
            <Chip color="soft" variant="caption" className="gap-1 rounded-full py-0.5 ps-2.5 pe-0.5">
              <span>
                Search: <span className="text-text-primary">&ldquo;{trimmed}&rdquo;</span>
              </span>
              <button
                type="button"
                data-filter-chip-remove
                aria-label={`Clear search: ${trimmed}`}
                onClick={() => {
                  refocus.current = true;
                  setSearch('');
                }}
                className={cx(
                  'inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-foreground-icon-tertiary outline-none',
                  'transition-colors duration-150 ease-out motion-reduce:transition-none',
                  'hover:bg-background-tertiary-hover hover:text-foreground-icon-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring',
                )}
              >
                <RiCloseLine aria-hidden className="size-3.5" />
              </button>
            </Chip>
          ) : null}
          <Button variant="ghost" size="xs" leadingIcon={RiFilterOffLine} onClick={clearAll}>
            {clearLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers or listeners of its own; the refocus effect only reads a ref. The kit Select owns its outside-press listener.

**Reduced motion.** Only colour transitions are used (motion-reduce:transition-none on the chip remove buttons); the kit Select popover drops its scale entry under reduced motion.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not store the "All" choice as a value: chips and filtering would treat __all__ as an active filter. Delete the key instead.
- Removing a chip unmounts the focused button; without the refocus effect keyboard focus drops to <body>.
- The bar does not filter anything itself; pass the post-filter length as resultCount or the live count will be stale.

## Notes

- Set showActiveFilters={false} when the selects alone are enough, e.g. in a narrow card.
- Option and filter labels feed both the chips and the accessible names ("Filter by product", "Remove Product filter: Laptop").

## Definition of done

Choosing "Laptop" in "All products" narrows the demo list to 3 orders, shows a "Product: Laptop" chip and announces "3 orders"; typing "clark" in search narrows it to 1 order; Clear all removes every chip, resets the selects to "All ..." and restores 10 orders.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
