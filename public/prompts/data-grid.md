# Build: Data Grid

A spreadsheet-style grid for thousands of rows: only the rows in view are mounted, a frozen first column and a row-number gutter stay put while the body scrolls, and a keyboard-driven cell cursor selects ranges, edits cells and pastes blocks from a spreadsheet. Every edit, paste and row delete goes back through `onDataChange` as a new array and lands on a 100-step undo stack. Around the body sit a toolbar (search, filters, column visibility, density, export) that swaps to a bulk-action bar when rows are checked, a summary row and a status bar with the selection address, count, sum and average.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A virtualized spreadsheet with range selection, validated in-cell edits, block paste, undo and redo, filters, summaries and CSV export.

- Category: block
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0, motion@^12.43.0, react-aria-components@^1.22.1

## How it works

1. Virtualization: the body is a fixed-height scroller (`height`, default 396) holding one spacer `rows.length * rowHeight` tall. Only rows from `floor(scrollTop / rowHeight) - 4` to `ceil((scrollTop + height) / rowHeight) + 4` render, each absolutely positioned at `top: r * rowHeight`. Rows are 44px, or 36px in Compact density, and every row shares one CSS grid template: a 48px gutter plus each column's width.
2. The header and summary rows sit outside the scroller with `overflow: hidden`; the body's `onScroll` copies its `scrollLeft` into both so the columns stay aligned. A `ResizeObserver` measures the body, and the first column is frozen (`sticky` at `inset-inline-start: 48px`) only while the body is at least gutter + first column + 96px wide, so on a phone it scrolls away instead of covering everything.
3. Range selection stores an anchor and a focus as `{ rowId, columnKey }`, not indices. `bounds` maps them through the current row and column index maps, so sorting, filtering or hiding columns keeps the selection on the same cells, and if an end cell drops out no range is drawn. Click selects, Shift+click and mouse drag (`pointerenter` with the button held) extend, Ctrl/Cmd+A selects everything, and `selectCell` scrolls the cursor into view on both axes, accounting for the frozen column and RTL.
4. The grid is one focusable `role="grid"` element with `aria-activedescendant` pointing at the focused cell id (only while that row is mounted). Arrows move (mirrored in RTL), Page Up/Down jump by a viewport of rows, Home/End go to the row ends (with Ctrl/Cmd, to the first or last row), Enter or F2 opens the editor, Escape clears the range, Ctrl/Cmd+Z undoes and Shift+Ctrl/Cmd+Z or Ctrl/Cmd+Y redoes. The cursor outline is a `motion.span` with a shared `layoutId`, so it springs from cell to cell.
5. Editing: double-click, Enter or F2 swaps the cell for an input (select columns show their select whenever the cell is active). On commit the text goes through `parseGridValue` (numbers, min, max, allowed options) and the column's `validate`; a failure keeps the editor open and shows "Header: message" in a `role="alert"` bar. Enter commits and moves down, Shift+Enter up, Tab and Shift+Tab to the next or previous cell in reading order, and Escape cancels.
6. Clipboard and history: `onCopy` writes the range as TSV; `onPaste` parses TSV (quotes, CRLF), validates every cell first and cancels the whole paste on the first bad value, so a paste is all or nothing and one undo step. `commitEdits` applies `{ rowId, key, before, after }` edits with `applyGridEdits` and pushes them onto the undo stack (last 100 kept); deleting checked rows records each row with its index so undo splices them back. Before undoing, the grid checks the current data still holds the values it expects and clears the history instead if something outside changed them.
7. Toolbar and footer: the default toolbar shows the row count, Undo, Redo, Filter (a column switcher, a value search and one exact-match value per column), Columns, Row density, Export and Search. Checking rows cross-fades it (180ms, `AnimatePresence`, the leaving one `inert`) to a bar with Delete, Copy and Export for the checked rows. Summary cells show Sum, Avg or Count over the filtered rows; the status bar shows the range address ("B3:D7"), the count of filled cells and, for numbers, their sum and average.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `row height = 44px Comfortable, 36px Compact`
  Fixed row heights are what make virtualization pure arithmetic: the scroll offset alone tells the grid which rows to mount and where.
- `OVERSCAN = 4 rows above and below the viewport`
  A small buffer so a fast wheel flick does not show blank rows before React renders the next window.
- `GUTTER = 48px row-number and checkbox column`
  Holds the row number and the row checkbox, which fades in over the number on hover or focus and stays visible once checked.
- `column width = default 160px, resizable 96 to 480px, 16px per arrow key`
  The clamp keeps a column from vanishing or eating the viewport; double-clicking the resize handle restores the column's own width.
- `cursor spring = stiffness 480, damping 38, mass 0.7`
  Stiff and well damped, so the outline arrives under key repeat without overshooting into the next cell.
- `undo depth = 100 transactions`
  Bounds memory for long sessions; each paste or bulk delete is one transaction however many cells it touched.

## API

```ts
function DataGrid<T extends object>(props: DataGridProps<T>): JSX.Element
```

- `aria-label: string`
  Names the grid; also labels the search field.
- `data: readonly T[]`
  The rows. Treat as immutable; changes come back through `onDataChange`.
- `columns: readonly DataGridColumn<T>[]`
  Key, header, width, type (text, number or select), options, min, max, align, editable, filterable, summary (sum, average or count), format, formatSummary and validate.
- `getRowId: (row: T) => string`
  Stable id per row; selection, edits and undo are keyed by it.
- `onDataChange: (data: T[]) => void`
  Receives the next array after an edit, paste, delete, undo or redo. Omit for read-only.
- `height: number` — default `396`
  Height of the scrolling body in pixels.
- `exportFileName: string` — default `"data-grid.csv"`
  File name for CSV export.
- `emptyState: ReactNode` — default `"No matching rows. Try another search or clear your filters."`
  Shown when search or filters leave no rows.
- `className: string`
  Classes for the outer frame.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
const rows = useMemo(() => {
  const search = query.trim().toLocaleLowerCase();
  const filtered = data.filter((row) =>
    (!search || columns.some((column) => String(row[column.key] ?? "").toLocaleLowerCase().includes(search))) &&
    columns.every((column) => filters[column.key] === undefined || String(row[column.key] ?? "") === filters[column.key]),
  );
  if (!sort) return filtered;
  const key = sort.key as keyof T;
  return filtered.sort((a, b) => {
    const left = a[key], right = b[key];
    const result = typeof left === "number" && typeof right === "number" ? left - right : String(left ?? "").localeCompare(String(right ?? ""), undefined, { numeric: true });
    return sort.descending ? -result : result;
  });
}, [data, columns, filters, query, sort]);
const rowIndices = useMemo(() => new Map(rows.map((row, index) => [getRowId(row), index])), [rows, getRowId]);
const columnIndices = useMemo(() => new Map(visibleColumns.map((column, index) => [column.key as string, index])), [visibleColumns]);
const bounds: Bounds | null = useMemo(() => {
  if (!range) return null;
  const a = rowIndices.get(range.anchor.rowId), b = rowIndices.get(range.focus.rowId);
  const c = columnIndices.get(range.anchor.columnKey), d = columnIndices.get(range.focus.columnKey);
  return a === undefined || b === undefined || c === undefined || d === undefined ? null : {
    top: Math.min(a, b), bottom: Math.max(a, b), start: Math.min(c, d), end: Math.max(c, d),
  };
}, [range, rowIndices, columnIndices]);
const columnWidths = visibleColumns.map((column) => widths[column.key] ?? column.width ?? 160);
const freezeFirstColumn = viewportWidth === 0 || viewportWidth >= GUTTER + (columnWidths[0] ?? 0) + 96;
const totalWidth = GUTTER + columnWidths.reduce((sum, width) => sum + width, 0);
const rowStyle: CSSProperties = { gridTemplateColumns: `${GUTTER}px ${columnWidths.map((width) => `${width}px`).join(" ")}`, width: totalWidth, minWidth: "100%" };
const firstRow = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
const lastRow = Math.min(rows.length, Math.ceil((scrollTop + height) / rowHeight) + OVERSCAN);
const filterCount = Object.keys(filters).length;
const visibleSelected = rows.reduce((count, row) => count + Number(selectedRows.has(getRowId(row))), 0);
const filterColumns = columns.filter((column) => column.filterable || column.type === "select");
const filterOptions = useMemo(() => Object.fromEntries(columns.filter((column) => column.filterable || column.type === "select").map((column) => [column.key, column.options ?? Array.from(new Set(data.map((row) => String(row[column.key] ?? "")))).sort()])), [columns, data]);
const summaries = useMemo(() => Object.fromEntries(visibleColumns.map((column) => {
  if (!column.summary) return [column.key, null];
  const values = rows.map((row) => row[column.key]).filter((value): value is T[Extract<keyof T, string>] & number => typeof value === "number" && Number.isFinite(value));
  const sum = values.reduce((total, value) => total + value, 0);
  return [column.key, column.summary === "count" ? rows.length : column.summary === "average" ? (values.length ? sum / values.length : null) : sum];
})), [rows, visibleColumns]);
const selectionStats = useMemo(() => {
  if (!bounds) return { count: 0, sum: null as number | null, average: null as number | null };
  let count = 0, sum = 0, numbers = 0;
  for (let r = bounds.top; r <= bounds.bottom; r++) for (let c = bounds.start; c <= bounds.end; c++) {
    const value = rows[r]![visibleColumns[c]!.key];
    if (value !== null && value !== undefined && value !== "") count++;
    if (typeof value === "number" && Number.isFinite(value)) { sum += value; numbers++; }
  }
  return { count, sum: numbers ? sum : null, average: numbers ? sum / numbers : null };
}, [bounds, rows, visibleColumns]);
const focusRow = range ? rowIndices.get(range.focus.rowId) : undefined;
const focusColumn = range ? columnIndices.get(range.focus.columnKey) : undefined;
useEffect(() => {
  if (!freezeFirstColumn && focusColumn === 0 && bodyRef.current) bodyRef.current.scrollLeft = 0;
}, [freezeFirstColumn, focusColumn]);
const cellId = (r: number, c: number) => `${id}-cell-${r}-${c}`;
const activeId = focusRow !== undefined && focusColumn !== undefined && focusRow >= firstRow && focusRow < lastRow ? cellId(focusRow, focusColumn) : undefined;
const selectionAddress = bounds ? `${columnLetter(bounds.start)}${bounds.top + 1}${bounds.top !== bounds.bottom || bounds.start !== bounds.end ? `:${columnLetter(bounds.end)}${bounds.bottom + 1}` : ""}` : "—";

function resetScroll() {
  if (bodyRef.current) bodyRef.current.scrollTop = 0;
  setScrollTop(0);
  setEditing(null);
  setErrorMessage("");
}

function selectCell(r: number, c: number, extend = false) {
  if (!rows.length || !visibleColumns.length) return;
  r = Math.max(0, Math.min(rows.length - 1, r));
  c = Math.max(0, Math.min(visibleColumns.length - 1, c));
  const cell = { rowId: getRowId(rows[r]!), columnKey: visibleColumns[c]!.key };
  setRange((previous) => ({ anchor: extend && previous && bounds ? previous.anchor : cell, focus: cell }));
  setErrorMessage("");
  gridRef.current?.focus({ preventScroll: true });
  const body = bodyRef.current;
  if (body) {
    const top = r * rowHeight;
    if (top < body.scrollTop) body.scrollTop = top;
    else if (top + rowHeight > body.scrollTop + body.clientHeight) body.scrollTop = top + rowHeight - body.clientHeight;
    if (c > 0 || !freezeFirstColumn) {
      const start = GUTTER + columnWidths.slice(0, c).reduce((sum, width) => sum + width, 0);
      const offset = Math.abs(body.scrollLeft);
      const frozenWidth = GUTTER + (freezeFirstColumn ? (columnWidths[0] ?? 0) : 0);
      if (start < offset + frozenWidth) body.scrollLeft = (direction === "rtl" ? -1 : 1) * Math.max(0, start - frozenWidth);
      else if (start + columnWidths[c]! > offset + body.clientWidth) body.scrollLeft = (direction === "rtl" ? -1 : 1) * (start + columnWidths[c]! - body.clientWidth);
    }
  }
}

function commitEdits(edits: GridEdit<T>[]) {
  if (!onDataChange || !edits.length) return;
  onDataChange(applyGridEdits(data, getRowId, edits));
  setHistory((previous) => ({ undo: [...previous.undo.slice(-99), { type: "edit", edits }], redo: [] }));
  setMessage(`${integerFormat.format(edits.length)} ${edits.length === 1 ? "cell updated" : "cells updated"}.`);
  setErrorMessage("");
}

function travelHistory(undo: boolean) {
  const source = undo ? history.undo : history.redo;
  const transaction = source.at(-1);
  if (!transaction || !onDataChange) return;
  // External updates must not be overwritten by an old local history entry.
  const current = new Map(data.map((row) => [getRowId(row), row]));
  const stale = transaction.type === "edit"
    ? transaction.edits.some((edit) => !current.has(edit.rowId) || !Object.is(current.get(edit.rowId)![edit.key], undo ? edit.after : edit.before))
    : transaction.rows.some(({ row }) => undo ? current.has(getRowId(row)) : current.get(getRowId(row)) !== row);
  if (stale) {
    setHistory({ undo: [], redo: [] });
    setMessage("The data changed outside this grid. Change history has been cleared.");
    return;
  }
  if (transaction.type === "edit") onDataChange(applyGridEdits(data, getRowId, transaction.edits, undo));
  else if (undo) {
    const next = [...data];
    for (const { row, index } of transaction.rows) next.splice(Math.min(index, next.length), 0, row);
    onDataChange(next);
  } else {
    const removed = new Set(transaction.rows.map(({ row }) => getRowId(row)));
    onDataChange(data.filter((row) => !removed.has(getRowId(row))));
  }
  setHistory((previous) => undo ? { undo: previous.undo.slice(0, -1), redo: [...previous.redo, transaction] } : { undo: [...previous.undo, transaction], redo: previous.redo.slice(0, -1) });
  setEditing(null);
  setMessage(undo ? "Change undone." : "Change redone.");
  setErrorMessage("");
}
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** The `ResizeObserver` on the body disconnects on unmount. Column-resize listeners live on the handle and are removed on `lostpointercapture`. The CSV export's object URL is revoked one second after the download starts.

**Reduced motion.** Under `prefers-reduced-motion` (via motion's `useReducedMotion`) the toolbar cross-fade and the cursor spring get zero duration, so the bars swap and the outline jumps instantly. The 150ms cell background fade is dropped with `motion-reduce:transition-none`.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not track the selection by row index. The range stores row ids and column keys, which is why a sort or filter keeps it on the same cells; index-based ranges jump to different data.
- Do not mutate `data` in place. The filtered rows, index maps, filter options and summaries are memoized on the `data` reference, so an in-place change leaves them stale; replace the array, as the one `onDataChange` hands back does.
- Do not create `columns` or `getRowId` inline on every render. They are memo dependencies, so each new identity rebuilds the filtered and sorted rows and the index maps.
- Do not swap the grid's number formatting back to `toLocaleString()`. Footer summaries without `formatSummary`, the selection Count/Sum/Avg and the row counts all go through module-level `Intl.NumberFormat("en-US")` formatters, so a de-DE browser shows the same "100,716" as the server render instead of "100.716". To show another locale, pass `formatSummary` with your own formatter.

## Notes

- Omit `onDataChange` for a read-only grid: editing, paste, undo, redo and row delete are disabled and the grid reports `aria-readonly`.
- Search matches any column's text, case-insensitively; filters match exact values. Filter options come from `options` or from the distinct values in `data`.
- Export writes the visible columns of the checked rows (or of every filtered row when none are checked) as UTF-8 CSV with a BOM. `serializeGridRows` prefixes cells that start with =, +, - or @ with an apostrophe so spreadsheets do not run them as formulas.
- Copy selected rows uses `navigator.clipboard.writeText`, so it needs a secure context and clipboard permission; a refusal shows an error instead of failing silently.
- Composes kit items: Button, CloseButton, Checkbox, Dropdown, Input, Select, SegmentedControl and Tooltip.

## Definition of done

The grid shows its row count, a header with a frozen first column and a body that scrolls smoothly with only a window of rows in the DOM. Arrow keys move the outlined cursor, Shift+arrows extend a range and the status bar shows its address, count, sum and average. Double-clicking a number cell and entering text shows "Seats: Enter a valid number." and keeps the editor open; a valid value updates the cell and the column summary, and Ctrl/Cmd+Z restores it. Pasting a 2x2 block from a spreadsheet fills four cells as one undo step. Checking rows swaps the toolbar to the bulk bar; Delete removes them and Undo brings them back in place. Filter by a value, hide a column, switch to Compact and export a CSV.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
