/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Campaigns Table" (boardui.com/templates/marketing).
 * No BoardUI source was used.
 */
"use client";

import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { parseDate } from "@internationalized/date";
import type { Key, SortDescriptor } from "react-aria-components";
import {
  RiGoogleFill,
  RiLinkedinBoxFill,
  RiMailLine,
  RiMetaFill,
  RiTiktokFill,
  RiTwitterXFill,
} from "@remixicon/react";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@/registry/ui/table";
import { Pagination } from "@/registry/ui/pagination";
import { ProgressTrack } from "@/registry/ui/progress";
import { StatusDot } from "@/registry/ui/status-dot";
import { Select, SelectItem } from "@/registry/ui/select";
import { SegmentedControl, SegmentedControlItem } from "@/registry/ui/segmented-control";
import { ChevronSortDown } from "@/registry/lib/chevrons";
import { cx } from "@/registry/lib/cx";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export type CampaignChannel = "google" | "meta" | "x" | "linkedin" | "email" | "tiktok";
export type CampaignStatus = "active" | "paused" | "draft";
export type CampaignSortColumn = "name" | "channel" | "status" | "budget" | "ctr" | "updated";

export type Campaign = {
  id: string;
  name: string;
  channel: CampaignChannel;
  /** Short goal shown under the name, e.g. "Conversions". */
  objective: string;
  status: CampaignStatus;
  /** Budget and spend in whole currency units. */
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  /** Last edit as an ISO date, YYYY-MM-DD. */
  updated: string;
};

export interface CampaignsTableProps {
  campaigns: Campaign[];
  /** Rows per page. Default 6. */
  pageSize?: number;
  /** Controlled sort. Columns: name, channel, status, budget, ctr, updated. */
  sortDescriptor?: SortDescriptor;
  defaultSortDescriptor?: SortDescriptor;
  onSortChange?: (sort: SortDescriptor) => void;
  /** ISO 4217 code for budget and spend. Default "USD". */
  currency?: string;
  /** Locale for money, percents and dates. Default "en-US". */
  locale?: string;
  /** Accessible name of the card and the table. Default "Campaigns". */
  label?: string;
  className?: string;
}

const CHANNEL: Record<CampaignChannel, { label: string; icon: IconComponent }> = {
  google: { label: "Google Ads", icon: RiGoogleFill },
  meta: { label: "Meta", icon: RiMetaFill },
  x: { label: "X Ads", icon: RiTwitterXFill },
  linkedin: { label: "LinkedIn", icon: RiLinkedinBoxFill },
  email: { label: "Email", icon: RiMailLine },
  tiktok: { label: "TikTok", icon: RiTiktokFill },
};

const STATUS: Record<CampaignStatus, { label: string; dot: "green" | "yellow" | "indigo"; rank: number }> = {
  active: { label: "Active", dot: "green", rank: 0 },
  paused: { label: "Paused", dot: "yellow", rank: 1 },
  draft: { label: "Draft", dot: "indigo", rank: 2 },
};

type ColumnDef = { id: CampaignSortColumn; label: string; className?: string; end?: boolean };

const COLUMNS: ColumnDef[] = [
  { id: "name", label: "Campaign", className: "w-[28%]" },
  { id: "channel", label: "Channel" },
  { id: "status", label: "Status" },
  { id: "budget", label: "Budget spent", className: "w-[22%]" },
  { id: "ctr", label: "CTR", end: true, className: "text-end" },
  { id: "updated", label: "Last updated" },
];

const DEFAULT_SORT: SortDescriptor = { column: "updated", direction: "descending" };

// #region critical
/** Click-through rate as a fraction, or null before the first impression. */
export function ctrOf(c: Pick<Campaign, "clicks" | "impressions">): number | null {
  return c.impressions > 0 ? c.clicks / c.impressions : null;
}

/** Share of budget spent; a zero budget counts as nothing spent. */
export function spentRatio(c: Pick<Campaign, "spent" | "budget">): number {
  return c.budget > 0 ? c.spent / c.budget : 0;
}

function compare(a: Campaign, b: Campaign, column: Key): number {
  switch (column) {
    case "name":
      return a.name.localeCompare(b.name);
    case "channel":
      return CHANNEL[a.channel].label.localeCompare(CHANNEL[b.channel].label);
    case "status":
      return STATUS[a.status].rank - STATUS[b.status].rank;
    case "budget":
      return spentRatio(a) - spentRatio(b);
    case "updated":
      return a.updated < b.updated ? -1 : a.updated > b.updated ? 1 : 0;
    default:
      return 0;
  }
}

/** Filter by status and channel, then sort. CTR is special-cased so rows
 *  without impressions stay at the bottom in both directions; every other
 *  tie falls back to the id for a stable order across pages. */
export function sortCampaigns(
  rows: Campaign[],
  sort: SortDescriptor,
  status: CampaignStatus | "all" = "all",
  channel: CampaignChannel | "all" = "all",
): Campaign[] {
  const sign = sort.direction === "descending" ? -1 : 1;
  return rows
    .filter((c) => (status === "all" || c.status === status) && (channel === "all" || c.channel === channel))
    .sort((a, b) => {
      if (sort.column === "ctr") {
        const x = ctrOf(a);
        const y = ctrOf(b);
        if (x === null || y === null) return x === y ? a.id.localeCompare(b.id) : x === null ? 1 : -1;
        return sign * (x - y) || a.id.localeCompare(b.id);
      }
      return sign * compare(a, b, sort.column) || a.id.localeCompare(b.id);
    });
}
// #endregion

export function CampaignsTable({
  campaigns,
  pageSize = 6,
  sortDescriptor,
  defaultSortDescriptor = DEFAULT_SORT,
  onSortChange,
  currency = "USD",
  locale = "en-US",
  label = "Campaigns",
  className,
}: CampaignsTableProps) {
  const [localSort, setLocalSort] = useState<SortDescriptor>(defaultSortDescriptor);
  const sort = sortDescriptor ?? localSort;
  const [status, setStatus] = useState<CampaignStatus | "all">("all");
  const [channel, setChannel] = useState<CampaignChannel | "all">("all");
  const [rawPage, setRawPage] = useState(1);

  const money = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }),
    [locale, currency],
  );
  const pct = useMemo(() => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }), [locale]);
  const ctrPct = useMemo(
    () => new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [locale],
  );
  const day = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }),
    [locale],
  );

  const rows = useMemo(() => sortCampaigns(campaigns, sort, status, channel), [campaigns, sort, status, channel]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(rawPage, totalPages);
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (next: SortDescriptor) => {
    if (sortDescriptor === undefined) setLocalSort(next);
    onSortChange?.(next);
    setRawPage(1);
  };

  return (
    <section
      aria-label={label}
      className={cx(
        "flex w-full min-w-0 flex-col rounded-2xl border border-border-table bg-background-primary-default pt-2",
        totalPages > 1 ? "pb-3" : "pb-0",
        className,
      )}
    >
      <div className="flex flex-col gap-3 px-3 py-1 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col">
          <p className="text-body-medium text-text-tertiary">Total Results</p>
          <p className="text-body-medium text-text-primary tabular-nums" aria-live="polite">
            {rows.length.toLocaleString(locale)} {rows.length === 1 ? "campaign" : "campaigns"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <SegmentedControl
            aria-label="Filter by status"
            selectedKeys={[status]}
            onSelectionChange={(keys) => {
              const [k] = [...keys];
              if (k === undefined) return;
              setStatus(String(k) as CampaignStatus | "all");
              setRawPage(1);
            }}
          >
            <SegmentedControlItem id="all">All</SegmentedControlItem>
            {(Object.keys(STATUS) as CampaignStatus[]).map((s) => (
              <SegmentedControlItem key={s} id={s}>
                {STATUS[s].label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
          <Select
            aria-label="Filter by channel"
            className="shrink-0"
            popoverClassName="min-w-44"
            selectedKey={channel}
            onSelectionChange={(k) => {
              setChannel(String(k) as CampaignChannel | "all");
              setRawPage(1);
            }}
          >
            <SelectItem id="all" textValue="All channels">All channels</SelectItem>
            {(Object.keys(CHANNEL) as CampaignChannel[]).map((ch) => (
              <SelectItem key={ch} id={ch} textValue={CHANNEL[ch].label}>
                {CHANNEL[ch].label}
              </SelectItem>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-2">
        <Table aria-label={label} sortDescriptor={sort} onSortChange={handleSort} className="min-w-[860px]">
          <TableHeader>
            {COLUMNS.map((c) => (
              <TableColumn
                key={c.id}
                id={c.id}
                isRowHeader={c.id === "name"}
                allowsSorting
                className={cx(
                  c.className,
                  "cursor-pointer data-[focus-visible]:ring-2 data-[focus-visible]:ring-inset data-[focus-visible]:ring-border-focus-ring",
                )}
              >
                {({ sortDirection }) => (
                  <span className={cx("flex items-center gap-0.5", c.end && "flex-row-reverse")}>
                    <span className={cx(sortDirection && "text-text-secondary")}>{c.label}</span>
                    <ChevronSortDown
                      className={cx(
                        "size-5 shrink-0 transition-[transform,color] duration-150 ease-out motion-reduce:transition-none",
                        sortDirection === "ascending" && "rotate-180",
                        sortDirection ? "text-text-secondary" : "text-text-tertiary opacity-60",
                      )}
                    />
                  </span>
                )}
              </TableColumn>
            ))}
          </TableHeader>
          <TableBody
            renderEmptyState={() => (
              <div className="flex h-32 items-center justify-center text-body-medium text-text-tertiary">
                No campaigns match these filters.
              </div>
            )}
          >
            {visible.map((c) => {
              const ch = CHANNEL[c.channel];
              const Icon = ch.icon;
              const ratio = spentRatio(c);
              const over = ratio > 1;
              const ctr = ctrOf(c);
              return (
                <TableRow key={c.id} id={c.id} className="hover:bg-background-secondary-default">
                  <TableCell>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{c.name}</span>
                      <span className="truncate text-caption-1-regular text-text-tertiary">{c.objective}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background-secondary-default text-foreground-icon-primary">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      {ch.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-border-button-default px-2.5 py-1 shadow-xs">
                      <StatusDot color={STATUS[c.status].dot} aria-hidden />
                      {STATUS[c.status].label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex max-w-56 flex-col gap-1.5">
                      <span className="flex items-baseline justify-between gap-3 whitespace-nowrap tabular-nums">
                        <span>
                          {money.format(c.spent)}
                          <span className="text-text-tertiary"> of {money.format(c.budget)}</span>
                        </span>
                        <span
                          className={cx(
                            "text-caption-1-medium",
                            over ? "text-status-rose-text" : "text-text-secondary",
                          )}
                        >
                          {pct.format(ratio)}
                        </span>
                      </span>
                      <span aria-hidden>
                        <ProgressTrack
                          size="sm"
                          percentage={Math.min(100, ratio * 100)}
                          className={over ? "text-chart-3" : undefined}
                        />
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {ctr === null ? (
                      <span className="text-text-tertiary">
                        <span aria-hidden>–</span>
                        <span className="sr-only">No impressions yet</span>
                      </span>
                    ) : (
                      ctrPct.format(ctr)
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    <time dateTime={c.updated}>{day.format(parseDate(c.updated).toDate("UTC"))}</time>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="border-t border-separator-border px-3 pt-3">
          <Pagination page={page} totalPages={totalPages} onChange={setRawPage} aria-label={`${label} pages`} />
        </div>
      )}
    </section>
  );
}
