/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Funnel Chart Card" (boardui.com/components/funnel-chart-card).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'funnel-chart-card',
  title: 'Funnel Chart Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'funnel', 'conversion', 'dashboard', 'svg', 'boardui'],
  blurb:
    'A horizontal conversion funnel: tapered SVG bands per stage with share pills, stat tiles and a headline that follows the hovered stage.',
  cost: 'dom',
  motif: 'split',

  files: [
    { path: 'registry/ui/funnel-chart-card.tsx', type: 'registry:ui', role: 'component' },
    { path: 'registry/ui/funnel-chart-card-shell.tsx', type: 'registry:ui', role: 'chart card shell: frame, header, period select, stat tiles, palette, tween hook' },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'A dashboard card that draws a conversion funnel left to right. Every stage is a column whose band is sized to its share of the top stage and eases into the next stage\'s height, with a white share pill in the middle and a stat tile underneath. Hovering, focusing or tapping a stage dims the others, darkens it one tone and swaps the count-up headline for that stage\'s count with its step conversion from the stage before. A period select swaps the data and the bands re-grow from their old shape.',

  mechanism: [
    'Each stage is a `<button>` in a flex row (`gap-0.5`, so the card surface shows as a 2px seam between columns). Inside it an absolutely positioned SVG uses `viewBox="0 0 100 {chartHeight}"` with `preserveAspectRatio="none"`: vertical units are pixels, horizontal units are 0-100 of the column, so the band stretches with the card while its heights stay exact.',
    'Shares (`value / top`) go through `useTweenedValues`, a rAF tween with ease-out cubic over 520ms that starts from zeros on mount and from the current shares on every period change. Heights are `max(2, share * (chartHeight - 24))`, centred on `chartHeight / 2`.',
    '`bandPath(h0, h1)` draws one column from its own height to the next stage\'s. Curved: flat to x=50, then two cubic Béziers with both control points at x=75 (horizontal tangents at both ends), so the edge is an S-curve. Sharp: a plain trapezoid. The last column uses its own height for both ends, so it runs flat.',
    'Curved columns paint two halo copies of the band first, grown by 12px and 6px per side at 0.16 and 0.32 opacity, then the core. Sharp columns instead paint a 36px track rect at 0.18 opacity, so stages near 0% still have a visible lane.',
    'The active stage is `hovered ?? pinned`. Pointer enter and focus set `hovered`; pointer leave and blur clear it; click toggles `pinned` (`aria-pressed`). Inactive columns and tiles fade to opacity 0.35 / 0.45 over 200ms, and the active core switches from `--color-chart-N` to `--color-chart-N-active`.',
    'The header shows the title, `headline ?? top` and a lime/rose delta chip. With a stage active it shows the stage label, its value and a neutral chip reading "56% of Link opened" (step conversion) or "Top of funnel". The number counts through `useCountUp` (320ms) inside a `<p>` keyed by the active index, so the fade replays per swap.',
    'Under the chart, `StatTiles` lays out one white tile per stage with a 2.5 swatch, label and value. Tiles take `flex-basis: calc((100% - gaps) / columns)` with a 120px minimum and `grow`, so a 360px card wraps to two per row. Hovering a tile sets the same active stage.',
  ],

  constants: [
    { name: 'EDGE / halo layers', value: '12px; layers +12px @ 0.16 and +6px @ 0.32', why: 'Leaves 136px of core in the default 160px chart, and the two soft layers give the curved shape its layered edge without a stroke.' },
    { name: 'FLAT', value: '50 (of 100 column units)', why: 'The band holds its height for the first half of its column, so the share pill always sits on a flat stretch, then eases into the next stage across the second half.' },
    { name: 'SHARP_TRACK', value: '36px at 0.18 opacity', why: 'Sharp trapezoids of 1% stages collapse to a line; the track keeps a lane to hover and read.' },
    { name: 'MIN_CORE', value: '2px', why: 'A stage with a tiny share still draws a visible line instead of vanishing.' },
    { name: 'tween', value: '520ms ease-out cubic, from 0 on mount', why: 'Long enough to read as growth, short enough that switching periods feels immediate. Shares are tweened rather than heights so `chartHeight` changes never animate.' },
    { name: 'dim opacity', value: 'columns 0.35, tiles 0.45, 200ms', why: 'Pushes the other stages back without hiding them, so the active stage still reads in context.' },
  ],

  pitfalls: [
    'Using `preserveAspectRatio` other than `"none"`. The viewBox is 100 units wide but the column is not, so a uniform scale letterboxes the band and the columns stop meeting at their edges.',
    'Putting the share pill inside the SVG. With a non-uniform scale the text would stretch. The pill is an HTML span centred over the column.',
    'Tweening the path strings or the pixel heights. Interpolating shares keeps the shape correct at every frame and lets a new period start from wherever the previous tween had got to.',
    'Expecting Recharts\' `<Funnel>`: it stacks vertical trapezoids and cannot draw the eased horizontal taper.',
  ],

  notes: [
    '`SIGNUP_FUNNEL_RANGES`, `FunnelStage`, `FunnelRange` and `FunnelShape` are exported. Pass `stages` (and `delta`) for a single static funnel without the period select.',
    'The shell companion (`ChartCardFrame`, `ChartCardHeader`, `PeriodSelect`, `StatTiles`, `CHART_COLORS`, `useTweenedValues`) is shared by the other BoardUI chart cards in this batch.',
  ],

  apiSignature:
    'function FunnelChartCard(props: { title?: string; ranges?: FunnelRange[]; stages?: FunnelStage[]; delta?: number; range?: string; defaultRange?: string; onRangeChange?: (id: string) => void; shape?: "curved" | "sharp"; mono?: boolean; chartHeight?: number; className?: string }): JSX.Element\ntype FunnelStage = { label: string; value: number; color?: ChartColor }\ntype FunnelRange = { id: string; label: string; stages: FunnelStage[]; delta?: number; headline?: number }',

  props: [
    { name: 'title', type: 'string', default: '"Sign-up funnel"', description: 'Header label while no stage is active; also the card\'s accessible name.' },
    { name: 'ranges', type: 'FunnelRange[]', default: 'SIGNUP_FUNNEL_RANGES', description: 'Periods with their own stages and delta. Two or more show the period select.' },
    { name: 'stages', type: 'FunnelStage[]', description: 'A single funnel, top stage first. Overrides `ranges` and hides the select.' },
    { name: 'delta', type: 'number', description: 'Headline chip percentage when `stages` is used.' },
    { name: 'range', type: 'string', description: 'Controlled period id.' },
    { name: 'defaultRange', type: 'string', default: 'first range id', description: 'Initial period when uncontrolled.' },
    { name: 'onRangeChange', type: '(id: string) => void', description: 'Called when the period select changes.' },
    { name: 'shape', type: '"curved" | "sharp"', default: '"curved"', description: 'Eased taper with layered halo, or plain trapezoids over a faint track.' },
    { name: 'mono', type: 'boolean', default: 'false', description: 'Paints every stage in the secondary text colour (primary when active) and hides tile swatches.' },
    { name: 'chartHeight', type: 'number', default: '160', description: 'Chart height in px including the 12px halo above and below.' },
    { name: 'className', type: 'string', description: 'Merged onto the card section.' },
  ],

  reducedMotion:
    '`useTweenedValues` is disabled, so the bands render at their final shares on mount and jump on a period change. The headline count runs over 1ms (a single frame), the number fade and the opacity/fill transitions are removed with `motion-reduce:` variants.',

  cleanup:
    'The tween and `useCountUp` cancel their pending animation frame on every new target and on unmount. Hover state is plain React state; the Select\'s outside-press listener is removed by the Select itself when it closes or unmounts.',

  acceptance:
    'The card shows "Sign-up funnel", "197" and a lime "+5.2%" chip, four columns (lime, blue, purple, pink) with pills 100%, 56%, 39%, 19%, and tiles Link opened 197, Started 110, Completed 77, Converted 38. Hovering Started dims the other columns and tiles, and the header reads "Started", "110" and "56% of Link opened". Choosing "Last 30 days" re-grows the bands and the headline counts to 842. Clicking a stage sets its aria-pressed to true; clicking again clears it.',

  criticalRegion: 'critical',
};

export default meta;
