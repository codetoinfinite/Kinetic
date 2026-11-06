/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Recent Hires Card" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */
"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DateFormatter } from "@internationalized/date";
import type { CalendarDate } from "@internationalized/date";
import { RiArrowLeftLine, RiArrowRightLine, RiArrowRightUpLine } from "@remixicon/react";
import { Avatar } from "@/registry/ui/avatar";
import { Button } from "@/registry/ui/button";
import { LinkButton } from "@/registry/ui/link-button";
import { StatusDot } from "@/registry/ui/status-dot";
import {
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownPopover,
  DropdownTrigger,
} from "@/registry/ui/dropdown";
import { ChevronDownSmall } from "@/registry/lib/chevrons";
import { cx } from "@/registry/lib/cx";

export type HireStatus = "active" | "onboarding" | "pending";
export type HireAvatarColor = "neutral" | "blue" | "lime" | "pink";

export type Hire = {
  id: string;
  name: string;
  role: string;
  /** First working day. Compared with `today` for the relative caption. */
  startDate: CalendarDate;
  status: HireStatus;
  /** Team the hire joined; the team switcher filters on it. */
  team?: string;
  /** Defaults to the first letters of the first two words of `name`. */
  initials?: string;
  /** Defaults to a colour picked from a hash of `name`. */
  avatarColor?: HireAvatarColor;
};

export interface RecentHiresCardProps {
  hires: Hire[];
  /** Reference day for "Joined today" / "2 days ago". Pass it in so server and client agree. */
  today: CalendarDate;
  title?: string;
  /** Headline number. Defaults to the number of hires in the selected team. */
  total?: number | ((visible: Hire[]) => number);
  /** Team options for the switcher. The first entry with `value: null` means every team. */
  teams?: { value: string | null; label: string }[];
  team?: string | null;
  defaultTeam?: string | null;
  onTeamChange?: (team: string | null) => void;
  /** Hires per page (a 2-column grid once the card is wide enough). */
  pageSize?: number;
  page?: number;
  defaultPage?: number;
  onPageChange?: (page: number) => void;
  /** "View all" target. Pass an href for a link, or a handler for a button. */
  viewAllHref?: string;
  onViewAll?: () => void;
  viewAllLabel?: string;
  statusLabels?: Partial<Record<HireStatus, string>>;
  /** Replaces the English relative caption ("Joined today", "2 days ago"). */
  formatRelative?: (daysSinceStart: number) => string;
  locale?: string;
  className?: string;
}

const STATUS_DOT: Record<HireStatus, "green" | "indigo" | "yellow"> = {
  active: "green",
  onboarding: "indigo",
  pending: "yellow",
};

const DEFAULT_STATUS_LABELS: Record<HireStatus, string> = {
  active: "Active",
  onboarding: "Onboarding",
  pending: "Starts soon",
};

const AVATAR_COLORS: HireAvatarColor[] = ["blue", "lime", "pink", "neutral"];

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function colorFor(name: string): HireAvatarColor {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] ?? "neutral";
}

export function relativeStart(days: number): string {
  if (days < -1) return `Starts in ${-days} days`;
  if (days === -1) return "Starts tomorrow";
  if (days === 0) return "Joined today";
  if (days === 1) return "Joined yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "A week ago";
  if (days < 31) return `${Math.floor(days / 7)} weeks ago`;
  const months = Math.max(1, Math.round(days / 30));
  return months === 1 ? "A month ago" : `${months} months ago`;
}

/** Controlled when `value` is defined, otherwise local state seeded by `initial`. */
function useControllable<T>(value: T | undefined, initial: T, onChange?: (next: T) => void) {
  const [local, setLocal] = useState(initial);
  const current = value !== undefined ? value : local;
  const set = (next: T) => {
    if (value === undefined) setLocal(next);
    onChange?.(next);
  };
  return [current, set] as const;
}

function HireTile({
  hire,
  today,
  statusLabel,
  formatRelative,
  dateFormatter,
}: {
  hire: Hire;
  today: CalendarDate;
  statusLabel: string;
  formatRelative: (days: number) => string;
  dateFormatter: DateFormatter;
}) {
  const days = today.compare(hire.startDate);
  return (
    <li className="flex min-w-0 flex-col gap-2.5 rounded-xl bg-background-inner-default p-2.5 shadow-card transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none">
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar
          size="lg"
          color={hire.avatarColor ?? colorFor(hire.name)}
          initials={hire.initials ?? initialsOf(hire.name)}
          className="text-headline-semibold"
          aria-hidden
        />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-body-medium text-text-primary">{hire.name}</p>
          <p className="truncate text-body-regular text-text-secondary">{formatRelative(days)}</p>
        </div>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-caption-1-medium text-text-secondary">
          <StatusDot color={STATUS_DOT[hire.status]} />
          <span className="truncate">{statusLabel}</span>
        </span>
        <time
          dateTime={hire.startDate.toString()}
          className="shrink-0 text-caption-1-regular text-text-tertiary tabular-nums"
        >
          {dateFormatter.format(hire.startDate.toDate("UTC"))}
        </time>
      </div>
      <p className="truncate rounded-md bg-background-recent-hire-role px-2 py-1 text-center text-caption-1-medium text-text-secondary">
        {hire.role}
      </p>
    </li>
  );
}

export function RecentHiresCard({
  hires,
  today,
  title = "Recent hires",
  total,
  teams,
  team: teamProp,
  defaultTeam = null,
  onTeamChange,
  pageSize = 4,
  page: pageProp,
  defaultPage = 1,
  onPageChange,
  viewAllHref,
  onViewAll,
  viewAllLabel = "View all",
  statusLabels,
  formatRelative = relativeStart,
  locale = "en-US",
  className,
}: RecentHiresCardProps) {
  const [team, setTeam] = useControllable<string | null>(teamProp, defaultTeam, onTeamChange);
  const [page, setPage] = useControllable<number>(pageProp, defaultPage, onPageChange);
  const [menuOpen, setMenuOpen] = useState(false);

  const dateFormatter = useMemo(
    () => new DateFormatter(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
    [locale],
  );
  const labels = { ...DEFAULT_STATUS_LABELS, ...statusLabels };

  // #region critical
  // Filter by team, newest start first, then slice the page. The page is
  // clamped rather than trusted, so a team switch that shrinks the list can
  // never leave the grid on an empty page.
  const visible = useMemo(
    () =>
      hires
        .filter((h) => team == null || h.team === team)
        .sort((a, b) => b.startDate.compare(a.startDate)),
    [hires, team],
  );
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * pageSize;
  const slice = visible.slice(start, start + pageSize);
  const headline = typeof total === "function" ? total(visible) : (total ?? visible.length);
  const teamLabel = teams?.find((t) => t.value === team)?.label ?? teams?.[0]?.label;

  const chooseTeam = (next: string | null) => {
    setTeam(next);
    setPage(1);
    setMenuOpen(false);
  };
  // #endregion

  let viewAll: ReactNode = null;
  if (viewAllHref) {
    viewAll = (
      <LinkButton href={viewAllHref} size="small" trailingIcon={RiArrowRightUpLine}>
        {viewAllLabel}
      </LinkButton>
    );
  } else if (onViewAll) {
    viewAll = (
      <LinkButton size="small" trailingIcon={RiArrowRightUpLine} onClick={onViewAll}>
        {viewAllLabel}
      </LinkButton>
    );
  }

  return (
    <section
      aria-label={title}
      className={cx(
        "@container flex w-full min-w-0 flex-col gap-2 rounded-2xl bg-background-secondary-default p-2",
        className,
      )}
    >
      <header className="flex flex-col gap-0.5 px-2 pt-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="truncate text-body-medium text-text-secondary">{title}</h3>
          {teams && teams.length > 0 && (
            <Dropdown isOpen={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownTrigger
                aria-label={`Team: ${teamLabel ?? ""}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-1 text-body-medium text-text-primary transition-colors duration-150 ease-out hover:text-text-secondary"
              >
                {teamLabel}
                <ChevronDownSmall
                  className={cx(
                    "size-4 text-foreground-icon-secondary transition-transform duration-200 ease-out motion-reduce:transition-none",
                    menuOpen && "rotate-180",
                  )}
                />
              </DropdownTrigger>
              <DropdownPopover aria-label="Choose a team" placement="bottom end" className="w-[200px] p-2">
                <DropdownGroup>
                  {teams.map((t) => (
                    <DropdownItem
                      key={t.label}
                      selected={t.value === team}
                      onSelect={() => chooseTeam(t.value)}
                      className="px-2 py-1.5"
                    >
                      <span className="truncate text-body-medium text-text-primary">{t.label}</span>
                    </DropdownItem>
                  ))}
                </DropdownGroup>
              </DropdownPopover>
            </Dropdown>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-title-1-medium text-text-primary tabular-nums">{headline.toLocaleString(locale)}</p>
          {viewAll}
        </div>
      </header>

      {slice.length > 0 ? (
        <ul
          key={`${team ?? "all"}-${current}`}
          aria-label={`${title}, page ${current} of ${pageCount}`}
          className="grid grid-cols-1 gap-2 @md:grid-cols-2"
        >
          {slice.map((hire) => (
            <HireTile
              key={hire.id}
              hire={hire}
              today={today}
              statusLabel={labels[hire.status]}
              formatRelative={formatRelative}
              dateFormatter={dateFormatter}
            />
          ))}
        </ul>
      ) : (
        <p className="flex h-32 items-center justify-center rounded-xl bg-background-inner-default text-body-medium text-text-tertiary shadow-card">
          No recent hires{teamLabel && team != null ? ` in ${teamLabel}` : ""}.
        </p>
      )}

      <p className="sr-only" aria-live="polite">
        {visible.length === 0
          ? "No hires"
          : `Showing ${start + 1}–${start + slice.length} of ${visible.length}`}
      </p>

      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="small"
            leadingIcon={RiArrowLeftLine}
            className="flex-1"
            disabled={current <= 1}
            onClick={() => setPage(current - 1)}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="small"
            trailingIcon={RiArrowRightLine}
            className="flex-1"
            disabled={current >= pageCount}
            onClick={() => setPage(current + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </section>
  );
}
