/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Most Active Days Card" (boardui.com/components/most-active-days-card).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'most-active-days-card',
  title: 'Most Active Days Card',
  category: 'display',
  kit: 'boardui',
  tags: ['calendar', 'rings', 'fitness', 'scroll-spy', 'chart', 'boardui'],
  blurb:
    'A scrolling year calendar where each day is a mini activity ring, with a month pill that follows the scroll and selectable days.',
  cost: 'dom',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/most-active-days-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@internationalized/date@^3.12.4', '@remixicon/react@^4.9.0'],

  summary:
    'A grey dashboard card with the visible month\'s step total, a month pill with previous and next arrows, and a fixed-height white panel that scrolls through all twelve months of the year. Every day is a numbered cell with a 26px stack of three concentric progress rings; days after "today" show faded empty tracks and cannot be picked. Scrolling updates the pill and the total to the month in view, the arrows scroll smoothly to the neighbouring month, and picking a day (click or arrow keys) reports it so a paired Activity Rings Card can show that day.',

  mechanism: [
    'One memoised pass builds the year: for each month, `getDaysInMonth` gives the day count, each `CalendarDate` gets its data from `getActivity` (default `sampleDayActivity`, seeded by `createRng(date.toString())` so every date is stable across renders and server/client), and each month sums `steps` for days on or before `today` into its total.',
    'Each month is a section with a sticky 44px heading ("Jul") over a 7-column grid of day buttons that simply runs 1–7, 8–14 and so on, like the reference, rather than aligning to weekdays. A cell is 42×74px: the number above `MiniActivityRings`, an SVG where each ring is a tinted track (ring colour mixed 22% into `--color-chart-track`) plus a `pathLength={100}` arc with `stroke-dasharray: pct 100`, rotated -90° to start at twelve o\'clock.',
    'Scroll-spy: the scroller\'s `onScroll` schedules one `requestAnimationFrame`, which picks the last month section whose `offsetTop` is at or above `scrollTop + 35%` of the viewport (or December once the scroll is at the end). That month names the pill and its total; both are keyed spans, so `.animate-number-fade` replays as the label walks along.',
    'The arrows call `scrollTo({ top: section.offsetTop })` on the scroller (smooth, or instant under reduced motion) and let the spy update the label as the scroll passes. On mount, and again whenever `height` changes, an isomorphic layout effect sets `scrollTop` to the focused day\'s month (the selection, else `today`) and reveals that day before paint.',
    'Selection is controlled (`selected` + `onSelectedChange`) or uncontrolled (`defaultSelected`, else `today`). Day buttons use a roving tabindex: arrow keys move ±1 or ±7 days, Home and End go to the month\'s first and last day, Page Up and Page Down move a month, clamped to January 1 and `today`; the focused button is revealed inside the scroller (never the page) below the sticky heading. Enter or Space picks it.',
  ],

  constants: [
    {
      name: 'RING_SIZE / RING_STROKE / RING_GAP',
      value: '26px / 2.75px / 1px',
      why: 'Three rings fit in a day cell with a visible hole in the middle and still read as separate bands at a glance.',
    },
    {
      name: 'HEADING_H',
      value: '44px',
      why: 'Height of the sticky month heading; a revealed day is kept below it so keyboard focus never hides under "Jul".',
    },
    {
      name: 'SPY_LINE',
      value: '0.35',
      why: 'The pill switches once the next month\'s heading is a third of the way up the panel, so the label changes while that month is clearly arriving rather than at the very top.',
    },
    {
      name: 'height',
      value: '232px',
      why: 'Shows two full weeks of cells and the start of a third, which hints that the panel scrolls.',
    },
  ],

  pitfalls: [
    'Using `scrollIntoView` to reveal the focused day. In a preview frame or a scrolled page it also scrolls every ancestor; setting `scrollTop` on the panel only moves the calendar.',
    'Setting the pill label straight from the arrow click. The spy would then flip it back for a few frames while the smooth scroll is still short of the line; letting the spy own the label keeps it in step with what is on screen.',
    'Passing a fresh `CalendarDate` for `today` each render rebuilds the whole year. The memo is keyed on `today.toString()` so equal dates reuse it.',
  ],

  notes: [
    'Exports `MostActiveDaysCard`, `MiniActivityRings`, `sampleDayActivity`, `formatLongDate` and the `DayActivity` type (`{ steps, rings: ActivityRing[] }`). The rings use the `ActivityRing` shape from the Activity Rings Card, so a day\'s rings can be passed straight to it.',
    'The demo pairs the two cards: the selected day drives the Activity Rings Card\'s title ("Activity for July 10, 2026") and rings, which glide to the new values. On screens under 640px the demo stacks the cards and passes a 168px calendar `height` and a 120px ring `size` so both fit.',
  ],

  apiSignature:
    'function MostActiveDaysCard(props?: MostActiveDaysCardProps): JSX.Element\nfunction MiniActivityRings(props: { rings: ActivityRing[]; empty?: boolean; size?: number; className?: string }): JSX.Element\nfunction sampleDayActivity(date: CalendarDate): DayActivity\ntype DayActivity = { steps: number; rings: ActivityRing[] }',

  props: [
    { name: 'title', type: 'string', default: '"Most active days"', description: 'Header label.' },
    { name: 'totalLabel', type: 'string', default: '"total steps"', description: 'Unit after the month total.' },
    { name: 'year', type: 'number', default: 'today.year', description: 'Year on show; all twelve months scroll in one column.' },
    { name: 'today', type: 'CalendarDate', default: 'parseDate("2026-07-10")', description: 'Later days are empty and disabled, and totals stop here.' },
    { name: 'getActivity', type: '(date: CalendarDate) => DayActivity', default: 'sampleDayActivity', description: 'Steps and ring values per day.' },
    { name: 'selected', type: 'CalendarDate | null', description: 'Controlled selected day.' },
    { name: 'defaultSelected', type: 'CalendarDate | null', default: 'today', description: 'Uncontrolled initial selection.' },
    { name: 'onSelectedChange', type: '(date: CalendarDate) => void', description: 'Called when a day is picked by click, Enter or Space.' },
    { name: 'height', type: 'number', default: '232', description: 'Height of the scrolling calendar in px.' },
    { name: 'className', type: 'string', description: 'Merged onto the card section.' },
  ],

  reducedMotion:
    'With `prefers-reduced-motion: reduce`, the month arrows and keyboard reveal scroll instantly instead of smoothly, the pill label and total no longer fade in (`motion-reduce:animate-none`), and the cell hover and selection border changes are instant.',

  cleanup:
    'The pending scroll-spy animation frame is cancelled on every new scroll event and on unmount. Scrolling, clicks and keys use React event props, so there are no listeners to remove.',

  acceptance:
    'The default card reads "Most active days", "39,919 total steps" and a pill showing "July", with the panel opened on July: days 1–10 have three-colour mini rings, 11–31 are faded empty tracks and disabled, and the 10th has a grey outline. Clicking the next arrow scrolls smoothly to August and the pill then reads "August" with a total of 0; scrolling back up changes it to "July" again. Clicking July 3 outlines it and fires `onSelectedChange` (in the demo the Activity card title becomes "Activity for July 3, 2026" and its rings move); with July 3 focused, Arrow Right moves focus to July 4 and Arrow Down to July 10, but not past it.',

  criticalRegion: 'critical',
};

export default meta;
