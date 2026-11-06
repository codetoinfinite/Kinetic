import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'context-usage-ring',
  title: 'Context Usage Ring',
  category: 'display',
  kit: 'boardui',
  tags: ['chat', 'context', 'tokens', 'progress', 'tooltip', 'boardui'],
  blurb:
    'Small ring and percentage for how full a chat context window is. Turns orange, then rose, near the limit; a tooltip breaks the tokens down.',
  cost: 'dom',
  motif: 'rings',

  files: [
    {
      path: 'registry/ui/context-usage-ring.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['react-aria-components@^1.22.1'],

  summary:
    'A compact pill for a chat header or status bar that shows how much of the model\'s context window is in use. A 16px ring fills clockwise next to the percentage, and the pill moves from neutral to orange to rose as the window fills. Hovering or focusing it opens the kit tooltip with used and total tokens, a stacked bar, a per-source list and a "Free" row.',

  mechanism: [
    '`ratio = clamp(used / limit, 0, 1)` and `pct = round(ratio * 100)`. `contextLevel(ratio, warnAt, dangerAt)` returns `"normal"`, `"warning"` (from 0.75) or `"danger"` (from 0.9), and the level picks the pill and arc classes from `LEVEL_STYLE`.',
    'The ring is two SVG circles with `pathLength={100}`, rotated -90deg so it starts at 12 o\'clock. The track uses the quaternary icon colour. The arc is `strokeDasharray="{pct} 100"`, so the dash length is the percentage with no circumference maths. It is hidden at 0% because a round cap on a zero-length dash still draws a dot.',
    'Arc length and colour animate together with `transition-[stroke-dasharray,color] duration-300 ease-out`, and the pill background and text animate with `transition-colors`. A new token count slides the arc forward and crossing a threshold fades the colour.',
    'The pill is a React Aria `Button` wrapped in the kit `TooltipTrigger`, so the tooltip opens on hover and on keyboard focus. The button\'s accessible name is "Context window N% used", and it carries `data-level` for styling and tests.',
    'Inside the tooltip, each `breakdown` slice gets a width of `tokens / limit` in a flex bar on the track colour, so the empty tail of the bar is the free space. The list repeats the slices with a dot in the same tone and ends with a "Free" row of `limit - used`. Above the warning threshold a one-line note explains what happens next.',
  ],

  constants: [
    {
      name: 'warnAt / dangerAt',
      value: '0.75 / 0.9',
      why: 'Orange at three quarters leaves room for a couple of large file reads before the window is full. Rose at 90% is roughly the point where a long reply or one more file forces older turns out.',
    },
    {
      name: 'ring size',
      value: '16px, stroke 2px (2.5px above 16px)',
      why: 'Matches the 16px icons in a status bar. Thicker strokes at that size close up the centre, and thinner ones vanish at 0-10%.',
    },
    {
      name: 'tooltip width',
      value: '248px, capped at 100vw - 32px',
      why: 'Wide enough for a label, a token count and the warning note on two lines. The cap keeps it inside a 360px screen.',
    },
  ],

  pitfalls: [
    'Using `strokeDashoffset` with a computed circumference. `pathLength={100}` lets the dash array be the percentage directly and keeps working at any `size`.',
    'Drawing the arc at 0% with a round cap. A zero-length dash still renders as a dot, so the arc is hidden until there is at least 1%.',
    'Putting the tooltip on a plain `<div>`. The kit tooltip needs a focusable React Aria trigger, otherwise keyboard users never see the breakdown.',
  ],

  notes: [
    'Slices without a `tone` take accent, purple, cyan, lime and yellow in turn. Orange and rose are left for the warning levels so a slice is never mistaken for the alert colour.',
    '`formatTokens` prints 812, 4.2k, 114k and 1.2M, and is exported for labels next to the ring.',
    'The demo is a session header with branch, project and the ring. Its buttons add tokens for a file, a tool run or a message, Compact keeps 20% of messages and drops tool output, and three cards show normal, warning and danger examples with `hideLabel`.',
  ],

  apiSignature:
    'function ContextUsageRing(props: { used: number; limit: number; breakdown?: ContextSlice[]; warnAt?: number; dangerAt?: number; hideLabel?: boolean; size?: number; className?: string }): JSX.Element\ninterface ContextSlice { label: string; tokens: number; tone?: "accent" | "blue" | "purple" | "orange" | "cyan" | "lime" | "rose" | "yellow" }\nfunction contextLevel(ratio: number, warnAt?: number, dangerAt?: number): "normal" | "warning" | "danger"\nfunction formatTokens(n: number): string',

  props: [
    { name: 'used', type: 'number', description: 'Tokens currently in the window.' },
    { name: 'limit', type: 'number', description: 'Window size in tokens.' },
    { name: 'breakdown', type: 'ContextSlice[]', description: 'What the used tokens are made of. Shown as a stacked bar and a list in the tooltip; zero slices are skipped.' },
    { name: 'warnAt', type: 'number', default: '0.75', description: 'Share of the window where the pill turns orange.' },
    { name: 'dangerAt', type: 'number', default: '0.9', description: 'Share of the window where the pill turns rose.' },
    { name: 'hideLabel', type: 'boolean', default: 'false', description: 'Shows the ring alone. The accessible name still includes the percentage.' },
    { name: 'size', type: 'number', default: '16', description: 'Ring diameter in px.' },
    { name: 'className', type: 'string', description: 'Classes for the pill button.' },
  ],

  reducedMotion:
    'The arc, its colour and the pill colours use `motion-reduce:transition-none`, so they jump straight to the new value. The tooltip follows the kit\'s own reduced-motion rule.',

  cleanup:
    'No timers, listeners or observers. React Aria owns the hover, focus and tooltip state.',

  acceptance:
    'At 35% the pill is neutral with a third of the ring filled. Adding tokens grows the arc; at 75% the pill turns orange and at 90% rose, each with a note in the tooltip. Hover or Tab onto the pill to see used/limit, a stacked bar, one row per source and a Free row. Compacting brings it back to neutral.',

  criticalRegion: 'critical',
};

export default meta;
