/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Most Active Days Card" (boardui.com/components/most-active-days-card).
 * No BoardUI source was used.
 */
"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { CalendarDate, parseDate } from "@internationalized/date";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";

import { useReducedMotion } from "@/registry/hooks/use-reduced-motion";
import { cx } from "@/registry/lib/cx";
import { createRng } from "@/registry/lib/prng";
import { ACTIVITY_RINGS, type ActivityRing } from "@/registry/ui/activity-rings-card";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const DEFAULT_TODAY = parseDate("2026-07-10");
const RING_SIZE = 26;
const RING_STROKE = 2.75;
const RING_GAP = 1;
/** Height kept clear for the sticky month heading when revealing a day. */
const HEADING_H = 44;
/** A month is "in view" once its top passes this share of the viewport. */
const SPY_LINE = 0.35;

export type DayActivity = {
  /** Steps walked that day; summed per month for the header total. */
  steps: number;
  /** Same shape the Activity Rings Card takes, outermost first. */
  rings: ActivityRing[];
};

export function formatLongDate(date: CalendarDate): string {
  return `${MONTHS[date.month - 1] ?? ""} ${date.day}, ${date.year}`;
}

function formatRingValue(id: string, value: number): string {
  if (id === "exercise") {
    const h = Math.floor(value / 60);
    const m = Math.round(value % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  if (id === "running") return `${value.toFixed(1)} km`;
  return `${Math.round(value).toLocaleString("en-US")} kcal`;
}

/** Deterministic sample data: every date always gets the same steps and ring values. */
export function sampleDayActivity(date: CalendarDate): DayActivity {
  const rng = createRng(date.toString());
  const rings = ACTIVITY_RINGS.map((ring) => {
    const value = ring.goal * (0.3 + 0.78 * rng());
    return { ...ring, value, display: formatRingValue(ring.id, value) };
  });
  return { steps: Math.round(1500 + 3600 * rng()), rings };
}

export interface MiniActivityRingsProps {
  rings: ActivityRing[];
  /** Draw the tracks only, faded: a day that has not happened yet. */
  empty?: boolean;
  size?: number;
  className?: string;
}

/** A 26px stack of concentric progress rings for one day. */
export function MiniActivityRings({ rings, empty = false, size = RING_SIZE, className }: MiniActivityRingsProps) {
  const scale = size / RING_SIZE;
  const stroke = RING_STROKE * scale;
  const c = size / 2;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={cx("block shrink-0", empty && "opacity-40", className)}
    >
      {rings.map((ring, i) => {
        const r = c - stroke / 2 - i * (stroke + RING_GAP * scale);
        if (r <= stroke / 2) return null;
        const pct = ring.goal > 0 ? Math.min(100, Math.max(0, (ring.value / ring.goal) * 100)) : 0;
        return (
          <g key={ring.id} transform={`rotate(-90 ${c} ${c})`}>
            <circle
              cx={c}
              cy={c}
              r={r}
              fill="none"
              strokeWidth={stroke}
              style={{ stroke: `color-mix(in oklab, ${ring.color} 22%, var(--color-chart-track))` }}
            />
            {!empty && pct > 0 && (
              <circle
                cx={c}
                cy={c}
                r={r}
                fill="none"
                pathLength={100}
                strokeDasharray={`${pct} 100`}
                strokeLinecap="round"
                strokeWidth={stroke}
                style={{ stroke: ring.color }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export interface MostActiveDaysCardProps {
  title?: string;
  /** Unit after the month total. */
  totalLabel?: string;
  /** Calendar year on show (all twelve months scroll in one column). */
  year?: number;
  /** Days after this one are drawn as empty tracks and cannot be picked. */
  today?: CalendarDate;
  /** Data source per day; defaults to deterministic sample data. */
  getActivity?: (date: CalendarDate) => DayActivity;
  /** Controlled selected day. */
  selected?: CalendarDate | null;
  /** Uncontrolled initial selection; defaults to `today`. */
  defaultSelected?: CalendarDate | null;
  onSelectedChange?: (date: CalendarDate) => void;
  /** Height of the scrolling calendar in px. */
  height?: number;
  className?: string;
}

export function MostActiveDaysCard({
  title = "Most active days",
  totalLabel = "total steps",
  year: yearProp,
  today = DEFAULT_TODAY,
  getActivity = sampleDayActivity,
  selected: selectedProp,
  defaultSelected,
  onSelectedChange,
  height = 232,
  className,
}: MostActiveDaysCardProps) {
  const year = yearProp ?? today.year;
  const labelId = useId();
  const reduced = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<(HTMLElement | null)[]>([]);
  const spyFrame = useRef(0);

  const [ownSelected, setOwnSelected] = useState<CalendarDate | null>(
    defaultSelected === undefined ? today : defaultSelected,
  );
  const selected = selectedProp !== undefined ? selectedProp : ownSelected;
  const start = (selected ?? today).year === year ? (selected ?? today) : new CalendarDate(year, 1, 1);
  const [focusDate, setFocusDate] = useState<CalendarDate>(start);
  const [visibleMonth, setVisibleMonth] = useState(start.month);

  // One pass over the year: per-day data plus each month's step total (future days excluded).
  const todayKey = today.toString();
  const months = useMemo(() => {
    const cutoff = parseDate(todayKey);
    return MONTHS.map((_, mi) => {
      const first = new CalendarDate(year, mi + 1, 1);
      const count = first.calendar.getDaysInMonth(first);
      let total = 0;
      const days = Array.from({ length: count }, (_, di) => {
        const date = first.add({ days: di });
        const future = date.compare(cutoff) > 0;
        const data = getActivity(date);
        if (!future) total += data.steps;
        return { date, key: date.toString(), future, data };
      });
      return { month: mi + 1, days, total };
    });
  }, [year, todayKey, getActivity]);

  const lastPickable = today.year > year ? new CalendarDate(year, 12, 31) : today;

  // #region critical
  // Scroll the calendar so `el` sits fully below the sticky month heading.
  const reveal = (el: HTMLElement, behavior: ScrollBehavior) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const top = el.offsetTop - HEADING_H;
    const bottom = el.offsetTop + el.offsetHeight + 8;
    if (top < scroller.scrollTop) scroller.scrollTo({ top, behavior });
    else if (bottom > scroller.scrollTop + scroller.clientHeight)
      scroller.scrollTo({ top: bottom - scroller.clientHeight, behavior });
  };

  // Scroll-spy: the month whose top has passed SPY_LINE of the viewport names the pill.
  const spy = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
    const line = scroller.scrollTop + scroller.clientHeight * SPY_LINE;
    let month = 1;
    monthRefs.current.forEach((section, i) => {
      if (section && section.offsetTop <= line) month = i + 1;
    });
    setVisibleMonth(atEnd ? 12 : month);
  };

  const onScroll = () => {
    cancelAnimationFrame(spyFrame.current);
    spyFrame.current = requestAnimationFrame(spy);
  };

  const goToMonth = (month: number) => {
    const section = monthRefs.current[month - 1];
    const scroller = scrollerRef.current;
    if (!section || !scroller) return;
    scroller.scrollTo({ top: section.offsetTop, behavior: reduced ? "auto" : "smooth" });
  };
  // #endregion

  // Open on the month of the focused day (the selection, else today) with that day in view, before
  // first paint; re-anchor the same way if the panel height changes. Other scrolling belongs to the user.
  useIsoLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const section = monthRefs.current[focusDate.month - 1];
    if (!scroller || !section) return;
    scroller.scrollTop = section.offsetTop;
    const day = scroller.querySelector<HTMLElement>(`[data-date="${focusDate.toString()}"]`);
    if (day) reveal(day, "auto");
    spy();
  }, [height]);

  useEffect(() => () => cancelAnimationFrame(spyFrame.current), []);

  const pick = (date: CalendarDate) => {
    setOwnSelected(date);
    setFocusDate(date);
    onSelectedChange?.(date);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 };
    let next: CalendarDate | null = null;
    if (event.key in steps) next = focusDate.add({ days: steps[event.key] ?? 0 });
    else if (event.key === "Home") next = focusDate.set({ day: 1 });
    else if (event.key === "End") next = focusDate.set({ day: focusDate.calendar.getDaysInMonth(focusDate) });
    else if (event.key === "PageDown") next = focusDate.add({ months: 1 });
    else if (event.key === "PageUp") next = focusDate.subtract({ months: 1 });
    if (!next) return;
    event.preventDefault();
    const first = new CalendarDate(year, 1, 1);
    if (next.compare(first) < 0) next = first;
    if (next.compare(lastPickable) > 0) next = lastPickable;
    setFocusDate(next);
    const el = scrollerRef.current?.querySelector<HTMLElement>(`[data-date="${next.toString()}"]`);
    if (el) {
      el.focus({ preventScroll: true });
      reveal(el, reduced ? "auto" : "smooth");
    }
  };

  const shown = months[visibleMonth - 1];
  const total = shown?.total ?? 0;
  const monthName = MONTHS[visibleMonth - 1] ?? "";

  return (
    <section
      aria-labelledby={labelId}
      className={cx("flex w-full min-w-0 flex-col gap-2.5 rounded-2xl bg-background-secondary-default p-2", className)}
    >
      <div className="flex items-start justify-between gap-3 px-2 pt-2">
        <div className="min-w-0">
          <p id={labelId} className="text-body-medium text-text-secondary">
            {title}
          </p>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
            <span
              key={`${visibleMonth}-${total}`}
              data-month-total
              className="animate-number-fade text-title-1-medium text-text-primary tabular-nums motion-reduce:animate-none"
            >
              {total.toLocaleString("en-US")}
            </span>
            <span className="whitespace-nowrap text-caption-1-regular text-text-secondary">{totalLabel}</span>
          </p>
        </div>

        <div className="flex h-8 shrink-0 items-center rounded-xl border border-border-button-default bg-background-primary-default shadow-xs">
          <button
            type="button"
            aria-label="Previous month"
            disabled={visibleMonth <= 1}
            onClick={() => goToMonth(visibleMonth - 1)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-xl text-foreground-icon-secondary outline-none transition-colors duration-150 ease-out hover:text-foreground-icon-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring disabled:cursor-not-allowed disabled:text-foreground-icon-disabled motion-reduce:transition-none"
          >
            <RiArrowLeftSLine aria-hidden className="size-4" />
          </button>
          <span
            aria-live="polite"
            data-month-pill
            className="w-[76px] overflow-hidden text-center text-body-medium text-text-primary"
          >
            <span key={visibleMonth} className="inline-block animate-number-fade motion-reduce:animate-none">
              {monthName}
            </span>
          </span>
          <button
            type="button"
            aria-label="Next month"
            disabled={visibleMonth >= 12}
            onClick={() => goToMonth(visibleMonth + 1)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-xl text-foreground-icon-secondary outline-none transition-colors duration-150 ease-out hover:text-foreground-icon-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring disabled:cursor-not-allowed disabled:text-foreground-icon-disabled motion-reduce:transition-none"
          >
            <RiArrowRightSLine aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        data-calendar-scroller
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        style={{ height }}
        className="relative overflow-y-auto overscroll-contain rounded-xl bg-background-primary-default [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {months.map(({ month, days }) => (
          <section
            key={month}
            ref={(el) => {
              monthRefs.current[month - 1] = el;
            }}
            aria-label={`${MONTHS[month - 1]} ${year}`}
            className="pb-2"
          >
            <h3
              aria-hidden
              className="sticky top-0 z-[1] bg-background-primary-default px-3.5 pt-3 pb-2 text-title-3-medium text-text-primary"
            >
              {(MONTHS[month - 1] ?? "").slice(0, 3)}
            </h3>
            <div className="grid grid-cols-7 gap-y-1 px-1.5">
              {days.map(({ date, key, future, data }) => {
                const isSelected = selected != null && selected.compare(date) === 0;
                const pct = data.rings.map((r) => `${r.label} ${Math.round((r.value / r.goal) * 100)}%`).join(", ");
                return (
                  <button
                    key={key}
                    type="button"
                    data-date={key}
                    disabled={future}
                    tabIndex={focusDate.compare(date) === 0 ? 0 : -1}
                    aria-pressed={isSelected}
                    aria-current={date.compare(today) === 0 ? "date" : undefined}
                    aria-label={`${formatLongDate(date)}${future ? ", no data yet" : `: ${data.steps.toLocaleString("en-US")} steps, ${pct}`}`}
                    onClick={() => pick(date)}
                    onFocus={() => setFocusDate(date)}
                    className={cx(
                      "mx-auto flex h-[74px] w-[42px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[10px] border outline-none transition-[border-color,background-color] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-border-focus-ring disabled:cursor-default motion-reduce:transition-none",
                      isSelected
                        ? "border-border-button-hover"
                        : "border-transparent enabled:hover:bg-background-secondary-default",
                    )}
                  >
                    <span className="text-body-medium text-text-primary tabular-nums">{date.day}</span>
                    <MiniActivityRings rings={data.rings} empty={future} />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
