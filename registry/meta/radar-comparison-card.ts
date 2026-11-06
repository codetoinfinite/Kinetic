import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'radar-comparison-card',
  title: 'Radar Comparison Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'radar-chart', 'comparison', 'legend', 'dashboard', 'recharts', 'boardui'],
  blurb:
    'Desktop and Mobile as lime and blue radar outlines on one grid, with a live legend whose entries toggle each series on and off.',
  cost: 'dom',
  motif: 'orbit',

  files: [{ path: 'registry/ui/radar-comparison-card.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['recharts@^3.10.1'],

  summary:
    'A grey "Visitors" dashboard card that overlays two outline-only Recharts radars, Desktop in lime and Mobile in blue, on one hexagonal grid. The header counts up the lead series total with a chip against the range before, a calendar pill swaps between H1 2024, H2 2024 and the full year, and a tile per axis sits underneath. The legend under the chart is live: it shows each series total at rest and its value on the hovered axis, and every entry is a toggle button that hides or shows its outline, with the last visible series locked on.',

  mechanism: [
    'Each series is a `Radar` with `fillOpacity={0}` and a 2px outline in its tone\'s `-active` colour, so overlapping shapes stay readable. The range data is stored as `{ label, values: { desktop, mobile } }` and spread into flat chart rows, one `dataKey` per series key.',
    'Hiding a series sets the Radar `hide` prop instead of unmounting it. The hidden `PolarRadiusAxis` gets a fixed domain of `[0, max]`, where `max` is taken over every series in the range, so turning one outline off never rescales the other.',
    'The legend is a list of native buttons with `aria-pressed`. A click builds the next key list in series order and, when `visible` is uncontrolled, stores it; `onVisibleChange` gets it either way. If the clicked series is the only one shown, the click is ignored and the button carries `aria-disabled` and a title saying why.',
    'Hover state comes from Recharts\' store through `RadarActiveAxis` from Radar Chart Card, so it is right on the first pointer event and follows the chart\'s arrow-key focus. With an axis active, the header shows the lead series value for it and hides the chip, and every legend entry swaps its total for its value on that axis.',
    'The lead series is the first visible one. The header total, the chip (`describeDelta` against `previous[lead]`) and the tiles all follow it, and the tiles carry its colour square so it is clear which series they show.',
    'The tooltip lists only visible series, each with its colour dot, and every Radar uses the shared `PulseDot` as `activeDot`, so each visible outline pulses on the hovered axis.',
  ],

  constants: [
    {
      name: 'radius domain',
      value: '[0, largest value of any series in the range]',
      why: 'A shared, fixed scale keeps side-by-side reads honest and stops the remaining outline jumping when one is hidden.',
    },
    {
      name: 'outline',
      value: '2px stroke, fill opacity 0',
      why: 'Outline-only shapes let the smaller series show through the larger one, as in the preview.',
    },
    {
      name: 'hidden legend entry',
      value: '50% opacity, hollow square',
      why: 'Shows the series is off while keeping its value readable and the button easy to find again.',
    },
    {
      name: 'plot size',
      value: '260px high, 78% outer radius, margins 12px top and bottom and 40px left and right',
      why: 'The same geometry as Radar Chart Card, a little shorter to make room for the legend row.',
    },
    {
      name: 'motion',
      value: 'outlines 500ms, tooltip 160ms, legend fade 150ms, count-up 320ms',
      why: 'Quick enough to sweep round six axes, and all of it is off under reduced motion.',
    },
  ],

  pitfalls: [
    'Leaving the radius domain on "auto". Recharts then scales to the visible data only, so hiding Desktop makes Mobile balloon to fill the grid and the comparison is lost.',
    'Unmounting a hidden Radar instead of using `hide`. The series order, colours and the tooltip rows then shift as series come and go.',
    'Letting every series be turned off. An empty grid has no lead series for the header or tiles, so the last visible entry is locked.',
    'Reading `activeIndex` with `Number()` directly. Recharts passes `null` when inactive and `Number(null)` is 0, which would pin the tooltip to January.',
  ],

  notes: [
    'H1 2024 is Desktop 1,424 against 1,354 ("+5.2%") and Mobile 860 against 800 ("+7.5%"); H2 2024 is 1,598 ("+12.2%") and 1,100 ("+27.9%"); 2024 is 3,022 ("+8.7%") and 1,960 ("+15.3%") in two-month buckets.',
    'Imports `RADAR_MARGIN`, `RADAR_OUTER_RADIUS` and `RadarActiveAxis` from `radar-chart-card.tsx`, and the frame, header, range pill, tooltip card, tiles and pulse dot from `line-chart-card-parts.tsx`.',
    'With Desktop hidden, Mobile becomes the lead series: the header shows "860" with "+7.5%" and the tiles show the Mobile values.',
  ],

  apiSignature:
    'function RadarComparisonCard(props?: RadarComparisonCardProps): JSX.Element\ntype RadarComparisonCardProps = { title?: string; series?: RadarSeries[]; ranges?: RadarComparisonRange[]; range?: string; defaultRange?: string; onRangeChange?: (id: string) => void; visible?: string[]; defaultVisible?: string[]; onVisibleChange?: (keys: string[]) => void; rangeControl?: "segmented" | "select"; hideTiles?: boolean; className?: string }\ntype RadarSeries = { key: string; label: string; tone: ChartTone }\ntype RadarComparisonRange = { id: string; label: string; data: { label: string; values: Record<string, number> }[]; previous?: Record<string, number> }',

  props: [
    { name: 'title', type: 'string', default: '"Visitors"', description: 'Header label.' },
    { name: 'series', type: 'RadarSeries[]', default: 'RADAR_COMPARISON_SERIES', description: 'Series keys, legend labels and tones; the first visible one leads the header and tiles.' },
    { name: 'ranges', type: 'RadarComparisonRange[]', default: 'RADAR_COMPARISON_RANGES', description: 'Data sets for the pill, one point per axis with a value per series key; `previous` feeds the chip.' },
    { name: 'range', type: 'string', description: 'Controlled range id.' },
    { name: 'defaultRange', type: 'string', default: 'first range id', description: 'Initial range when uncontrolled.' },
    { name: 'onRangeChange', type: '(id: string) => void', description: 'Called with the chosen range id.' },
    { name: 'visible', type: 'string[]', description: 'Controlled list of visible series keys.' },
    { name: 'defaultVisible', type: 'string[]', default: 'every series', description: 'Initial visible keys when uncontrolled.' },
    { name: 'onVisibleChange', type: '(keys: string[]) => void', description: 'Called with the next visible keys after a legend click.' },
    { name: 'rangeControl', type: '"segmented" | "select"', default: '"select"', description: 'Calendar pill with a listbox, or a segmented switch.' },
    { name: 'hideTiles', type: 'boolean', default: 'false', description: 'Hide the per-axis tiles under the chart.' },
    { name: 'className', type: 'string', description: 'Merged onto the card section.' },
  ],

  reducedMotion:
    'Under `prefers-reduced-motion: reduce`, `useReducedMotion` turns off `isAnimationActive` on every Radar and the Tooltip, the header shows its value without counting, the active dots drop their ping, and the legend fade is disabled with a `motion-reduce:` variant.',

  cleanup:
    '`RadarActiveAxis` only runs an effect that calls the setter, `useCountUp` cancels its animation frame on target change and unmount, `useReducedMotion` unsubscribes its media-query listener, `ResponsiveContainer` disconnects its resize observer, and the kit `Select` tears down its popover when closed. The card adds no listeners or timers of its own.',

  acceptance:
    'The card shows "Visitors", "1,424" with a lime "+5.2%" chip and an "H1 2024" pill, a lime and a blue radar outline on a grey hexagon grid labelled January to June, a legend reading "Desktop 1,424" and "Mobile 860", and six tiles January 186 to June 214. Hovering an axis pulses both vertices, opens a tooltip with both values and switches the header and legend to that month. Clicking "Desktop" hides the lime outline, and the header reads "860" with "+7.5%"; clicking "Mobile" then does nothing. Picking "H2 2024" shows "1,598" and "+12.2%".',

  criticalRegion: 'critical',
};

export default meta;
