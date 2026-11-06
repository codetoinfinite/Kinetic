/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Notification Bell Badge" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */
import type { ComponentMetaInput } from '@/scripts/schema';

const meta: ComponentMetaInput = {
  slug: 'notification-bell-badge',
  title: 'Notification Bell Badge',
  category: 'action',
  kit: 'boardui',
  tags: ['boardui', 'notifications', 'badge', 'popover', 'bell', 'dashboard'],
  blurb: 'Bell button with a red unread badge that opens a notification popover; mark one or all read and the badge follows.',
  cost: 'css',
  motif: 'rings',
  files: [{ path: 'registry/ui/notification-bell-badge.tsx', type: 'registry:ui', role: 'component' }],
  dependencies: ['@remixicon/react@^4.9.0'],
  summary:
    'The dashboard header bell: a 36px bordered button with a small red count badge over the glyph. Pressing it opens the kit Popover with the notification list; each row toggles its own read state and "Mark all as read" clears them, and the badge, the trigger\'s accessible name and the "N unread" line all come from the same list.',
  mechanism: [
    'State is one notifications array (controlled via notifications + onNotificationsChange, or uncontrolled via defaultNotifications); unread is derived as items.filter(!read).length and never stored separately.',
    'BellButton is a plain <button> that forwards its ref and spreads props, styled with the kit buttonStyles base and secondary variant at 36px (or 32px), so it can be the first child of PopoverTrigger.',
    'Its aria-label reads "Notifications, N unread"; the visual badge is aria-hidden, absolutely positioned at top-1 start-[18px] and scales from 50% plus fades out when the count hits 0.',
    'While fading out the badge keeps its last non-zero number (a setState-during-render sync that only updates on non-zero counts), so it never flashes an empty red dot.',
    'Each row\'s toggle button flips between "Mark as read" and "Mark as unread" and calls setRead(id, !read), mapping a new array; "Mark all as read" maps every unread item to read.',
    'Neither control unmounts or becomes disabled after use (the mark-all button turns aria-disabled), so keyboard focus stays inside the popover; the unread line is aria-live so screen readers hear the new count.',
  ],
  constants: [
    { name: 'badge position', value: 'top-1 start-[18px], h-3.5 min-w-3.5', why: 'Sits on the bell glyph\'s top-right shoulder inside the 36px button, matching the dashboard shot.' },
    { name: 'badge ring', value: 'ring-2 ring-background-primary-default', why: 'A 2px ring in the button\'s own fill cuts the badge out of the glyph outline in both themes.' },
    { name: 'max', value: '9', why: 'A 14px badge holds two characters; larger counts read 9+.' },
    { name: 'popover width', value: '360px (max 100vw - 32px)', why: 'Fits a two-line title, a description and the toggle button without wrapping the time row.' },
    { name: 'list height', value: 'max-h-[min(340px,60vh)]', why: 'About five rows before the list scrolls, and never taller than a phone viewport allows.' },
  ],
  pitfalls: [
    'Do not remove the per-row button once a notification is read: focus would drop to <body> mid-popover. Flip its label instead.',
    'Do not disable "Mark all as read" with the disabled attribute for the same reason; use aria-disabled and no-op the handler.',
    'Do not wrap IconButton in a span as the PopoverTrigger child: the trigger must be the focusable element that receives the forwarded ref and press props.',
    'Do not keep a separate unread counter in state; derive it from the list or the badge and the list will drift apart.',
  ],
  notes: [
    'BellButton is exported on its own for headers that open a different surface (a drawer or a full notification center).',
    'Pass isOpen / onOpenChange to control the popover, e.g. to close it after navigating to a notification.',
  ],
  apiSignature:
    'export function NotificationBellBadge({ notifications, defaultNotifications, onNotificationsChange, isOpen, defaultOpen, onOpenChange, max, size, label, emptyState, footer, placement, className, popoverClassName }: NotificationBellBadgeProps): JSX.Element\nexport function BellButton({ count, max, size, label, className, ref, ...props }: BellButtonProps): JSX.Element',
  props: [
    { name: 'notifications', type: 'readonly BellNotification[]', description: 'Controlled list: { id, title, description?, time, read?, icon?, tone? }.' },
    { name: 'defaultNotifications', type: 'readonly BellNotification[]', default: '[]', description: 'Initial list when uncontrolled.' },
    { name: 'onNotificationsChange', type: '(next: BellNotification[]) => void', description: 'Receives the whole updated list after a mark-one or mark-all change.' },
    { name: 'isOpen / defaultOpen / onOpenChange', type: 'boolean / boolean / (isOpen: boolean) => void', description: 'Popover open state, controlled or not.' },
    { name: 'max', type: 'number', default: '9', description: 'Counts above this show as max+.' },
    { name: 'size', type: "'medium' | 'small'", default: "'medium'", description: '36px or 32px bell.' },
    { name: 'label', type: 'string', default: "'Notifications'", description: 'Trigger accessible name base and popover title.' },
    { name: 'emptyState', type: 'ReactNode', default: "'You are all caught up.'", description: 'Shown when the list is empty.' },
    { name: 'footer', type: 'ReactNode', description: 'Content under the list, e.g. a "View all" link.' },
    { name: 'placement', type: "'bottom' | 'bottom start' | 'bottom end'", default: "'bottom end'", description: 'Popover placement relative to the bell.' },
    { name: 'BellButton.count', type: 'number', description: 'Unread count shown in the standalone bell; the badge hides at 0.' },
  ],
  reducedMotion:
    'The badge and row highlight change instantly (motion-reduce:transition-none); the kit Popover drops its scale and blur entry and only fades.',
  cleanup: 'Nothing of its own to release: no timers or listeners. The kit PopoverTrigger owns and removes its outside-press listener.',
  acceptance:
    'With 5 unread, the bell reads "Notifications, 5 unread"; marking one read in the popover makes it "4 unread", and "Mark all as read" hides the badge and leaves the name "Notifications".',
  criticalRegion: 'critical',
};

export default meta;
