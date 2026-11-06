/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Sankey Chart Card" (boardui.com/components/sankey-chart-card).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'sankey-chart-card',
  title: 'Sankey Chart Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'sankey', 'flow', 'dashboard', 'svg', 'boardui'],
  blurb:
    'Source-to-sink flows as tinted SVG ribbons in a dashboard card: hover a node or ribbon to isolate its path while the headline follows.',
  cost: 'dom',
  motif: 'trail',

  files: [{ path: 'registry/ui/sankey-chart-card.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: [],

  summary:
    'A Sankey diagram in the BoardUI chart card shell. The layout is computed in the component: columns by link depth, nodes stacked to one shared scale, ribbons ordered so they only cross where the data does. Each ribbon takes its source node\'s colour, sources are labelled with name and value on the left, sinks with their share on the right. Hovering or focusing a node, or hovering a ribbon, lights the whole path through it, dims everything else and swaps the headline for that node or flow.',

  mechanism: [
    'Links reference nodes by name or index. Unknown references, self-links and non-positive values are dropped. Depths are relaxed across the links (a node sits one column right of its deepest source), with the passes capped at the node count so a cycle cannot loop forever.',
    'A node\'s value is the larger of its inflow and outflow. Each column needs `(height - 14px * (n - 1)) / sum` px per unit; the smallest of those is used for every column, so equal hours are equal heights everywhere. Each column is then centred vertically.',
    'Ribbons leave a source stacked in the vertical order of their targets and arrive at a target stacked in the order of their sources. Each is a filled path: two cubic Béziers whose control points sit at the horizontal midpoint, so the band keeps its thickness at both ends and eases between them.',
    'The chart width comes from `useResizeObserver`. The label gutters are `clamp(14% of width, 72, 96)` on the left and `clamp(26%, 104, 168)` on the right. Below 440px the labels drop to 12px names and the sink labels stack the share under the name.',
    'Hover is `{ kind: "node" | "link", index }`. `litPath` walks upstream and downstream from the node (or from the ribbon\'s two ends), collecting links and nodes. Lit ribbons go to 0.65 fill-opacity, the rest to 0.1 (0.4 at rest), and unlit nodes and labels fade over 200ms.',
    'The labels are absolutely positioned `<button>`s carrying a full description ("Focus: 32h, 37% of total. to Browsing 9h, …"), so keyboard and screen-reader users get every flow. Focus lights the same path as hover.',
    'A clipPath rect sweeps from the first column to the right edge over 800ms (ease-out cubic) on mount and on every period change. `useSweep` resets to 0 during render when the key changes, so no frame shows the old ribbons at full width.',
  ],

  constants: [
    { name: 'NODE_W', value: '12px, rx 3', why: 'Wide enough to read as a bar and to hover, narrow enough that the ribbons carry the picture.' },
    { name: 'NODE_GAP', value: '14px', why: 'At the default 340px height with seven sinks, this leaves 256px for 86h (about 3px per hour) and room for a two-line label beside a 7h node.' },
    { name: 'RIBBON', value: 'rest 0.4, lit 0.65, dim 0.1 fill-opacity', why: 'At rest overlaps stay readable; on hover the lit path stands out and the rest almost disappears without vanishing.' },
    { name: 'SWEEP_MS', value: '800ms ease-out cubic', why: 'The sweep reads as flow from sources to sinks. A new period redraws instead of morphing, because node order and counts can change between ranges.' },
    { name: 'COMPACT_W', value: '440px', why: 'Below it, "Everything else · 13%" no longer fits the right gutter on one line, so the share moves under a 12px name.' },
    { name: 'chartHeight', value: '340px', why: 'Matches the preview\'s proportion with seven sinks.' },
  ],

  pitfalls: [
    'Stroking a centre line with `stroke-width` for ribbons. The stroke keeps its width perpendicular to the curve, so on a slope the band visibly thins and the ends no longer match the node slices. Filled ribbons keep exact heights at both ends.',
    'Scaling each column to fill the height on its own. A column with fewer nodes would get a bigger px-per-unit than its neighbours, and ribbons would change thickness between columns.',
    'Sorting a node\'s outgoing ribbons by value instead of by target position. Ribbons then cross right next to the node and the diagram turns to noise.',
    'Leaving the old ribbons visible for a frame when the period changes. `useSweep` resets its progress during render, not in an effect.',
  ],

  notes: [
    'Pass `nodes` and `links` for one static data set (no period select), or `ranges` for a select. `TRACKED_TIME_RANGES`, `FlowNode`, `FlowLink` and `FlowRange` are exported.',
    'More than two columns work: middle nodes are labelled on their right with their share of the total. Labels of very small neighbouring nodes can overlap; raise `chartHeight` for dense columns.',
    'The frame, header and period select come from `funnel-chart-card-shell`.',
  ],

  apiSignature:
    'function SankeyChartCard(props: { title?: string; ranges?: FlowRange[]; nodes?: FlowNode[]; links?: FlowLink[]; delta?: number; range?: string; defaultRange?: string; onRangeChange?: (id: string) => void; formatValue?: (value: number) => string; sourceCaption?: string; targetCaption?: string; chartHeight?: number; className?: string }): JSX.Element\ntype FlowNode = { name: string; color?: ChartColor }\ntype FlowLink = { source: string | number; target: string | number; value: number }',

  props: [
    { name: 'title', type: 'string', default: '"Tracked time"', description: 'Header label while nothing is hovered; also the card\'s accessible name.' },
    { name: 'ranges', type: 'FlowRange[]', default: 'TRACKED_TIME_RANGES', description: 'Periods with their own nodes, links and optional delta/headline. Two or more show the period select.' },
    { name: 'nodes', type: 'FlowNode[]', description: 'Static nodes; used with `links` instead of `ranges`.' },
    { name: 'links', type: 'FlowLink[]', description: 'Static links `{ source, target, value }`, by node name or index.' },
    { name: 'delta', type: 'number', description: 'Headline chip percentage for static data.' },
    { name: 'range', type: 'string', description: 'Controlled period id.' },
    { name: 'defaultRange', type: 'string', default: 'first range id', description: 'Initial period when uncontrolled.' },
    { name: 'onRangeChange', type: '(id: string) => void', description: 'Called when the period select changes.' },
    { name: 'formatValue', type: '(value: number) => string', default: 'whole hours, e.g. "86h"', description: 'Formats the headline, the source labels and the screen-reader descriptions.' },
    { name: 'sourceCaption', type: 'string', default: '"Tracked time"', description: 'Caption under the left column.' },
    { name: 'targetCaption', type: 'string', default: '"Share of tracked time"', description: 'Caption under the right column.' },
    { name: 'chartHeight', type: 'number', default: '340', description: 'Chart height in px.' },
    { name: 'className', type: 'string', description: 'Merged onto the card section.' },
  ],

  reducedMotion:
    '`useSweep` is disabled, so the ribbons are drawn in full at once on mount and on a period change. The headline count runs over 1ms, and the opacity transitions and number fade are removed with `motion-reduce:` variants.',

  cleanup:
    'The sweep\'s and the count-up\'s animation frames are cancelled on every restart and on unmount. `useResizeObserver` unobserves the chart box on unmount.',

  acceptance:
    'The card reads "Tracked time" and "86h" with a "This week" select. Sources Focus 32h (emerald), Meetings 18h (purple), Breaks 12h (yellow), Admin 14h (blue) and Learning 10h (pink) sit on the left. On the right are grey sinks Browsing · 22%, Writing · 18%, Messaging · 13%, Productivity · 12%, Email · 8%, Video calls · 14% and Everything else · 13%. Hovering Focus dims the other sources\' ribbons and the header shows "Focus", "32h" and "37% of total". Hovering a ribbon shows e.g. "Focus → Browsing". Choosing "Last week" redraws the ribbons with a sweep, and the headline becomes 79h.',

  criticalRegion: 'critical',
};

export default meta;
