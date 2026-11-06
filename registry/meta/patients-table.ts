/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Patients Table" (boardui.com/templates/medical-profile).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'patients-table',
  title: 'Patients Table',
  category: 'display',
  kit: 'boardui',
  tags: ['table', 'medical', 'patients', 'selection', 'sorting', 'pagination', 'react-aria', 'boardui'],
  blurb:
    'A clinic patient list: initials, age, admission select, status pill, conditions, next and last visit, row selection, sort, filter, pages.',
  cost: 'dom',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/patients-table.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [
    '@internationalized/date@^3.12.4',
    '@remixicon/react@^4.9.0',
    'react-aria-components@^1.22.1',
  ],

  summary:
    'A patient list for a clinic dashboard. A toolbar shows the result count (and how many rows are picked) next to status and condition filters and a rounded search field; the table lists each patient with a selection checkbox, initials avatar, name and age, an inline admission select, a coloured status pill, condition chips, the next appointment with the last visit under it, and three row actions. Selection, sorting and paging run on React Aria\'s own Table state, with selection kept across pages and filters.',

  mechanism: [
    'Rows are filtered in a `useMemo` by status, condition and a case-insensitive name search, then copied and sorted when the React Aria `sortDescriptor` names a sortable column: `name` uses `localeCompare`, `nextAppointment` compares ISO strings, and a missing date always sorts last.',
    'The sorted rows are sliced into pages of `pageSize` (default 6). The page index is clamped to the page count so a filter that shrinks the list never leaves an empty page, and every filter, search keystroke and sort change resets to page 1. The kit `Pagination` footer appears only when there is more than one page.',
    'The table uses React Aria `selectionMode="multiple"`: a `Checkbox slot="selection"` in the Patient column header is the select-all-on-this-page box (React Aria makes it indeterminate for a partial page) and one in each Patient cell selects the row. Clicking anywhere else on a row also toggles it.',
    'Selection is one `Set` of patient ids (controlled via `selectedKeys` or uncontrolled via `defaultSelectedKeys`). React Aria only receives the ids on the visible page; its `onSelectionChange` result, `"all"` meaning every id on the page, replaces that page\'s ids in the full set, so picks on other pages and on filtered-out rows survive.',
    'Inline controls are React Aria buttons (the admission `Select` trigger, the chart and edit buttons, the more-menu `DropdownTrigger`), whose presses stop at the button and never toggle the row. Admission changes live in a per-id state map and call `onAdmissionChange`; row actions call `onAction(action, patient)`.',
    'Dates are ISO strings parsed with `parseDate` and printed with an `@internationalized/date` `DateFormatter` (`month: "short", day: "2-digit", year: "numeric"`, UTC), so server and client render the same "Oct 03, 2026".',
  ],

  constants: [
    { name: 'pageSize', value: '6', why: 'Default rows per page; the demo uses 5 so the card fits a dashboard panel.' },
    { name: 'table min width', value: '1060px', why: 'Six columns keep their widths; narrower viewports scroll the table inside its own overflow-x-auto wrapper.' },
    { name: 'search width', value: '153px', why: 'Matches the kit data table search pill; it grows to fill the row on mobile.' },
  ],

  pitfalls: [
    'Do not hand React Aria the full selection set: it only knows the rendered page, so `"all"` would be read as every patient. Merge its answer back into the page\'s ids only.',
    'Do not use the kit IconButton (a plain <button>) for row actions inside a selectable row; a React Aria Button keeps the press from toggling selection.',
    'Do not format dates with `toLocaleDateString` on a `Date` built in local time; parse ISO strings with `parseDate` and format in UTC so SSR and hydration agree.',
  ],

  notes: [
    'The condition filter lists every condition found in `patients` unless `conditionOptions` is passed.',
    'Age and last visit are optional per patient and are simply omitted when missing; a missing next appointment shows an em dash.',
  ],

  apiSignature:
    'export function PatientsTable({ patients, pageSize = 6, selectedKeys, defaultSelectedKeys, onSelectionChange, onAdmissionChange, onAction, conditionOptions, locale = "en-US", className, "aria-label": ariaLabel = "Patients" }: PatientsTableProps): JSX.Element',

  props: [
    { name: 'patients', type: 'Patient[]', description: 'Rows: id, name, optional initials/avatarColor/age, admission, status, conditions, optional lastVisit and nextAppointment ISO dates.' },
    { name: 'pageSize', type: 'number', default: '6', description: 'Rows per page.' },
    { name: 'selectedKeys', type: 'Iterable<Key>', description: 'Controlled selected patient ids, kept across pages and filters.' },
    { name: 'defaultSelectedKeys', type: 'Iterable<Key>', description: 'Initial selection when uncontrolled.' },
    { name: 'onSelectionChange', type: '(keys: Set<Key>) => void', description: 'Called with the full selection after any checkbox or row press.' },
    { name: 'onAdmissionChange', type: '(id: string, admission: Admission) => void', description: 'Called when a row\'s admission select changes.' },
    { name: 'onAction', type: '(action: PatientAction, patient: Patient) => void', description: 'Chart, edit, book, message or archive from the row actions.' },
    { name: 'conditionOptions', type: 'string[]', description: 'Condition filter options; defaults to every condition in the data.' },
    { name: 'locale', type: 'string', default: '"en-US"', description: 'Locale for the date columns and the result count.' },
    { name: 'className', type: 'string', description: 'Classes on the outer section.' },
    { name: 'aria-label', type: 'string', default: '"Patients"', description: 'Accessible name of the table.' },
  ],

  reducedMotion:
    'Nothing moves except colour transitions; the sort chevron flip and the row button colour fades are dropped with motion-reduce:transition-none.',
  cleanup:
    'No timers, listeners or observers of its own; the Select, Dropdown and Tooltip release their popovers when unmounted.',
  acceptance:
    'Ticking a row checkbox adds it to "N selected", the header box selects the whole page, sorting Patient orders names A to Z, the status filter narrows the rows, and choosing a new admission does not change selection.',
  criticalRegion: 'critical',
};

export default meta;
