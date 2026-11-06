/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Notification Bell Badge" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */
'use client';

import { useState, type ButtonHTMLAttributes, type ComponentType, type ReactNode, type Ref } from 'react';
import { RiCheckDoubleLine, RiCheckLine, RiMailLine, RiNotification3Line } from '@remixicon/react';
import { Button, buttonStyles } from '@/registry/ui/button';
import { Popover, PopoverHeader, PopoverTrigger } from '@/registry/ui/popover';
import { StatusDot } from '@/registry/ui/status-dot';
import { cx, sortCx } from '@/registry/lib/cx';

/**
 * NotificationBellBadge: the dashboard header's bell. A 36px bordered button
 * with a red unread badge over the glyph's shoulder; pressing it opens a
 * popover listing notifications. Each row toggles its own read state and the
 * header's "Mark all as read" clears them all; the badge, the trigger's
 * accessible name and the "N unread" line all derive from the same list, so
 * they can never disagree.
 *
 * Focus never falls out of the popover: the per-row button flips between
 * "Mark as read" and "Mark as unread" instead of disappearing, and "Mark all
 * as read" becomes aria-disabled rather than disabled once nothing is unread.
 */

type IconComponent = ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;

export type NotificationTone = 'information' | 'success' | 'error' | 'neutral';

const DEFAULT_TONE: NotificationTone = 'neutral';

export interface BellNotification {
  id: string;
  title: string;
  description?: ReactNode;
  /** Preformatted time, e.g. "2m ago". */
  time: string;
  read?: boolean;
  icon?: IconComponent;
  tone?: NotificationTone;
}

const styles = sortCx({
  bell: {
    base: 'relative overflow-visible p-0',
    size: { medium: 'size-9', small: 'size-8' },
    icon: { medium: 'size-5', small: 'size-[18px]' },
  },
  badge: [
    'pointer-events-none absolute top-1 start-[18px] flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-[3px]',
    'bg-red-600 text-[10px] leading-none font-semibold text-white tabular-nums ring-2 ring-background-primary-default',
    'origin-center transition-[scale,opacity] duration-200 ease-out motion-reduce:transition-none',
  ].join(' '),
  tone: {
    information: 'bg-notification-information-background text-notification-information-foreground',
    success: 'bg-notification-success-background text-notification-success-foreground',
    error: 'bg-notification-error-background text-notification-error-foreground',
    neutral: 'bg-background-tertiary-default text-foreground-icon-secondary',
  },
  toggle: [
    'inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground-icon-secondary outline-none',
    'transition-colors duration-150 ease-out motion-reduce:transition-none',
    'hover:bg-background-primary-hover hover:text-foreground-icon-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring',
  ].join(' '),
});

export interface BellButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Unread count; the badge hides at 0. */
  count: number;
  /** Counts above this read as `max+`. Default 9. */
  max?: number;
  size?: 'medium' | 'small';
  /** Base accessible name; ", N unread" is appended while count > 0. */
  label?: string;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * The bell trigger on its own. It forwards its ref and spreads props, so it
 * can be the first child of PopoverTrigger, Dropdown or a TooltipTrigger.
 */
export function BellButton({ count, max = 9, size = 'medium', label = 'Notifications', className, ref, ...props }: BellButtonProps) {
  // Keep the last non-zero count on screen while the badge fades out, so it
  // doesn't flash an empty red dot on its way to zero.
  const [shown, setShown] = useState(count);
  if (count > 0 && count !== shown) setShown(count);
  const text = shown > max ? `${max}+` : String(shown);

  return (
    <button
      ref={ref}
      type="button"
      aria-label={count > 0 ? `${label}, ${count} unread` : label}
      className={cx(
        buttonStyles.base,
        buttonStyles.variant.secondary,
        'rounded-2lg text-foreground-icon-primary',
        styles.bell.base,
        styles.bell.size[size],
        className,
      )}
      {...props}
    >
      <RiNotification3Line aria-hidden className={styles.bell.icon[size]} />
      <span aria-hidden className={cx(styles.badge, count > 0 ? 'scale-100 opacity-100' : 'scale-50 opacity-0')}>
        {text}
      </span>
    </button>
  );
}

export interface NotificationBellBadgeProps {
  /** Controlled list. Pair with onNotificationsChange. */
  notifications?: readonly BellNotification[];
  /** Initial list when uncontrolled. */
  defaultNotifications?: readonly BellNotification[];
  /** Called with the whole updated list after any read-state change. */
  onNotificationsChange?: (next: BellNotification[]) => void;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  max?: number;
  size?: 'medium' | 'small';
  /** Trigger label and popover title. Default "Notifications". */
  label?: string;
  /** Shown when the list is empty. */
  emptyState?: ReactNode;
  /** Extra content under the list, e.g. a "View all" link. */
  footer?: ReactNode;
  placement?: 'bottom' | 'bottom start' | 'bottom end';
  className?: string;
  popoverClassName?: string;
}

// #region critical
export function NotificationBellBadge({
  notifications,
  defaultNotifications = [],
  onNotificationsChange,
  isOpen,
  defaultOpen,
  onOpenChange,
  max = 9,
  size = 'medium',
  label = 'Notifications',
  emptyState = 'You are all caught up.',
  footer,
  placement = 'bottom end',
  className,
  popoverClassName,
}: NotificationBellBadgeProps) {
  const [uncontrolled, setUncontrolled] = useState<readonly BellNotification[]>(defaultNotifications);
  const items = notifications ?? uncontrolled;
  const unread = items.filter((item) => !item.read).length;

  const commit = (next: BellNotification[]) => {
    setUncontrolled(next);
    onNotificationsChange?.(next);
  };
  const setRead = (id: string, read: boolean) =>
    commit(items.map((item) => (item.id === id ? { ...item, read } : item)));
  const markAllRead = () => {
    if (unread === 0) return;
    commit(items.map((item) => (item.read ? item : { ...item, read: true })));
  };

  return (
    <PopoverTrigger isOpen={isOpen} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <BellButton count={unread} max={max} size={size} label={label} className={className} />
      <Popover placement={placement} className={cx('w-[360px]', popoverClassName)} dialogClassName="gap-1.5 p-1">
        <div className="flex items-start justify-between gap-3 px-2 pt-1.5 pb-1">
          <PopoverHeader
            title={label}
            description={<span aria-live="polite">{unread > 0 ? `${unread} unread` : 'No unread notifications'}</span>}
          />
          <Button
            variant="ghost"
            size="xs"
            leadingIcon={RiCheckDoubleLine}
            aria-disabled={unread === 0 || undefined}
            onClick={markAllRead}
            className="mt-px"
          >
            Mark all as read
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-body-2-regular text-text-tertiary">{emptyState}</p>
        ) : (
          <ul className="flex max-h-[min(340px,60vh)] flex-col gap-0.5 overflow-y-auto" aria-label={label}>
            {items.map((item) => {
              const Icon = item.icon ?? RiNotification3Line;
              return (
                <li
                  key={item.id}
                  className={cx(
                    'flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors duration-150 ease-out motion-reduce:transition-none',
                    item.read ? 'bg-transparent' : 'bg-background-secondary-default',
                  )}
                >
                  <span
                    aria-hidden
                    className={cx('flex size-8 shrink-0 items-center justify-center rounded-full', styles.tone[item.tone ?? DEFAULT_TONE])}
                  >
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className={cx('text-body-2-medium', item.read ? 'text-text-secondary' : 'text-text-primary')}>
                      {item.title}
                      {item.read ? null : <span className="sr-only"> (unread)</span>}
                    </p>
                    {item.description ? <p className="text-caption-1-regular text-text-tertiary">{item.description}</p> : null}
                    <p className="flex items-center gap-1 text-caption-1-regular text-text-tertiary">
                      {item.read ? null : <StatusDot color="indigo" className="-ms-[3px]" />}
                      {item.time}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.toggle}
                    aria-label={item.read ? `Mark "${item.title}" as unread` : `Mark "${item.title}" as read`}
                    title={item.read ? 'Mark as unread' : 'Mark as read'}
                    onClick={() => setRead(item.id, !item.read)}
                  >
                    {item.read ? <RiMailLine aria-hidden className="size-4" /> : <RiCheckLine aria-hidden className="size-4" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {footer ? <div className="border-t border-separator-border px-2 pt-2 pb-1">{footer}</div> : null}
      </Popover>
    </PopoverTrigger>
  );
}
// #endregion
