import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'notification-center',
  title: 'Notification Center',
  category: 'block',
  kit: 'boardui',
  tags: ['notifications', 'inbox', 'tabs', 'unread', 'activity', 'boardui'],
  blurb:
    'Tabbed activity inbox with unread counts, avatars or status icons, inline action buttons and a mark-all-read control.',
  cost: 'dom',
  motif: 'stack',

  files: [
    {
      path: 'registry/ui/notification-center.tsx',
      type: 'registry:ui',
      role: 'component',
    },
  ],
  dependencies: ['@remixicon/react@^4.9.0'],

  summary:
    'A 430px inbox card: a header with the unread count and "Mark all read", a segmented control filtering All / Mentions / System with a count on each tab, and a scrolling list of notification rows. Each row shows an avatar or a tinted status icon, title, timestamp, an unread dot, the description and optional action buttons. Read state is tracked inside the component, so pressing an action or "Mark all read" clears the dots without the parent rewriting its data; the tab can be controlled or left uncontrolled.',

  mechanism: [
    'Tab state bridges controlled and uncontrolled use: `activeTab = tab ?? internalTab`, and `setTab` only writes `internalTab` when `tab` is undefined before calling `onTabChange`. The `SegmentedControl` (`selectedKeys={[activeTab]}`) reads the first key of the selection set and ignores an empty selection, so a tab can never be deselected.',
    'Read state is a `Set` of ids in local state. `isUnread(item)` is `item.unread === true && !readIds.has(item.id)`; the header shows "N unread" or "No unread notifications", and "Mark all read" (a small ghost Button, disabled at zero) replaces the set with every `unread` id. Pressing any action button adds that row\'s id before calling `onAction(notificationId, actionId)`.',
    'Tab counts and the visible list are `useMemo`s over `notifications`: All shows everything, Mentions and System filter by `category`. Items with `category: "activity"` only appear under All. Each tab label renders its count in a `bg-badge-neutral-background` pill.',
    '`NotificationVisual` renders the `avatar` (Avatar `size="lg"` forced to `size-10`) when present, else a 40px round badge with `icon ?? STATUS_ICON[status]` tinted by `status`: neutral (tertiary background), information, success and error (`bg-notification-*-background` / `text-notification-*-foreground`).',
    'The list sits in a padded well (`p-1.5` around a `rounded-2xl bg-background-secondary-default` box) whose inner div is `max-h-[516px] overflow-y-auto overscroll-contain`, so long inboxes scroll inside the card without scrolling the page. Rows are `<article>`s with `rounded-notification-card` (10px) on the primary background; the unread dot is an 8px `bg-accent-500` span labelled "Unread". With no visible rows it shows an empty state with `RiNotificationOffLine` and `emptyMessage`.',
  ],

  constants: [
    {
      name: 'card width',
      value: 'w-full max-w-[430px], rounded-3xl',
      why: 'Fits a notification row with two inline buttons and a timestamp on one line, and fits the 440px bell popover in the app shell with its border.',
    },
    {
      name: 'list height',
      value: 'max-h-[516px]',
      why: 'Caps the list so the card stays inside a laptop viewport when it is opened from a header bell; longer inboxes scroll inside it.',
    },
    {
      name: 'row card radius',
      value: '--radius-notification-card: 10px',
      why: 'Smaller than the 16px (`rounded-2xl`) well around the rows, so the nested corners read as nested inside its 8px padding.',
    },
    {
      name: 'visual size',
      value: 'size-10 (40px), icon size-5',
      why: 'Avatars and status icons share one footprint, so titles line up whatever the row\'s visual is.',
    },
  ],

  pitfalls: [
    'Do not expect `unread: false` to be written back to your data. Read state lives in the component\'s `readIds` set; persist it in `onAction` (or a "mark all" handler of your own) if it must survive a remount.',
    'Do not rely on `group` for headings. It is part of the item type for your own data, but the list renders flat rows in array order; sort the array yourself.',
    'Do not pass `tab` without `onTabChange`. A controlled tab never changes on its own, so the segmented control would appear stuck.',
    'Do not give an item both `avatar` and `icon` expecting the icon; the avatar wins.',
  ],

  notes: [
    'The fixed copy (tab names, "Mark all read", the empty-state line) runs through `useTemplateCopy()`\'s `localize`, so localized templates translate it.',
    'The section is labelled by `title` (`aria-label`), and the h2 shows the same text.',
    'Used by the app shell\'s notification bell, which renders it inside a non-modal popover.',
  ],

  apiSignature:
    'function NotificationCenter(props: Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & { notifications: NotificationCenterItem[]; defaultTab?: "all" | "mentions" | "system"; tab?: "all" | "mentions" | "system"; onTabChange?: (tab: NotificationCenterTab) => void; onAction?: (notificationId: string, actionId: string) => void; title?: string; emptyMessage?: string; ref?: Ref<HTMLDivElement> }): JSX.Element\ntype NotificationCenterItem = { id: string; category: "mentions" | "system" | "activity"; group: string; title: string; description: string; timestamp: string; unread?: boolean; status?: "neutral" | "information" | "success" | "error"; icon?: IconComponent; avatar?: Pick<AvatarProps, "src" | "alt" | "initials" | "color">; actions?: { id: string; label: string; variant?: ButtonProps["variant"] }[] }',

  props: [
    { name: 'notifications', type: 'NotificationCenterItem[]', description: 'The inbox, rendered in array order.' },
    { name: 'defaultTab', type: '"all" | "mentions" | "system"', default: '"all"', description: 'Initial tab when uncontrolled.' },
    { name: 'tab / onTabChange', type: 'NotificationCenterTab / (tab) => void', description: 'Controlled tab.' },
    { name: 'onAction', type: '(notificationId: string, actionId: string) => void', description: 'Called when a row\'s action button is pressed; the row is marked read first.' },
    { name: 'title', type: 'string', default: '"Notifications"', description: 'Heading and accessible name of the section.' },
    { name: 'emptyMessage', type: 'string', default: '"You’re all caught up."', description: 'Shown when the active tab has no rows.' },
    { name: 'item.status', type: '"neutral" | "information" | "success" | "error"', default: '"neutral"', description: 'Tint and default icon of the round badge when there is no avatar.' },
    { name: 'item.actions[].variant', type: 'ButtonProps["variant"]', default: '"secondary"', description: 'Button style of an inline action.' },
  ],

  reducedMotion:
    'The component adds no motion of its own; tab and button transitions come from SegmentedControl and Button and follow their reduced-motion rules.',

  cleanup:
    'None: state only (tab, read ids), no listeners or timers.',

  acceptance:
    'The card reads "4 unread" with tab counts All 6, Mentions 2, System 3. Choosing System shows the three system rows and "Viewing System" in the activity panel. Pressing Retry removes that row\'s blue dot, drops the count to 3 and logs "Retry" beside the card. "Mark all read" clears every dot, reads "No unread notifications" and disables itself. The list scrolls inside the card when it is taller than 516px.',

  criticalRegion: 'critical',
};

export default meta;
