/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Trend Badge" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */

import { RiArrowUpLine } from '@remixicon/react';
import { CHIP_COLORS } from '@/registry/ui/chip';
import { cx } from '@/registry/lib/cx';

/**
 * TrendBadge: the small change pill next to a dashboard KPI ("+5.3%",
 * "-2.1%", "0.00%"). The sign of the rounded value picks the direction:
 * lime for up, rose for down, grey for flat. One arrow glyph rotates
 * between the three states, so a live value turns the arrow instead of
 * swapping icons. Screen readers hear "Up 5.3%" plus an optional context
 * ("vs last month") rather than a bare "+5.3".
 */

export type TrendDirection = 'up' | 'down' | 'flat';
export type TrendBadgeSize = 'sm' | 'md' | 'lg';

export interface TrendBadgeProps {
  /** Change in percent, e.g. 5.3 or -2.1. */
  value: number;
  /** Override the direction taken from the rounded value's sign. */
  direction?: TrendDirection;
  /** For metrics where going down is good (churn, cost): down turns lime, up rose. */
  invert?: boolean;
  /** Fraction digits shown. Default 1. */
  decimals?: number;
  size?: TrendBadgeSize;
  /** Show the arrow. Default true. */
  icon?: boolean;
  /** Appended to the screen-reader text, e.g. "vs last month". */
  context?: string;
  /** Number locale; fixed by default so server and client render the same text. */
  locale?: string;
  className?: string;
}

const SIZE: Record<TrendBadgeSize, { pill: string; icon: string }> = {
  sm: { pill: 'h-5 gap-0.5 rounded-md px-1 text-caption-2-medium', icon: 'size-3' },
  md: { pill: 'h-6 gap-0.5 rounded-md px-1.5 text-caption-1-medium', icon: 'size-3.5' },
  lg: { pill: 'h-7 gap-1 rounded-lg px-2 text-body-medium', icon: 'size-4' },
};

const TONE = {
  good: CHIP_COLORS.lime,
  bad: CHIP_COLORS.rose,
  flat: CHIP_COLORS.neutral,
} as const;

/** One up-arrow, turned: 0deg up, 90deg flat (pointing along the reading direction), 180deg down. */
const ROTATE: Record<TrendDirection, string> = {
  up: 'rotate-0',
  flat: 'rotate-90 rtl:-rotate-90',
  down: 'rotate-180',
};

const WORD: Record<TrendDirection, string> = { up: 'Up', down: 'Down', flat: 'No change,' };

// #region critical
export function TrendBadge({
  value,
  direction,
  invert = false,
  decimals = 1,
  size = 'md',
  icon = true,
  context,
  locale = 'en-US',
  className,
}: TrendBadgeProps) {
  // Round first, so -0.04 at one decimal reads "0.0%" and counts as flat
  // instead of showing a red "-0.0%".
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor || 0;
  const dir: TrendDirection = direction ?? (rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat');
  const tone = dir === 'flat' ? TONE.flat : (dir === 'up') !== invert ? TONE.good : TONE.bad;

  const format = (n: number, signDisplay: 'exceptZero' | 'never') =>
    new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals, signDisplay }).format(n);
  const s = SIZE[size];

  return (
    <span
      data-direction={dir}
      className={cx(
        'inline-flex shrink-0 items-center whitespace-nowrap tabular-nums',
        'transition-colors duration-200 ease-out motion-reduce:transition-none',
        s.pill,
        tone,
        className,
      )}
    >
      {icon ? (
        <RiArrowUpLine
          aria-hidden
          className={cx(
            'shrink-0 transition-[rotate] duration-300 ease-out motion-reduce:transition-none',
            s.icon,
            ROTATE[dir],
          )}
        />
      ) : null}
      <span aria-hidden>{format(rounded, 'exceptZero')}%</span>
      <span className="sr-only">
        {`${WORD[dir]} ${format(Math.abs(rounded), 'never')}%${context ? ` ${context}` : ''}`}
      </span>
    </span>
  );
}
// #endregion
