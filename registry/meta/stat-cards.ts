import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'stat-cards',
  title: 'Stat Cards',
  category: 'display',
  kit: 'boardui',
  tags: ['stat', 'kpi', 'dashboard', 'metric', 'delta', 'tooltip', 'boardui'],
  blurb:
    'A responsive row of KPI cards in two looks: a compact tile with a delta chip, or a gradient icon tile over a caption band and delta pill.',
  cost: 'css',
  motif: 'grid',

  files: [
    {
      path: 'registry/ui/stat-cards.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'The KPI row at the top of a dashboard, driven by an array of `Stat` objects. `variant="plain"` is a compact 132px card with an icon tile, a label, the value and a delta `Chip`. `variant="footer"` adds a tinted gradient icon tile, an optional info tooltip, a display-size value and an inner footer band with a comparison caption and a delta pill. The grid reflows from one or two columns up to four, and `count` and `columns` cut it down for narrower hosts.',

  mechanism: [
    '`StatCards` picks `stats`, or the demo set that matches the variant (`DEFAULT_STATS` or `DEFAULT_FOOTER_STATS`), slices it to `count` and renders one card per entry keyed by `label`. The wrapper is a `grid w-full gap-4`.',
    'Columns are set per variant. `columns={1}` is always `grid-cols-1`. Otherwise plain cards start at `grid-cols-2` and footer cards at `grid-cols-1 sm:grid-cols-2`, because a display-size value does not fit two-up on a phone. With `columns={4}` plain cards go four-up at `lg` and footer cards at `xl`.',
    'Delta colour is data, not maths. Each stat carries `deltaColor: "lime" | "rose" | "neutral"`, and `DELTA_STYLES` maps it to a glyph (`RiArrowUpCircleFill`, `RiArrowDownCircleFill`, `RiIndeterminateCircleFill`), a text colour and a pill background. A rise that is bad news, such as refunds going up, can therefore read rose.',
    'The plain card is a `section` with `h-[132px]`, `justify-between`, `rounded-2xl`, `bg-background-secondary-default` and `p-4`. The icon sits in a `bg-stat-card-icon-background` tile, the value is `text-title-1-medium`, and the delta is a `Chip variant="bold"` in the stat\'s colour. The value and chip row is `flex-wrap`, so a narrow card drops the chip below the number instead of overflowing.',
    'The footer card is a `p-2` section in three parts. A header holds a 40px `rounded-2lg` icon tile filled with `bg-linear-to-b` from the `TILE_TONES[tone]` stops (blue by default), with a white glyph. The body holds a truncated label over a `text-display-4-medium tabular-nums` value. The band is an inner tile (`bg-background-inner-default shadow-card rounded-2lg`, `mt-auto`) holding the caption (default "From last month") and the `DeltaPill`.',
    'When `hint` is set, `StatHint` renders a bare 20px info button inside React Aria\'s `TooltipTrigger` (200ms delay) wrapped in `Focusable`. The open state is controlled, so the tooltip opens on hover and focus as usual and the button\'s `onClick` also toggles it, because a glyph that small gets tapped. The button is labelled "About {label}".',
    'Every subcomponent returns its JSX through `useTemplateCopy()`. With no `TemplateCopyProvider` this returns the node unchanged. With one, labels, captions and hints are translated while values and IDs are left alone.',
  ],

  constants: [
    {
      name: 'plain card height',
      value: 'h-[132px]',
      why: 'Fixed so a row of cards lines up whether or not a chip wraps. `justify-between` pins the icon to the top and the label and value to the bottom, so the row reads as one band across the dashboard.',
    },
    {
      name: 'footer icon tile',
      value: 'size-10 rounded-2lg, gradient from-*-500 to-*-600 (orange and sky use 400 to 500)',
      why: 'A top-to-bottom two-step gradient gives the tile a lit edge without an image. The tones are fixed Tailwind palette stops rather than theme tokens, so the tile reads the same on light and dark surfaces.',
    },
    {
      name: 'tooltip delay',
      value: '200ms',
      why: 'Long enough that sweeping the pointer across a row of cards does not flash four tooltips, short enough that a deliberate hover feels immediate. A click skips the delay altogether.',
    },
    {
      name: 'breakpoints',
      value: 'plain lg:grid-cols-4, footer sm:grid-cols-2 xl:grid-cols-4',
      why: 'The footer card\'s `display-4` value needs roughly a third more width than the plain card\'s `title-1`, so it reaches four-up one breakpoint later and stays single-column below `sm`.',
    },
  ],

  pitfalls: [
    'Deriving the delta colour from the sign of the number. Whether a change is good depends on the metric. Pass `deltaColor` with the data, as the default refunds card does.',
    'Removing `Focusable` around the info button. React Aria\'s `TooltipTrigger` hands its hover and focus handlers to its child through a context, and a plain `<button>` does not read that context, so neither hover nor focus would open the tooltip.',
    'Making the tooltip hover-only. The info glyph is 20px and touch users tap it, which is why `onClick` toggles the controlled `open` state as well.',
    'Giving cards a fixed width so the values line up. The grid sizes them, and the values use `tabular-nums`. A fixed width clips "$152,313.92" at the `display-4` size.',
    'Keying cards by array index. They are keyed by `label`, so a reordered `stats` array keeps tooltip state with the right card. Labels must be unique.',
  ],

  notes: [
    '`count` slices from the start of the list. Together with `columns={1}` it makes a single-card preview or sidebar summary.',
    'The tone palette (`blue`, `orange`, `purple`, `pink`, `sky`, `emerald`) only affects the footer variant. The plain variant always uses the neutral `stat-card-icon-background` tile.',
  ],

  apiSignature:
    'function StatCards(props?: { variant?: "plain" | "footer"; stats?: Stat[]; count?: number; columns?: 1 | 2 | 4; className?: string }): JSX.Element\ntype Stat = { icon: IconComponent; label: string; value: string; delta: string; deltaColor: "lime" | "rose" | "neutral"; tone?: StatTone; caption?: string; hint?: string }\ntype StatTone = "blue" | "orange" | "purple" | "pink" | "sky" | "emerald"',

  props: [
    { name: 'variant', type: '"plain" | "footer"', default: '"plain"', description: 'Compact tile with a delta chip, or the gradient-tile card with a caption band and delta pill.' },
    { name: 'stats', type: 'Stat[]', description: 'Cards to render. Defaults to demo metrics that match the variant.' },
    { name: 'count', type: 'number', description: 'Render only the first `count` stats.' },
    { name: 'columns', type: '1 | 2 | 4', default: '4', description: 'Column count at the widest breakpoint. `2` stays two-up, `1` pins a single column at every width.' },
    { name: 'Stat.deltaColor', type: '"lime" | "rose" | "neutral"', description: 'Picks the chip or pill colour and the up, down or flat glyph.' },
    { name: 'Stat.tone', type: 'StatTone', default: '"blue"', description: 'Footer variant only: the icon tile gradient.' },
    { name: 'Stat.hint', type: 'string', description: 'Footer variant only: adds an info button whose tooltip shows this text.' },
    { name: 'Stat.caption', type: 'string', default: '"From last month"', description: 'Footer variant only: the comparison caption in the band.' },
  ],

  reducedMotion:
    'The cards do not move. The only motion is the tooltip\'s 200ms blur and scale-in, a CSS transition on React Aria\'s `data-entering` and `data-exiting` states. It is short and does not travel, so it is kept under reduced motion.',

  cleanup:
    'Nothing to clean up in the cards. The tooltip is a React Aria overlay, and React Aria removes its portal and listeners when it closes or unmounts.',

  acceptance:
    'The footer variant shows a blue revenue card and an orange orders card side by side, each with a white glyph on a gradient tile, a large tabular value and a band reading "From last month" with a lime up-arrow pill. Hovering or clicking the info glyph opens a tooltip with the hint after about 200ms. The plain variant shows four 132px cards whose chips are lime, rose and neutral. Below `sm` the footer cards stack in one column while the plain cards stay two-up.',

  criticalRegion: 'critical',
};

export default meta;
