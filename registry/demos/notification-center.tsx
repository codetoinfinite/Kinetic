'use client';

import { useState } from 'react';
import {
  RiDownloadCloud2Line,
  RiGitPullRequestLine,
  RiShieldCheckLine,
  RiUserAddLine,
} from '@remixicon/react';

import {
  NotificationCenter,
  type NotificationCenterItem,
  type NotificationCenterTab,
} from '@/registry/ui/notification-center';

const NOTIFICATIONS: NotificationCenterItem[] = [
  {
    id: 'mention-notes',
    category: 'mentions',
    group: 'Today',
    title: 'Livia mentioned you',
    description: 'Can you review the new empty state before we ship the dashboard?',
    timestamp: '2m',
    unread: true,
    avatar: { initials: 'LS', alt: 'Livia Saris', color: 'pink' },
    actions: [
      { id: 'reply', label: 'Reply', variant: 'primary' },
      { id: 'view', label: 'View thread', variant: 'secondary' },
    ],
  },
  {
    id: 'backup-ready',
    category: 'system',
    group: 'Today',
    title: 'Workspace backup is ready',
    description: 'The July 23 backup finished successfully and is ready to download.',
    timestamp: '18m',
    unread: true,
    status: 'success',
    icon: RiDownloadCloud2Line,
    actions: [{ id: 'download', label: 'Download', variant: 'secondary' }],
  },
  {
    id: 'project-invite',
    category: 'activity',
    group: 'Today',
    title: 'You joined Project Sea',
    description: 'Maria added you as an editor. You now have access to all project files.',
    timestamp: '1h',
    unread: true,
    icon: RiUserAddLine,
    status: 'information',
  },
  {
    id: 'pull-request',
    category: 'mentions',
    group: 'Earlier this week',
    title: 'Jaydon requested your review',
    description: 'Pull request #284 updates the notification preferences flow.',
    timestamp: 'Mon',
    avatar: { initials: 'JA', alt: 'Jaydon Aminoff', color: 'blue' },
    actions: [{ id: 'review', label: 'Review changes', variant: 'secondary' }],
  },
  {
    id: 'security-check',
    category: 'system',
    group: 'Earlier this week',
    title: 'Security check completed',
    description: 'No exposed credentials or vulnerable dependencies were found.',
    timestamp: 'Sun',
    status: 'success',
    icon: RiShieldCheckLine,
  },
  {
    id: 'deploy-failed',
    category: 'system',
    group: 'Earlier this week',
    title: 'Preview deployment failed',
    description: 'The build stopped while validating the application routes.',
    timestamp: 'Sat',
    unread: true,
    status: 'error',
    icon: RiGitPullRequestLine,
    actions: [
      { id: 'retry', label: 'Retry', variant: 'primary' },
      { id: 'logs', label: 'View logs', variant: 'secondary' },
    ],
  },
];

const TAB_LABEL: Record<NotificationCenterTab, string> = {
  all: 'All',
  mentions: 'Mentions',
  system: 'System',
};

type LogEntry = { id: number; action: string; title: string };

/* BoardUI's inbox on a page surface: the center is controlled (tab state lives
   here), and every action button lands in the activity log beside it, so the
   callbacks are visible. Pressing an action also marks that item read inside
   the center; "Mark all read" clears the rest. */
export default function Demo() {
  const [tab, setTab] = useState<NotificationCenterTab>('all');
  const [log, setLog] = useState<LogEntry[]>([]);

  const handleAction = (notificationId: string, actionId: string) => {
    const item = NOTIFICATIONS.find((candidate) => candidate.id === notificationId);
    const action = item?.actions?.find((candidate) => candidate.id === actionId);
    if (!item || !action) return;
    setLog((current) =>
      [{ id: (current[0]?.id ?? 0) + 1, action: action.label, title: item.title }, ...current].slice(0, 6),
    );
  };

  return (
    <div className="flex h-full w-full items-center justify-center gap-6 bg-background-full p-10">
      <NotificationCenter
        notifications={NOTIFICATIONS}
        tab={tab}
        onTabChange={setTab}
        onAction={handleAction}
      />

      <aside
        aria-label="Notification activity"
        className="flex w-[320px] flex-col gap-4 rounded-3xl bg-background-secondary-default p-4"
      >
        <div className="flex flex-col gap-0.5">
          <h2 className="text-headline-medium text-text-primary">Activity</h2>
          <p className="text-body-regular text-text-secondary">
            Viewing <span className="text-text-primary">{TAB_LABEL[tab]}</span>
          </p>
        </div>

        {log.length === 0 ? (
          <p className="rounded-2xl bg-background-primary-default px-4 py-5 text-body-regular text-text-tertiary">
            Press Reply, Download or Retry on a notification and it shows up here.
          </p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {log.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-0.5 rounded-2xl bg-background-primary-default px-3 py-2.5"
              >
                <span className="text-body-medium text-text-primary">{entry.action}</span>
                <span className="truncate text-caption-1-regular text-text-tertiary">{entry.title}</span>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}
