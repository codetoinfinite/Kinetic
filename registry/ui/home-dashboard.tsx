/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Home Dashboard" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */
'use client';

import { useCallback, useState } from 'react';
import type { CalendarDate } from '@internationalized/date';
import { parseDate } from '@internationalized/date';
import {
  RiAddLine,
  RiBox3Line,
  RiChatSmile2Line,
  RiGroupLine,
  RiShoppingBasketLine,
  RiTicketLine,
} from '@remixicon/react';
import { Button } from '@/registry/ui/button';
import { ContributionsCard } from '@/registry/ui/contributions-card';
import { EarningsChartCard } from '@/registry/ui/earnings-chart-card';
import type { EarningsPeriod } from '@/registry/ui/earnings-chart-card';
import { Input } from '@/registry/ui/input';
import { LineChartCard } from '@/registry/ui/line-chart-card';
import type { LinePeriod, LineSeries } from '@/registry/ui/line-chart-card';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/registry/ui/modal';
import { RecentHiresCard } from '@/registry/ui/recent-hires-card';
import type { Hire } from '@/registry/ui/recent-hires-card';
import { Select, SelectItem } from '@/registry/ui/select';
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
import { HomeCustomersTable } from '@/registry/ui/home-dashboard-customers';
import type { Customer } from '@/registry/ui/home-dashboard-customers';
import { cx } from '@/registry/lib/cx';

/**
 * The BoardUI home dashboard as one working page: the kit sidebar switches
 * views inside the block, the header's Filters menu shows and hides each
 * widget, Create ticket opens a form that bumps the Support tickets stat,
 * and the customers table at the foot filters, sorts, selects, edits and
 * deletes rows. Every card is a kit component fed with fixed sample data.
 */

export const HOME_TODAY: CalendarDate = parseDate('2026-11-05');

export const HOME_HIRES: Hire[] = [
  { id: 'h1', name: 'Livia Saris', role: 'Backend Engineer', startDate: parseDate('2026-11-05'), status: 'onboarding', team: 'engineering', avatarColor: 'pink' },
  { id: 'h2', name: 'Jaydon Aminoff', role: 'UI Designer', startDate: parseDate('2026-11-03'), status: 'onboarding', team: 'design', avatarColor: 'blue' },
  { id: 'h3', name: 'Maria Lubin', role: 'User Researcher', startDate: parseDate('2026-10-31'), status: 'active', team: 'research', avatarColor: 'lime' },
  { id: 'h4', name: 'Ann Press', role: 'DevOps Engineer', startDate: parseDate('2026-10-29'), status: 'active', team: 'engineering', avatarColor: 'neutral' },
  { id: 'h5', name: 'Zaire Torff', role: 'Product Designer', startDate: parseDate('2026-10-22'), status: 'active', team: 'design', avatarColor: 'blue' },
  { id: 'h6', name: 'Omar Vetrovs', role: 'Data Analyst', startDate: parseDate('2026-10-15'), status: 'active', team: 'research', avatarColor: 'neutral' },
  { id: 'h7', name: 'Talan Calzoni', role: 'Frontend Engineer', startDate: parseDate('2026-10-08'), status: 'active', team: 'engineering', avatarColor: 'lime' },
  { id: 'h8', name: 'Gretchen Septimus', role: 'Brand Designer', startDate: parseDate('2026-11-12'), status: 'pending', team: 'design', avatarColor: 'pink' },
];

const HIRE_TEAMS = [
  { value: null, label: 'Board team' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'design', label: 'Design' },
  { value: 'research', label: 'Research' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKS = MONTHS.map((_, i) => `W${i + 1}`);
const YEARS = ['2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026'];

const series = (labels: string[], values: number[]) => labels.map((label, i) => ({ label, value: values[i] ?? 0 }));

// The last bar is the headline; the one before it sets the change chip (7,462 vs 6,500 = +14.8%).
const EARNINGS: EarningsPeriod[] = [
  { id: 'weekly', label: 'Weekly', ticks: [0, 500, 1000, 2000], data: series(WEEKS, [980, 1420, 1880, 1210, 760, 540, 920, 1150, 1640, 1080, 1310, 1504]) },
  { id: 'monthly', label: 'Monthly', ticks: [0, 3000, 5000, 10000], data: series(MONTHS, [2700, 7400, 9600, 6900, 3600, 2200, 3800, 5000, 8100, 4400, 6500, 7462]) },
  { id: 'yearly', label: 'Yearly', ticks: [0, 25000, 50000, 75000], data: series(YEARS, [21000, 26400, 33800, 41200, 47900, 55100, 61300, 70350]) },
];

const REVENUE_SERIES: LineSeries[] = [{ key: 'revenue', label: 'Revenue', tone: 2, area: true }];
const line = (labels: string[], values: number[]) => labels.map((label, i) => ({ label, revenue: values[i] ?? 0 }));
// 18,240 vs 16,673 = +9.4%.
const REVENUE: LinePeriod[] = [
  { id: 'weekly', label: 'Weekly', data: line(WEEKS, [3100, 3420, 3380, 3860, 3720, 4010, 4260, 4110, 4390, 4520, 4300, 4704]) },
  { id: 'monthly', label: 'Monthly', data: line(MONTHS, [6200, 7900, 9800, 9100, 11800, 11200, 10400, 13100, 15400, 14600, 16673, 18240]) },
  { id: 'yearly', label: 'Yearly', data: line(YEARS, [61000, 74500, 88200, 97400, 112300, 126800, 139900, 152313]) },
];

const CONTRIBUTION_STATS = [
  { label: 'Lifetime tokens', value: '9B' },
  { label: 'Peak tokens', value: '562.7M' },
  { label: 'Longest task', value: '12h 54m' },
  { label: 'Top streak', value: '62 days' },
];

const SUPPORT_TICKETS = 708;

export type HomeWidget = 'hires' | 'earnings' | 'revenue' | 'contributions' | 'stats' | 'customers';

export const HOME_WIDGETS: readonly { id: HomeWidget; label: string }[] = [
  { id: 'hires', label: 'Recent hires' },
  { id: 'earnings', label: 'Earned so far' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'contributions', label: 'Contributions' },
  { id: 'stats', label: 'Key numbers' },
  { id: 'customers', label: 'Customers' },
];

const ALL_WIDGETS: readonly HomeWidget[] = HOME_WIDGETS.map((w) => w.id);

export interface HomeDashboardProps {
  /** Nav key on screen. Controlled; pair with onViewChange. */
  view?: string;
  /** Initial nav key when uncontrolled. Default "home". */
  defaultView?: string;
  onViewChange?: (key: string) => void;
  /** First name in the greeting. Default "Mertcan". */
  userName?: string;
  /** Anchor for the hires' relative dates. Default 2026-11-05. */
  today?: CalendarDate;
  hires?: Hire[];
  /** Initial rows of the customers table. */
  customers?: readonly Customer[];
  /** Widgets shown on first render. Default all six. */
  defaultWidgets?: readonly HomeWidget[];
  className?: string;
}

// #region critical
export function HomeDashboard({
  view,
  defaultView = 'home',
  onViewChange,
  userName = 'Mertcan',
  today = HOME_TODAY,
  hires = HOME_HIRES,
  customers,
  defaultWidgets = ALL_WIDGETS,
  className,
}: HomeDashboardProps) {
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
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketsCreated, setTicketsCreated] = useState(0);
  const [team, setTeam] = useState<string | null>(null);

  const shown = widgets.isShown;

  const stats: Stat[] = [
    { icon: RiGroupLine, label: 'Customers', value: '14,592', delta: '+5.3%', deltaColor: 'lime' },
    { icon: RiBox3Line, label: 'Unit sold', value: '385', delta: '-2.1%', deltaColor: 'rose' },
    { icon: RiShoppingBasketLine, label: 'Orders', value: '1,394', delta: '0.00%', deltaColor: 'neutral' },
    {
      icon: RiChatSmile2Line,
      label: 'Support tickets',
      value: (SUPPORT_TICKETS + ticketsCreated).toLocaleString('en-US'),
      delta: '+12.8%',
      deltaColor: 'lime',
    },
  ];
  // #endregion

  const item = findView(current);
  const isHome = current === 'home';

  const actions = isHome ? (
    <>
      <DashboardWidgetMenu widgets={HOME_WIDGETS} shown={widgets.shown} onToggle={widgets.toggle} onShowAll={widgets.showAll} />
      <Button leadingIcon={RiAddLine} onClick={() => setTicketOpen(true)}>
        Create ticket
      </Button>
    </>
  ) : undefined;

  // A pair splits into columns only while both of its cards are shown.
  const topBoth = shown('hires') && shown('earnings');
  const midBoth = shown('revenue') && shown('contributions');

  return (
    <DashboardFrame view={current} onViewChange={go} label={isHome ? 'Home' : item.label} className={className}>
      <DashboardHeader
        title={isHome ? `Welcome ${userName}` : item.label}
        current={item}
        homeKey="home"
        onViewChange={go}
        actions={actions}
      />

      {isHome ? (
        <div className="mt-5 flex flex-col gap-4">
          {shown('hires') || shown('earnings') ? (
            <div className={cx('grid grid-cols-1 gap-4', topBoth && 'lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)]')}>
              {shown('hires') ? (
                <RecentHiresCard
                  hires={hires}
                  today={today}
                  teams={HIRE_TEAMS}
                  team={team}
                  onTeamChange={setTeam}
                  total={team === null ? 56 : (visible) => visible.length}
                  pageSize={4}
                  onViewAll={() => go('profile')}
                />
              ) : null}
              {shown('earnings') ? <EarningsChartCard periods={EARNINGS} defaultPeriod="monthly" /> : null}
            </div>
          ) : null}

          {shown('revenue') || shown('contributions') ? (
            <div className={cx('grid grid-cols-1 gap-4', midBoth && 'lg:grid-cols-2')}>
              {shown('revenue') ? <LineChartCard title="Revenue" series={REVENUE_SERIES} periods={REVENUE} defaultPeriod="monthly" /> : null}
              {shown('contributions') ? <ContributionsCard change={14.8} stats={CONTRIBUTION_STATS} /> : null}
            </div>
          ) : null}

          {shown('stats') ? <StatCards stats={stats} /> : null}

          {shown('customers') ? <HomeCustomersTable defaultCustomers={customers} /> : null}

          {widgets.shown.size === 0 ? <DashboardEmptyGrid onShowAll={widgets.showAll} /> : null}
        </div>
      ) : (
        <DashboardViewPlaceholder item={item} backLabel="Home" onBack={() => go('home')} />
      )}

      <Modal isOpen={ticketOpen} onOpenChange={setTicketOpen} size="sm">
        <TicketForm
          onCancel={() => setTicketOpen(false)}
          onCreate={(subject, priority) => {
            setTicketsCreated((n) => n + 1);
            setTicketOpen(false);
            toast('Ticket created', { status: 'success', description: `${subject} (${priority} priority)` });
          }}
        />
      </Modal>
    </DashboardFrame>
  );
}

const PRIORITIES = ['Low', 'Normal', 'Urgent'] as const;

function TicketForm({ onCancel, onCreate }: { onCancel: () => void; onCreate: (subject: string, priority: string) => void }) {
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState<string>('Normal');
  const valid = subject.trim().length > 0;
  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) onCreate(subject.trim(), priority.toLowerCase());
      }}
    >
      <ModalHeader icon={RiTicketLine} title="Create ticket" description="Log a request for the support team. It counts toward Support tickets." />
      <ModalBody className="flex flex-col gap-4">
        <Input label="Subject" placeholder="e.g. Refund for order #1394" value={subject} onChange={setSubject} isRequired autoFocus />
        <Select label="Priority" selectedKey={priority} onSelectionChange={(key) => key != null && setPriority(String(key))}>
          {PRIORITIES.map((p) => (
            <SelectItem key={p} id={p} textValue={p}>
              {p}
            </SelectItem>
          ))}
        </Select>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!valid}>
          Create ticket
        </Button>
      </ModalFooter>
    </form>
  );
}
