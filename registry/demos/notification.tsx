'use client';

import { useRef, useState } from 'react';
import { RiChat3Line, RiCheckboxCircleLine, RiErrorWarningLine } from '@remixicon/react';

import { Button } from '@/registry/ui/button';
import { Notification, NotificationViewport, type NotificationPosition } from '@/registry/ui/notification';
import { SegmentedControl, SegmentedControlItem } from '@/registry/ui/segmented-control';

type Kind = 'deploy' | 'comment' | 'failed';
type Item = { id: number; kind: Kind; dismissed: boolean };

const POSITIONS: { id: NotificationPosition; label: string }[] = [
  { id: 'top-end', label: 'Top' },
  { id: 'bottom-end', label: 'Bottom' },
  { id: 'bottom-center', label: 'Center' },
];

/* Nothing is on screen until a button sends one: each notification slides
   into the stack in the chosen corner, the timed ones run a countdown bar
   (hover the stack to hold it), and the action buttons close their card by
   flipping `dismissed`, which plays the exit before it leaves the list. */
export default function Demo() {
  const [items, setItems] = useState<Item[]>([]);
  const [position, setPosition] = useState<NotificationPosition>('bottom-end');
  const [paused, setPaused] = useState(false);
  const nextId = useRef(1);

  const send = (kind: Kind) => {
    const id = nextId.current;
    nextId.current += 1;
    // The pointer is on the button, not the stack, so any hold is over.
    setPaused(false);
    // Keep at most four live cards: the oldest one plays its exit instead of vanishing.
    setItems((current) => {
      const next = [...current, { id, kind, dismissed: false }];
      const live = next.filter((item) => !item.dismissed);
      if (live.length <= 4) return next;
      const oldest = live[0]?.id;
      return next.map((item) => (item.id === oldest ? { ...item, dismissed: true } : item));
    });
  };

  const close = (id: number) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, dismissed: true } : item)));

  const remove = (id: number) => setItems((current) => current.filter((item) => item.id !== id));

  return (
    <div
      onPointerEnter={() => setPaused(false)}
      className="flex w-full max-w-[400px] flex-col gap-4 rounded-3xl border border-border-button-default bg-background-primary-default p-5"
    >
      <div className="flex flex-col gap-0.5">
        <h3 className="text-headline-medium text-text-primary">Send a notification</h3>
        <p className="text-body-regular text-text-secondary">Hover the stack to pause the countdown.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="small" variant="secondary" leadingIcon={RiCheckboxCircleLine} onClick={() => send('deploy')}>
          Deploy finished
        </Button>
        <Button size="small" variant="secondary" leadingIcon={RiChat3Line} onClick={() => send('comment')}>
          New comment
        </Button>
        <Button size="small" variant="secondary" leadingIcon={RiErrorWarningLine} onClick={() => send('failed')}>
          Build failed
        </Button>
      </div>

      <SegmentedControl
        aria-label="Stack position"
        selectedKeys={[position]}
        onSelectionChange={(keys) => {
          const next = [...(keys as Set<NotificationPosition>)][0];
          if (next) setPosition(next);
        }}
        className="flex w-full"
      >
        {POSITIONS.map(({ id, label }) => (
          <SegmentedControlItem key={id} id={id} className="flex-1">
            {label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>

      <NotificationViewport
        position={position}
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
      >
        {items.map((item) =>
          item.kind === 'deploy' ? (
            <Notification
              key={item.id}
              status="success"
              title="Deployment finished"
              description="acme.app is live on production."
              timestamp="now"
              introDelay={0}
              autoDismissDuration={5000}
              paused={paused}
              dismissed={item.dismissed}
              onDismiss={() => remove(item.id)}
            />
          ) : item.kind === 'comment' ? (
            <Notification
              key={item.id}
              title="Livia commented"
              description="“Can we ship the empty state today?”"
              timestamp="now"
              avatar={{ initials: 'LS', alt: 'Livia Saris', color: 'pink', presence: 'online' }}
              actions={[
                { label: 'Mark read', onClick: () => close(item.id) },
                { label: 'Reply', onClick: () => close(item.id) },
              ]}
              introDelay={0}
              dismissed={item.dismissed}
              onDismiss={() => remove(item.id)}
            />
          ) : (
            <Notification
              key={item.id}
              status="error"
              title="Build failed"
              description="The preview stopped while validating routes."
              timestamp="now"
              actions={[{ label: 'Retry', variant: 'primary', onClick: () => close(item.id) }]}
              introDelay={0}
              autoDismissDuration={8000}
              paused={paused}
              dismissed={item.dismissed}
              onDismiss={() => remove(item.id)}
            />
          ),
        )}
      </NotificationViewport>
    </div>
  );
}
