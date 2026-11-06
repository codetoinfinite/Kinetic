/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Activity Rings Card" (boardui.com/components/activity-rings-card).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'activity-rings-card',
  title: 'Activity Rings Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'rings', 'progress', 'fitness', 'svg', 'boardui'],
  blurb:
    'Watch-style concentric goal rings in SVG with value tiles: the rings draw in on mount, and hovering a ring or tile focuses it.',
  cost: 'css',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/activity-rings-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A grey dashboard card with one value tile per goal (Move, Exercise, Running by default) above a stack of concentric SVG progress rings. Each ring starts at twelve o\'clock and sweeps clockwise to its share of the goal over a tinted track, the outer ring first. Hovering or focusing a ring or its tile dims the others and puts the percentage in the centre, and clicking a tile pins that focus. Under reduced motion the rings are simply there at their final length.',

  mechanism: [
    'Each ring is a pair of circles rotated by -90° so the path starts at twelve o\'clock: a track and a progress stroke. The track colour is the ring colour mixed 22% into `--color-chart-track` with `color-mix(in oklab, …)`, so it reads as a pale tint in light mode and a dark tint in dark mode.',
    'The progress circle has `pathLength={100}`, so the dash maths is in percent regardless of radius: `stroke-dasharray: 100 100` and `stroke-dashoffset: 100 - pct` leave exactly pct percent of the lap visible, with round caps on both ends. Progress is clamped to 0–100 for the arc.',
    'Radii step inward: the outer ring sits half a stroke inside the edge and each next one moves in by one 18px band plus a 4px gap, which leaves a 60px hole at the default 184px size. More than three rings get thinner bands so they still fit.',
    'On mount every offset is 100 (nothing drawn). Two `requestAnimationFrame`s later `drawn` flips to true and the offsets move to their targets through a CSS `transition-[stroke-dashoffset]` of 1100ms with an expo-out curve, delayed 140ms per ring from the outside in. A remount (the demo\'s Replay) draws them again.',
    'Focus is `preview ?? pinned`. Pointer enter on a ring group (hit-tested on the stroke only, so the gaps do not count) or on a tile sets the preview; leaving clears it; clicking a tile toggles the pinned ring, which can also be controlled with `focused` and `onFocusedChange`. Unfocused rings fade to 30% and unfocused tiles to 50%.',
    'The centre readout is a polite live region that shows the focused ring\'s percentage and label, keyed by ring so `.animate-number-fade` replays on each change. The SVG itself carries an `aria-label` listing every ring\'s percentage.',
  ],

  constants: [
    {
      name: 'STROKE / RING_GAP',
      value: '18px / 4px at 184px',
      why: 'Fat bands with a hairline of card between them read as separate rings at a glance; both scale with `size`.',
    },
    {
      name: 'draw',
      value: '1100ms, cubic-bezier(0.22, 1, 0.36, 1)',
      why: 'The expo-out curve spends most of the time near the end, so the rings sweep in fast and settle gently on the exact value.',
    },
    {
      name: 'STAGGER_MS',
      value: '140ms',
      why: 'Enough to see the rings draw one after another from the outside in without making the last one feel late.',
    },
    {
      name: 'track mix',
      value: '22%',
      why: 'Keeps the unfinished part of the lap visibly the ring\'s colour but much lighter than the stroke, in both themes.',
    },
  ],

  pitfalls: [
    'Animating `stroke-dasharray` or computing `2πr` per ring. `pathLength={100}` makes every ring use the same 0–100 numbers, so one transition rule covers them all.',
    'Starting the transition in the same frame as the first paint. Setting `drawn` straight from `useEffect` can be batched with the initial render and the rings appear without animating; waiting two animation frames guarantees the browser has painted the empty state first.',
    'Letting progress past 100% wrap the dash. The arc is clamped to a full lap; the centre readout still shows the real percentage, such as 112%.',
  ],

  notes: [
    '`ACTIVITY_RINGS` and the `ActivityRing` type are exported. A ring is `{ id, label, value, goal, display?, color }`.',
    'Pass `caption` to show the day on show at the top right; the Most Active Days Card demo uses this to pair the two cards.',
  ],

  apiSignature:
    'function ActivityRingsCard(props?: ActivityRingsCardProps): JSX.Element\ntype ActivityRing = { id: string; label: string; value: number; goal: number; display?: string; color: string }\nconst ACTIVITY_RINGS: ActivityRing[]',

  props: [
    { name: 'title', type: 'string', default: '"Activity"', description: 'Header label.' },
    { name: 'caption', type: 'string', description: 'Right-hand header text, such as the selected day.' },
    { name: 'rings', type: 'ActivityRing[]', default: 'ACTIVITY_RINGS', description: 'Rings from the outside in, each with its value, goal, display text and colour.' },
    { name: 'size', type: 'number', default: '184', description: 'Diameter of the ring stack in px; stroke and gap scale with it.' },
    { name: 'focused', type: 'string | null', description: 'Controlled pinned ring id.' },
    { name: 'onFocusedChange', type: '(id: string | null) => void', description: 'Called when a tile click pins or unpins a ring.' },
    { name: 'className', type: 'string', description: 'Merged onto the card section.' },
  ],

  reducedMotion:
    'With `prefers-reduced-motion: reduce`, `useReducedMotion` renders the rings at their final offsets from the start and `motion-reduce:transition-none` removes the draw transition, so nothing sweeps. The focus fades and the centre readout fade are also instant.',

  cleanup:
    'The mount effect cancels both pending animation frames on unmount. Everything else is CSS transitions and React event props.',

  acceptance:
    'The default card reads "Activity" with three tiles, Move 1,592 kcal (pink), Exercise 1h 45m (lime) and Running 5.2 km (sky), and three rings that draw clockwise from the top to about 88%, 81% and 76%. Hovering the Exercise ring or tile dims the other rings and tiles and shows "81%" and "Exercise" in the centre; leaving restores them. Replay draws the rings again.',

  criticalRegion: 'critical',
};

export default meta;
