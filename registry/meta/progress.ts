import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'progress',
  title: 'Progress',
  category: 'display',
  kit: 'boardui',
  tags: ['progress', 'loading', 'upload', 'ring', 'react-aria', 'boardui'],
  blurb: 'Progress bar and ring, determinate or indeterminate, with an eased translate fill and a layered light sweep, on React Aria.',
  cost: 'css',
  motif: 'trail',

  files: [
    {
      path: 'registry/ui/progress.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'How far along a task is, as a rounded rail or a small ring. Both are React Aria `ProgressBar`s, so they are announced with their label and a locale-formatted value. The bar\'s fill moves by `translate` and eases to each new value over 500ms; the indeterminate bar sweeps a band of light (crisp core, tight glow, wide bloom) along the rail, and the indeterminate ring is the Spinner\'s orbiting light.',

  mechanism: [
    '`ProgressTrack` draws the rail: `relative w-full rounded-full bg-border-button-default text-accent-500` at `h-1`, `h-1.5` or `h-2` for sm / md / lg. The fill colour is `currentColor`, so a text class recolours it.',
    'Determinate: inside an `overflow-hidden rounded-full` clip, a full-width `bg-current` span is shifted by `translate: -(100 - p)% 0` (positive in RTL, read from `useDirection()`), with `p` clamped to 0..100. `transition-[translate] duration-500` with `cubic-bezier(0.22,1,0.36,1)` eases each change on the compositor instead of animating `width`.',
    'Indeterminate (`Sweep`): a wrapper clipped with `[clip-path:inset(-8px_0_round_9999px)]` keeps the light inside the rail\'s length but lets it bleed 8px past its thickness. A `w-2/5` band runs `bui-progress-sweep` (translate -100% to 250%) over 1.6s `cubic-bezier(0.65,0,0.35,1)`, reversed in RTL.',
    'The band holds three right-anchored `bg-linear-to-r from-transparent to-current` layers: a bloom (`-inset-y-[5px] right-[10px]`, opacity 30%, `blur-[5px]`), a glow (`-inset-y-[1.5px] right-[4px] left-[25%]`, opacity 60%, `blur-[2px]`) and a crisp core (`right-0 left-[35%]`). Pulling the soft layers back from the right edge is what keeps the sharp head in front.',
    '`ProgressBar` wraps `AriaProgressBar` and uses its render props `{ percentage, valueText }`: a label row (the kit `Label`, truncated, and `valueText` in `tabular-nums`), the track, and an optional caption description. The value label shows by default only when there is a label and the bar is determinate.',
    '`ProgressCircle` maps sm / md / lg to box 16 / 24 / 32 and line 2 / 2.5 / 3. It draws a `-rotate-90` SVG with a `stroke-border-button-default` track circle and a `currentColor` arc whose `strokeDashoffset = circumference × (1 - p/100)`, transitioned over 500ms. Indeterminate, it renders `SpinnerGlyph` at sm / lg / xl.',
  ],

  constants: [
    {
      name: 'track heights',
      value: 'sm h-1 (4px), md h-1.5 (6px), lg h-2 (8px)',
      why: 'Md is the default rail of the agent-limits card; sm fits inside dense rows and lg reads as a primary step indicator.',
    },
    {
      name: 'fill easing',
      value: '500ms cubic-bezier(0.22, 1, 0.36, 1) on translate',
      why: 'A strong ease-out lands each new value softly. Moving by `translate` keeps the change on the compositor; animating `width` relayouts every frame.',
    },
    {
      name: 'sweep',
      value: 'band w-2/5, 1.6s cubic-bezier(0.65,0,0.35,1), translate -100% to 250%; 4s under reduced motion',
      why: '250% of a 40% band carries it fully past the rail\'s end, so the band leaves before it re-enters on the left.',
    },
    {
      name: 'sweep bleed',
      value: 'clip-path inset(-8px 0 round 9999px); bloom -5px, glow -1.5px',
      why: 'The glow and bloom are taller than the 6px rail. Clipping only horizontally lets the light halo above and below while it still stops at the rail ends.',
    },
    {
      name: 'ring sizes',
      value: 'sm 16/2, md 24/2.5, lg 32/3 (box/line px); indeterminate uses SpinnerGlyph sm / lg / xl',
      why: 'Ring and spinner share box sizes, so a ring can swap between determinate and indeterminate in place without moving its neighbours.',
    },
  ],

  pitfalls: [
    'Do not animate the fill\'s `width`. The component translates a full-width span inside an `overflow-hidden` clip; width transitions cause layout on every frame.',
    'Do not forget RTL. The fill offset flips sign with `useDirection()` and the sweep reverses; a hard-coded negative translate fills from the wrong edge in Arabic or Hebrew.',
    'Do not replace the sweep\'s `clip-path` with `overflow: hidden`. It would cut the glow off at the rail\'s 6px thickness.',
    'Do not render a ring or an unlabelled bar without `aria-label`. React Aria warns and screen readers announce an unnamed progress bar.',
  ],

  notes: [
    '`ProgressTrack` is exported and shared with Meter, which reuses the same rail and fill.',
    'Values are React Aria\'s: `value`, `minValue` (0), `maxValue` (100) and `formatOptions`; `valueText` is formatted for the locale.',
  ],

  apiSignature:
    'type ProgressSize = "sm" | "md" | "lg"\ninterface ProgressBarProps extends Omit<AriaProgressBarProps, "children" | "className"> { label?: ReactNode; showValueLabel?: boolean; description?: ReactNode; size?: ProgressSize; className?: string }\nfunction ProgressBar(props: ProgressBarProps): JSX.Element\ninterface ProgressTrackProps { percentage: number; size?: ProgressSize; isIndeterminate?: boolean; className?: string }\nfunction ProgressTrack(props: ProgressTrackProps): JSX.Element\ninterface ProgressCircleProps extends Omit<AriaProgressBarProps, "children" | "className"> { size?: ProgressSize; className?: string }\nfunction ProgressCircle(props: ProgressCircleProps): JSX.Element',

  props: [
    { name: 'value', type: 'number', default: '0', description: 'Current value between `minValue` and `maxValue` (React Aria).' },
    { name: 'isIndeterminate', type: 'boolean', default: 'false', description: 'Show the light sweep (bar) or the orbiting spinner (ring) instead of a value.' },
    { name: 'label', type: 'ReactNode', description: 'Bar only. Label above the rail; also turns the value label on by default.' },
    { name: 'showValueLabel', type: 'boolean', description: 'Bar only. Show the formatted value at the end of the label row. Defaults to on when there is a label and a value.' },
    { name: 'description', type: 'ReactNode', description: 'Bar only. Helper text under the rail.' },
    { name: 'size', type: '"sm" | "md" | "lg"', default: '"md"', description: 'Bar: 4 / 6 / 8px rail. Ring: 16 / 24 / 32px box.' },
    { name: 'className', type: 'string', description: 'Bar: classes on the root. Ring: arc colour via a text class (default accent).' },
  ],

  reducedMotion:
    'Fill and ring transitions are removed (`motion-reduce:transition-none`), so values jump straight to their new position. The indeterminate sweep keeps running but slows from 1.6s to 4s, and the indeterminate ring inherits Spinner\'s slower 2.4s orbit, because a stopped loader reads as a hang.',

  cleanup: 'Nothing to clean up. Motion is CSS transitions and keyframes; there are no listeners, timers or effects.',

  acceptance:
    '`<ProgressBar label="Uploading" value={64} />` shows "Uploading" with "64%" on the right and a 6px rail filled 64% in the accent colour; raising the value to 90 slides the fill smoothly over half a second. An indeterminate bar shows a glowing band crossing the rail left to right every 1.6s, with its glow spilling slightly above and below the rail but never past its ends. Rings show a clockwise arc from 12 o\'clock proportional to the value, and an indeterminate ring shows the spinner. Each exposes `role="progressbar"` with its name.',

  criticalRegion: 'critical',
};

export default meta;
