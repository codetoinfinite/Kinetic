import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'data-grid',
  title: 'Data Grid',
  category: 'block',
  kit: 'boardui',
  tags: ['data-grid', 'spreadsheet', 'virtualized', 'range-selection', 'undo', 'csv', 'clipboard', 'boardui'],
  blurb:
    'A virtualized spreadsheet with range selection, validated in-cell edits, block paste, undo and redo, filters, summaries and CSV export.',
  cost: 'dom',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/data-grid.tsx',
      type: 'registry:ui',
      role: 'block',
    },
    {
      path: 'registry/ui/data-grid-utils.ts',
      type: 'registry:ui',
      role: 'parsing, clipboard and CSV helpers',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'motion@^12.43.0', 'react-aria-components@^1.22.1'],

  summary:
    'A spreadsheet-style grid for thousands of rows: only the rows in view are mounted, a frozen first column and a row-number gutter stay put while the body scrolls, and a keyboard-driven cell cursor selects ranges, edits cells and pastes blocks from a spreadsheet. Every edit, paste and row delete goes back through `onDataChange` as a new array and lands on a 100-step undo stack. Around the body sit a toolbar (search, filters, column visibility, density, export) that swaps to a bulk-action bar when rows are checked, a summary row and a status bar with the selection address, count, sum and average.',

  mechanism: [
    'Virtualization: the body is a fixed-height scroller (`height`, default 396) holding one spacer `rows.length * rowHeight` tall. Only rows from `floor(scrollTop / rowHeight) - 4` to `ceil((scrollTop + height) / rowHeight) + 4` render, each absolutely positioned at `top: r * rowHeight`. Rows are 44px, or 36px in Compact density, and every row shares one CSS grid template: a 48px gutter plus each column\'s width.',
    'The header and summary rows sit outside the scroller with `overflow: hidden`; the body\'s `onScroll` copies its `scrollLeft` into both so the columns stay aligned. A `ResizeObserver` measures the body, and the first column is frozen (`sticky` at `inset-inline-start: 48px`) only while the body is at least gutter + first column + 96px wide, so on a phone it scrolls away instead of covering everything.',
    'Range selection stores an anchor and a focus as `{ rowId, columnKey }`, not indices. `bounds` maps them through the current row and column index maps, so sorting, filtering or hiding columns keeps the selection on the same cells, and if an end cell drops out no range is drawn. Click selects, Shift+click and mouse drag (`pointerenter` with the button held) extend, Ctrl/Cmd+A selects everything, and `selectCell` scrolls the cursor into view on both axes, accounting for the frozen column and RTL.',
    'The grid is one focusable `role="grid"` element with `aria-activedescendant` pointing at the focused cell id (only while that row is mounted). Arrows move (mirrored in RTL), Page Up/Down jump by a viewport of rows, Home/End go to the row ends (with Ctrl/Cmd, to the first or last row), Enter or F2 opens the editor, Escape clears the range, Ctrl/Cmd+Z undoes and Shift+Ctrl/Cmd+Z or Ctrl/Cmd+Y redoes. The cursor outline is a `motion.span` with a shared `layoutId`, so it springs from cell to cell.',
    'Editing: double-click, Enter or F2 swaps the cell for an input (select columns show their select whenever the cell is active). On commit the text goes through `parseGridValue` (numbers, min, max, allowed options) and the column\'s `validate`; a failure keeps the editor open and shows "Header: message" in a `role="alert"` bar. Enter commits and moves down, Shift+Enter up, Tab and Shift+Tab to the next or previous cell in reading order, and Escape cancels.',
    'Clipboard and history: `onCopy` writes the range as TSV; `onPaste` parses TSV (quotes, CRLF), validates every cell first and cancels the whole paste on the first bad value, so a paste is all or nothing and one undo step. `commitEdits` applies `{ rowId, key, before, after }` edits with `applyGridEdits` and pushes them onto the undo stack (last 100 kept); deleting checked rows records each row with its index so undo splices them back. Before undoing, the grid checks the current data still holds the values it expects and clears the history instead if something outside changed them.',
    'Toolbar and footer: the default toolbar shows the row count, Undo, Redo, Filter (a column switcher, a value search and one exact-match value per column), Columns, Row density, Export and Search. Checking rows cross-fades it (180ms, `AnimatePresence`, the leaving one `inert`) to a bar with Delete, Copy and Export for the checked rows. Summary cells show Sum, Avg or Count over the filtered rows; the status bar shows the range address ("B3:D7"), the count of filled cells and, for numbers, their sum and average.',
  ],

  constants: [
    {
      name: 'row height',
      value: '44px Comfortable, 36px Compact',
      why: 'Fixed row heights are what make virtualization pure arithmetic: the scroll offset alone tells the grid which rows to mount and where.',
    },
    {
      name: 'OVERSCAN',
      value: '4 rows above and below the viewport',
      why: 'A small buffer so a fast wheel flick does not show blank rows before React renders the next window.',
    },
    {
      name: 'GUTTER',
      value: '48px row-number and checkbox column',
      why: 'Holds the row number and the row checkbox, which fades in over the number on hover or focus and stays visible once checked.',
    },
    {
      name: 'column width',
      value: 'default 160px, resizable 96 to 480px, 16px per arrow key',
      why: 'The clamp keeps a column from vanishing or eating the viewport; double-clicking the resize handle restores the column\'s own width.',
    },
    {
      name: 'cursor spring',
      value: 'stiffness 480, damping 38, mass 0.7',
      why: 'Stiff and well damped, so the outline arrives under key repeat without overshooting into the next cell.',
    },
    {
      name: 'undo depth',
      value: '100 transactions',
      why: 'Bounds memory for long sessions; each paste or bulk delete is one transaction however many cells it touched.',
    },
  ],

  pitfalls: [
    'Do not track the selection by row index. The range stores row ids and column keys, which is why a sort or filter keeps it on the same cells; index-based ranges jump to different data.',
    'Do not mutate `data` in place. The filtered rows, index maps, filter options and summaries are memoized on the `data` reference, so an in-place change leaves them stale; replace the array, as the one `onDataChange` hands back does.',
    'Do not create `columns` or `getRowId` inline on every render. They are memo dependencies, so each new identity rebuilds the filtered and sorted rows and the index maps.',
    'Do not swap the grid\'s number formatting back to `toLocaleString()`. Footer summaries without `formatSummary`, the selection Count/Sum/Avg and the row counts all go through module-level `Intl.NumberFormat("en-US")` formatters, so a de-DE browser shows the same "100,716" as the server render instead of "100.716". To show another locale, pass `formatSummary` with your own formatter.',
  ],

  notes: [
    'Omit `onDataChange` for a read-only grid: editing, paste, undo, redo and row delete are disabled and the grid reports `aria-readonly`.',
    'Search matches any column\'s text, case-insensitively; filters match exact values. Filter options come from `options` or from the distinct values in `data`.',
    'Export writes the visible columns of the checked rows (or of every filtered row when none are checked) as UTF-8 CSV with a BOM. `serializeGridRows` prefixes cells that start with =, +, - or @ with an apostrophe so spreadsheets do not run them as formulas.',
    'Copy selected rows uses `navigator.clipboard.writeText`, so it needs a secure context and clipboard permission; a refusal shows an error instead of failing silently.',
    'Composes kit items: Button, CloseButton, Checkbox, Dropdown, Input, Select, SegmentedControl and Tooltip.',
  ],

  apiSignature: 'function DataGrid<T extends object>(props: DataGridProps<T>): JSX.Element',

  props: [
    { name: 'aria-label', type: 'string', description: 'Names the grid; also labels the search field.' },
    { name: 'data', type: 'readonly T[]', description: 'The rows. Treat as immutable; changes come back through `onDataChange`.' },
    { name: 'columns', type: 'readonly DataGridColumn<T>[]', description: 'Key, header, width, type (text, number or select), options, min, max, align, editable, filterable, summary (sum, average or count), format, formatSummary and validate.' },
    { name: 'getRowId', type: '(row: T) => string', description: 'Stable id per row; selection, edits and undo are keyed by it.' },
    { name: 'onDataChange', type: '(data: T[]) => void', description: 'Receives the next array after an edit, paste, delete, undo or redo. Omit for read-only.' },
    { name: 'height', type: 'number', default: '396', description: 'Height of the scrolling body in pixels.' },
    { name: 'exportFileName', type: 'string', default: '"data-grid.csv"', description: 'File name for CSV export.' },
    { name: 'emptyState', type: 'ReactNode', default: '"No matching rows. Try another search or clear your filters."', description: 'Shown when search or filters leave no rows.' },
    { name: 'className', type: 'string', description: 'Classes for the outer frame.' },
  ],

  reducedMotion:
    'Under `prefers-reduced-motion` (via motion\'s `useReducedMotion`) the toolbar cross-fade and the cursor spring get zero duration, so the bars swap and the outline jumps instantly. The 150ms cell background fade is dropped with `motion-reduce:transition-none`.',

  cleanup:
    'The `ResizeObserver` on the body disconnects on unmount. Column-resize listeners live on the handle and are removed on `lostpointercapture`. The CSV export\'s object URL is revoked one second after the download starts.',

  acceptance:
    'The grid shows its row count, a header with a frozen first column and a body that scrolls smoothly with only a window of rows in the DOM. Arrow keys move the outlined cursor, Shift+arrows extend a range and the status bar shows its address, count, sum and average. Double-clicking a number cell and entering text shows "Seats: Enter a valid number." and keeps the editor open; a valid value updates the cell and the column summary, and Ctrl/Cmd+Z restores it. Pasting a 2x2 block from a spreadsheet fills four cells as one undo step. Checking rows swaps the toolbar to the bulk bar; Delete removes them and Undo brings them back in place. Filter by a value, hide a column, switch to Compact and export a CSV.',

  criticalRegion: 'critical',
};

export default meta;
