/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Radial Chart Card" (boardui.com/components/radial-chart-card).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'radial-chart-card',
  title: 'Radial Chart Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'radial', 'rings', 'gauge', 'dashboard', 'boardui'],
  blurb:
    'Concentric radial bars in the dashboard card shell, with a tooltip on the arc tip, a count-up headline that follows hover, and stat tiles.',
  cost: 'dom',
  motif: 'rings',

  files: [{ path: 'registry/ui/radial-chart-card.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: [],

  summary:
    'A dashboard card that draws one rounded arc per item over its own track ring, smallest item innermost, every arc starting at twelve o\'clock and running clockwise. The arcs sweep in on mount and to their new lengths on every period or look change. Hovering, focusing or tapping a ring darkens it one tone, fades the others, floats a tooltip on the arc\'s tip and swaps the count-up headline to that item. Four looks come from one prop: plain rings, names set along each arc, rings over a circular grid, and a single gauge of the total against a goal with the percentage in the centre.',

  mechanism: [
    'The chart is an inline SVG drawn 1:1 in a 216px square. `layoutRings` puts the outermost ring flush with the edge (radius 108 − 2 − stroke/2) and steps inwards by the pitch (stroke + gap, 8 + 4 for rings). If the rings would come closer than 26px to the centre, the pitch shrinks to fit.',
    'Each arc is a `<circle>` rotated −90° about the centre, with `pathLength=100` and `strokeLinecap="round"`. Its dash is just `fraction × 100`, so no arc maths is needed. The fraction is `value / max`, where max defaults to the largest item ÷ 0.9, so the biggest ring sweeps 324°.',
    'The fractions go through `useTweenedValues`: a 520ms ease-out cubic tween that starts from 0 on mount and from the current sweeps on a new period or look. So the arcs grow, shrink and re-proportion in one motion.',
    'Each ring is a `<g role="button" tabIndex=0>` holding the track, the arc, an optional name and a transparent hit circle as wide as the pitch, so the gaps between rings still hover. Pointer enter and focus set the active ring, click or Enter/Space toggle a pin (`aria-pressed`), and leaving the square clears the hover.',
    'The active arc switches to the darker `--color-chart-N-active` tone. The other arcs fade to 0.3 opacity over 200ms, and so do the stat tiles (to 0.45). A keyboard focus also draws a focus-ring halo under that ring.',
    'The tooltip is a plain absolutely positioned div. It sits on the arc\'s tip, at `(C + r·cos θ, C + r·sin θ)` with θ = fraction × 2π − π/2. Its x is clamped 52px inside the square so it never clips, and it is lifted 10px above the tip.',
    'The `labels` look writes each name in 8px white type on a `<textPath>` that follows a closed circle path starting at twelve o\'clock. A name only shows once its arc is longer than the text (about 4.9px per character plus 10px of padding and the stroke), so short arcs never spill their label.',
    '`gauge` folds the items into one ring of their total against the range\'s `goal` (or `max`), with the percentage and a caption in the centre. Its tiles show the total, the goal and what is still to go.',
  ],

  constants: [
    { name: 'SIZE', value: '216px square, drawn 1:1', why: 'Matches the preview\'s ring diameter, and keeps tooltip positions in plain CSS px with no viewBox scaling.' },
    { name: 'LOOKS', value: 'rings 8/4, labels 12/2, grid 8/4 without track, gauge 16 (stroke/gap px)', why: 'Five rings fit with a 50px hole on the plain look. The labelled look needs a 12px band for 8px type.' },
    { name: 'HEADROOM', value: '0.9', why: 'The largest item sweeps 324° instead of a closed circle, so every ring still shows where it ends.' },
    { name: 'MIN_HOLE', value: '26px', why: 'With many items the pitch shrinks so the innermost ring never collapses into the centre.' },
    { name: 'TIP_INSET', value: '52px', why: 'Keeps the roughly 110px-wide tooltip inside the chart square at the ring\'s far left or right.' },
    { name: 'tween', value: '520ms ease-out cubic (useTweenedValues)', why: 'Sweeps are tweened as fractions, so a period or look change starts from wherever the arcs are.' },
  ],

  pitfalls: [
    'Drawing arcs with SVG `A` commands. A full or near-full sweep then needs special cases, because start and end coincide. A rotated circle with `pathLength=100` and a dash covers 0–100% with one formula.',
    'Hit-testing only the visible stroke. The 4px gaps between rings then flicker the hover off as the pointer crosses them. A transparent stroke as wide as the pitch makes the whole band one target.',
    'Showing ring names regardless of arc length. The name of a short arc then runs on past its end over the bare track. Hide it until the arc is longer than the text.',
  ],

  notes: [
    '`RADIAL_RANGES`, `RadialItem`, `RadialRange` and `RadialVariant` are exported. Pass `items` (and `delta`) for one static list without the period select.',
    '`showCenter` writes the active item\'s value (or the total) in the hole of the ring looks.',
    'The frame, header, period select and stat tiles come from `funnel-chart-card-shell`.',
  ],

  apiSignature:
    'function RadialChartCard(props: { title?: string; variant?: "rings" | "labels" | "grid" | "gauge"; ranges?: RadialRange[]; items?: RadialItem[]; delta?: number; max?: number; range?: string; defaultRange?: string; onRangeChange?: (id: string) => void; tiles?: boolean; showCenter?: boolean; gaugeCaption?: string; formatValue?: (value: number) => string; className?: string }): JSX.Element\ntype RadialItem = { label: string; value: number; color?: ChartColor }\ntype RadialRange = { id: string; label: string; items: RadialItem[]; delta?: number; goal?: number }',

  props: [
    { name: 'title', type: 'string', default: '"Visitors"', description: 'Header label while nothing is active. Also the gauge\'s item name and the card\'s accessible name.' },
    { name: 'variant', type: '"rings" | "labels" | "grid" | "gauge"', default: '"rings"', description: 'Plain rings, names along each arc, rings over a circular grid, or one total against a goal.' },
    { name: 'ranges', type: 'RadialRange[]', default: 'RADIAL_RANGES', description: 'Periods with their own items, delta and goal. Two or more show the period select.' },
    { name: 'items', type: 'RadialItem[]', description: 'A single item list, innermost first. Overrides `ranges` and hides the select.' },
    { name: 'delta', type: 'number', description: 'Headline chip percentage when `items` is used.' },
    { name: 'max', type: 'number', default: 'largest ÷ 0.9 (rings), range goal (gauge)', description: 'The value of a full circle.' },
    { name: 'range', type: 'string', description: 'Controlled period id.' },
    { name: 'defaultRange', type: 'string', default: 'first range id', description: 'Initial period when uncontrolled.' },
    { name: 'onRangeChange', type: '(id: string) => void', description: 'Called when the period select changes.' },
    { name: 'tiles', type: 'boolean', default: 'true', description: 'Stat tiles under the chart, three per row; hovering one focuses its ring.' },
    { name: 'showCenter', type: 'boolean', default: 'false', description: 'Shows the active value (or the total) in the hole of the ring looks.' },
    { name: 'gaugeCaption', type: 'string', default: '"of goal"', description: 'Caption under the gauge\'s centre percentage.' },
    { name: 'formatValue', type: '(value: number) => string', default: 'en-US integer', description: 'Formats the headline, tooltip, tiles and the accessible labels.' },
    { name: 'className', type: 'string', description: 'Merged onto the card section.' },
  ],

  reducedMotion:
    '`useTweenedValues` is disabled, so the arcs render at their final sweeps and jump on a change. The stroke/opacity fades on arcs and names use `motion-reduce:transition-none`. The headline count runs over 1ms, and the number fade is off.',

  cleanup:
    'The sweep tween and the headline\'s `useCountUp` cancel their animation frame on every new target and on unmount. Hover, focus and pin are plain React state on SVG elements, with no document listeners.',

  acceptance:
    'The card shows "Visitors", "925", a lime "+5.2%" chip and a "Last 7 days" select. Five rings follow, from the inside out: Other (lime), Edge (blue), Firefox (purple), Safari (pink) and Chrome (yellow), with Chrome sweeping about 324°. Five tiles sit three per row, the last row stretched. Hovering the Chrome ring fades the others, shows a tooltip "Chrome 275 30%" at its tip, and the header reads "Chrome", "275" and "30% of total". The Labels look writes each name along its arc. The Gauge look shows one ring with "62%" over "of goal" and tiles for Visitors 925, Goal 1,500 and To go 575. "Last 30 days" sweeps the arcs to the new values, and the headline counts to 4,005.',

  criticalRegion: 'critical',
};

export default meta;
