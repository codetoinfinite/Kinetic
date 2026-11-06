/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Finance Dashboard" (boardui.com/templates/finance).
 * No BoardUI source was used.
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiAddLine, RiBankCardLine, RiExchangeFundsLine, RiHandCoinLine, RiWallet3Line } from '@remixicon/react';
import { Button } from '@/registry/ui/button';
import { FinanceKpiRow } from '@/registry/ui/finance-kpi-row';
import type { FinanceKpi } from '@/registry/ui/finance-kpi-row';
import { HeatmapChartCard } from '@/registry/ui/heatmap-chart-card';
import type { HeatmapRange } from '@/registry/ui/heatmap-chart-card';
import { Input } from '@/registry/ui/input';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/registry/ui/modal';
import { RadialChartCard } from '@/registry/ui/radial-chart-card';
import type { RadialRange } from '@/registry/ui/radial-chart-card';
import { SankeyChartCard } from '@/registry/ui/sankey-chart-card';
import type { FlowLink, FlowNode, FlowRange } from '@/registry/ui/sankey-chart-card';
import { ScatterChartCard } from '@/registry/ui/scatter-chart-card';
import type { ScatterRange } from '@/registry/ui/scatter-chart-card';
import { Select, SelectItem } from '@/registry/ui/select';
import { toast } from '@/registry/ui/toast';
import { TransactionsTable } from '@/registry/ui/transactions-table';
import type { Transaction, TransactionAccount, TransactionCategory } from '@/registry/ui/transactions-table';
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
 * The BoardUI finance dashboard as one working page. The kit sidebar switches
 * views inside the block, Filters shows and hides each widget, and Add
 * transaction writes a row into the transactions table and moves the KPI
 * cards with it. Every chart is a kit card fed with fixed sample data.
 */

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const formatMoney = (value: number) => money.format(value);
const formatPercent = (value: number) => `${Math.round(value)}%`;

/* ---------- Cash flow: income sources on the left, spending on the right ---------- */

const FLOW_SOURCES: FlowNode[] = [
  { name: 'Salary', color: 'emerald' },
  { name: 'Freelance', color: 'blue' },
  { name: 'Dividends', color: 'purple' },
];
const FLOW_SINKS = ['Housing', 'Groceries', 'Transport', 'Subscriptions', 'Dining', 'Investing', 'Savings'];

function flowRange(id: string, label: string, matrix: number[][], delta: number): FlowRange {
  const links: FlowLink[] = [];
  matrix.forEach((row, s) =>
    row.forEach((value, t) => {
      if (value > 0) links.push({ source: s, target: FLOW_SOURCES.length + t, value });
    }),
  );
  return { id, label, delta, nodes: [...FLOW_SOURCES, ...FLOW_SINKS.map((name) => ({ name }))], links };
}

// Rows are Salary, Freelance, Dividends; columns follow FLOW_SINKS. This month totals $18,420.
const CASH_FLOW: FlowRange[] = [
  flowRange('month', 'This month', [
    [2580, 1290, 550, 0, 0, 4000, 3980],
    [0, 0, 0, 370, 920, 1200, 1310],
    [0, 0, 0, 0, 0, 1430, 790],
  ], 6.1),
  flowRange('last-month', 'Last month', [
    [2580, 1340, 610, 0, 0, 3900, 3970],
    [0, 0, 0, 370, 860, 900, 770],
    [0, 0, 0, 0, 0, 1300, 760],
  ], 2.8),
  flowRange('quarter', 'This quarter', [
    [7740, 3900, 1700, 0, 0, 12000, 11860],
    [0, 0, 0, 1110, 2680, 3400, 3210],
    [0, 0, 0, 0, 0, 4200, 2280],
  ], 4.9),
];

/* ---------- Spending by category: innermost ring first ---------- */

const SPEND_CATEGORIES = [
  { label: 'Subscriptions', color: 'lime' },
  { label: 'Transport', color: 'blue' },
  { label: 'Dining', color: 'purple' },
  { label: 'Groceries', color: 'pink' },
  { label: 'Housing', color: 'yellow' },
] as const;

const spendRange = (id: string, label: string, values: number[], delta: number): RadialRange => ({
  id,
  label,
  delta,
  items: SPEND_CATEGORIES.map((c, i) => ({ label: c.label, color: c.color, value: values[i] ?? 0 })),
});

const SPENDING: RadialRange[] = [
  spendRange('month', 'This month', [500, 700, 890, 1320, 2400], 2.4),
  spendRange('last-month', 'Last month', [480, 760, 820, 1250, 2400], -1.2),
  spendRange('quarter', 'This quarter', [1480, 2110, 2590, 3940, 7200], 3.1),
];

/* ---------- Portfolio: risk score against return, bubble size is the holding ---------- */

const PORTFOLIO: ScatterRange[] = [
  {
    id: 'ytd',
    label: 'Year to date',
    change: 6.2,
    series: [
      {
        label: 'Stocks',
        points: [
          { x: 15, y: 6, z: 25, label: 'Dividend stocks' },
          { x: 22, y: 6, z: 30, label: 'Utilities ETF' },
          { x: 27, y: 8, z: 50, label: 'S&P 500 index' },
          { x: 33, y: 9, z: 70, label: 'Tech growth' },
          { x: 40, y: 11, z: 30, label: 'Small caps' },
        ],
      },
      {
        label: 'Funds',
        points: [
          { x: 5, y: 2, z: 35, label: 'Treasury fund' },
          { x: 7, y: 3, z: 30, label: 'Money market' },
          { x: 9, y: 3, z: 55, label: 'Bond fund' },
          { x: 11, y: 4, z: 40, label: 'Balanced fund' },
        ],
      },
      {
        label: 'Crypto',
        points: [
          { x: 68, y: 14, z: 20, label: 'Bitcoin' },
          { x: 79, y: 10, z: 15, label: 'Ether' },
        ],
      },
    ],
  },
  {
    id: '12m',
    label: 'Last 12 months',
    change: 4.1,
    series: [
      {
        label: 'Stocks',
        points: [
          { x: 15, y: 5, z: 25, label: 'Dividend stocks' },
          { x: 22, y: 5, z: 30, label: 'Utilities ETF' },
          { x: 27, y: 7, z: 50, label: 'S&P 500 index' },
          { x: 33, y: 8, z: 70, label: 'Tech growth' },
          { x: 40, y: 10, z: 30, label: 'Small caps' },
        ],
      },
      {
        label: 'Funds',
        points: [
          { x: 5, y: 2, z: 35, label: 'Treasury fund' },
          { x: 7, y: 3, z: 30, label: 'Money market' },
          { x: 9, y: 3, z: 55, label: 'Bond fund' },
          { x: 11, y: 4, z: 40, label: 'Balanced fund' },
        ],
      },
      {
        label: 'Crypto',
        points: [
          { x: 68, y: 18, z: 20, label: 'Bitcoin' },
          { x: 79, y: 6, z: 15, label: 'Ether' },
        ],
      },
    ],
  },
];

/* ---------- Daily spending: weekday x week, deterministic sample values ---------- */

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_BASE = [40, 38, 50, 44, 58, 70, 48];
const WEEK_COLUMNS = Array.from({ length: 12 }, (_, i) => `W${i + 1}`);
const dailyValue = (d: number, w: number) => (DAY_BASE[d] ?? 40) + ((w * 7 + d * 13) % 9) * 3;

const DAILY: HeatmapRange[] = [
  {
    id: '12w',
    label: 'Last 12 weeks',
    change: 3.6,
    columns: WEEK_COLUMNS,
    rows: WEEKDAYS.map((label, d) => ({ label, values: WEEK_COLUMNS.map((_, w) => dailyValue(d, w)) })),
  },
  {
    id: '6w',
    label: 'Last 6 weeks',
    change: 1.9,
    columns: WEEK_COLUMNS.slice(6),
    rows: WEEKDAYS.map((label, d) => ({ label, values: WEEK_COLUMNS.slice(6).map((_, w) => dailyValue(d, w + 6)) })),
  },
];

/* ---------- Transactions ---------- */

type Row = [string, TransactionCategory, TransactionAccount, string, number, Transaction['status']?];

const TX_ROWS: Row[] = [
  ['Whole Foods Market', 'groceries', 'savings', '2026-10-28', -135],
  ['Spotify', 'subscriptions', 'savings', '2026-10-15', -12],
  ['Acme Corp payroll', 'income', 'savings', '2026-10-31', 6200],
  ['iCloud storage', 'subscriptions', 'savings', '2026-10-03', -3],
  ['Electric utility', 'utilities', 'credit', '2026-10-06', -91],
  ['Whole Foods Market', 'groceries', 'savings', '2026-10-21', -161],
  ['Studio K invoice', 'income', 'checking', '2026-11-02', 1286, 'pending'],
  ['Shell', 'transport', 'credit', '2026-11-01', -76],
  ['Netflix', 'subscriptions', 'credit', '2026-10-14', -18],
  ['Rent, Oak Street', 'housing', 'checking', '2026-11-01', -2580],
  ['Vanguard transfer', 'investing', 'savings', '2026-10-30', -1200],
  ['Trattoria Roma', 'dining', 'credit', '2026-10-25', -84],
  ['Dividend payout', 'income', 'savings', '2026-10-20', 2220],
  ['City metro card', 'transport', 'credit', '2026-10-12', -45],
  ['Pharmacy', 'health', 'credit', '2026-10-09', -38, 'failed'],
  ['Lisbon flights', 'travel', 'credit', '2026-09-28', -412],
  ['Acme Corp payroll', 'income', 'savings', '2026-09-30', 6200],
  ['Farmers market', 'groceries', 'checking', '2026-09-27', -52],
  ['Gym membership', 'health', 'checking', '2026-09-15', -49],
  ['Coffee Lab', 'dining', 'credit', '2026-09-11', -7],
];

export const FINANCE_TRANSACTIONS: Transaction[] = TX_ROWS.map(([name, category, account, date, amount, status], i) => ({
  id: `tx-${i + 1}`,
  name,
  category,
  account,
  date,
  amount,
  status: status ?? 'completed',
}));

const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  housing: 'Housing',
  groceries: 'Groceries',
  transport: 'Transport',
  dining: 'Dining',
  subscriptions: 'Subscriptions',
  utilities: 'Utilities',
  travel: 'Travel',
  health: 'Health',
  income: 'Income',
  investing: 'Investing',
};
const ACCOUNT_LABELS: Record<TransactionAccount, string> = { checking: 'Checking', savings: 'Savings', credit: 'Credit card' };

/* ---------- KPIs: fixed bases that move with every added transaction ---------- */

const BASE = { balance: 84230, income: 18420, expenses: 9140, invested: 32400 };
const TRENDS = {
  balance: [78100, 79400, 80250, 81600, 81900],
  income: [16200, 17100, 16800, 17360],
  expenses: [8600, 9300, 8900, 8925],
  invested: [27800, 28900, 30100, 29900],
};

export type FinanceWidget = 'kpis' | 'cashflow' | 'spending' | 'portfolio' | 'daily' | 'transactions';

export const FINANCE_WIDGETS: readonly { id: FinanceWidget; label: string }[] = [
  { id: 'kpis', label: 'Key metrics' },
  { id: 'cashflow', label: 'Cash flow' },
  { id: 'spending', label: 'Spending by category' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'daily', label: 'Daily spending' },
  { id: 'transactions', label: 'Transactions' },
];
const ALL_WIDGETS: readonly FinanceWidget[] = FINANCE_WIDGETS.map((w) => w.id);
const ROW_COLS = ['', 'lg:grid-cols-1', 'lg:grid-cols-2', 'lg:grid-cols-3'] as const;

// The KPI row types its icon as a plain component; thin wrappers keep Remix icons assignable.
type KpiIcon = NonNullable<FinanceKpi['icon']>;
const WalletIcon: KpiIcon = (p) => <RiWallet3Line {...p} />;
const IncomeIcon: KpiIcon = (p) => <RiHandCoinLine {...p} />;
const CardIcon: KpiIcon = (p) => <RiBankCardLine {...p} />;
const InvestIcon: KpiIcon = (p) => <RiExchangeFundsLine {...p} />;

export interface FinanceDashboardProps {
  /** Nav key on screen. Controlled; pair with onViewChange. */
  view?: string;
  /** Initial nav key when uncontrolled. Default "finance". */
  defaultView?: string;
  onViewChange?: (key: string) => void;
  /** Initial rows of the transactions table. */
  transactions?: readonly Transaction[];
  /** ISO date stamped on new transactions. Default "2026-11-05". */
  today?: string;
  /** Widgets shown on first render. Default all six. */
  defaultWidgets?: readonly FinanceWidget[];
  className?: string;
}

// #region critical
export function FinanceDashboard({
  view,
  defaultView = 'finance',
  onViewChange,
  transactions: initialTransactions = FINANCE_TRANSACTIONS,
  today = '2026-11-05',
  defaultWidgets = ALL_WIDGETS,
  className,
}: FinanceDashboardProps) {
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
  const [rows, setRows] = useState<Transaction[]>(() => [...initialTransactions]);
  const [added, setAdded] = useState<Transaction[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const nextId = useRef(1);


  // Only transactions added on this page move the cards; the sample rows are already in the bases.
  const kpis = useMemo<FinanceKpi[]>(() => {
    const inflow = added.reduce((sum, t) => sum + Math.max(0, t.amount), 0);
    const outflow = added.reduce((sum, t) => sum + Math.max(0, -t.amount), 0);
    const invested = added.reduce((sum, t) => sum + (t.category === 'investing' ? -t.amount : 0), 0);
    const balance = BASE.balance + inflow - outflow;
    return [
      { id: 'balance', label: 'Total balance', icon: WalletIcon, value: balance, change: 0.032, trend: [...TRENDS.balance, balance] },
      { id: 'income', label: 'Income', icon: IncomeIcon, value: BASE.income + inflow, change: 0.061, trend: [...TRENDS.income, BASE.income + inflow] },
      {
        id: 'expenses',
        label: 'Expenses',
        icon: CardIcon,
        value: BASE.expenses + outflow,
        change: 0.024,
        goodDirection: 'down',
        trend: [...TRENDS.expenses, BASE.expenses + outflow],
      },
      { id: 'invested', label: 'Invested', icon: InvestIcon, value: BASE.invested + invested, change: 0.084, trend: [...TRENDS.invested, BASE.invested + invested] },
    ];
  }, [added]);

  const addTransaction = (draft: Omit<Transaction, 'id' | 'date' | 'status'>) => {
    const tx: Transaction = { ...draft, id: `tx-new-${nextId.current++}`, date: today, status: 'completed' };
    setRows((prev) => [tx, ...prev]);
    setAdded((prev) => [...prev, tx]);
    setFormOpen(false);
    toast('Transaction added', { status: 'success', description: `${tx.name}: ${tx.amount > 0 ? '+' : '-'}${formatMoney(Math.abs(tx.amount))}` });
  };
  // #endregion

  const item = findView(current);
  const isHome = current === 'finance';
  const lower = (['spending', 'portfolio', 'daily'] as const).filter(shown);

  const actions = isHome ? (
    <>
      <DashboardWidgetMenu widgets={FINANCE_WIDGETS} shown={widgets.shown} onToggle={widgets.toggle} onShowAll={widgets.showAll} />
      <Button leadingIcon={RiAddLine} onClick={() => setFormOpen(true)}>
        Add transaction
      </Button>
    </>
  ) : undefined;

  return (
    <DashboardFrame view={current} onViewChange={go} label={item.label} className={className}>
      <DashboardHeader title={item.label} current={item} homeKey="finance" onViewChange={go} actions={actions} />

      {isHome ? (
        <div className="mt-5 flex flex-col gap-4">
          {shown('kpis') ? <FinanceKpiRow items={kpis} /> : null}
          {shown('cashflow') ? <CashFlowCard /> : null}
          {lower.length ? (
            <div className={cx('grid grid-cols-1 gap-4', ROW_COLS[lower.length])}>
              {shown('spending') ? (
                <RadialChartCard title="Spending by category" variant="labels" ranges={SPENDING} tiles={false} formatValue={formatMoney} />
              ) : null}
              {shown('portfolio') ? (
                <ScatterChartCard
                  title="Portfolio"
                  ranges={PORTFOLIO}
                  axisLabels={['Risk score', 'Return']}
                  format={formatPercent}
                  formatX={(v) => String(Math.round(v))}
                  tiles={false}
                />
              ) : null}
              {shown('daily') ? (
                <HeatmapChartCard
                  title="Daily spending"
                  ranges={DAILY}
                  format={formatMoney}
                  cellLabel={(row, column) => `${row}, ${column}`}
                />
              ) : null}
            </div>
          ) : null}
          {shown('transactions') ? <TransactionsTable transactions={rows} pageSize={8} /> : null}
          {widgets.shown.size === 0 ? <DashboardEmptyGrid onShowAll={widgets.showAll} /> : null}
        </div>
      ) : (
        <DashboardViewPlaceholder item={item} backLabel="Finance" onBack={() => go('finance')} />
      )}

      <Modal isOpen={formOpen} onOpenChange={setFormOpen} size="sm">
        <TransactionForm onCancel={() => setFormOpen(false)} onAdd={addTransaction} />
      </Modal>
    </DashboardFrame>
  );
}

/**
 * The Sankey card starts its sweep clock in an effect and reads rAF frame times. When it mounts
 * inside this page's long first commit, the first frame can predate that clock and draw a negative
 * clip width. Mounting it a frame later in its own small subtree keeps that commit short.
 */
function CashFlowCard() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let timer = 0;
    const raf = requestAnimationFrame(() => {
      timer = window.setTimeout(() => setReady(true), 0);
    });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, []);
  if (!ready) return <div aria-hidden className="h-[386px]" />;
  return (
    <SankeyChartCard
      title="Cash flow"
      ranges={CASH_FLOW}
      formatValue={formatMoney}
      sourceCaption="Income"
      targetCaption="Spending"
      chartHeight={320}
    />
  );
}

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as TransactionCategory[];
const ACCOUNT_KEYS = Object.keys(ACCOUNT_LABELS) as TransactionAccount[];

function TransactionForm({
  onCancel,
  onAdd,
}: {
  onCancel: () => void;
  onAdd: (draft: Omit<Transaction, 'id' | 'date' | 'status'>) => void;
}) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'out' | 'in'>('out');
  const [category, setCategory] = useState<TransactionCategory>('groceries');
  const [account, setAccount] = useState<TransactionAccount>('checking');
  const value = Number(amount);
  const amountOk = amount.trim() !== '' && Number.isFinite(value) && value > 0;
  const valid = name.trim().length > 0 && amountOk;

  return (
    <form
      className="contents"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        const signed = Math.round(value) * (direction === 'in' ? 1 : -1);
        onAdd({ name: name.trim(), amount: signed, category, account });
      }}
    >
      <ModalHeader icon={RiExchangeFundsLine} title="Add transaction" description="It lands at the top of the table and updates the cards above." />
      <ModalBody className="flex flex-col gap-4">
        <Input label="Merchant or payer" placeholder="e.g. Whole Foods Market" value={name} onChange={setName} isRequired autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount (USD)"
            placeholder="0"
            inputMode="numeric"
            value={amount}
            onChange={setAmount}
            isRequired
            isInvalid={amount.trim() !== '' && !amountOk}
            errorMessage="Enter an amount above zero."
          />
          <Select
            label="Direction"
            selectedKey={direction}
            onSelectionChange={(key) => {
              if (key === 'in' || key === 'out') {
                setDirection(key);
                if (key === 'in') setCategory('income');
              }
            }}
          >
            <SelectItem id="out" textValue="Money out">
              Money out
            </SelectItem>
            <SelectItem id="in" textValue="Money in">
              Money in
            </SelectItem>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Category" selectedKey={category} onSelectionChange={(key) => key != null && setCategory(String(key) as TransactionCategory)}>
            {CATEGORY_KEYS.map((c) => (
              <SelectItem key={c} id={c} textValue={CATEGORY_LABELS[c]}>
                {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </Select>
          <Select label="Account" selectedKey={account} onSelectionChange={(key) => key != null && setAccount(String(key) as TransactionAccount)}>
            {ACCOUNT_KEYS.map((a) => (
              <SelectItem key={a} id={a} textValue={ACCOUNT_LABELS[a]}>
                {ACCOUNT_LABELS[a]}
              </SelectItem>
            ))}
          </Select>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!valid}>
          Add transaction
        </Button>
      </ModalFooter>
    </form>
  );
}
