/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Trend Badge" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'trend-badge',
  title: 'Trend Badge',
  category: 'display',
  kit: 'boardui',
  tags: ['boardui', 'kpi', 'trend', 'percent', 'badge', 'dashboard'],
  blurb: 'Up, down or flat change pill for dashboard KPIs: one rotating arrow, a signed percent, lime, rose or grey, in three sizes.',
  cost: 'css',
  motif: 'stack',
  files: [{ path: 'registry/ui/trend-badge.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['@remixicon/react@^4.9.0'],
  summary:
    'The small change pill beside the big numbers on the BoardUI dashboard KPI cards ("+5.3%", "-2.1%", "0.00%"). The direction comes from the sign of the value after rounding, so a tiny change never shows as a red "-0.0%". Up is lime and down is rose, swapped with invert for metrics where lower is better. A single arrow rotates between up, sideways and down, so a live value turns it smoothly instead of swapping icons. Screen readers hear "Up 5.3% vs last month" instead of a bare "+5.3".',
  mechanism: [
    'The value is rounded to the shown decimals first; the sign of that rounded number picks up, down or flat (direction overrides it), and a rounded -0 is folded to 0.',
    'Tone reuses the kit Chip colours: CHIP_COLORS.lime for good, CHIP_COLORS.rose for bad and CHIP_COLORS.neutral (tertiary background, secondary text) for flat; invert flips which direction counts as good.',
    'The glyph is always RiArrowUpLine, rotated 0, 90 (mirrored under rtl) or 180 degrees with transition-[rotate], and the pill fades its colours with transition-colors, both 200 to 300ms ease-out and off under motion-reduce.',
    'Intl.NumberFormat with signDisplay exceptZero prints "+5.3%" and "0.0%"; that visible text is aria-hidden and an sr-only span reads the direction word, the unsigned percent and the optional context.',
    'A fixed locale (en-US by default) keeps the server and client text identical, so the badge hydrates cleanly.',
  ],
  constants: [
    { name: 'sizes', value: 'sm h-5 / md h-6 / lg h-7', why: 'sm fits table cells, md sits beside body text and lg matches the 28px pills next to the KPI numbers.' },
    { name: 'radius', value: 'rounded-md (sm, md), rounded-lg (lg)', why: 'The reference pills are squared-off rectangles, not full capsules.' },
    { name: 'rotate', value: '0 / 90 / 180deg, 300ms ease-out', why: 'One glyph that turns reads as the same metric changing, not a new icon popping in.' },
    { name: 'decimals', value: '1 by default', why: 'Matches "+5.3%"; pass 2 for "0.00%" as on the Orders card.' },
  ],
  pitfalls: [
    'Pass the change in percent (5.3), not as a ratio (0.053); the badge only formats, it does not multiply.',
    'Without context the screen-reader text is just "Up 5.3%"; add context ("vs last month") when the comparison period is not read out nearby.',
    'For cost, churn or latency set invert, or a drop shows rose although it is good news.',
  ],
  notes: [
    'icon={false} gives the arrowless pills of the reference KPI cards; the arrow is on by default for tables and lists.',
    'It renders a plain span with no hooks, so it works in server components.',
  ],
  apiSignature:
    'export function TrendBadge({ value, direction, invert, decimals, size, icon, context, locale, className }: TrendBadgeProps): JSX.Element',
  props: [
    { name: 'value', type: 'number', description: 'Change in percent, e.g. 5.3 or -2.1.' },
    { name: 'direction', type: "'up' | 'down' | 'flat'", description: 'Overrides the direction taken from the rounded value.' },
    { name: 'invert', type: 'boolean', default: 'false', description: 'Down is good: down turns lime and up rose.' },
    { name: 'decimals', type: 'number', default: '1', description: 'Fraction digits shown and used for rounding.' },
    { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Pill height, padding and type size.' },
    { name: 'icon', type: 'boolean', default: 'true', description: 'Show the rotating arrow.' },
    { name: 'context', type: 'string', description: 'Appended to the screen-reader text, e.g. "vs last month".' },
    { name: 'locale', type: 'string', default: "'en-US'", description: 'Number formatting locale.' },
  ],
  reducedMotion: 'Under prefers-reduced-motion the arrow snaps to its new angle and the colours switch at once; nothing else moves.',
  cleanup: 'Stateless span: no timers, listeners or effects.',
  acceptance:
    'The KPI cards show +5.3% lime, -2.1% rose and 0.00% grey; stepping the conversion change from +1.0% down through 0.0% to -0.5% turns its arrow from up to sideways to down and its colour from lime to grey to rose; the churn badge reads -0.6% in lime.',
  criticalRegion: 'critical',
};

export default meta;
