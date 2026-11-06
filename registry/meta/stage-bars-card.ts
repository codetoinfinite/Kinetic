/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Stage Bars Card" (boardui.com/components/stage-bars-card).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'stage-bars-card',
  title: 'Stage Bars Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'funnel', 'bar', 'stacked', 'dashboard', 'boardui'],
  blurb:
    'A funnel as rounded stage pills with value and share, optional stacked parts with a legend, stat tiles and a headline that follows hover.',
  cost: 'dom',
  motif: 'stack',

  files: [{ path: 'registry/ui/stage-bars-card.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'A dashboard card that lists funnel stages as rounded pills over the chart track: name on the left, value and share of the top stage on the right, a 14px icon at the start of each pill. The pills grow to their shares on mount and on every period change. Hovering, focusing or tapping a stage fades the others and swaps the count-up headline to that stage with its step conversion. With `stacked`, each pill splits into its breakdown parts with a legend, and hovering a part (or arrowing through it) shows that part\'s value and its share of the stage.',

  mechanism: [
    'The rows live in one CSS grid, `max-content | minmax(0,1fr) | max-content`, and every row is a `<button>` spanning it with `grid-cols-subgrid`. So the name column sizes to the longest stage name and all pills start on the same line.',
    'Each pill is an absolutely positioned span inside a `bg-chart-track` track. Its width is `share * 100%`, where share is `value / top` tweened by `useTweenedValues` (520ms ease-out cubic, from 0 on mount and from the current shares on a new period). With an icon, the pill keeps a 20px minimum so the icon always sits on colour.',
    'Stacked, the pill becomes a flex row with a 2px gap. Each part is `flex-basis: 0` with `flex-grow` set to its value, so the parts always fill exactly the pill. When a new period changes the mix, `flex-grow` moves through a 300ms CSS transition.',
    'The legend is built from the parts\' labels in first-seen order. Each series takes the next palette colour (lime, blue, purple, …) unless a part sets `color`. In mono, the series step down in opacity (1, 0.75, 0.5, floor 0.4) instead.',
    'The target is `{ stage, segment | null }`. Pointer enter and focus on a row set the stage; pointer enter on a part sets the part, and leaving it goes back to the stage. On a focused stacked row, ArrowRight/ArrowLeft walk through the parts and back to the whole stage. Click toggles a pin (`aria-pressed`) that holds the stage when nothing is hovered.',
    'The header shows the title, the top value and the delta chip at rest. A stage shows its name, its value and "58% of Sign-up" (step conversion) or "Top of funnel". A part shows "Sign-up · Paid", its value and "32% of Sign-up". The number counts up in a `<p>` keyed by the target, so the fade replays on every swap.',
    'Inactive rows and tiles fade to 0.4 and 0.45 opacity over 200ms. Within a hovered stacked row the other parts fade to 0.35, and the active fill switches to the darker `--color-chart-N-active` tone (text-primary in mono).',
  ],

  constants: [
    { name: 'pill', value: '20px tall (h-5), rounded-full, rows 28px + 4px gap', why: 'Matches the preview\'s pitch: six stages fit in about 190px, with room for a 14px icon and a hit area tall enough to hover.' },
    { name: 'ICON_PILL_MIN', value: '20px', why: 'A 3% stage would otherwise be a 7px sliver with its icon over the track; on the dark track the near-black icon would vanish.' },
    { name: 'tween', value: '520ms ease-out cubic, from 0 on mount', why: 'Shares are tweened rather than widths in px, so resizing the card never animates and a new period starts from wherever the bars are.' },
    { name: 'part transition', value: 'flex-grow, background-color and opacity over 300ms', why: 'Re-proportioning the parts at the same pace as the bar width keeps a period change reading as one motion.' },
    { name: 'monoOpacity', value: '1 − 0.25 × series index, floor 0.4', why: 'With one ink, stacked parts still need to read as different series; three steps stay apart on both themes.' },
    { name: 'tiles', value: '3 per row, 120px minimum', why: 'Six stages make two even rows, as in the preview; a 360px card wraps to two per row.' },
  ],

  pitfalls: [
    'Sizing stacked parts as percentages of the track. Their sum then drifts from the pill width as soon as the 2px gaps or the icon minimum come in. Flex-grow by value always fills the pill exactly.',
    'Putting the label, bar and numbers in separate flex rows. Each row then sizes its own name column and the pills start at different x positions. A shared grid with subgrid rows keeps one column for every row.',
    'Making stacked parts separate tab stops. Six stages × three parts is 18 stops; arrow keys on the focused stage reach the same detail with one stop per row.',
  ],

  notes: [
    '`PIPELINE_RANGES`, `BarStage`, `StageSegment` and `StageRange` are exported. Pass `stages` (and `delta`) for one static list without the period select.',
    'Stages share the funnel\'s shape (`label`, `value`, `color`) plus `icon` and `segments`, so the same data can drive the Funnel Chart Card.',
    'The frame, header, period select and stat tiles come from `funnel-chart-card-shell`.',
  ],

  apiSignature:
    'function StageBarsCard(props: { title?: string; ranges?: StageRange[]; stages?: BarStage[]; delta?: number; range?: string; defaultRange?: string; onRangeChange?: (id: string) => void; stacked?: boolean; mono?: boolean; showIcons?: boolean; formatValue?: (value: number) => string; className?: string }): JSX.Element\ntype BarStage = { label: string; value: number; color?: ChartColor; icon?: ReactNode; segments?: StageSegment[] }\ntype StageSegment = { label: string; value: number; color?: ChartColor }',

  props: [
    { name: 'title', type: 'string', default: '"Pipeline"', description: 'Header label while nothing is active; also the card\'s accessible name.' },
    { name: 'ranges', type: 'StageRange[]', default: 'PIPELINE_RANGES', description: 'Periods with their own stages, delta and optional headline. Two or more show the period select.' },
    { name: 'stages', type: 'BarStage[]', description: 'A single stage list, top first. Overrides `ranges` and hides the select.' },
    { name: 'delta', type: 'number', description: 'Headline chip percentage when `stages` is used.' },
    { name: 'range', type: 'string', description: 'Controlled period id.' },
    { name: 'defaultRange', type: 'string', default: 'first range id', description: 'Initial period when uncontrolled.' },
    { name: 'onRangeChange', type: '(id: string) => void', description: 'Called when the period select changes.' },
    { name: 'stacked', type: 'boolean', default: 'false', description: 'Splits each pill into its stage\'s `segments` and shows a legend. Tile swatches are hidden, since colour then means the part.' },
    { name: 'mono', type: 'boolean', default: 'false', description: 'One ink for every pill (secondary text colour, primary when active) and no tile swatches.' },
    { name: 'showIcons', type: 'boolean', default: 'true', description: 'Draws each stage\'s `icon` at the left end inside its pill.' },
    { name: 'formatValue', type: '(value: number) => string', default: 'en-US integer', description: 'Formats the headline, row values, tiles and the accessible labels.' },
    { name: 'className', type: 'string', description: 'Merged onto the card section.' },
  ],

  reducedMotion:
    '`useTweenedValues` is disabled, so the pills render at their final widths on mount and jump on a period change. The parts\' flex-grow/colour/opacity transitions and the row fades are removed with `motion-reduce:transition-none`. The headline count runs over 1ms, and the number fade is off.',

  cleanup:
    'The width tween and `useCountUp` cancel their animation frame on every new target and on unmount. Hover, pin and keyboard targets are plain React state; there are no listeners outside React.',

  acceptance:
    'The card shows "Pipeline", "1,180" and a lime "+2.4%" chip. Six rows follow: Visits 1,180 100%, Sign-up 790 67%, Active 460 39%, Pro 250 21%, Team 120 10% and Enterprise 40 3%, with lime, blue, purple, pink, yellow and emerald pills and icons. Six tiles sit three per row. Hovering Active fades the other rows and the header reads "Active", "460" and "58% of Sign-up". With "By channel", each pill splits into three parts with an Organic / Paid / Referral legend. Hovering Sign-up\'s second part reads "Sign-up · Paid", "253" and "32% of Sign-up". "Last 30 days" grows the pills and the headline counts to 4,820.',

  criticalRegion: 'critical',
};

export default meta;
