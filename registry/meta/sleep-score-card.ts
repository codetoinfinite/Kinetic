/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Sleep Score Card" (boardui.com/components/sleep-score-card).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'sleep-score-card',
  title: 'Sleep Score Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'gauge', 'rings', 'health', 'svg', 'boardui'],
  blurb:
    'A segmented SVG ring that sums sleep sub-scores to a total out of 100, with a week switcher and metric rows that focus their arc.',
  cost: 'css',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/sleep-score-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'A grey dashboard card headed "Sleep score" with a rating word ("Excellent") and a week pill with arrows. Below sits a ring split into one coloured arc per metric (Duration, Bedtime, Interruptions), each owning a share of the lap equal to its points available and filled by its score, with the total in the middle. A white panel lists the metrics with their detail and score; hovering or focusing a row (or an arc) dims the other arcs and puts that metric\'s score in the centre, and stepping through weeks glides the arcs to the new values.',

  mechanism: [
    'Each metric owns a slot of the ring sized `max / sum(max) × 100` percent (50, 30 and 20 by default, so the total reads out of 100), laid clockwise from twelve o\'clock in row order. Its arc fills `score / max` of that slot.',
    'Every arc is a circle with `pathLength={100}` rotated -90°, drawn with `stroke-dasharray: length 100` and `stroke-dashoffset: -start` over a full `stroke-chart-track` circle. Round caps reach half a stroke past each dash end, so the dash is trimmed by one cap on each side, `cap = (stroke / 2) / (2πr) × 100`, plus a 4% visible gap, and starts a half-gap plus a cap into its slot.',
    'The dash length, offset and opacity are inline CSS properties with a 700ms expo-out `transition-[stroke-dasharray,stroke-dashoffset,opacity]`. On mount every arc has length 0 and opacity 0; two animation frames later the real values apply, so the arcs grow in. Changing week only changes the numbers, so the same transition glides each arc to its new length.',
    'The week pill steps an index into `weeks` (controlled via `weekIndex` / `onWeekIndexChange`, or uncontrolled starting at the latest week); the arrows disable at either end. The rating word comes from `rate(total)` (Excellent ≥ 90, Good ≥ 75, Fair ≥ 60, else Poor) and is keyed by week so it fades in on change.',
    'Focus is `preview ?? pinned`: pointer enter on a row or an arc (hit-tested on the stroke) and keyboard focus on a row set the preview; clicking a row toggles the pinned metric. Other arcs drop to 25% and other rows to 50%, and the centre swaps the total for the focused score with "of max" underneath, in a polite live region.',
  ],

  constants: [
    {
      name: 'SIZE / STROKE',
      value: '108px / 12px',
      why: 'A chunky band on a small ring, as in the reference; the stroke scales with `size`.',
    },
    {
      name: 'GAP',
      value: '4 (ring percent)',
      why: 'About 15° of track shows between arcs after the caps are trimmed, enough to read the segments as separate scores.',
    },
    {
      name: 'arc transition',
      value: '700ms, cubic-bezier(0.22, 1, 0.36, 1)',
      why: 'Fast start and soft landing, so a week change reads instantly but the arcs settle gently.',
    },
    {
      name: 'max split',
      value: '50 / 30 / 20',
      why: 'Duration matters most, so it owns half the ring; the three maxima sum to 100 so the centre total is a percentage-style score.',
    },
  ],

  pitfalls: [
    'Forgetting the round caps. A dash of exactly the slot length overlaps its neighbour by a full stroke width; trim one cap from each end before subtracting the visible gap.',
    'Setting the dash values as SVG attributes and expecting a CSS transition. Put `strokeDasharray` and `strokeDashoffset` in `style` so the browser interpolates them.',
    'Starting from length 0 with round caps leaves a dot at each arc\'s start; the arcs also start at opacity 0 and fade in with the draw.',
  ],

  notes: [
    'Exports `SLEEP_WEEKS` (six sample weeks, oldest first), `sleepRating` and the `SleepMetric` / `SleepWeek` types. A metric is `{ id, label, detail, score, max, color }`; any number of metrics works and the slots follow their maxima.',
  ],

  apiSignature:
    'function SleepScoreCard(props?: SleepScoreCardProps): JSX.Element\ntype SleepMetric = { id: string; label: string; detail: string; score: number; max: number; color: string }\ntype SleepWeek = { id: string; label: string; metrics: SleepMetric[] }',

  props: [
    { name: 'title', type: 'string', default: '"Sleep score"', description: 'Header label.' },
    { name: 'weeks', type: 'SleepWeek[]', default: 'SLEEP_WEEKS', description: 'Weeks the pill steps through, oldest first.' },
    { name: 'weekIndex', type: 'number', description: 'Controlled index into `weeks`.' },
    { name: 'defaultWeekIndex', type: 'number', default: 'weeks.length - 1', description: 'Uncontrolled starting week.' },
    { name: 'onWeekIndexChange', type: '(index: number) => void', description: 'Called when an arrow changes week.' },
    { name: 'rate', type: '(score: number) => string', default: 'sleepRating', description: 'Turns the total into the headline word.' },
    { name: 'size', type: 'number', default: '108', description: 'Ring diameter in px.' },
    { name: 'className', type: 'string', description: 'Merged onto the card section.' },
  ],

  reducedMotion:
    'With `prefers-reduced-motion: reduce`, `useReducedMotion` renders the arcs at their final lengths from the first frame and `motion-reduce:transition-none` removes the draw and week-change transitions, so arcs jump to new values. The rating and centre fades and the row dimming are also instant.',

  cleanup:
    'The mount effect cancels both pending animation frames on unmount. Everything else is CSS transitions and React event props.',

  acceptance:
    'The default card reads "Sleep score", "Excellent", "29 Jun - 5 Jul" and 98 in the centre, with purple, pink and blue arcs that grow in clockwise from the top over a grey track, and rows "Duration: 7h 50m 49/50", "Bedtime: 20m earlier 29/30" and "Interruptions: 5m wake up 20/20". The next arrow is disabled. Hovering the Bedtime row dims the other arcs and rows and shows 29 "of 30" in the centre. Clicking the previous arrow shows "22 Jun - 28 Jun", "Good" and 83, and the arcs shorten smoothly.',

  criticalRegion: 'critical',
};

export default meta;
