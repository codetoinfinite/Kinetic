/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Bar List Card" (boardui.com/components/bar-list-card).
 * No BoardUI source was used.
 */
'use client';

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import type { Key } from 'react-aria-components';
import {
  RiAndroidLine,
  RiAppleLine,
  RiArrowDownSLine,
  RiChromeLine,
  RiComputerLine,
  RiEdgeLine,
  RiFirefoxLine,
  RiGlobalLine,
  RiOperaLine,
  RiSafariLine,
  RiSmartphoneLine,
  RiTabletLine,
  RiTerminalBoxLine,
  RiWindowsLine,
} from '@remixicon/react';

import { Tab, TabList, TabPanel, Tabs } from '@/registry/ui/tabs';
import { useReducedMotion } from '@/registry/hooks/use-reduced-motion';
import { cx } from '@/registry/lib/cx';

/* ------------------------------------------------------------------ types */

export type BarListMetric = 'share' | 'value';

export type BarListItem = {
  label: string;
  value: number;
  /** A 16px glyph drawn on the bar before the label: an icon, a flag, a favicon. */
  icon?: ReactNode;
};

export type BarListTab = {
  id: string;
  label: string;
  items: BarListItem[];
};

/* ------------------------------------------------------------ sample data */

function CountryCode({ code }: { code: string }) {
  return (
    <span className="flex h-3 w-[18px] items-center justify-center rounded-[2px] bg-background-primary-default text-[8px] leading-none font-semibold tracking-[0.02em] text-text-secondary ring-1 ring-border-button-default ring-inset">
      {code}
    </span>
  );
}

/** Thirty days of visitors (5,120 in every tab), broken down four ways. */
export const TRAFFIC_TABS: BarListTab[] = [
  {
    id: 'devices',
    label: 'Devices',
    items: [
      { label: 'Desktop', value: 3120, icon: <RiComputerLine /> },
      { label: 'Mobile', value: 1590, icon: <RiSmartphoneLine /> },
      { label: 'Tablet', value: 410, icon: <RiTabletLine /> },
    ],
  },
  {
    id: 'browsers',
    label: 'Browsers',
    items: [
      { label: 'Chrome', value: 2480, icon: <RiChromeLine /> },
      { label: 'Safari', value: 1310, icon: <RiSafariLine /> },
      { label: 'Edge', value: 540, icon: <RiEdgeLine /> },
      { label: 'Firefox', value: 430, icon: <RiFirefoxLine /> },
      { label: 'Opera', value: 190, icon: <RiOperaLine /> },
      { label: 'Samsung Internet', value: 110, icon: <RiGlobalLine /> },
      { label: 'Other', value: 60, icon: <RiGlobalLine /> },
    ],
  },
  {
    id: 'os',
    label: 'Operating systems',
    items: [
      { label: 'Windows', value: 1840, icon: <RiWindowsLine /> },
      { label: 'macOS', value: 1270, icon: <RiAppleLine /> },
      { label: 'iOS', value: 1010, icon: <RiAppleLine /> },
      { label: 'Android', value: 690, icon: <RiAndroidLine /> },
      { label: 'Linux', value: 230, icon: <RiTerminalBoxLine /> },
      { label: 'ChromeOS', value: 80, icon: <RiChromeLine /> },
    ],
  },
  {
    id: 'countries',
    label: 'Countries',
    items: [
      { label: 'United States of America', value: 1480, icon: <CountryCode code="US" /> },
      { label: 'India', value: 1020, icon: <CountryCode code="IN" /> },
      { label: 'Brazil', value: 660, icon: <CountryCode code="BR" /> },
      { label: 'Japan', value: 470, icon: <CountryCode code="JP" /> },
      { label: 'Türkiye', value: 450, icon: <CountryCode code="TR" /> },
      { label: 'Germany', value: 410, icon: <CountryCode code="DE" /> },
      { label: 'United Kingdom', value: 380, icon: <CountryCode code="GB" /> },
      { label: 'France', value: 250, icon: <CountryCode code="FR" /> },
    ],
  },
];

/* ---------------------------------------------------------------- helpers */

const ROW_PITCH = 40; // 36px row + 4px gap
const PEEK = 30; // 4px gap + 26px of the first hidden row
const PILL_SPACE = 26; // band under the last row for the collapse pill
const BAR_MIN = 8; // px, so a 1% item still shows a rounded nub

const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const defaultFormat = (value: number) => integer.format(value);

function formatShare(share: number) {
  if (share <= 0) return '0%';
  if (share < 0.01) return '<1%';
  return `${Math.round(share * 100)}%`;
}

/** False for the first painted frame, then true, so bars grow in from their nub. */
function useGrown(skip: boolean) {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    if (skip) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setGrown(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [skip]);
  return grown || skip;
}

type RankedItem = BarListItem & { share: number; width: number };

function rank(items: BarListItem[]): RankedItem[] {
  const clean = items.filter((it) => Number.isFinite(it.value) && it.value >= 0);
  const total = clean.reduce((sum, it) => sum + it.value, 0);
  const max = clean.reduce((m, it) => Math.max(m, it.value), 0);
  return clean
    .map((it) => ({ ...it, share: total > 0 ? it.value / total : 0, width: max > 0 ? it.value / max : 0 }))
    .sort((a, b) => b.value - a.value);
}

/* ------------------------------------------------------------------- rows */

type RowsProps = {
  name: string;
  items: BarListItem[];
  metric: BarListMetric;
  metricLabel: string;
  limit: number;
  mono: boolean;
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
  formatValue: (value: number) => string;
};

function BarRow({
  item,
  metric,
  metricLabel,
  mono,
  grown,
  formatValue,
}: {
  item: RankedItem;
  metric: BarListMetric;
  metricLabel: string;
  mono: boolean;
  grown: boolean;
  formatValue: (value: number) => string;
}) {
  const share = formatShare(item.share);
  const count = formatValue(item.value);
  const primary = metric === 'share' ? share : count;
  const secondary = metric === 'share' ? `${count} ${metricLabel.toLowerCase()}` : share;

  return (
    <li className="group/row relative flex h-9 items-center gap-3 rounded-lg px-2.5">
      <span
        aria-hidden
        data-bar
        className={cx(
          'absolute inset-y-0 left-0 rounded-lg transition-[width,background-color] duration-500 ease-out motion-reduce:transition-none',
          mono
            ? 'bg-chart-track group-hover/row:bg-chart-neutral dark:group-hover/row:bg-neutral-700'
            : 'bg-notification-information-background group-hover/row:bg-accent-200 dark:group-hover/row:bg-accent-800/80',
        )}
        style={{
          width: grown ? `${item.width * 100}%` : 0,
          minWidth: item.value > 0 ? BAR_MIN : 0,
        }}
      />
      <span className="relative flex min-w-0 flex-1 items-center gap-2">
        {item.icon != null && (
          <span
            aria-hidden
            className="flex size-4 shrink-0 items-center justify-center text-text-secondary [&>svg]:size-4"
          >
            {item.icon}
          </span>
        )}
        <span className="truncate text-body-regular text-text-primary">{item.label}</span>
      </span>
      <span className="relative flex shrink-0 items-baseline gap-2 tabular-nums">
        <span className="text-caption-1-regular text-text-tertiary opacity-0 transition-opacity duration-150 ease-out group-hover/row:opacity-100 motion-reduce:transition-none">
          {secondary}
        </span>
        <span key={metric} data-metric-value className="animate-number-fade text-body-regular text-text-primary motion-reduce:animate-none">
          {primary}
        </span>
      </span>
    </li>
  );
}

// #region critical
function BarRows({
  name,
  items,
  metric,
  metricLabel,
  limit,
  mono,
  expanded,
  onExpandedChange,
  formatValue,
}: RowsProps) {
  const reduced = useReducedMotion();
  const grown = useGrown(reduced);
  const moreId = useId();
  const ranked = useMemo(() => rank(items), [items]);

  const cap = Math.max(1, Math.floor(limit));
  const shown = ranked.slice(0, cap);
  const rest = ranked.slice(cap);
  // Shares are of the tab's total and widths of its largest item, so hidden
  // rows never change the visible bars when they expand.
  const openHeight = rest.length * ROW_PITCH + PILL_SPACE;
  const row = (item: RankedItem) => (
    <BarRow
      key={item.label}
      item={item}
      metric={metric}
      metricLabel={metricLabel}
      mono={mono}
      grown={grown}
      formatValue={formatValue}
    />
  );

  if (ranked.length === 0) {
    return <p className="px-2.5 py-2 text-body-regular text-text-tertiary">No data yet</p>;
  }

  return (
    <div className="flex flex-col">
      <ul aria-label={`${name} by ${metricLabel.toLowerCase()}`} className="flex flex-col gap-1">
        {shown.map(row)}
      </ul>
      {rest.length > 0 && (
        <div className="relative">
          <div
            id={moreId}
            inert={!expanded}
            data-expanded={expanded || undefined}
            className="overflow-hidden transition-[height] duration-300 ease-out motion-reduce:transition-none"
            style={{
              height: expanded ? openHeight : PEEK,
              maskImage: expanded ? undefined : 'linear-gradient(to bottom, black, transparent)',
              WebkitMaskImage: expanded ? undefined : 'linear-gradient(to bottom, black, transparent)',
            }}
          >
            <ul aria-label={`More ${name.toLowerCase()}`} className="flex flex-col gap-1 pt-1">
              {rest.map(row)}
            </ul>
          </div>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={moreId}
            aria-label={expanded ? 'Show fewer' : `Show ${rest.length} more`}
            onClick={() => onExpandedChange(!expanded)}
            className="absolute bottom-1 left-1/2 flex h-4.5 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-border-button-default bg-background-primary-default text-foreground-icon-primary shadow-xs outline-none transition-colors duration-150 ease-out after:absolute after:-inset-x-2 after:-inset-y-3 hover:bg-background-secondary-default focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            <RiArrowDownSLine
              aria-hidden
              className={cx(
                'size-3.5 transition-transform duration-300 ease-out motion-reduce:transition-none',
                expanded && 'rotate-180',
              )}
            />
          </button>
        </div>
      )}
    </div>
  );
}
// #endregion

/* ---------------------------------------------------------------- caption */

function MetricCaption({
  label,
  metric,
  onToggle,
}: {
  label: string;
  metric: BarListMetric;
  onToggle?: () => void;
}) {
  const text = 'text-caption-1-medium uppercase tracking-[0.04em] text-text-tertiary';
  if (!onToggle) return <span className={text}>{label}</span>;

  const unit = (on: boolean) =>
    cx(
      'rounded-full px-1 transition-colors duration-150 ease-out motion-reduce:transition-none',
      on ? 'bg-background-primary-default text-text-primary shadow-xs dark:bg-neutral-700' : 'text-text-tertiary',
    );

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${label}: showing ${metric === 'share' ? 'share of total' : 'counts'}. Show ${
        metric === 'share' ? 'counts' : 'shares'
      }`}
      className={cx(
        text,
        'inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 outline-none transition-colors duration-150 ease-out hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-border-focus-ring',
      )}
    >
      {label}
      <span aria-hidden className="inline-flex rounded-full bg-chart-track p-px tracking-normal">
        <span data-unit="share" className={unit(metric === 'share')}>%</span>
        <span data-unit="value" className={unit(metric === 'value')}>#</span>
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------- card */

export type BarListCardProps = {
  /** Lists behind underline tabs. Ignored when `items` is set. */
  tabs?: BarListTab[];
  /** One list without tabs; `title` names it. */
  items?: BarListItem[];
  /** Header of a single list, and the card's accessible name. */
  title?: string;
  /** Controlled tab id. */
  tab?: string;
  defaultTab?: string;
  onTabChange?: (id: string) => void;
  /** Caption over the numbers, e.g. "Visitors" or "Views". */
  metricLabel?: string;
  /** Controlled metric: share of the list's total, or the raw value. */
  metric?: BarListMetric;
  defaultMetric?: BarListMetric;
  onMetricChange?: (metric: BarListMetric) => void;
  /** Turns the caption into a share / count switch. */
  metricToggle?: boolean;
  /** Rows shown before the rest fold behind the show-more pill. */
  limit?: number;
  /** One grey ink for every bar. */
  mono?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
};

export function BarListCard({
  tabs = TRAFFIC_TABS,
  items,
  title,
  tab,
  defaultTab,
  onTabChange,
  metricLabel = 'Visitors',
  metric,
  defaultMetric = 'share',
  onMetricChange,
  metricToggle = true,
  limit = 5,
  mono = false,
  formatValue = defaultFormat,
  className,
}: BarListCardProps) {
  const [innerTab, setInnerTab] = useState(() => defaultTab ?? tabs[0]?.id ?? '');
  const [innerMetric, setInnerMetric] = useState<BarListMetric>(defaultMetric);
  const [expandedIn, setExpandedIn] = useState<string | null>(null);

  const activeTab = tab ?? innerTab;
  const activeMetric = metric ?? innerMetric;

  const toggleMetric = metricToggle
    ? () => {
        const next: BarListMetric = activeMetric === 'share' ? 'value' : 'share';
        setInnerMetric(next);
        onMetricChange?.(next);
      }
    : undefined;

  const selectTab = (key: Key) => {
    const id = String(key);
    setInnerTab(id);
    setExpandedIn(null);
    onTabChange?.(id);
  };

  const rows = (id: string, name: string, list: BarListItem[]) => (
    <BarRows
      name={name}
      items={list}
      metric={activeMetric}
      metricLabel={metricLabel}
      limit={limit}
      mono={mono}
      expanded={expandedIn === id}
      onExpandedChange={(open) => setExpandedIn(open ? id : null)}
      formatValue={formatValue}
    />
  );

  const frame = 'flex min-w-0 flex-col rounded-2xl bg-background-secondary-default';

  if (items) {
    const name = title ?? metricLabel;
    return (
      <section aria-label={name} className={cx(frame, className)}>
        <header className="flex h-[45px] items-center justify-between gap-3 border-b border-separator-border pr-3 pl-[26px]">
          <h3 className="truncate text-body-medium text-text-primary">{name}</h3>
          <MetricCaption label={metricLabel} metric={activeMetric} onToggle={toggleMetric} />
        </header>
        <div className="p-2">{rows('items', name, items)}</div>
      </section>
    );
  }

  const name = title ?? 'Breakdown';
  return (
    <section aria-label={name} className={cx(frame, className)}>
      <Tabs selectedKey={activeTab} onSelectionChange={selectTab} className="gap-0">
        <div className="flex items-stretch border-b border-separator-border">
          {/* The strip scrolls sideways when the tabs outgrow the card; its
              right edge fades under the caption. -mb-px lays the underline on
              the divider. */}
          <div
            className="-mb-px min-w-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{
              maskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent)',
              WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 24px), transparent)',
            }}
          >
            <div className="w-max min-w-full pt-2 pr-6 pl-4">
              <TabList aria-label={name} className="border-b-0">
                {tabs.map((t) => (
                  <Tab key={t.id} id={t.id}>
                    {t.label}
                  </Tab>
                ))}
              </TabList>
            </div>
          </div>
          <div className="flex shrink-0 items-center pt-2 pr-3 pl-1">
            <MetricCaption label={metricLabel} metric={activeMetric} onToggle={toggleMetric} />
          </div>
        </div>
        {tabs.map((t) => (
          <TabPanel key={t.id} id={t.id} className="p-2">
            {rows(t.id, t.label, t.items)}
          </TabPanel>
        ))}
      </Tabs>
    </section>
  );
}
