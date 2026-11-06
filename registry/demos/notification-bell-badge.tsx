'use client';
/*
 * Built for Kinetic from scratch after the public preview of BoardUI's "Notification Bell Badge" (boardui.com/templates/dashboard).
 * No BoardUI source was used.
 */

import { useState } from 'react';
import { RiAddLine, RiCheckLine, RiErrorWarningLine, RiMailLine, RiUserAddLine } from '@remixicon/react';
import { Button } from '@/registry/ui/button';
import { NotificationBellBadge, type BellNotification } from '@/registry/ui/notification-bell-badge';

const INITIAL: BellNotification[] = [
  { id: 'n1', title: 'Ana Carter assigned you a ticket', description: '#1042 Refund for order 88213', time: '2m ago', tone: 'information', icon: RiUserAddLine },
  { id: 'n2', title: 'Payout of $12,480 completed', description: 'Sent to the account ending 4410', time: '1h ago', tone: 'success', icon: RiCheckLine },
  { id: 'n3', title: 'Delivery failed for #88190', description: 'The courier could not reach the address', time: '3h ago', tone: 'error', icon: RiErrorWarningLine },
  { id: 'n4', title: 'Weekly report is ready', description: 'Jun 29 - Jul 5 summary', time: 'Yesterday', icon: RiMailLine },
  { id: 'n5', title: 'Leo Park replied to your comment', description: '"Shipping label is attached now."', time: 'Yesterday', tone: 'information', icon: RiMailLine },
  { id: 'n6', title: 'Mertcan joined Board team', time: '2d ago', icon: RiUserAddLine, read: true },
];

const INCOMING: Omit<BellNotification, 'id'>[] = [
  { title: 'New order #88241 placed', description: '3 items, $214.00', time: 'Just now', tone: 'success', icon: RiCheckLine },
  { title: 'Payment retry scheduled', description: 'Invoice INV-2207 will retry tomorrow', time: 'Just now', tone: 'error', icon: RiErrorWarningLine },
  { title: 'Mia Chen mentioned you', description: '"Can you check the refund?"', time: 'Just now', tone: 'information', icon: RiMailLine },
];

export default function Demo() {
  const [items, setItems] = useState<BellNotification[]>(INITIAL);
  const [received, setReceived] = useState(0);
  const unread = items.filter((item) => !item.read).length;

  const simulate = () => {
    const template = INCOMING[received % INCOMING.length];
    if (!template) return;
    setItems((current) => [{ ...template, id: `in-${received}` }, ...current]);
    setReceived((count) => count + 1);
  };

  return (
    <div className="flex w-full max-w-[1100px] flex-col gap-3" data-demo>
      <div className="flex min-h-[460px] flex-col gap-6 rounded-3xl border border-border-table bg-background-full p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="truncate text-title-2-medium text-text-primary">Support inbox</h2>
            <p className="text-body-2-regular text-text-secondary">Board team</p>
          </div>
          <NotificationBellBadge notifications={items} onNotificationsChange={setItems} />
        </div>

        <div className="flex flex-col gap-4 rounded-2xl bg-background-secondary-default p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-caption-1-medium text-text-secondary">Unread notifications</span>
            <span className="text-title-2-medium text-text-primary tabular-nums" data-unread>
              {unread}
            </span>
          </div>
          <Button variant="secondary" leadingIcon={RiAddLine} onClick={simulate}>
            Simulate new notification
          </Button>
        </div>
        <p className="text-body-2-regular text-text-tertiary">
          Open the bell to mark single notifications read or unread, or clear them all at once; the badge follows the list.
        </p>
      </div>
    </div>
  );
}
