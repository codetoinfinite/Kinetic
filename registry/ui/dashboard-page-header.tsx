/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Dashboard Page Header" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */
'use client';

import type { ComponentType, HTMLAttributes, ReactNode } from 'react';
import { RiNotification3Line } from '@remixicon/react';
import { Breadcrumb, BreadcrumbItem } from '@/registry/ui/breadcrumb';
import { IconButton } from '@/registry/ui/icon-button';
import { cx, sortCx } from '@/registry/lib/cx';

/**
 * DashboardPageHeader: the strip at the top of every BoardUI dashboard page.
 *
 *   Board team › Mertcan › Home                      (breadcrumb, 12px)
 *   Welcome Mertcan        [range] [bell] [Export] [+ Create ticket]
 *
 * The breadcrumb takes plain data: a crumb can carry initials (drawn in a
 * 16px tinted circle, like the team and person crumbs in the shot) or an
 * icon, and the last crumb is the current page. The toolbar is three slots
 * in a fixed order: a date-range control, the notification bell, then the
 * actions, so every page lines them up the same way. Below `sm` the toolbar
 * wraps under the title instead of squeezing it.
 */

type IconComponent = ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;

export type CrumbTone = 'blue' | 'neutral' | 'lime' | 'purple';

export interface PageHeaderCrumb {
  label: string;
  href?: string;
  onPress?: () => void;
  /** One or two letters in a 16px circle (a team, workspace or person). */
  initials?: string;
  tone?: CrumbTone;
  /** A 16px glyph before the label, e.g. the page's nav icon. */
  icon?: IconComponent;
}

export interface DashboardPageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  /** Ancestors first; the last crumb is the current page. */
  breadcrumbs?: readonly PageHeaderCrumb[];
  breadcrumbLabel?: string;
  /** Date-range control shown first in the toolbar, e.g. `<PeriodStepper>`. */
  dateRange?: ReactNode;
  /** Unread count for the built-in bell. Omit (and `notifications`) to hide the bell. */
  notificationCount?: number;
  onNotificationsPress?: () => void;
  notificationsLabel?: string;
  /** Replaces the built-in bell, e.g. a bell that opens a notification popover. */
  notifications?: ReactNode;
  /** Trailing buttons: secondary actions first, the primary action last. */
  actions?: ReactNode;
  /** Heading level of the title. Default 1. */
  headingLevel?: 1 | 2 | 3;
}

const styles = sortCx({
  initials: {
    base: 'inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] leading-none font-semibold uppercase',
    tone: {
      blue: 'bg-status-blue-background text-status-blue-text',
      neutral: 'bg-background-tertiary-default text-text-secondary',
      lime: 'bg-status-lime-background text-status-lime-text',
      purple: 'bg-status-purple-background text-status-purple-text',
    },
  },
  badge: [
    'pointer-events-none absolute top-1 start-[18px] flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-[3px]',
    'bg-red-600 text-[10px] leading-none font-semibold text-white tabular-nums ring-2 ring-background-primary-default',
    'origin-center transition-[scale,opacity] duration-200 ease-out motion-reduce:transition-none',
  ].join(' '),
});

export interface PageHeaderBellProps {
  count?: number;
  /** Counts above this show as `max+`. Default 9. */
  max?: number;
  label?: string;
  onPress?: () => void;
  className?: string;
}

/** The header's bell: IconButton plus a red count badge that scales away at zero. */
export function PageHeaderBell({ count = 0, max = 9, label = 'Notifications', onPress, className }: PageHeaderBellProps) {
  const shown = count > max ? `${max}+` : String(count);
  return (
    <span className={cx('relative inline-flex shrink-0', className)}>
      <IconButton icon={RiNotification3Line} aria-label={count > 0 ? `${label}, ${count} unread` : label} onClick={onPress} />
      <span aria-hidden className={cx(styles.badge, count > 0 ? 'scale-100 opacity-100' : 'scale-50 opacity-0')}>
        {count > 0 ? shown : null}
      </span>
    </span>
  );
}

function CrumbInitials({ initials, tone = 'neutral' }: { initials: string; tone?: CrumbTone }) {
  return (
    <span aria-hidden className={cx(styles.initials.base, styles.initials.tone[tone])}>
      {initials.slice(0, 2)}
    </span>
  );
}

// #region critical
export function DashboardPageHeader({
  title,
  description,
  breadcrumbs = [],
  breadcrumbLabel = 'Breadcrumb',
  dateRange,
  notificationCount,
  onNotificationsPress,
  notificationsLabel,
  notifications,
  actions,
  headingLevel = 1,
  className,
  ...props
}: DashboardPageHeaderProps) {
  const Heading = (['h1', 'h2', 'h3'] as const)[headingLevel - 1] ?? 'h1';
  const bell =
    notifications ??
    (notificationCount !== undefined ? (
      <PageHeaderBell count={notificationCount} label={notificationsLabel} onPress={onNotificationsPress} />
    ) : null);
  const hasToolbar = Boolean(dateRange || bell || actions);
  const lastIndex = breadcrumbs.length - 1;

  return (
    <header {...props} className={cx('flex w-full min-w-0 flex-col gap-4', className)}>
      {breadcrumbs.length > 0 ? (
        <Breadcrumb aria-label={breadcrumbLabel} className="-mx-1">
          {breadcrumbs.map((crumb, index) => (
            <BreadcrumbItem
              key={`${index}-${crumb.label}`}
              icon={crumb.initials ? undefined : crumb.icon}
              href={index === lastIndex ? undefined : crumb.href}
              onClick={index === lastIndex ? undefined : crumb.onPress}
              current={index === lastIndex}
            >
              {crumb.initials ? <CrumbInitials initials={crumb.initials} tone={crumb.tone} /> : null}
              {crumb.label}
            </BreadcrumbItem>
          ))}
        </Breadcrumb>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Heading className="truncate text-title-2-medium text-text-primary">{title}</Heading>
          {description ? <p className="text-body-regular text-text-secondary">{description}</p> : null}
        </div>
        {hasToolbar ? (
          <div className="flex flex-wrap items-center gap-2">
            {dateRange}
            {bell}
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
// #endregion
