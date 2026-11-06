/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Marketing Dashboard" (boardui.com/templates/marketing).
 * No BoardUI source was used.
 */
'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  RiAddLine,
  RiEyeLine,
  RiGoogleFill,
  RiLinkedinBoxFill,
  RiMailLine,
  RiMegaphoneLine,
  RiMetaFill,
  RiMoneyDollarCircleLine,
  RiTiktokFill,
  RiTwitterXFill,
  RiUserFollowLine,
} from '@remixicon/react';
import { AreaChartCard } from '@/registry/ui/area-chart-card';
import type { AreaPeriod, AreaSeries } from '@/registry/ui/area-chart-card';
import { Button } from '@/registry/ui/button';
import { CampaignsTable } from '@/registry/ui/campaigns-table';
import type { Campaign, CampaignChannel } from '@/registry/ui/campaigns-table';
import { ChannelTabsBarList } from '@/registry/ui/channel-tabs-bar-list';
import type { BarListItem, BarListTab } from '@/registry/ui/channel-tabs-bar-list';
import { ComboChartCard } from '@/registry/ui/combo-chart-card';
import type { ComboPeriod } from '@/registry/ui/combo-chart-card';
import { FunnelChartCard } from '@/registry/ui/funnel-chart-card';
import type { FunnelRange } from '@/registry/ui/funnel-chart-card';
import { Input } from '@/registry/ui/input';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/registry/ui/modal';
import { Select, SelectItem } from '@/registry/ui/select';
import { SpeedometerChartCard } from '@/registry/ui/speedometer-chart-card';
import type { GaugeRange } from '@/registry/ui/speedometer-chart-card';
import { StatCards } from '@/registry/ui/stat-cards';
import type { Stat } from '@/registry/ui/stat-cards';
import { toast } from '@/registry/ui/toast';
import {
  DashboardEmptyGrid,
  DashboardFrame,
  DashboardHeader,
  DashboardViewPlaceholder,
  DashboardWidgetMenu,
  findView,
  useWidgetToggles,
} from '@/registry/ui/home-dashboard-shell';
import { cx } from '@/registry/lib/cx';

/**
 * The BoardUI marketing dashboard as one working page. The kit sidebar switches
 * views inside the block, Filters shows and hides each widget, and New campaign
 * writes a draft into the campaigns table and the Draft campaigns count. Every
 * chart is a kit card fed with fixed sample data.
 */

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const formatUsd = (value: number) => usd.format(value);
const sum = (values: readonly number[]) => values.reduce((total, v) => total + v, 0);

/* ---------- Acquisition funnel ---------- */

const STAGES = ['Visits', 'Sign-ups', 'Trials', 'Customers'];
const funnel = (id: string, label: string, values: number[], delta: number): FunnelRange => ({
  id,
  label,
  delta,
  stages: STAGES.map((stage, i) => ({ label: stage, value: values[i] ?? 0 })),
});
const FUNNEL: FunnelRange[] = [
  funnel('30d', 'Last 30 days', [96400, 38600, 14100, 5200], 5.8),
  funnel('7d', 'Last 7 days', [22800, 9300, 3500, 1310], 2.1),
  funnel('90d', 'Last 90 days', [281000, 109500, 40200, 14800], 7.4),
];

/* ---------- Spend by channel: the centre reports the first item's share ---------- */

const SPEND_CHANNELS = ['Paid search', 'Paid social', 'Email', 'Affiliates'];
const spend = (id: string, label: string, values: number[], delta: number): GaugeRange => ({
  id,
  label,
  delta,
  items: SPEND_CHANNELS.map((channel, i) => ({ label: channel, value: values[i] ?? 0 })),
});
const SPEND: GaugeRange[] = [
  spend('30d', 'Last 30 days', [11400, 7620, 3180, 2680], 8.4),
  spend('7d', 'Last 7 days', [2700, 1850, 760, 610], 3.2),
];

/* ---------- Traffic sources: sessions per channel, campaign and landing page ---------- */

// The bar list types its icon as a plain component; thin wrappers keep Remix icons assignable.
type BarIcon = NonNullable<BarListItem['icon']>;
const GoogleIcon: BarIcon = (p) => <RiGoogleFill {...p} />;
const MetaIcon: BarIcon = (p) => <RiMetaFill {...p} />;
const XIcon: BarIcon = (p) => <RiTwitterXFill {...p} />;
const LinkedInIcon: BarIcon = (p) => <RiLinkedinBoxFill {...p} />;
const MailIcon: BarIcon = (p) => <RiMailLine {...p} />;
const TikTokIcon: BarIcon = (p) => <RiTiktokFill {...p} />;

const TRAFFIC: BarListTab[] = [
  {
    id: 'channels',
    label: 'Channels',
    items: [
      { id: 'google', label: 'Google Ads', value: 18700, icon: GoogleIcon },
      { id: 'meta', label: 'Meta', value: 12000, icon: MetaIcon },
      { id: 'x', label: 'X Ads', value: 6700, icon: XIcon },
      { id: 'linkedin', label: 'LinkedIn', value: 3800, icon: LinkedInIcon },
      { id: 'email', label: 'Email', value: 3400, icon: MailIcon },
      { id: 'tiktok', label: 'TikTok', value: 1900, icon: TikTokIcon },
    ],
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    items: [
      { id: 'holiday', label: 'Holiday gift guide', value: 9800 },
      { id: 'spring', label: 'Spring launch', value: 7400 },
      { id: 'founder', label: 'Founder story video', value: 6100 },
      { id: 'newsletter', label: 'Newsletter promo', value: 4300 },
      { id: 'webinar', label: 'Webinar signups', value: 3000 },
      { id: 'cart', label: 'Cart retargeting', value: 2200 },
    ],
  },
  {
    id: 'pages',
    label: 'Landing pages',
    items: [
      { id: 'pricing', label: '/pricing', value: 11200 },
      { id: 'features', label: '/features', value: 8400 },
      { id: 'launch', label: '/blog/launch', value: 5900 },
      { id: 'signup', label: '/signup', value: 4700 },
      { id: 'demo', label: '/demo', value: 2600 },
    ],
  },
];

/* ---------- Ad spend with click-through rate, and visitors by source ---------- */

const MONTHS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const AD_SPEND = [12400, 13900, 15100, 14600, 16200, 17800, 17100, 18900, 19600, 20300, 22490, 24380];
const CTR = [2.8, 2.9, 3.1, 3.0, 3.3, 3.4, 3.3, 3.5, 3.6, 3.6, 3.8, 3.9];
const AD_SPEND_PREV = AD_SPEND.map((v) => Math.round((v * 0.914) / 10) * 10);
const CTR_PREV = CTR.map((v) => Math.round((v - 0.4) * 10) / 10);

const AD_PERIODS: ComboPeriod[] = [
  {
    id: '12m',
    label: 'Last 12 months',
    data: MONTHS.map((label, i) => ({ label, bar: AD_SPEND[i] ?? 0, line: CTR[i] ?? 0 })),
    previousTotal: sum(AD_SPEND_PREV),
  },
  {
    id: 'prev',
    label: 'Previous 12 months',
    data: MONTHS.map((label, i) => ({ label, bar: AD_SPEND_PREV[i] ?? 0, line: CTR_PREV[i] ?? 0 })),
    previousTotal: Math.round(sum(AD_SPEND_PREV) / 1.12),
  },
];

const VISITOR_SERIES: AreaSeries[] = [
  { key: 'organic', label: 'Organic', tone: 2 },
  { key: 'paid', label: 'Paid', tone: 6 },
  { key: 'social', label: 'Social', tone: 5 },
];
const ORGANIC = [4800, 5000, 5100, 5300, 5600, 5800, 6000, 6300, 6600, 6900, 7300, 7600];
const PAID = [2400, 2500, 2600, 2700, 2900, 3000, 3100, 3300, 3400, 3500, 3700, 3900];
const SOCIAL = [1300, 1350, 1400, 1450, 1500, 1600, 1650, 1700, 1800, 1900, 2000, 2100];
const visitors = (scale: number) =>
  MONTHS.map((label, i) => ({
    label,
    organic: Math.round((ORGANIC[i] ?? 0) * scale),
    paid: Math.round((PAID[i] ?? 0) * scale),
    social: Math.round((SOCIAL[i] ?? 0) * scale),
  }));
const VISITORS_NOW = sum([...ORGANIC, ...PAID, ...SOCIAL]);
const VISITOR_PERIODS: AreaPeriod[] = [
  { id: '12m', label: 'Last 12 months', data: visitors(1), previousTotal: Math.round(VISITORS_NOW / 1.088) },
  { id: 'prev', label: 'Previous 12 months', data: visitors(1 / 1.088), previousTotal: Math.round(VISITORS_NOW / 1.088 / 1.06) },
];

/* ---------- Campaigns ---------- */

type Row = [string, CampaignChannel, string, Campaign['status'], number, number, number, number, string];

const CAMPAIGN_ROWS: Row[] = [
  ['Holiday gift guide · Global', 'meta', 'Traffic', 'active', 32000, 30884, 612000, 18400, '2026-11-04'],
  ['Founder story video · US', 'google', 'Awareness', 'active', 36000, 34800, 880000, 15900, '2026-11-02'],
  ['Newsletter promo · EU', 'email', 'Leads', 'paused', 36000, 34445, 210000, 9300, '2026-10-30'],
  ['Spring launch · UK', 'google', 'Awareness', 'draft', 12000, 0, 0, 0, '2026-10-28'],
  ['Webinar signups · UK', 'x', 'Leads', 'active', 26000, 25305, 402000, 7800, '2026-10-24'],
  ['Newsletter promo · US', 'meta', 'Awareness', 'active', 30000, 28095, 540000, 12100, '2026-10-21'],
  ['Brand search · US', 'google', 'Leads', 'paused', 20000, 19116, 288000, 11600, '2026-10-17'],
  ['Cart retargeting · UK', 'tiktok', 'Retargeting', 'draft', 8000, 0, 0, 0, '2026-10-12'],
  ['Case study promo · UK', 'linkedin', 'Conversions', 'active', 6000, 333, 9100, 140, '2026-10-08'],
  ['Product tour · DE', 'linkedin', 'Conversions', 'active', 14000, 9800, 120000, 2900, '2026-10-03'],
  ['Back to school · US', 'tiktok', 'Awareness', 'paused', 18000, 17400, 760000, 9700, '2026-09-26'],
  ['Free trial nudge · Global', 'email', 'Conversions', 'active', 4000, 2950, 98000, 4100, '2026-09-19'],
  ['Partner spotlight · FR', 'x', 'Traffic', 'paused', 9000, 8120, 150000, 2600, '2026-09-11'],
  ['Pricing page test · US', 'google', 'Conversions', 'draft', 5000, 0, 0, 0, '2026-09-02'],
];

export const MARKETING_CAMPAIGNS: Campaign[] = CAMPAIGN_ROWS.map(
  ([name, channel, objective, status, budget, spent, impressions, clicks, updated], i) => ({
    id: `cmp-${i + 1}`,
    name,
    channel,
    objective,
    status,
    budget,
    spent,
    impressions,
    clicks,
    updated,
  }),
);

const CHANNEL_LABELS: Record<CampaignChannel, string> = {
  google: 'Google Ads',
  meta: 'Meta',
  x: 'X Ads',
  linkedin: 'LinkedIn',
  email: 'Email',
  tiktok: 'TikTok',
};
const CHANNEL_KEYS = Object.keys(CHANNEL_LABELS) as CampaignChannel[];
const OBJECTIVES = ['Awareness', 'Traffic', 'Conversions', 'Leads', 'Retargeting'];

export type MarketingWidget = 'kpis' | 'funnel' | 'spend' | 'traffic' | 'adspend' | 'visitors' | 'campaigns';

export const MARKETING_WIDGETS: readonly { id: MarketingWidget; label: string }[] = [
  { id: 'kpis', label: 'Key metrics' },
  { id: 'funnel', label: 'Acquisition funnel' },
  { id: 'spend', label: 'Spend by channel' },
  { id: 'traffic', label: 'Traffic sources' },
  { id: 'adspend', label: 'Ad spend' },
  { id: 'visitors', label: 'Visitors' },
  { id: 'campaigns', label: 'Campaigns' },
];
const ALL_WIDGETS: readonly MarketingWidget[] = MARKETING_WIDGETS.map((w) => w.id);
const ROW_COLS = ['', 'lg:grid-cols-1', 'lg:grid-cols-2', 'lg:grid-cols-3'] as const;

export interface MarketingDashboardProps {
  /** Nav key on screen. Controlled; pair with onViewChange. */
  view?: string;
  /** Initial nav key when uncontrolled. Default "marketing". */
  defaultView?: string;
  onViewChange?: (key: string) => void;
  /** Initial rows of the campaigns table. */
  campaigns?: readonly Campaign[];
  /** ISO date stamped on new campaigns. Default "2026-11-05". */
  today?: string;
  /** Widgets shown on first render. Default all seven. */
  defaultWidgets?: readonly MarketingWidget[];
  className?: string;
}

// #region critical
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
  // #endregion

  const item = findView(current);
  const isHome = current === 'marketing';
  const top = (['funnel', 'spend', 'traffic'] as const).filter(shown);
  const middle = (['adspend', 'visitors'] as const).filter(shown);

  const actions = isHome ? (
    <>
      <DashboardWidgetMenu widgets={MARKETING_WIDGETS} shown={widgets.shown} onToggle={widgets.toggle} onShowAll={widgets.showAll} />
      <Button leadingIcon={RiAddLine} onClick={() => setFormOpen(true)}>
        New campaign
      </Button>
    </>
  ) : undefined;

  return (
    <DashboardFrame view={current} onViewChange={go} label={item.label} className={className}>
      <DashboardHeader title={item.label} current={item} homeKey="marketing" onViewChange={go} actions={actions} />

      {isHome ? (
        <div className="mt-5 flex flex-col gap-4">
          {shown('kpis') ? <StatCards stats={stats} /> : null}
          {top.length ? (
            <div className={cx('grid grid-cols-1 gap-4', ROW_COLS[top.length])}>
              {shown('funnel') ? <FunnelChartCard title="Acquisition funnel" ranges={FUNNEL} /> : null}
              {shown('spend') ? <SpeedometerChartCard title="Spend by channel" ranges={SPEND} formatValue={formatUsd} /> : null}
              {shown('traffic') ? (
                <ChannelTabsBarList tabs={TRAFFIC} metricLabel="Sessions" aria-label="Traffic sources" className="h-full" />
              ) : null}
            </div>
          ) : null}
          {middle.length ? (
            <div className={cx('grid grid-cols-1 gap-4', ROW_COLS[middle.length])}>
              {shown('adspend') ? (
                <ComboChartCard
                  bars={{ label: 'Ad spend', tone: 2 }}
                  line={{ label: 'CTR', tone: 6 }}
                  periods={AD_PERIODS}
                  periodControl="select"
                />
              ) : null}
              {shown('visitors') ? <AreaChartCard title="Visitors" series={VISITOR_SERIES} periods={VISITOR_PERIODS} periodControl="select" /> : null}
            </div>
          ) : null}
          {shown('campaigns') ? <CampaignsTable campaigns={campaigns} pageSize={6} /> : null}
          {widgets.shown.size === 0 ? <DashboardEmptyGrid onShowAll={widgets.showAll} /> : null}
        </div>
      ) : (
        <DashboardViewPlaceholder item={item} backLabel="Marketing" onBack={() => go('marketing')} />
      )}

      <Modal isOpen={formOpen} onOpenChange={setFormOpen} size="sm">
        <CampaignForm onCancel={() => setFormOpen(false)} onAdd={addCampaign} />
      </Modal>
    </DashboardFrame>
  );
}

function CampaignForm({
  onCancel,
  onAdd,
}: {
  onCancel: () => void;
  onAdd: (draft: Pick<Campaign, 'name' | 'channel' | 'objective' | 'budget'>) => void;
}) {
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<CampaignChannel>('google');
  const [objective, setObjective] = useState('Awareness');
  const [budget, setBudget] = useState('');
  const value = Number(budget);
  const budgetOk = budget.trim() !== '' && Number.isFinite(value) && value > 0;
  const valid = name.trim().length > 0 && budgetOk;

  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        onAdd({ name: name.trim(), channel, objective, budget: Math.round(value) });
      }}
    >
      <ModalHeader icon={RiMegaphoneLine} title="New campaign" description="It is saved as a draft at the top of the campaigns table." />
      <ModalBody className="flex flex-col gap-4">
        <Input label="Campaign name" placeholder="e.g. Winter sale · US" value={name} onChange={setName} isRequired autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Channel" selectedKey={channel} onSelectionChange={(key) => key != null && setChannel(String(key) as CampaignChannel)}>
            {CHANNEL_KEYS.map((c) => (
              <SelectItem key={c} id={c} textValue={CHANNEL_LABELS[c]}>
                {CHANNEL_LABELS[c]}
              </SelectItem>
            ))}
          </Select>
          <Select label="Objective" selectedKey={objective} onSelectionChange={(key) => key != null && setObjective(String(key))}>
            {OBJECTIVES.map((o) => (
              <SelectItem key={o} id={o} textValue={o}>
                {o}
              </SelectItem>
            ))}
          </Select>
        </div>
        <Input
          label="Budget (USD)"
          placeholder="0"
          inputMode="numeric"
          value={budget}
          onChange={setBudget}
          isRequired
          isInvalid={budget.trim() !== '' && !budgetOk}
          errorMessage="Enter a budget above zero."
        />
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!valid}>
          Create campaign
        </Button>
      </ModalFooter>
    </form>
  );
}
