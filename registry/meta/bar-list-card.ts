/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Bar List Card" (boardui.com/components/bar-list-card).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'bar-list-card',
  title: 'Bar List Card',
  category: 'display',
  kit: 'boardui',
  tags: ['chart', 'bar', 'list', 'analytics', 'dashboard', 'boardui'],
  blurb:
    'Ranked analytics rows on proportional bars behind underline tabs, with a share / count switch and a pill that unfolds long lists.',
  cost: 'dom',
  motif: 'stack',

  files: [{ path: 'registry/ui/bar-list-card.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'An analytics breakdown card: each row is a label and icon sitting on a pale bar whose width is the item against the largest one, with the metric on the right. Underline tabs switch between lists, and the caption doubles as a switch between shares of the list total and raw counts. Lists longer than `limit` end in a faded peek row with a small chevron pill that unfolds the rest. Hovering a row brings in the other number.',

  mechanism: [
    'Each list is filtered to finite values of 0 or more, then sorted high to low. Every item gets `share = value / total` and `width = value / max`, so the top row always spans the full bar and hidden rows never change the visible ones.',
    'A bar is an absolutely positioned span behind the row content, `width: width × 100%` with an 8px minimum so a tiny item still shows a rounded nub. `useGrown` holds the width at 0 for two animation frames after a list mounts, then a 500ms ease-out width transition grows every bar to its size.',
    'The kit `Tabs` render one `TabPanel` per list. Only the selected panel is mounted, so switching tabs mounts the new list and its bars grow in. The tab strip sits in a sideways scroller with a 24px fade on the right, and `-mb-px` lays the blue underline over the header divider.',
    'Rows past `limit` live in a second list inside a clipping box. Collapsed, the box is 30px tall: a 4px gap plus 26px of the first hidden row, masked from opaque to transparent, and `inert` so the hidden rows are neither focusable nor announced.',
    'The chevron pill toggles the box between that peek and `hidden rows × 40px + 26px`, over a 300ms height transition. The extra 26px leaves a band for the pill under the last row, and the chevron turns 180°. Only one list is open at a time, and switching tabs folds it again.',
    'The caption button flips the metric between `share` and `value`; its % / # marker shows which is live. Each row\'s number is keyed by the metric, so it replays the kit\'s `animate-number-fade` on every switch. On row hover the other number (count or share) fades in beside it in tertiary text.',
  ],

  constants: [
    { name: 'row', value: '36px tall (h-9), 4px gap, 8px radius', why: 'Gives the 40px pitch of the preview and lets the unfold height be computed exactly instead of measured.' },
    { name: 'PEEK', value: '30px', why: 'Shows enough of the next row (its icon, label and number) to read as "there is more" under the fade, while the pill sits on top of it.' },
    { name: 'PILL_SPACE', value: '26px', why: 'Room under the last row for the 18px pill when the list is open, so the pill never covers a number.' },
    { name: 'BAR_MIN', value: '8px', why: 'One radius wide: a 1% item still shows a rounded nub instead of a hairline.' },
    { name: 'grow', value: '500ms ease-out width, after two animation frames', why: 'Two frames guarantee the zero width is painted before the transition starts, even when a click mounts the panel synchronously.' },
    { name: 'unfold', value: '300ms ease-out height', why: 'Fast enough to follow the click, long enough to show the list growing rather than jumping.' },
  ],

  pitfalls: [
    'Scaling bar widths to the list total. The top item of a flat list then stops halfway across, and every bar looks short. Widths are against the largest item; shares are against the total.',
    'Hiding folded rows with `display: none` or opacity alone. Neither gives the peek, and opacity leaves the rows focusable. A clipping box with a mask, plus `inert`, does both.',
    'Putting the tab underline inside a scroll container without the strip. The underline would stay put while the tabs scroll. The whole `TabList` (with its underline) scrolls together inside one wrapper.',
  ],

  notes: [
    '`TRAFFIC_TABS`, `BarListItem`, `BarListTab` and `BarListMetric` are exported. With neither `tabs` nor `items`, the card shows the traffic sample.',
    '`icon` takes any 16px node. The sample countries use small text code chips rather than flag images, so the card works offline.',
    'Pass `metricToggle={false}` for a plain caption, or control `metric` from outside.',
  ],

  apiSignature:
    'function BarListCard(props: { tabs?: BarListTab[]; items?: BarListItem[]; title?: string; tab?: string; defaultTab?: string; onTabChange?: (id: string) => void; metricLabel?: string; metric?: "share" | "value"; defaultMetric?: "share" | "value"; onMetricChange?: (metric: "share" | "value") => void; metricToggle?: boolean; limit?: number; mono?: boolean; formatValue?: (value: number) => string; className?: string }): JSX.Element\ntype BarListItem = { label: string; value: number; icon?: ReactNode }\ntype BarListTab = { id: string; label: string; items: BarListItem[] }',

  props: [
    { name: 'tabs', type: 'BarListTab[]', default: 'TRAFFIC_TABS', description: 'Lists behind underline tabs. Ignored when `items` is set.' },
    { name: 'items', type: 'BarListItem[]', description: 'One list without tabs, headed by `title`.' },
    { name: 'title', type: 'string', default: '"Breakdown" (tabs) or `metricLabel` (items)', description: 'Header of a single list; the card\'s accessible name in both modes.' },
    { name: 'tab', type: 'string', description: 'Controlled tab id.' },
    { name: 'defaultTab', type: 'string', default: 'first tab id', description: 'Initial tab when uncontrolled.' },
    { name: 'onTabChange', type: '(id: string) => void', description: 'Called when a tab is selected.' },
    { name: 'metricLabel', type: 'string', default: '"Visitors"', description: 'Uppercase caption over the numbers.' },
    { name: 'metric', type: '"share" | "value"', description: 'Controlled metric: share of the list total, or the raw value.' },
    { name: 'defaultMetric', type: '"share" | "value"', default: '"share"', description: 'Initial metric when uncontrolled.' },
    { name: 'onMetricChange', type: '(metric) => void', description: 'Called when the caption switch flips the metric.' },
    { name: 'metricToggle', type: 'boolean', default: 'true', description: 'Turns the caption into a share / count switch with a % / # marker.' },
    { name: 'limit', type: 'number', default: '5', description: 'Rows shown before the rest fold behind the peek row and pill.' },
    { name: 'mono', type: 'boolean', default: 'false', description: 'Grey chart-track bars instead of pale blue.' },
    { name: 'formatValue', type: '(value: number) => string', default: 'en-US integer', description: 'Formats counts in the rows and the hover detail.' },
    { name: 'className', type: 'string', description: 'Merged onto the card section.' },
  ],

  reducedMotion:
    '`useGrown` is skipped, so the bars render at their final widths. The width, height, chevron, colour and fade transitions are removed with `motion-reduce:transition-none`, and the number fade with `motion-reduce:animate-none`. The list unfolds and folds at once.',

  cleanup:
    '`useGrown` cancels both of its animation frames on unmount, so switching tabs mid-grow leaves nothing running. Everything else is React state and CSS transitions; the kit `TabList` disconnects its own observers.',

  acceptance:
    'The left card shows Devices, Browsers, Operating systems and Countries tabs and a "VISITORS % #" caption. Under Devices are Desktop 61%, Mobile 31% and Tablet 8%, with blue bars at full, about half and about an eighth of the width. Browsers shows four rows, then a faded Opera row under a chevron pill. Clicking the pill unfolds Opera, Samsung Internet and Other, and the chevron turns up. Back on Devices, clicking the caption changes Desktop to 3,120. Hovering a row shows the other number. The right card lists Pages in views: / 12,480, /pricing 6,210, /components 4,880, then /blog/launch peeking. Mono turns every bar grey.',

  criticalRegion: 'critical',
};

export default meta;
