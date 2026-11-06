# Build: Marketing Dashboard

The BoardUI marketing dashboard as one working page. The kit sidebar switches views in local state, and the header carries breadcrumbs, a live notification bell, a Filters menu that shows and hides each widget and a New campaign dialog. Under it sit four stat cards, an acquisition funnel, spend by channel, traffic sources, ad spend with click-through rate, visitors by source and a campaigns table that filters, sorts and pages.

Build this as a React component in my project. Match my existing conventions —
file layout, styling system, and naming — rather than the ones implied below.
Everything after this line is specification, not code to copy verbatim.

## What it does

A full marketing dashboard page: in-block sidebar views, key metrics, funnel, channel spend, traffic, ad spend, visitors and campaigns.

- Category: block
- Runtime cost: dom
- Dependencies: @remixicon/react@^4.9.0

## How it works

1. The frame comes from `home-dashboard-shell.tsx`: `DashboardFrame` is the `h-full w-full` sidebar and scrolling main column, and it turns nav clicks into view keys. `DashboardHeader` draws the title, the crumbs and the bell. `"marketing"` renders the dashboard, and any other key renders `DashboardViewPlaceholder` with a "Back to Marketing" button.
2. Filters is the shared `DashboardWidgetMenu` over `useWidgetToggles`, with seven widget ids. The funnel, spend and traffic row and the ad spend and visitors row each count their visible cards and set one, two or three columns at `lg`, so hiding a card widens the rest. When every widget is hidden, `DashboardEmptyGrid` offers "Show all widgets".
3. New campaign opens a controlled `Modal`. A name and a budget above zero are required, and submit stays disabled until both are valid. Submitting prepends a draft campaign with nothing spent, stamped `today`, so it sorts first under the table's default updated-newest order. It also closes the dialog and fires a success toast.
4. The stat cards are derived in a `useMemo` over the campaign rows. Ad spend, Impressions and Conversions are fixed figures for last month, and Draft campaigns counts the rows whose status is draft, with the row total as its caption.
5. Every chart card is a kit item fed with fixed ranges. The funnel has three ranges of Visits, Sign-ups, Trials and Customers. Spend by channel is a segmented gauge over four channels formatted as dollars. Traffic sources tabs between channels, campaigns and landing pages. Ad spend pairs monthly bars with a CTR line on its own axis, and Visitors stacks organic, paid and social traffic.

## Constants — use these values

These are tuned. Each one has a reason; do not round them off or replace them
with values that "look cleaner".

- `today = 2026-11-05`
  Date stamped on new campaigns, fixed so server and client renders agree and new rows sort above the newest sample (2026-11-04).
- `campaigns pageSize = 6`
  Fourteen sample campaigns give three pages, so paging is visible and works.
- `sample drafts = 3 of 14`
  The Draft campaigns card starts at 3 with "14 total" and moves to 4 and "15 total" after one new campaign.

## API

```ts
function MarketingDashboard(props: { view?: string; defaultView?: string; onViewChange?: (key: string) => void; campaigns?: readonly Campaign[]; today?: string; defaultWidgets?: readonly MarketingWidget[]; className?: string }): JSX.Element
```

- `view: string`
  Nav key on screen. Controlled; pair with onViewChange.
- `defaultView: string` — default `"marketing"`
  Initial nav key when uncontrolled. "marketing" is the dashboard; any other key shows the placeholder view.
- `onViewChange: (key: string) => void`
  Called with the new key when a nav row, a crumb or a back button is used.
- `campaigns: readonly Campaign[]` — default `MARKETING_CAMPAIGNS`
  Initial rows of the campaigns table (fourteen samples); new campaigns stay in local state.
- `today: string` — default `"2026-11-05"`
  ISO date stamped on campaigns created through the dialog.
- `defaultWidgets: readonly MarketingWidget[]` — default `all seven`
  Widgets shown on first render: kpis, funnel, spend, traffic, adspend, visitors, campaigns.
- `className: string`
  Merged onto the frame root.

## Reference implementation of the core

This is the part that is hard to get right. Adapt it; do not treat the rest of
the component as fixed.

```tsx
export function MarketingDashboard({
  view,
  defaultView = 'marketing',
  onViewChange,
  campaigns: initialCampaigns = MARKETING_CAMPAIGNS,
  today = '2026-11-05',
  defaultWidgets = ALL_WIDGETS,
  className,
}: MarketingDashboardProps) {
  const [innerView, setInnerView] = useState(defaultView);
  const current = view ?? innerView;
  const go = useCallback(
    (key: string) => {
      if (view === undefined) setInnerView(key);
      onViewChange?.(key);
    },
    [view, onViewChange],
  );

  const widgets = useWidgetToggles(ALL_WIDGETS, defaultWidgets);
  const shown = widgets.isShown;
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => [...initialCampaigns]);
  const [formOpen, setFormOpen] = useState(false);
  const nextId = useRef(1);

  // Ad spend, impressions and conversions are last month's figures; the drafts count follows the table.
  const stats = useMemo<Stat[]>(() => {
    const drafts = campaigns.filter((c) => c.status === 'draft').length;
    return [
      { icon: RiMoneyDollarCircleLine, label: 'Ad spend', value: '$24,380', delta: '+8.4%', deltaColor: 'lime' },
      { icon: RiEyeLine, label: 'Impressions', value: '1.94M', delta: '+12.6%', deltaColor: 'lime' },
      { icon: RiUserFollowLine, label: 'Conversions', value: '1,286', delta: '+5.2%', deltaColor: 'lime' },
      { icon: RiMegaphoneLine, label: 'Draft campaigns', value: String(drafts), delta: `${campaigns.length} total`, deltaColor: 'neutral' },
    ];
  }, [campaigns]);

  const addCampaign = (draft: Pick<Campaign, 'name' | 'channel' | 'objective' | 'budget'>) => {
    const campaign: Campaign = {
      ...draft,
      id: `cmp-new-${nextId.current++}`,
      status: 'draft',
      spent: 0,
      impressions: 0,
      clicks: 0,
      updated: today,
    };
    setCampaigns((prev) => [campaign, ...prev]);
    setFormOpen(false);
    toast('Campaign created', { status: 'success', description: `${campaign.name} is saved as a draft.` });
  };
```

## Requirements

These are not optional. A version of this component that skips any of them is
not finished.

**Cleanup.** No timers or listeners in the page; the id counter is a ref and everything else is React state. The composed charts, overlays and the Toaster clean up their own timers and frames.

**Reduced motion.** The page adds no motion of its own. The composed chart cards follow `useReducedMotion` and draw at their final state, and the dropdown, dialog and toasts fall back to instant open and close.

**Frame-rate independence.** Any smoothing must be a function of delta time.
`x += (target - x) * 0.1` converges twice as fast at 120 Hz as at 60 Hz; use
`x = target + (x - target) * Math.pow(smoothing, dt)` instead, where
`smoothing` is the fraction of the gap remaining after one second.

**Strict mode.** Assume effects run twice in development. Setup must be
idempotent and teardown must fully undo it.

## Known pitfalls — avoid these specifically

- Passing Remix icons straight into `BarListItem.icon`. Their type includes a class component whose props do not match the bar list's narrow icon type, so the page wraps each one in a small function component.
- Giving a new campaign an older date. `CampaignsTable` sorts by updated date, newest first, by default, so a row stamped before the newest sample would land on a later page.
- Opening Filters and then scrolling. The menu is a react-aria popover, which closes on scroll, so its toggles should be used before moving down the page.

## Notes

- Every card is an existing kit item (`StatCards`, `FunnelChartCard`, `SpeedometerChartCard`, `ChannelTabsBarList`, `ComboChartCard`, `AreaChartCard`, `CampaignsTable`, `Modal`, `Select`, `Input`). The page owns the wiring, the sample data and the campaign form.
- The status filter, channel filter, sort and paging are built into `CampaignsTable`, so the page only owns the rows.

## Definition of done

At 1280x800 the sidebar shows Marketing selected and the main column shows the Marketing title, four stat cards, a row of Acquisition funnel, Spend by channel and Traffic sources, then Ad spend and Visitors, then the campaigns table. Clicking Home in the sidebar shows the Home placeholder, and "Back to Marketing" returns. Unticking Visitors in Filters removes that card and the button reads 6/7. Creating a campaign puts it at the top of the table as a draft, moves Draft campaigns from 3 to 4 and shows a toast.

When you are finished, tell me which of the requirements above you implemented
and where, so I can check them.
