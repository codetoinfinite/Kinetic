/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Contributions Card" (boardui.com/components/contributions-card).
 * No BoardUI source was used.
 */
"use client";

import { Fragment, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { Chip } from "@/registry/ui/chip";
import { useResizeObserver } from "@/registry/hooks/use-resize-observer";
import { createRng } from "@/registry/lib/prng";
import { cx } from "@/registry/lib/cx";

/** One calendar year of counts: `counts[i]` is day i of the year (0 = Jan 1). */
export type ContributionYear = { year: number; counts: number[] };
export type ContributionAccent = "emerald" | "green" | "teal" | "cyan" | "blue" | "indigo" | "violet" | "rose" | "amber";
export type ContributionView = "weekly" | "monthly" | "yearly";
export type ContributionStat = { label: string; value: string };

/* ---------- Calendar arithmetic (no Date objects, so no time zones) ---------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const monthLengths = (y: number) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
/** Sakamoto's day of week, 0 = Sunday. */
function weekday(y: number, m: number, d: number) {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const yy = m < 3 ? y - 1 : y;
  return (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + (t[m - 1] ?? 0) + d) % 7;
}
/** Month (0-11) and day (1-31) of day-of-year i. */
function monthDay(y: number, i: number) {
  let rest = i;
  const lengths = monthLengths(y);
  for (let m = 0; m < 12; m++) {
    const len = lengths[m] ?? 31;
    if (rest < len) return { m, d: rest + 1 };
    rest -= len;
  }
  return { m: 11, d: 31 };
}
const dayOfYear = (y: number, m: number, d: number) => monthLengths(y).slice(0, m).reduce((a, b) => a + b, 0) + d - 1;

/* ---------- Built-in demo data ---------- */

/** Weekdays busier than weekends, a seasonal swell and fortnightly sprints, all from a seeded RNG. */
function generateYear(year: number, level: number): ContributionYear {
  const rng = createRng(`contributions-${year}`);
  const days = isLeap(year) ? 366 : 365;
  const jan1 = weekday(year, 1, 1);
  const counts = Array.from({ length: days }, (_, i) => {
    const wd = (jan1 + i) % 7;
    const season = 0.7 + 0.3 * Math.sin((i / days) * Math.PI * 2 - 1.3);
    const sprint = 0.55 + 0.45 * Math.sin(i / 7 + year);
    const roll = rng();
    const amount = rng();
    const chance = (wd === 0 || wd === 6 ? 0.4 : 0.92) * season;
    return roll > chance ? 0 : Math.max(1, Math.round(level * sprint * season * (0.3 + amount * 1.7)));
  });
  return { year, counts };
}

export const CONTRIBUTION_YEARS: ContributionYear[] = [generateYear(2023, 4.2), generateYear(2024, 4.6), generateYear(2025, 5.2)];

/* ---------- Cells ---------- */

type Cell = { count: number; label: string };
type Matrix = {
  rows: (Cell | null)[][];
  /** Column labels: start column and text. */
  marks: { col: number; text: string }[];
  rowLabels?: string[];
};

const GAP = 3;
const MIN_CELL = 8;
const ROW_HEIGHT: [number, number] = [8, 14];
const TIERS = [0, 1, 2, 3, 4, 5];
const VIEWS: { id: ContributionView; label: string }[] = [
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

/** Day cells: 7 weekday rows by week columns, the classic calendar. */
function weeklyMatrix({ year, counts }: ContributionYear): Matrix {
  const offset = weekday(year, 1, 1);
  const days = isLeap(year) ? 366 : 365;
  const weeks = Math.ceil((offset + days) / 7);
  const rows = Array.from({ length: 7 }, (_, r) =>
    Array.from({ length: weeks }, (_, c) => {
      const i = c * 7 + r - offset;
      if (i < 0 || i >= days) return null;
      const { m, d } = monthDay(year, i);
      return { count: counts[i] ?? 0, label: `${WEEKDAYS[r]}, ${MONTHS[m]} ${d}, ${year}` };
    }),
  );
  const marks = MONTHS.map((text, m) => ({ col: Math.floor((dayOfYear(year, m, 1) + offset) / 7), text }));
  return { rows, marks };
}

/** Week cells: five rows (days 1–7, 8–14, … 29–31) by twelve month columns. */
function monthlyMatrix({ year, counts }: ContributionYear): Matrix {
  const lengths = monthLengths(year);
  const rows = Array.from({ length: 5 }, (_, r) =>
    MONTHS.map((name, m) => {
      const first = r * 7 + 1;
      const last = Math.min(r === 4 ? 31 : first + 6, lengths[m] ?? 31);
      if (first > last) return null;
      const start = dayOfYear(year, m, first);
      const count = counts.slice(start, start + last - first + 1).reduce((a, b) => a + b, 0);
      return { count, label: `${name} ${first}–${last}, ${year}` };
    }),
  );
  return { rows, marks: MONTHS.map((text, col) => ({ col, text })) };
}

/** Month cells: one row per year by twelve month columns. */
function yearlyMatrix(years: ContributionYear[]): Matrix {
  const rows = years.map(({ year, counts }) =>
    MONTHS.map((name, m) => {
      const start = dayOfYear(year, m, 1);
      const len = monthLengths(year)[m] ?? 31;
      return { count: counts.slice(start, start + len).reduce((a, b) => a + b, 0), label: `${name} ${year}` };
    }),
  );
  return { rows, marks: MONTHS.map((text, col) => ({ col, text })), rowLabels: years.map((y) => String(y.year)) };
}

const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export interface ContributionsCardProps {
  /** Header label. */
  title?: string;
  /** Years of daily counts, oldest first; the last one is the year on show. */
  years?: ContributionYear[];
  /** One of the nine accent families defined by `.contributions-grid[data-accent]`. */
  accent?: ContributionAccent;
  /** Percent change for the chip; defaults to this year against the year before. */
  change?: number;
  /** Tiles under the header. Defaults to figures derived from the counts; false hides them. */
  stats?: ContributionStat[] | false;
  /** Controlled granularity. */
  view?: ContributionView;
  defaultView?: ContributionView;
  onViewChange?: (view: ContributionView) => void;
  /** Singular and plural noun for the tooltip. */
  unit?: [string, string];
  className?: string;
}

export function ContributionsCard({
  title = "Contributions this year",
  years = CONTRIBUTION_YEARS,
  accent = "violet",
  change: changeProp,
  stats: statsProp,
  view: viewProp,
  defaultView = "weekly",
  onViewChange,
  unit = ["contribution", "contributions"],
  className,
}: ContributionsCardProps) {
  const labelId = useId();
  const gridRef = useRef<HTMLDivElement>(null);
  const { width } = useResizeObserver(gridRef);
  const [innerView, setInnerView] = useState<ContributionView>(defaultView);
  const view = viewProp ?? innerView;
  const [active, setActive] = useState<{ r: number; c: number } | null>(null);

  const current = years[years.length - 1] ?? { year: 2025, counts: [] };

  // #region critical
  const summary = useMemo(() => {
    const total = current.counts.reduce((a, b) => a + b, 0);
    const previous = years[years.length - 2];
    const prevTotal = previous ? previous.counts.reduce((a, b) => a + b, 0) : 0;
    let best = 0;
    let bestAt = 0;
    let streak = 0;
    let longest = 0;
    current.counts.forEach((n, i) => {
      if (n > best) [best, bestAt] = [n, i];
      streak = n > 0 ? streak + 1 : 0;
      longest = Math.max(longest, streak);
    });
    const { m, d } = monthDay(current.year, bestAt);
    const derived: ContributionStat[] = [
      { label: "Active days", value: String(current.counts.filter((n) => n > 0).length) },
      { label: `Best day · ${MONTHS[m]} ${d}`, value: String(best) },
      { label: "Longest streak", value: `${longest} days` },
      { label: "Daily average", value: numberFormat.format(total / Math.max(1, current.counts.length)) },
    ];
    return { total, change: prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 1000) / 10 : undefined, derived };
  }, [current, years]);

  const matrix = useMemo(
    () => (view === "weekly" ? weeklyMatrix(current) : view === "monthly" ? monthlyMatrix(current) : yearlyMatrix(years)),
    [view, current, years],
  );

  // Weekly view keeps the most recent weeks that fit at MIN_CELL; the other views always fit.
  const allCols = matrix.rows[0]?.length ?? 0;
  const weeks = Math.ceil((weekday(current.year, 1, 1) + (isLeap(current.year) ? 366 : 365)) / 7);
  const weekCols = width > 0 ? Math.max(1, Math.min(weeks, Math.floor((width + GAP) / (MIN_CELL + GAP)))) : weeks;
  const cols = view === "weekly" ? weekCols : allCols;
  const first = allCols - cols;
  // Every view shares the height of seven square weekly rows, so switching never resizes the card.
  const weekCell = width > 0 ? (width - (weekCols - 1) * GAP) / weekCols : 11;
  const weekRow = Math.max(ROW_HEIGHT[0], Math.min(ROW_HEIGHT[1], weekCell));
  const gridHeight = 7 * weekRow + 6 * GAP;
  const rowHeight = (gridHeight - (matrix.rows.length - 1) * GAP) / matrix.rows.length;

  const peak = Math.max(1, ...matrix.rows.flat().map((cell) => cell?.count ?? 0));
  const tierOf = (count: number) => (count <= 0 ? 0 : Math.min(5, Math.max(1, Math.ceil((count / peak) ** 0.7 * 5))));
  // #endregion

  const change = changeProp ?? summary.change;
  const stats = statsProp === false ? [] : (statsProp ?? summary.derived);
  const activeCell = active ? matrix.rows[active.r]?.[active.c] : null;

  const choose = (next: ContributionView) => {
    setInnerView(next);
    setActive(null);
    onViewChange?.(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") return setActive(null);
    const moves: Record<string, [number, number]> = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] };
    const move = moves[event.key];
    if (!move && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const at = (r: number, c: number) => (c >= first && c < allCols ? matrix.rows[r]?.[c] : undefined);
    if (event.key === "Home" || event.key === "End" || !active) {
      // Jump to the first or last real cell in reading order.
      const order = event.key === "End" ? [...Array(cols).keys()].reverse() : [...Array(cols).keys()];
      for (const k of order) {
        for (let r = 0; r < matrix.rows.length; r++) {
          const rr = event.key === "End" ? matrix.rows.length - 1 - r : r;
          if (at(rr, first + k)) return setActive({ r: rr, c: first + k });
        }
      }
      return;
    }
    let { r, c } = active;
    for (;;) {
      r += move?.[0] ?? 0;
      c += move?.[1] ?? 0;
      if (r < 0 || r >= matrix.rows.length || c < first || c >= allCols) return;
      if (at(r, c)) return setActive({ r, c });
    }
  };

  const template = `${matrix.rowLabels ? "max-content " : ""}repeat(${cols}, minmax(0, 1fr))`;
  const lead = matrix.rowLabels ? 1 : 0;

  return (
    <section
      aria-labelledby={labelId}
      className={cx("@container flex w-full min-w-0 flex-col gap-3 rounded-2xl bg-background-secondary-default p-2", className)}
    >
      {/* Header: total and change */}
      <div className="flex flex-col gap-0.5 px-2 pt-2">
        <p id={labelId} className="text-body-medium text-text-secondary">
          {title}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-title-1-medium text-text-primary tabular-nums">{summary.total.toLocaleString("en-US")}</p>
          {change !== undefined && (
            <Chip variant="bold" color={change >= 0 ? "lime" : "rose"} className="tabular-nums">
              {change > 0 ? "+" : ""}
              {change}%
            </Chip>
          )}
        </div>
      </div>

      {stats.length > 0 && (
        <ul className="grid grid-cols-2 gap-1.5 @lg:grid-cols-4">
          {stats.map((s) => (
            <li key={s.label} className="flex min-w-0 flex-col gap-0.5 rounded-xl bg-background-primary-default px-2.5 py-2">
              <span className="truncate text-body-medium text-text-primary tabular-nums">{s.value}</span>
              <span className="truncate text-body-medium text-text-secondary">{s.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 px-2 pb-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-body-medium text-text-secondary">Activity</p>
          <div role="group" aria-label="Granularity" className="flex items-center gap-3">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={view === v.id}
                onClick={() => choose(v.id)}
                className={cx(
                  "cursor-pointer rounded-md text-body-medium outline-none transition-colors duration-150 ease-out focus-visible:ring-2 focus-visible:ring-border-focus-ring motion-reduce:transition-none",
                  view === v.id ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* The grid: one tab stop, cells carry the tier as data-tier for the theme's accent ramp */}
        <div ref={gridRef} className="w-full min-w-0">
          <div
            key={view}
            tabIndex={0}
            role="group"
            aria-roledescription="contribution calendar"
            aria-label={`${title}: ${summary.total} ${unit[1]} in ${current.year}. Arrow keys move between cells.`}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
            onMouseLeave={() => setActive(null)}
            data-accent={accent}
            className="contributions-grid grid rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background-secondary-default"
            style={{ gridTemplateColumns: template, gap: GAP }}
          >
            {matrix.rows.map((row, r) => (
              <Fragment key={r}>
                {matrix.rowLabels && (
                  <span
                    className="flex items-center pr-2 text-caption-1-regular text-text-tertiary tabular-nums"
                    style={{ height: rowHeight }}
                  >
                    {matrix.rowLabels[r]}
                  </span>
                )}
                {row.slice(first).map((cell, k) => {
                  const c = first + k;
                  if (!cell) return <span key={c} aria-hidden style={{ height: rowHeight }} />;
                  const on = active?.r === r && active.c === c;
                  const edge = k < cols * 0.25 ? "left-0" : k > cols * 0.75 ? "right-0" : "left-1/2 -translate-x-1/2";
                  return (
                    <span
                      key={c}
                      data-cell={`${r}-${c}`}
                      data-tier={tierOf(cell.count)}
                      onMouseEnter={() => setActive({ r, c })}
                      className={cx(
                        "contribution-cell relative animate-cell-pop rounded-[2px] motion-reduce:animate-none",
                        on && "z-10 outline-2 outline-offset-1 outline-text-primary",
                      )}
                      style={{ height: rowHeight, animationDelay: `${Math.min(k * 9 + r * 12, 520)}ms` }}
                    >
                      {on && (
                        <span
                          role="tooltip"
                          className={cx(
                            "pointer-events-none absolute bottom-[calc(100%+8px)] flex flex-col gap-0.5 whitespace-nowrap rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-1.5 shadow-dropdown",
                            edge,
                          )}
                        >
                          <span className="text-body-2-medium text-text-primary tabular-nums">
                            {cell.count === 0 ? "No" : cell.count.toLocaleString("en-US")} {cell.count === 1 ? unit[0] : unit[1]}
                          </span>
                          <span className="text-caption-1-medium text-text-secondary">{cell.label}</span>
                        </span>
                      )}
                    </span>
                  );
                })}
              </Fragment>
            ))}

            {/* Column marks: months under the weeks they start in, dropped when they would collide */}
            {matrix.rowLabels && <span aria-hidden />}
            {matrix.marks
              .filter((mark, i, all) => {
                if (mark.col < first) return false;
                const next = all[i + 1];
                return view !== "weekly" || !next || next.col - mark.col >= 3 || next.col >= allCols;
              })
              .map((mark) => (
                <span
                  key={mark.text}
                  aria-hidden
                  className="overflow-visible pt-1 text-caption-1-regular whitespace-nowrap text-text-tertiary"
                  style={{ gridColumnStart: mark.col - first + 1 + lead, gridRow: matrix.rows.length + 1 }}
                >
                  {mark.text}
                </span>
              ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-caption-1-regular text-text-tertiary">
          <span aria-live="polite" className="truncate">
            {activeCell ? `${activeCell.count} ${activeCell.count === 1 ? unit[0] : unit[1]} · ${activeCell.label}` : ""}
          </span>
          <span className="contributions-grid flex shrink-0 items-center gap-1" data-accent={accent} aria-hidden>
            <span className="mr-0.5">Less</span>
            {TIERS.map((t) => (
              <span key={t} data-tier={t} className="contribution-cell size-2.5 rounded-[2px]" />
            ))}
            <span className="ml-0.5">More</span>
          </span>
        </div>
      </div>
    </section>
  );
}
