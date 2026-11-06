/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Speedometer Chart Card" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'speedometer-chart-card',
  title: 'Speedometer Chart Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'gauge', 'speedometer', 'needle', 'dashboard', 'boardui'],
  blurb:
    'A 220° half gauge in the dashboard card shell: stacked segments with the main share in the centre, or a value arc and needle.',
  cost: 'dom',
  motif: 'rings',

  files: [{ path: 'registry/ui/speedometer-chart-card.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: [],

  summary:
    'A dashboard card with a half gauge that opens at the bottom. The `segments` look stacks one round-capped segment per item around a gray track, with a small gap between neighbours, and writes the primary item\'s share in the centre ("47%" over "Desktop"). The segments sweep in from the left end on mount and re-proportion on a period change. Hovering, focusing or tapping a segment darkens it one tone, fades the others, swaps the count-up headline to that item and moves the centre to its share; a click or Enter makes it the primary. The `needle` look draws one value arc in the item\'s colour over a tick scale, with a needle that swings to every new value, the value under the hub and min/max labels at the arc ends.',

  mechanism: [
    'The gauge is an inline SVG drawn 1:1 in a 280 × 212 box, centred on (140, 134) with a 110px radius. Angles run clockwise from twelve o\'clock, from −110° to +110° (a 220° sweep), and `polar(θ, r)` maps them to `(140 + r·sin θ, 134 − r·cos θ)`. `arcPath` writes one SVG `A` command between two angles, with the large-arc flag set past 180°.',
    'For `segments`, the items become cumulative boundaries (0..1 of the total) that go through `useTweenedValues`, a 520ms ease-out cubic tween from 0 on mount and from the current boundaries on a period change. `layoutSegments` turns them into angles: a 6px gap (6/110 rad) between neighbours, scaled by the last boundary so the gaps open as the gauge sweeps in, and the rest of the sweep shared by value.',
    'Each segment path is inset by the round cap\'s half-width (14/110 rad) at both ends, so the caps land exactly on the segment\'s extent and the gaps stay clean. The gray track is inset the same way, so no track shows past the first and last segments. A segment too short for its two caps becomes a dot centred on its extent, as wide as the extent (at least 4px).',
    'Each segment is a `<g role="button" tabIndex=0 aria-pressed>`. Pointer enter and focus set the active item, leaving the gauge or blurring clears it, and click or Enter/Space call `onPrimaryChange` (or set the uncontrolled primary). The active segment switches to the darker `--color-chart-N-active` tone, the others fade to 0.35 opacity over 200ms, and a keyboard focus draws a focus-ring halo under the segment.',
    'The centre is an HTML overlay over the SVG with `aria-live="polite"`. It shows the share of the hovered item, or else the primary item, in `text-display-4`, and remounts on every change so the shell\'s number fade plays. The header shows the total and the delta chip at rest; on hover it shows the item, its value and "x% of total".',
    'For `needle`, the value is the `value` prop or else the shown item\'s share in percent, mapped to 0..1 of `min`..`max`. The fraction goes through `useTweenedValues` over 700ms. The value arc runs from the left end to the needle angle in the shown item\'s colour, and the needle polygon is drawn pointing up and rotated about the hub by that angle, so the arc and the needle move together. Eleven ticks mark every 10% (the 0, 50 and 100% ticks are longer), and the min/max labels sit under the arc ends.',
  ],

  constants: [
    { name: 'W × H', value: '280 × 212px, centre (140, 134), radius 110', why: 'Drawn 1:1 so the centre overlay is placed in plain CSS px with no viewBox scaling, and the arc ends and their labels fit under the hub.' },
    { name: 'START / SWEEP', value: '−110° / 220°', why: 'Opens the gauge at the bottom like the preview, with room for the centre value inside the arc.' },
    { name: 'SEG_STROKE / NEEDLE_STROKE', value: '28px / 16px', why: 'Thick segments read as a stacked gauge; the needle look uses a thinner band so the ticks and needle stay the focus.' },
    { name: 'GAP_PX', value: '6px', why: 'A visible break between round-capped neighbours. It is scaled by the sweep progress so it does not show before the gauge fills.' },
    { name: 'NEEDLE_MS', value: '700ms ease-out cubic', why: 'Slower than the 520ms segment tween, so the needle reads as a swing rather than a jump.' },
  ],

  pitfalls: [
    'Drawing round-capped segments edge to edge. The caps then overlap the neighbours by half the stroke on each side. Inset each path by the cap\'s half-width so the visible extent is exactly the segment.',
    'Opening the gaps from the first frame. On mount every segment then starts as a dot at its gap position. Scaling the gap with the last boundary makes the whole gauge sweep in from one end.',
    'Rotating the needle with a CSS transition while the arc is tweened in JS. The two then drift apart mid-swing. Drive both from the same tweened fraction.',
  ],

  notes: [
    '`SPEEDOMETER_RANGES`, `GaugeItem`, `GaugeRange` and `SpeedometerVariant` are exported. Pass `items` (and `delta`) for one static list without the period select.',
    'Pass `value` with `min`/`max` to use the needle look as a plain gauge for any number, and `formatGaugeValue` for the units.',
    'The frame, header, period select and stat tiles come from `funnel-chart-card-shell`.',
  ],

  apiSignature:
    'function SpeedometerChartCard(props: { title?: string; variant?: "segments" | "needle"; ranges?: GaugeRange[]; items?: GaugeItem[]; delta?: number; range?: string; defaultRange?: string; onRangeChange?: (id: string) => void; primary?: number; defaultPrimary?: number; onPrimaryChange?: (index: number) => void; value?: number; min?: number; max?: number; formatGaugeValue?: (value: number) => string; gaugeLabel?: string; tiles?: boolean; formatValue?: (value: number) => string; className?: string }): JSX.Element\ntype GaugeItem = { label: string; value: number; color?: ChartColor }\ntype GaugeRange = { id: string; label: string; items: GaugeItem[]; delta?: number }',

  props: [
    { name: 'title', type: 'string', default: '"Visitors"', description: 'Header label while nothing is hovered, and the card\'s accessible name.' },
    { name: 'variant', type: '"segments" | "needle"', default: '"segments"', description: 'Stacked segments with the primary share in the centre, or one value arc with a needle.' },
    { name: 'ranges', type: 'GaugeRange[]', default: 'SPEEDOMETER_RANGES', description: 'Periods with their own items and delta. Two or more show the period select.' },
    { name: 'items', type: 'GaugeItem[]', description: 'A single item list. Overrides `ranges` and hides the select.' },
    { name: 'delta', type: 'number', description: 'Headline chip percentage when `items` is used.' },
    { name: 'range', type: 'string', description: 'Controlled period id.' },
    { name: 'defaultRange', type: 'string', default: 'first range id', description: 'Initial period when uncontrolled.' },
    { name: 'onRangeChange', type: '(id: string) => void', description: 'Called when the period select changes.' },
    { name: 'primary', type: 'number', description: 'Controlled index of the item the centre and the needle report while nothing is hovered.' },
    { name: 'defaultPrimary', type: 'number', default: '0', description: 'Initial primary index when uncontrolled.' },
    { name: 'onPrimaryChange', type: '(index: number) => void', description: 'Called when a segment is clicked or pressed with Enter/Space.' },
    { name: 'value', type: 'number', description: 'Needle value. Defaults to the shown item\'s share of the total in percent.' },
    { name: 'min', type: 'number', default: '0', description: 'Needle scale start.' },
    { name: 'max', type: 'number', default: '100', description: 'Needle scale end.' },
    { name: 'formatGaugeValue', type: '(value: number) => string', default: '`${Math.round(v)}%`', description: 'Formats the centre value and the min/max labels.' },
    { name: 'gaugeLabel', type: 'string', default: 'shown item\'s name', description: 'Caption under the centre value.' },
    { name: 'tiles', type: 'boolean', default: 'true', description: 'Stat tiles under the gauge, three per row; hovering one focuses its segment.' },
    { name: 'formatValue', type: '(value: number) => string', default: 'en-US integer', description: 'Formats the headline, tiles and the segments\' accessible labels.' },
    { name: 'className', type: 'string', description: 'Merged onto the card section.' },
  ],

  reducedMotion:
    '`useTweenedValues` is disabled for both looks, so the segments render at their final extents and the needle sits at its value, jumping on a change. The stroke/opacity fades use `motion-reduce:transition-none`, and the centre number fade is off (`motion-reduce:animate-none`).',

  cleanup:
    'The segment and needle tweens and the headline\'s count-up cancel their animation frame on every new target and on unmount. Hover, focus and the primary are plain React state on SVG elements, with no document listeners.',

  acceptance:
    'The card shows "Visitors", "2,500", a lime "+5.2%" chip and a "Last 7 days" select. Under it is a half gauge with lime, blue, purple and pink segments (Desktop, Mobile, Tablet, TV) separated by small gaps, with "47%" over "Desktop" in the centre, and four tiles: Desktop 1,180, Mobile 620, Tablet 380 and TV 320. Hovering the Mobile tile fades the other segments and tiles, the header reads "Mobile", "620" and "25% of total", and the centre reads "25%" over "Mobile". In the Needle look the needle and a lime arc point at 47%, "0%" and "100%" sit under the arc ends, and picking Mobile swings the needle back to 25%. "Last 30 days" re-proportions the segments, and the headline counts to 10,000.',

  criticalRegion: 'critical',
};

export default meta;
