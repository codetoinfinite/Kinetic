/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Channel Tabs Bar List" (boardui.com/templates/marketing).
 * No BoardUI source was used.
 */
"use client";

import { useId, useMemo, useState } from "react";
import type { ComponentType, CSSProperties } from "react";
import type { Key } from "react-aria-components";
import { RiArrowDownSLine } from "@remixicon/react";
import { Tab, TabList, TabPanel, Tabs } from "@/registry/ui/tabs";
import { IconButton } from "@/registry/ui/icon-button";
import { cx } from "@/registry/lib/cx";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export type BarListItem = {
  id: string;
  label: string;
  value: number;
  icon?: IconComponent;
};

export type BarListTab = {
  id: string;
  label: string;
  items: BarListItem[];
};

export interface ChannelTabsBarListProps {
  tabs: BarListTab[];
  /** Selected tab id. Controlled when defined. */
  selectedKey?: string;
  defaultSelectedKey?: string;
  onSelectionChange?: (id: string) => void;
  /** Caption for the value column. Default "Sessions". */
  metricLabel?: string;
  /** "share" shows each row's percent of the tab total, "value" the raw number. Default "share". */
  display?: "share" | "value";
  /** Rows shown before the expand button. Default 5. */
  limit?: number;
  /** Locale for numbers and percents. Default "en-US". */
  locale?: string;
  "aria-label"?: string;
  className?: string;
}

export type RankedRow = BarListItem & { share: number; width: number };

// #region critical
/** Sort largest first and size every bar against the leader, so the top row
 *  always spans the track and the rest read as fractions of it. Shares are
 *  of the tab total and drive the percent labels. */
export function rankBars(items: BarListItem[]): RankedRow[] {
  const total = items.reduce((sum, it) => sum + Math.max(0, it.value), 0);
  const max = items.reduce((m, it) => Math.max(m, it.value), 0);
  return [...items]
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .map((it) => ({
      ...it,
      share: total > 0 ? Math.max(0, it.value) / total : 0,
      width: max > 0 ? (Math.max(0, it.value) / max) * 100 : 0,
    }));
}

function BarRows({
  rows,
  limit,
  display,
  label,
  number,
  percent,
}: {
  rows: RankedRow[];
  limit: number;
  display: "share" | "value";
  label: string;
  number: Intl.NumberFormat;
  percent: Intl.NumberFormat;
}) {
  const listId = useId();
  const [expanded, setExpanded] = useState(false);
  const hidden = Math.max(0, rows.length - limit);
  const shown = expanded || hidden === 0 ? rows : rows.slice(0, limit);
  return (
    <div className="flex flex-col gap-2">
      <ol id={listId} aria-label={label} className="flex flex-col gap-1">
        {shown.map((row, i) => {
          const Icon = row.icon;
          // The last collapsed row fades out to say "the list goes on".
          const teaser = !expanded && hidden > 0 && i === shown.length - 1;
          return (
            <li key={row.id} className={cx("relative isolate h-9", teaser && "opacity-45")}>
              <span
                aria-hidden
                className="absolute inset-y-0 start-0 -z-10 w-(--bar) rounded-lg bg-status-blue-background transition-[width] duration-500 ease-out starting:w-0 motion-reduce:transition-none"
                style={{ "--bar": `${row.width.toFixed(2)}%` } as CSSProperties}
              />
              <span className="flex h-full items-center justify-between gap-3 px-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  {Icon ? <Icon className="size-4 shrink-0 text-foreground-icon-secondary" aria-hidden /> : null}
                  <span className="truncate text-body-medium text-text-primary">{row.label}</span>
                </span>
                <span className="shrink-0 text-body-medium text-text-secondary tabular-nums">
                  {display === "share" ? percent.format(row.share) : number.format(row.value)}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      {hidden > 0 ? (
        <IconButton
          icon={RiArrowDownSLine}
          size="small"
          aria-label={expanded ? "Show fewer" : `Show ${hidden} more`}
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((v) => !v)}
          className={cx(
            "self-center [&>svg]:transition-transform [&>svg]:duration-200 [&>svg]:ease-out motion-reduce:[&>svg]:transition-none",
            expanded && "[&>svg]:rotate-180",
          )}
        />
      ) : null}
    </div>
  );
}
// #endregion

export function ChannelTabsBarList({
  tabs,
  selectedKey,
  defaultSelectedKey,
  onSelectionChange,
  metricLabel = "Sessions",
  display = "share",
  limit = 5,
  locale = "en-US",
  "aria-label": ariaLabel = "Traffic sources",
  className,
}: ChannelTabsBarListProps) {
  const number = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const percent = useMemo(() => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }), [locale]);
  const ranked = useMemo(() => tabs.map((t) => ({ ...t, rows: rankBars(t.items) })), [tabs]);

  return (
    <section
      aria-label={ariaLabel}
      className={cx("@container flex w-full min-w-0 flex-col rounded-2xl bg-background-secondary-default p-2", className)}
    >
      <Tabs
        selectedKey={selectedKey}
        defaultSelectedKey={defaultSelectedKey ?? tabs[0]?.id}
        onSelectionChange={(k: Key) => onSelectionChange?.(String(k))}
      >
        <div className="flex">
          <div className="min-w-0 flex-1">
            <TabList aria-label={ariaLabel}>
              {tabs.map((t) => (
                <Tab key={t.id} id={t.id}>
                  {t.label}
                </Tab>
              ))}
            </TabList>
          </div>
          <span
            aria-hidden
            className="hidden items-center border-b border-separator-border ps-3 pe-2.5 text-caption-1-medium tracking-wide text-text-tertiary uppercase @sm:flex"
          >
            {metricLabel}
          </span>
        </div>
        {ranked.map((t) => (
          <TabPanel key={t.id} id={t.id} className="pt-2">
            <p className="flex justify-end px-2.5 pb-1 text-caption-1-medium tracking-wide text-text-tertiary uppercase @sm:hidden" aria-hidden>
              {metricLabel}
            </p>
            {t.rows.length > 0 ? (
              <BarRows
                rows={t.rows}
                limit={limit}
                display={display}
                label={`${t.label} by ${metricLabel.toLowerCase()}`}
                number={number}
                percent={percent}
              />
            ) : (
              <p className="px-2.5 py-6 text-center text-body-medium text-text-tertiary">No data yet.</p>
            )}
          </TabPanel>
        ))}
      </Tabs>
    </section>
  );
}
