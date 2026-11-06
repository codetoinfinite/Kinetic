/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Channel Tabs Bar List" (boardui.com/templates/marketing).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'channel-tabs-bar-list',
  title: 'Channel Tabs Bar List',
  category: 'display',
  kit: 'boardui',
  tags: ['bar-list', 'tabs', 'marketing', 'dashboard', 'ranking', 'boardui'],
  blurb: 'A tabbed card of ranked horizontal bars: switch channels, campaigns or pages and each row shows its share of sessions.',
  cost: 'css',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/channel-tabs-bar-list.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0', 'react-aria-components@^1.22.1'],

  summary:
    'A grey card with the kit Tabs on top and an uppercase metric caption on the right. Each tab holds a ranked list where every row sits on a light blue bar sized against the leader, with an optional icon, the label and the row\'s share of the tab total. Five rows show by default; the last one fades and a chevron button reveals the rest.',

  mechanism: [
    'Render the kit `Tabs`, `TabList` and one `TabPanel` per tab, selection controlled (`selectedKey`) or uncontrolled (`defaultSelectedKey`, else the first tab); React Aria gives the arrow-key roving focus and `aria-selected`.',
    'Rank each tab with `rankBars`: sort by value descending (label as tie-break), take `share = value / total` for the percent label and `width = value / max × 100` for the bar, so the leader always spans the row and the rest read as fractions of it.',
    'Draw each row as a `relative isolate` list item with an absolutely positioned bar behind the content (`-z-10`), its width set through a `--bar` custom property and `w-(--bar)`, so the class can also carry `starting:w-0` and the bar grows from zero whenever a panel mounts.',
    'Slice to `limit` rows while collapsed, fade the last visible row to 45% and show a small kit `IconButton` with `aria-expanded` and `aria-controls` pointing at the list; expanding rotates its chevron 180° and lists every row.',
    'Show the metric caption beside the tabs from `@sm` (24rem), sharing the tab bar\'s bottom border, and as its own right-aligned line above the list in narrower containers so three tabs still fit at 300px.',
  ],

  constants: [
    { name: 'row height', value: '36px (h-9), 4px gap', why: 'Matches the 14px body line with room for the bar to read as a block rather than a stripe.' },
    { name: 'limit', value: '5', why: 'Five ranked rows cover most of the traffic; the long tail stays one click away.' },
    { name: 'bar grow', value: '500ms ease-out from 0 via @starting-style', why: 'Long enough to read the ranking settle when switching tabs, short enough not to delay reading values.' },
    { name: 'teaser opacity', value: '45%', why: 'Signals that more rows follow the fifth without hiding its value.' },
  ],

  pitfalls: [
    'Size bars against the largest value, not the total. Against the total, a 39% leader fills only 39% of the row and the list looks empty.',
    'Set the width through a CSS variable and a class. An inline `width` style beats the `starting:w-0` class, so the bars would never animate in.',
    'The bars are `aria-hidden`; the written percent carries the value, so each row reads once as "Google Ads 39%".',
  ],

  notes: [
    'Pass `display="value"` to show raw session counts instead of shares.',
    'Inactive panels unmount (React Aria default), so the expanded state resets per tab and the bars regrow on every switch.',
    '`rankBars` is exported for reuse in other ranked lists.',
  ],

  apiSignature:
    'type BarListItem = { id: string; label: string; value: number; icon?: ComponentType }\ntype BarListTab = { id: string; label: string; items: BarListItem[] }\nfunction ChannelTabsBarList(props: ChannelTabsBarListProps): JSX.Element\nfunction rankBars(items: BarListItem[]): (BarListItem & { share: number; width: number })[]',

  props: [
    { name: 'tabs', type: 'BarListTab[]', description: 'One tab per grouping, each with its rows in any order.' },
    { name: 'selectedKey / defaultSelectedKey / onSelectionChange', type: 'string', default: 'first tab id', description: 'Selected tab, controlled or uncontrolled.' },
    { name: 'metricLabel', type: 'string', default: '"Sessions"', description: 'Caption for the value column and part of each list\'s accessible name.' },
    { name: 'display', type: '"share" | "value"', default: '"share"', description: 'Percent of the tab total or the raw number.' },
    { name: 'limit', type: 'number', default: '5', description: 'Rows shown before the expand button.' },
    { name: 'locale', type: 'string', default: '"en-US"', description: 'Locale for numbers and percents.' },
    { name: 'aria-label', type: 'string', default: '"Traffic sources"', description: 'Accessible name of the card and the tab list.' },
    { name: 'className', type: 'string', description: 'Merged onto the card.' },
  ],

  reducedMotion:
    'The bars grow over 500ms, the chevron rotates over 200ms and the kit tab underline slides; the bar and chevron carry `motion-reduce:transition-none`, so under `prefers-reduced-motion: reduce` they appear at full width and flip instantly.',

  cleanup: 'The component adds no timers or listeners. The kit TabList disconnects its underline ResizeObserver on unmount.',

  acceptance:
    'The demo opens on Channels with Google Ads 39%, Meta 25%, X Ads 14%, LinkedIn 8% and a faded Email 7%, each bar sized against Google Ads. Clicking the chevron shows TikTok 4% and Referral 3% and sets aria-expanded. Choosing Campaigns ranks "Free trial push · US" first with five rows and a "Show 1 more" button. At 360px the three tabs fit and the Sessions caption moves above the list. Light and dark both read correctly.',

  criticalRegion: 'critical',
};

export default meta;
