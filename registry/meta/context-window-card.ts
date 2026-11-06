/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Context Window Card" (boardui.com/).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'context-window-card',
  title: 'Context Window Card',
  category: 'display',
  kit: 'boardui',
  tags: ['usage', 'tokens', 'context-window', 'meter', 'agent', 'boardui'],
  blurb:
    'An agent\'s context window as one thin segmented bar by category, with a disclosable legend of token counts and shares.',
  cost: 'css',
  motif: 'split',

  files: [
    {
      path: 'registry/ui/context-window-card.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: [],

  summary:
    'A small usage tile that shows how much of a model\'s context window is taken and by what. Each category (messages, tools, memory, system prompt) is a coloured segment on a 4px track, and whatever is left of the track is the free space. A chevron next to the totals opens a legend with each category\'s tokens and share, and hovering a row or a segment dims the rest so the pair reads together.',

  mechanism: [
    'Sum the segment tokens, clamped to `capacity`, as `used`; `free = capacity − used`; the header prints `formatTokens(used) / formatTokens(capacity) (pct%)` with the percentage in the semibold primary style.',
    'Compute each segment\'s width as its share of the WHOLE window (`tokens / capacity × 100%`), walking a `remaining` budget so an over-full list never paints past the track. Draw them left to right in a `flex h-1 gap-px overflow-hidden rounded-full bg-chart-track` row, so the empty track on the right is the free space with no element of its own.',
    'Give the bar `role="meter"` with `aria-valuemin`, `aria-valuemax=capacity`, `aria-valuenow=used` and an `aria-valuetext` like "820k of 1M tokens used (82%)". The segments themselves are decorative.',
    'The header totals are a `<button aria-expanded aria-controls>` that toggles the legend (controlled `expanded` or uncontrolled `defaultExpanded`). The legend collapses with a `grid-rows-[0fr] → [1fr]` transition plus opacity, and is `inert` while closed so its rows leave the tab and reading order.',
    'One `active` id is shared by the segments and the legend rows: `pointerenter` sets it, `pointerleave` clears it, and every other segment drops to 35% opacity (rows to 60%) while the active row gets the hover surface.',
    'Segment widths transition over 500ms ease-out, so adding or compacting tokens visibly grows or shrinks the bar. `children` render below an `<hr>` divider, which is how plan limits share the same tile.',
  ],

  constants: [
    {
      name: 'bar height',
      value: 'h-1 (4px) with gap-px between segments',
      why: 'Matches the hairline bar on BoardUI\'s Agent limits tile. The 1px gap is what keeps seven adjacent colours readable as separate categories without outlines.',
    },
    {
      name: 'width transition',
      value: '500ms ease-out',
      why: 'Long enough to read a compaction as the bar draining, short enough that a fast run of turns does not lag behind the totals in the header.',
    },
    {
      name: 'dim opacity',
      value: 'segments 35%, legend rows 60%',
      why: 'The thin bar needs a stronger drop than the text rows for the highlighted segment to pop; rows keep 60% so their numbers stay legible.',
    },
    {
      name: 'compact format',
      value: '≥1M → one decimal M (trailing .0 dropped), ≥1k → rounded k',
      why: 'Gives "820k / 1M" exactly as on the tile; decimals in k would make the header jitter on every turn.',
    },
  ],

  pitfalls: [
    'Sizing segments as a share of `used` instead of `capacity`. The bar then always looks full and the free space disappears.',
    'Rendering a separate "free" segment. The track already is the free space, and an extra element breaks the 1px gap rhythm at the end.',
    'Hiding the collapsed legend with `height: 0` alone. Its rows stay focusable and announced; `inert` on the wrapper is what removes them.',
    'Animating `flex-grow` instead of `width`. Grow values are relative to each other, so one segment changing reflows all the others in the same frame.',
  ],

  notes: [
    '`formatTokensCompact` is exported so surrounding UI (a composer badge, a toast) can print counts the same way.',
    'Colours come from the kit chart palette (`bg-chart-1…9`) plus `bg-accent-500` for the leading blue, so both themes are handled by the token sheet.',
  ],

  apiSignature:
    'function ContextWindowCard(props: { segments: ContextSegment[]; capacity: number; label?: ReactNode; freeLabel?: string; expanded?: boolean; defaultExpanded?: boolean; onExpandedChange?: (expanded: boolean) => void; formatTokens?: (tokens: number) => string; children?: ReactNode; className?: string }): JSX.Element\ntype ContextSegment = { id: string; label: string; tokens: number; color?: "blue" | "purple" | "pink" | "yellow" | "green" | "sky" | "teal" | "indigo" | "lime" }\nfunction formatTokensCompact(tokens: number): string',

  props: [
    { name: 'segments', type: 'ContextSegment[]', description: 'Category usage drawn left to right: id, label, tokens and a palette colour.' },
    { name: 'capacity', type: 'number', description: 'Window size in tokens. Segment widths are shares of this, the rest is free track.' },
    { name: 'label', type: 'ReactNode', default: '"Context window"', description: 'Header label; also the meter\'s accessible name when it is a string.' },
    { name: 'freeLabel', type: 'string', default: '"Free space"', description: 'Legend label for the unused remainder.' },
    { name: 'expanded', type: 'boolean', description: 'Controlled legend state.' },
    { name: 'defaultExpanded', type: 'boolean', default: 'false', description: 'Uncontrolled legend state on mount.' },
    { name: 'onExpandedChange', type: '(expanded: boolean) => void', description: 'Called when the header toggle is pressed.' },
    { name: 'formatTokens', type: '(tokens: number) => string', default: 'formatTokensCompact', description: 'Formats every count in the header and legend.' },
    { name: 'children', type: 'ReactNode', description: 'Rows rendered under a divider in the same tile (plan limits, actions).' },
    { name: 'className', type: 'string', description: 'Merged onto the card surface.' },
  ],

  reducedMotion:
    'Segment width, legend open/close and chevron rotation transitions carry `motion-reduce:transition-none`, so the bar and legend jump straight to their new state. Hover dimming still applies because it carries meaning, not motion.',

  cleanup:
    'Nothing to clean up: two pieces of React state, pointer handlers on rendered elements, and CSS transitions that end on their own.',

  acceptance:
    'The header reads "820k / 1M (82%)" for the demo data and the bar fills 82% of its track in seven colours with 1px gaps. Pressing the header toggle flips aria-expanded and shows or hides the legend; when hidden, Tab skips its rows. Hovering "System tools" in the legend dims every other segment. "Add a turn" grows the blue segment and the totals; "Compact" shrinks it back with an eased width change.',

  criticalRegion: 'critical',
};

export default meta;
