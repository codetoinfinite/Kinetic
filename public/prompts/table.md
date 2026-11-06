# Build: Table

The static table primitive behind BoardUI's dashboard tables. Only the root is wrapped: `Table` adds a horizontal scroll container and a density flag around React Aria's `Table`. `TableHeader`, `TableColumn`, `TableBody`, `TableRow` and `TableCell` are React Aria's collection components re-exported untouched, because wrapping them would break React Aria's collection building. All visual styling (header band, row separators, cell padding, focus ring) lives in CSS scoped to `.bui-table`, so the markup stays real `<table>`, `<th>`, `<tr>` and `<td>` with keyboard navigation for free.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

Semantic table on React Aria with a scroll container, an md/sm density flag and dashboard styling from one scoped stylesheet.

- Category: display
- Runtime cost: css
- Dependencies: react-aria-components@^1.22.1

## How it works

1. Wrap the table in `<div className="w-full overflow-x-auto">` (plus `containerClassName`), so a wide table scrolls sideways inside its card instead of stretching the page.
2. Render `AriaTable` with every React Aria prop passed through (`aria-label`, `selectionMode`, `sortDescriptor`, …), the forwarded `ref`, and `className = cx("bui-table", size === "sm" && "bui-table-sm", className)`.
3. Re-export `TableHeader`, `Column as TableColumn`, `TableBody`, `Row as TableRow` and `Cell as TableCell` from react-aria-components unchanged, so React Aria can still introspect the collection.
4. In the theme sheet, `.bui-table` is `w-full border-collapse text-start`. Header cells get `px-3 py-2.5 text-body-medium text-text-tertiary whitespace-nowrap`, the secondary background and a separator border above and below; body cells get `px-3 py-2.5 text-body-medium text-text-primary`.
5. Rows are separated by `tbody tr:not(:last-child) { border-bottom }` only, so the last row never doubles up with the container edge or a pagination footer. `tr[data-focus-visible]` draws an inset 2px focus ring.
6. `.bui-table-sm` drops cells to `px-2.5 py-1.5 text-body-2-medium`; padding and font-size carry a 200ms ease transition, so switching density animates.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `cell padding = md px-3 py-2.5 (12 / 10px); sm px-2.5 py-1.5 (10 / 6px)`
  The two dashboard densities. Both are set on th and td together, so header and body stay aligned.
- `density transition = padding 200ms ease, font-size 200ms ease`
  Toggling `size` reflows the rows smoothly instead of snapping.
- `separators = 1px solid var(--color-separator-border)`
  One token for the header band edges and the between-row rules, set with plain CSS because `@apply` drops border and background on row-group cells.

## API

```ts
type TableSize = "sm" | "md"
interface TableProps extends Omit<AriaTableProps, "className"> { size?: TableSize; className?: string; containerClassName?: string; ref?: Ref<HTMLTableElement> }
function Table(props: TableProps): JSX.Element
export { TableHeader, Column as TableColumn, TableBody, Row as TableRow, Cell as TableCell } from "react-aria-components"
```

- `size: "sm" | "md"` — default `"md"`
  Row density. `sm` adds `bui-table-sm` for tighter padding and the smaller body type.
- `aria-label: string`
  Accessible name for the table (React Aria). Required unless `aria-labelledby` is set.
- `className: string`
  Merged onto the `<table>` after `bui-table`.
- `containerClassName: string`
  Class for the `overflow-x-auto` scroll wrapper.
- `ref: Ref<HTMLTableElement>`
  Forwarded to the `<table>` element.
- `...props: AriaTableProps`
  Selection, sorting and every other React Aria Table prop.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function Table({ size = "md", className, containerClassName, ref, ...props }: TableProps) {
  return (
    <div className={cx("w-full overflow-x-auto", containerClassName)}>
      <AriaTable
        ref={ref}
        {...props}
        className={cx("bui-table", size === "sm" && "bui-table-sm", className)}
      />
    </div>
  );
}

export {
  TableHeader,
  Column as TableColumn,
  TableBody,
  Row as TableRow,
  Cell as TableCell,
};
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** Nothing to clean up. The wrapper is stateless; React Aria owns focus and selection state and removes its own listeners on unmount.

**Reduced motion.** The only motion is the 200ms padding and font-size transition when `size` changes, plus a 150ms colour transition on rows. Neither is gated by prefers-reduced-motion; both are short, non-spatial reflows. Add `motion-reduce:transition-none` through `className` if a product needs them off.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not wrap `TableColumn`, `TableRow` or `TableCell` in your own components. React Aria builds the collection by introspecting these exact elements; restyle through `.bui-table` CSS or `className` instead.
- Do not forget `aria-label` (or `aria-labelledby`) on `Table`. Without one the grid has no accessible name.
- Mark exactly one column `isRowHeader`, usually the name column, so screen readers announce each row by it.
- Do not put the header background or borders on `<thead>`. With `border-collapse` the browser does not paint them on the row group, which is why the sheet puts them on `th`.

## Notes

- Sorting, filtering and pagination are not built in. Pair the primitive with @tanstack/react-table (or your own state) and pass `sortDescriptor` / `onSortChange` through to React Aria.
- The component file's doc comment mentions h-16 / h-12 rows and a `data-size` attribute; the shipped code uses the `bui-table-sm` class and padding-driven heights instead.

## Definition of done

A `<Table aria-label="Team members">` with a header row and four body rows renders a real `<table>` inside a horizontally scrolling div. Header cells sit on the secondary background between two hairlines in tertiary text; body rows are separated by hairlines with none under the last row. Tabbing into the table and pressing the arrow keys moves a visible inset ring between rows. Switching `size` to "sm" tightens every cell from 12/10px to 10/6px padding over 200ms. At 360px the table scrolls sideways inside its container without widening the page.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
