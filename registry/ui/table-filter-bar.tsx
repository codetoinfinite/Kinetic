/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Table Filter Bar" (boardui.com/templates/finance).
 * No BoardUI source was used.
 */
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Key } from 'react-aria-components';
import { RiCloseLine, RiFilterOffLine } from '@remixicon/react';
import { Button } from '@/registry/ui/button';
import { Chip } from '@/registry/ui/chip';
import { SearchField } from '@/registry/ui/search-field';
import { Select, SelectItem } from '@/registry/ui/select';
import { cx } from '@/registry/lib/cx';

/**
 * TableFilterBar: the strip above a BoardUI table.
 *
 *   Total Results                [All prices v] [All products v] [All regions v] (Search)
 *   660 customers
 *   [Product: Laptop x] [Region: Europe x]  Clear all
 *
 * Each filter is a kit Select whose first option is its "All ..." label;
 * choosing it removes the filter. Active filters (and a non-empty search)
 * show as removable chips with a Clear all button. The bar owns no rows:
 * it reports values and the query, the caller filters and passes back the
 * result count, which is announced politely.
 */

export interface FilterOption {
  id: string;
  label: string;
}

export interface FilterDefinition {
  id: string;
  /** Chip prefix and the select's accessible name, e.g. "Product". */
  label: string;
  /** The reset option shown as the trigger's value, e.g. "All products". */
  allLabel: string;
  options: readonly FilterOption[];
}

/** filter id -> option id. A missing key means "All". */
export type FilterValues = Readonly<Record<string, string>>;

export interface TableFilterBarProps {
  filters: readonly FilterDefinition[];
  values?: FilterValues;
  defaultValues?: FilterValues;
  onValuesChange?: (values: FilterValues) => void;
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  searchPlaceholder?: string;
  /** Number of rows left after filtering; omit to hide the count block. */
  resultCount?: number;
  /** Noun after the count. Default "results". */
  resultLabel?: string;
  /** Caption above the count. Default "Total Results". */
  totalLabel?: ReactNode;
  /** Show the removable chips row while anything is active. Default true. */
  showActiveFilters?: boolean;
  clearLabel?: string;
  className?: string;
}

const ALL = '__all__';
const EMPTY: FilterValues = {};

// #region critical
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
// #endregion
