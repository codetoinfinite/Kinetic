import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'agent-log',
  title: 'Agent Log',
  category: 'display',
  kit: 'boardui',
  tags: ['agent', 'ai', 'log', 'streaming', 'tree', 'motion', 'boardui'],
  blurb: 'Streaming agent-log parts: a reveal ticker, rows that blur in under a soft clipping edge, and a curved tree guide that draws itself.',
  cost: 'dom',
  motif: 'trail',

  files: [
    {
      path: 'registry/ui/agent-log.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['motion@^12.43.0'],

  summary:
    'The shared machinery behind BoardUI\'s Task List and Web Search: a line of agent work drawing itself down the page. `useRevealTicker` paces how many units are visible, `LogRow` blurs each row in as its height opens, softening the clipping edge with an animated mask, and draws its own piece of a curved tree guide so the line reads as one pen stroke. `WorkingRow` is the loose "still going" indicator at the bottom, and `ShimmerText` marks a line in progress. It says nothing about what a row contains; that is the consumer\'s job.',

  mechanism: [
    '`useRevealTicker({ total, stepInterval = 850, startDelay = 320, delayFor, revealed, run, onComplete })` returns how many units to show. Uncontrolled, it schedules one `setTimeout` per step (`startDelay` before the first, `stepInterval` after, or `delayFor(index)` per unit) and clears it on cleanup. Passing `revealed` disables the timer so real events drive the log. `onComplete` fires once per completion, guarded by a ref.',
    '`LogRow` is a `motion.li` animating from `UNIT_INITIAL` (`opacity 0, height 0, y 4, blur(6px)`) to `UNIT_ANIMATE` (`opacity 1, height auto, y 0, blur(0px)`). Height runs 0.38s and the rest 0.42s, all on `SOFT_EASE` [0.22, 1, 0.36, 1], so the row has made space just before the text sharpens.',
    'Growing from height 0 behind `overflow-hidden` would cut a hard line through the text, so `useRevealMask` applies a `mask-image` gradient whose solid part ends `--bui-reveal-fade` pixels short of the bottom. Motion animates that custom property from 22px to 0 over 0.44s; on `onAnimationComplete` the mask is removed so nothing is composited at rest.',
    '`RowConnector` draws the row\'s piece of the guide: an SVG branch (down the trunk, a 6px quadratic corner at y = 14, out 12px) animating `pathLength` 0 → 1, and, unless the row is last, a 1px trunk below it scaling from its top edge.',
    'The pieces run in sequence like one pen: the tail (trunk) of the row above draws for 0.12s, then the new row\'s branch draws for 0.14s after a 0.12s delay (no delay for the first row). Both are `linear` so the stroke keeps one pace through each junction.',
    '`WorkingRow` uses the same blur-in to show `AgentThinking variant="stars"` with a label, off the guide. `GuideBridge` fills the gap between a parent row\'s glyph and a nested list\'s trunk. `useLogMotion` reads `prefers-reduced-motion` once for the whole log.',
  ],

  constants: [
    {
      name: 'SOFT_EASE',
      value: '[0.22, 1, 0.36, 1]',
      why: 'Steeply front-loaded, so text has settled by about 0.2s of its 0.42s blur-in.',
    },
    {
      name: 'UNIT_TRANSITION',
      value: 'height 0.38s; opacity, filter, y 0.42s; --bui-reveal-fade 0.44s',
      why: 'The container settles first, then the words arrive, which reads as smooth rather than as a jump.',
    },
    {
      name: '--bui-reveal-fade',
      value: '22px → 0px',
      why: 'Longer than a 20px text line, so a growing row is always faintest exactly where it is being clipped.',
    },
    {
      name: 'branch geometry',
      value: 'BRANCH_Y 14, BRANCH_RADIUS 6, BRANCH_WIDTH 12',
      why: 'The elbow sits at half of the 20px line plus the 4px top padding, fixed from the top, so a wrapped label still branches at its first line.',
    },
    {
      name: 'guide timing',
      value: 'tail 0.12s, branch 0.14s after 0.12s, linear',
      why: 'Lengths over one pen speed of about 160px/s, so the handoff between pieces is invisible.',
    },
    {
      name: 'ticker defaults',
      value: 'startDelay 320ms, stepInterval 850ms',
      why: 'A short wait before the first row, then a steady pace that `delayFor` can override per unit.',
    },
  ],

  pitfalls: [
    'Give each row content a 4px top padding and a 20px line (the demo uses `py-1` with body text). The branch elbow is fixed at 14px and will not meet the label otherwise.',
    'Pass `last` correctly: only the final visible row omits its trunk. When a new row arrives the previous one gains its trunk, which is what draws the tail first.',
    'Keep `delayFor` and `onComplete` stable or cheap. `delayFor` is an effect dependency, so an inline function restarts the pending timer on every render.',
    'Change the parent\'s `key` to replay a log. Toggling `run` only pauses and resumes from the current count.',
    'Do not render a log with motion on the hydration pass if the server cannot know the reduced-motion preference. `initial` differs between the two, so start revealing after mount.',
  ],

  notes: [
    'Real agent steps do not take equal time. Drive the log with `revealed` from real events as soon as you have them, or use `delayFor` to dwell on the slow steps.',
    '`ShimmerText` uses the theme\'s `.agent-progress-loading-text`: a 3.4s linear gradient sweep through `background-clip: text`, replaced by plain secondary text under reduced motion.',
    '`agent-log` imports `AgentThinking` for the working row, so installing it brings that item in.',
  ],

  apiSignature:
    'function useRevealTicker(options: { total: number; run?: boolean; stepInterval?: number; startDelay?: number; revealed?: number; delayFor?: (index: number) => number; onComplete?: () => void }): number\nfunction LogRow(props: { first: boolean; last: boolean; reduce: boolean; className?: string; children: ReactNode }): JSX.Element\nfunction WorkingRow(props: { label: string; reduce: boolean; className?: string }): JSX.Element\nfunction ShimmerText(props: { children: string }): JSX.Element\nfunction GuideBridge(props: { height: number; offset?: number; reduce: boolean }): JSX.Element\nfunction RowConnector(props: { first: boolean; last: boolean; reduce: boolean }): JSX.Element\nfunction useLogMotion(): boolean\nfunction useRevealMask(reduce: boolean): { style?: CSSProperties; onAnimationComplete: () => void }',

  props: [
    { name: 'total', type: 'number', description: 'useRevealTicker: how many units the log has.' },
    { name: 'stepInterval / startDelay', type: 'number', default: '850 / 320', description: 'useRevealTicker: wait between units and before the first, in ms.' },
    { name: 'delayFor', type: '(index: number) => number', description: 'useRevealTicker: per-unit wait; overrides both defaults.' },
    { name: 'revealed', type: 'number', description: 'useRevealTicker: controlled count; disables the internal timer.' },
    { name: 'run', type: 'boolean', default: 'true', description: 'useRevealTicker: pause and resume the timer.' },
    { name: 'onComplete', type: '() => void', description: 'useRevealTicker: fires once when the last unit lands.' },
    { name: 'first / last', type: 'boolean', description: 'LogRow: position in the list; controls the branch delay and whether a trunk is drawn.' },
    { name: 'reduce', type: 'boolean', description: 'LogRow, WorkingRow, GuideBridge: skip the entrance and draw animations (from useLogMotion).' },
    { name: 'label', type: 'string', description: 'WorkingRow: text next to the stars indicator.' },
  ],

  reducedMotion:
    'With `reduce` true, every `initial` is `false`: rows mount at full height and opacity with no blur, the mask is never applied, and the branch and trunk appear fully drawn. The ticker still paces rows, since that is content arriving rather than decoration. `ShimmerText` drops its sweep through the theme\'s reduced-motion rule.',

  cleanup:
    '`useRevealTicker` clears its pending `setTimeout` whenever the count, options or component change, and on unmount. Motion stops its animations when rows unmount. No global listeners are added.',

  acceptance:
    'A log of five steps with the default ticker shows its first row about 320ms after mount, then one row roughly every 850ms (or per `delayFor`). Each row opens its height and sharpens from a 6px blur while lifting 4px, with no hard line cutting the text as it grows. The guide draws as one continuous stroke: the previous row\'s trunk extends down, then the new row\'s curved branch draws out to its label. The last row has no trunk hanging below its corner. `onComplete` fires exactly once. With reduced motion, rows appear instantly with the guide already drawn.',

  criticalRegion: 'critical',
};

export default meta;
