# Build: Patients Table

A patient list for a clinic dashboard. A toolbar shows the result count (and how many rows are picked) next to status and condition filters and a rounded search field; the table lists each patient with a selection checkbox, initials avatar, name and age, an inline admission select, a coloured status pill, condition chips, the next appointment with the last visit under it, and three row actions. Selection, sorting and paging run on React Aria's own Table state, with selection kept across pages and filters.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A clinic patient list: initials, age, admission select, status pill, conditions, next and last visit, row selection, sort, filter, pages.

- Category: display
- Runtime cost: dom
- Dependencies: @internationalized/date@^3.12.4, @remixicon/react@^4.9.0, react-aria-components@^1.22.1

## How it works

1. Rows are filtered in a `useMemo` by status, condition and a case-insensitive name search, then copied and sorted when the React Aria `sortDescriptor` names a sortable column: `name` uses `localeCompare`, `nextAppointment` compares ISO strings, and a missing date always sorts last.
2. The sorted rows are sliced into pages of `pageSize` (default 6). The page index is clamped to the page count so a filter that shrinks the list never leaves an empty page, and every filter, search keystroke and sort change resets to page 1. The kit `Pagination` footer appears only when there is more than one page.
3. The table uses React Aria `selectionMode="multiple"`: a `Checkbox slot="selection"` in the Patient column header is the select-all-on-this-page box (React Aria makes it indeterminate for a partial page) and one in each Patient cell selects the row. Clicking anywhere else on a row also toggles it.
4. Selection is one `Set` of patient ids (controlled via `selectedKeys` or uncontrolled via `defaultSelectedKeys`). React Aria only receives the ids on the visible page; its `onSelectionChange` result, `"all"` meaning every id on the page, replaces that page's ids in the full set, so picks on other pages and on filtered-out rows survive.
5. Inline controls are React Aria buttons (the admission `Select` trigger, the chart and edit buttons, the more-menu `DropdownTrigger`), whose presses stop at the button and never toggle the row. Admission changes live in a per-id state map and call `onAdmissionChange`; row actions call `onAction(action, patient)`.
6. Dates are ISO strings parsed with `parseDate` and printed with an `@internationalized/date` `DateFormatter` (`month: "short", day: "2-digit", year: "numeric"`, UTC), so server and client render the same "Oct 03, 2026".

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `pageSize = 6`
  Default rows per page; the demo uses 5 so the card fits a dashboard panel.
- `table min width = 1060px`
  Six columns keep their widths; narrower viewports scroll the table inside its own overflow-x-auto wrapper.
- `search width = 153px`
  Matches the kit data table search pill; it grows to fill the row on mobile.

## API

```ts
export function PatientsTable({ patients, pageSize = 6, selectedKeys, defaultSelectedKeys, onSelectionChange, onAdmissionChange, onAction, conditionOptions, locale = "en-US", className, "aria-label": ariaLabel = "Patients" }: PatientsTableProps): JSX.Element
```

- `patients: Patient[]`
  Rows: id, name, optional initials/avatarColor/age, admission, status, conditions, optional lastVisit and nextAppointment ISO dates.
- `pageSize: number` — default `6`
  Rows per page.
- `selectedKeys: Iterable<Key>`
  Controlled selected patient ids, kept across pages and filters.
- `defaultSelectedKeys: Iterable<Key>`
  Initial selection when uncontrolled.
- `onSelectionChange: (keys: Set<Key>) => void`
  Called with the full selection after any checkbox or row press.
- `onAdmissionChange: (id: string, admission: Admission) => void`
  Called when a row's admission select changes.
- `onAction: (action: PatientAction, patient: Patient) => void`
  Chart, edit, book, message or archive from the row actions.
- `conditionOptions: string[]`
  Condition filter options; defaults to every condition in the data.
- `locale: string` — default `"en-US"`
  Locale for the date columns and the result count.
- `className: string`
  Classes on the outer section.
- `aria-label: string` — default `"Patients"`
  Accessible name of the table.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
// Filter → sort → page. Selection is kept as one Set of ids across every
// page; React Aria only ever sees the ids that are on the visible page, and
// its answers are merged back so off-page picks are never lost.
const selected = useMemo(
  () => (selectedKeys !== undefined ? new Set(selectedKeys) : ownSelection),
  [selectedKeys, ownSelection],
);

const rows = useMemo(() => {
  const q = query.trim().toLowerCase();
  const filtered = patients.filter(
    (p) =>
      (statusFilter === "all" || p.status === statusFilter) &&
      (conditionFilter === "all" || p.conditions.includes(conditionFilter)) &&
      (q === "" || p.name.toLowerCase().includes(q)),
  );
  if (!sort || !SORTABLE.has(sort.column)) return filtered;
  const dir = sort.direction === "ascending" ? 1 : -1;
  return [...filtered].sort((a, b) =>
    sort.column === "name"
      ? a.name.localeCompare(b.name, locale) * dir
      : compareOptional(a.nextAppointment, b.nextAppointment, dir),
  );
}, [patients, query, statusFilter, conditionFilter, sort, locale]);

const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
const currentPage = Math.min(page, totalPages);
const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
const pageSelection = new Set<Key>(pageRows.filter((p) => selected.has(p.id)).map((p) => p.id));

const commitSelection = (next: Set<Key>) => {
  if (selectedKeys === undefined) setOwnSelection(next);
  onSelectionChange?.(next);
};

const handleSelectionChange = (keys: Selection) => {
  const pageIds = pageRows.map((p) => p.id);
  const next = new Set(selected);
  for (const id of pageIds) next.delete(id);
  for (const id of keys === "all" ? pageIds : keys) next.add(id);
  commitSelection(next);
};

const resetPage = () => setPage(1);
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers, listeners or observers of its own; the Select, Dropdown and Tooltip release their popovers when unmounted.

**Reduced motion.** Nothing moves except colour transitions; the sort chevron flip and the row button colour fades are dropped with motion-reduce:transition-none.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Do not hand React Aria the full selection set: it only knows the rendered page, so `"all"` would be read as every patient. Merge its answer back into the page's ids only.
- Do not use the kit IconButton (a plain <button>) for row actions inside a selectable row; a React Aria Button keeps the press from toggling selection.
- Do not format dates with `toLocaleDateString` on a `Date` built in local time; parse ISO strings with `parseDate` and format in UTC so SSR and hydration agree.

## Notes

- The condition filter lists every condition found in `patients` unless `conditionOptions` is passed.
- Age and last visit are optional per patient and are simply omitted when missing; a missing next appointment shows an em dash.

## Definition of done

Ticking a row checkbox adds it to "N selected", the header box selects the whole page, sorting Patient orders names A to Z, the status filter narrows the rows, and choosing a new admission does not change selection.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
