/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Home Dashboard" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */
'use client';

import { useCallback, useMemo, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { RiArrowLeftLine, RiCheckLine, RiCustomerServiceLine, RiEqualizerLine, RiMenuLine } from '@remixicon/react';
import { DASHBOARD_NAV, DashboardSidebar } from '@/registry/ui/dashboard-sidebar';
import type { DashboardNavItem } from '@/registry/ui/dashboard-sidebar';
import { DashboardPageHeader } from '@/registry/ui/dashboard-page-header';
import type { PageHeaderCrumb } from '@/registry/ui/dashboard-page-header';
import { NotificationBellBadge } from '@/registry/ui/notification-bell-badge';
import type { BellNotification } from '@/registry/ui/notification-bell-badge';
import { Button, buttonStyles } from '@/registry/ui/button';
import { Dropdown, DropdownDivider, DropdownItem, DropdownPopover, DropdownTrigger } from '@/registry/ui/dropdown';
import { IconButton } from '@/registry/ui/icon-button';
import { Toaster } from '@/registry/ui/toast';
import { cx } from '@/registry/lib/cx';

/**
 * The frame shared by the BoardUI dashboard templates (home, finance,
 * marketing): the kit sidebar, a scrolling main pane and in-block view
 * switching. The sidebar's rows are plain links, so each row gets a
 * `#view-<key>` href and one capturing click handler on the sidebar's
 * wrapper turns those links into local state changes. Keyboard Enter on a
 * link fires the same click, so this covers the keyboard too, and nothing
 * ever navigates the host page.
 */

export const VIEW_HASH = '#view-';

/** The kit nav, re-pointed at in-block views. */
export const DASHBOARD_VIEWS: readonly DashboardNavItem[] = DASHBOARD_NAV.map((item) => ({
  ...item,
  href: `${VIEW_HASH}${item.key}`,
}));

/** The secondary "Support" row has no route of its own; it opens this view. */
export const SUPPORT_VIEW: DashboardNavItem = { key: 'support', label: 'Support', icon: RiCustomerServiceLine };

export function findView(key: string, items: readonly DashboardNavItem[] = DASHBOARD_VIEWS): DashboardNavItem {
  return items.find((item) => item.key === key) ?? (key === SUPPORT_VIEW.key ? SUPPORT_VIEW : items[0] ?? SUPPORT_VIEW);
}

export const DASHBOARD_NOTIFICATIONS: readonly BellNotification[] = [
  { id: 'n1', title: 'Livia Saris joined Backend', description: 'Say hello in the team channel.', time: '2m ago', tone: 'success' },
  { id: 'n2', title: 'Payout of $7,462 is on its way', description: 'Expected in your account on Friday.', time: '1h ago', tone: 'information' },
  { id: 'n3', title: 'Delivery failed for Aspen Lubin', description: 'The carrier could not reach the address.', time: '3h ago', tone: 'error' },
  { id: 'n4', title: 'Weekly report is ready', time: 'Yesterday', tone: 'neutral' },
  { id: 'n5', title: '3 new support tickets', description: 'Two are marked urgent.', time: 'Yesterday', tone: 'information' },
];

export interface DashboardFrameProps {
  /** Nav key of the view on screen. */
  view: string;
  onViewChange: (key: string) => void;
  /** Sidebar rows. Default: the kit nav with `#view-<key>` hrefs. */
  items?: readonly DashboardNavItem[];
  /** Accessible name of the scrolling main region. */
  label?: string;
  className?: string;
  children: ReactNode;
}

// #region critical
export function DashboardFrame({
  view,
  onViewChange,
  items = DASHBOARD_VIEWS,
  label = 'Dashboard',
  className,
  children,
}: DashboardFrameProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Capture phase so the decision is made before the browser follows the
  // link. DOM containment (not React's tree) keeps portalled menus out.
  const interceptNav = (event: MouseEvent<HTMLElement>) => {
    const link = (event.target as Element | null)?.closest?.('a');
    if (!link || !event.currentTarget.contains(link)) return;
    const href = link.getAttribute('href') ?? '';
    if (href.startsWith(VIEW_HASH)) {
      event.preventDefault();
      onViewChange(href.slice(VIEW_HASH.length));
      setDrawerOpen(false);
    } else if (href === '#') {
      event.preventDefault();
      if (link.getAttribute('aria-label') === SUPPORT_VIEW.label) {
        onViewChange(SUPPORT_VIEW.key);
        setDrawerOpen(false);
      }
    }
  };

  return (
    <div
      data-dashboard-view={view}
      className={cx('relative flex h-full w-full min-h-0 gap-3 overflow-hidden bg-background-full p-3 text-text-primary', className)}
    >
      <div className="hidden h-full shrink-0 lg:flex" onClickCapture={interceptNav}>
        <DashboardSidebar selected={view} items={[...items]} />
      </div>

      {drawerOpen ? (
        <div className="absolute inset-0 z-30 flex lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 cursor-default bg-black/40"
          />
          <div className="relative h-full p-3" onClickCapture={interceptNav}>
            <DashboardSidebar mobile selected={view} items={[...items]} onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      ) : null}

      <main aria-label={label} className="flex min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain px-1 pb-6 lg:px-2">
        <div className="mb-3 flex items-center lg:hidden">
          <IconButton icon={RiMenuLine} aria-label="Open navigation" onClick={() => setDrawerOpen(true)} />
        </div>
        {children}
      </main>

      <Toaster position="bottom-end" />
    </div>
  );
}
// #endregion

export interface DashboardHeaderProps {
  title: ReactNode;
  /** The current nav row; its label and icon close the breadcrumb. */
  current: DashboardNavItem;
  onViewChange: (key: string) => void;
  /** Where the "Board team" crumb leads. */
  homeKey: string;
  notifications?: readonly BellNotification[];
  actions?: ReactNode;
}

/** The page title row every dashboard view shares: crumbs, title, bell, actions. */
export function DashboardHeader({
  title,
  current,
  onViewChange,
  homeKey,
  notifications = DASHBOARD_NOTIFICATIONS,
  actions,
}: DashboardHeaderProps) {
  const crumbs = useMemo<PageHeaderCrumb[]>(
    () => [
      { label: 'Board team', initials: 'B', tone: 'blue', onPress: () => onViewChange(homeKey) },
      { label: 'Mertcan', initials: 'M', tone: 'neutral', onPress: () => onViewChange('profile') },
      { label: current.label, icon: current.icon },
    ],
    [current, homeKey, onViewChange],
  );
  return (
    <DashboardPageHeader
      title={title}
      breadcrumbs={crumbs}
      notifications={<NotificationBellBadge defaultNotifications={notifications} placement="bottom end" />}
      actions={actions}
      className="pt-1"
    />
  );
}

export interface DashboardViewPlaceholderProps {
  item: DashboardNavItem;
  /** Label of the page the back button returns to, e.g. "Home". */
  backLabel: string;
  onBack: () => void;
}

/** What a nav row that belongs to another template shows inside this one. */
export function DashboardViewPlaceholder({ item, backLabel, onBack }: DashboardViewPlaceholderProps) {
  const Icon = item.icon;
  return (
    <section
      aria-label={item.label}
      className="mt-5 flex min-h-[420px] flex-1 flex-col items-center justify-center gap-4 rounded-3xl bg-background-secondary-default p-8 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-background-inner-default text-foreground-icon-secondary shadow-card">
        <Icon aria-hidden className="size-6" />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-headline-semibold text-text-primary">{item.label}</h2>
        <p className="text-body-regular text-text-secondary">
          {item.label} is its own template in this kit. The sidebar keeps your place, so you can come straight back.
        </p>
      </div>
      <Button variant="secondary" size="small" leadingIcon={RiArrowLeftLine} onClick={onBack}>
        Back to {backLabel}
      </Button>
    </section>
  );
}

export interface DashboardWidget<Id extends string = string> {
  id: Id;
  label: string;
}

/** Which widgets of a dashboard are on screen, as a Set with toggle and reset. */
export function useWidgetToggles<Id extends string>(all: readonly Id[], initial: readonly Id[] = all) {
  const [shown, setShown] = useState<ReadonlySet<Id>>(() => new Set(initial));
  const toggle = useCallback(
    (id: Id) =>
      setShown((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    [],
  );
  const showAll = useCallback(() => setShown(new Set(all)), [all]);
  const isShown = useCallback((id: Id) => shown.has(id), [shown]);
  return { shown, toggle, showAll, isShown };
}

const TRIGGER = cx(buttonStyles.base, buttonStyles.size.medium, buttonStyles.variant.secondary);

export interface DashboardWidgetMenuProps<Id extends string> {
  widgets: readonly DashboardWidget<Id>[];
  shown: ReadonlySet<Id>;
  onToggle: (id: Id) => void;
  onShowAll: () => void;
}

/** The header's Filters button: one pressed/unpressed row per widget, then "Show all". */
export function DashboardWidgetMenu<Id extends string>({ widgets, shown, onToggle, onShowAll }: DashboardWidgetMenuProps<Id>) {
  const [open, setOpen] = useState(false);
  const visible = widgets.filter((w) => shown.has(w.id)).length;
  return (
    <Dropdown isOpen={open} onOpenChange={setOpen}>
      <DropdownTrigger className={cx(TRIGGER, open && 'bg-background-primary-active border-border-button-active')}>
        <RiEqualizerLine aria-hidden className={buttonStyles.icon.medium} />
        <span className={buttonStyles.label.medium}>Filters</span>
        {visible < widgets.length ? (
          <span className="rounded-md bg-background-tertiary-default px-1.5 text-caption-1-medium text-text-secondary tabular-nums">
            {visible}/{widgets.length}
          </span>
        ) : null}
      </DropdownTrigger>
      <DropdownPopover aria-label="Dashboard widgets" placement="bottom end" className="w-60 p-1.5" dialogClassName="gap-0.5">
        <p className="px-2 pt-1 pb-1.5 text-caption-1-medium text-text-tertiary">Show on dashboard</p>
        {widgets.map((w) => (
          <DropdownItem key={w.id} selected={shown.has(w.id)} onSelect={() => onToggle(w.id)} className="justify-between px-2 py-1.5">
            <span className="text-body-medium">{w.label}</span>
            <RiCheckLine aria-hidden className={cx('size-[18px] text-foreground-icon-secondary', !shown.has(w.id) && 'invisible')} />
          </DropdownItem>
        ))}
        <DropdownDivider />
        <DropdownItem onSelect={onShowAll} className="px-2 py-1.5">
          <span className="text-body-medium">Show all</span>
        </DropdownItem>
      </DropdownPopover>
    </Dropdown>
  );
}

/** Shown in place of the grid when every widget is hidden. */
export function DashboardEmptyGrid({ onShowAll }: { onShowAll: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-background-secondary-default p-10 text-center">
      <p className="text-body-medium text-text-secondary">Every widget is hidden.</p>
      <Button variant="secondary" size="small" onClick={onShowAll}>
        Show all widgets
      </Button>
    </div>
  );
}
